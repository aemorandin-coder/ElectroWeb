'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { FiCopy, FiEdit2, FiPause, FiPlay, FiPlus, FiScissors, FiSearch, FiTag, FiTrash2, FiX } from 'react-icons/fi';
import {
    adminBadge, adminCard, adminChoice, adminError, adminHint, adminInput, adminLabel, adminModalBody, adminModalFooter,
    adminModalHeader, adminModalOverlay, adminModalPanel, adminModalTitle, adminNotice, adminPrimaryButton,
    adminSecondaryButton, adminIconButton, type AdminTone,
} from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { formatUSD } from '@/lib/currency';
import { PORCENTAJE_MAXIMO } from '@/lib/promotions-core';

// Ofertas y cupones de la tienda (C-102).

type Estado = 'ACTIVA' | 'PROGRAMADA' | 'VENCIDA' | 'PAUSADA' | 'AGOTADA';

interface Promocion {
    id: string;
    name: string;
    label: string | null;
    kind: 'AUTOMATIC' | 'COUPON';
    code: string | null;
    isPublic: boolean;
    percentOff: number | null;
    amountOffUSD: number | null;
    scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
    productIds: string[];
    categoryIds: string[];
    minSubtotalUSD: number | null;
    startsAt: string;
    endsAt: string | null;
    maxUses: number | null;
    maxUsesPerUser: number | null;
    usesCount: number;
    isActive: boolean;
    status: Estado;
    savedUSD: number;
}
interface ProductoRef { id: string; name: string; priceUSD: number }
interface Categoria { id: string; name: string }

const ESTADO: Record<Estado, { label: string; tone: AdminTone }> = {
    ACTIVA: { label: 'Activa', tone: 'success' },
    PROGRAMADA: { label: 'Programada', tone: 'brand' },
    PAUSADA: { label: 'Pausada', tone: 'warning' },
    AGOTADA: { label: 'Agotada', tone: 'neutral' },
    VENCIDA: { label: 'Terminada', tone: 'neutral' },
};
const FILTROS = [
    { value: 'vigentes', label: 'Vigentes' },
    { value: 'todas', label: 'Todas' },
    { value: 'terminadas', label: 'Terminadas' },
] as const;

interface Formulario {
    kind: 'AUTOMATIC' | 'COUPON';
    name: string;
    label: string;
    code: string;
    isPublic: boolean;
    valueType: 'PERCENT' | 'AMOUNT';
    value: string;
    scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
    categoryIds: string[];
    products: ProductoRef[];
    minSubtotalUSD: string;
    startsAt: string;
    endsAt: string;
    maxUses: string;
    maxUsesPerUser: string;
}

/** Fecha ISO → valor de <input type="datetime-local"> en la hora del navegador */
function aLocal(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fechaCorta = (iso: string) => new Date(iso).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function vacio(kind: 'AUTOMATIC' | 'COUPON'): Formulario {
    return {
        kind, name: '', label: '', code: '', isPublic: true, valueType: 'PERCENT', value: '', scope: 'ALL',
        categoryIds: [], products: [], minSubtotalUSD: '', startsAt: '', endsAt: '', maxUses: '',
        maxUsesPerUser: kind === 'COUPON' ? '1' : '',
    };
}

function valorTexto(p: Pick<Promocion, 'percentOff' | 'amountOffUSD' | 'kind'>): string {
    if (p.percentOff) return `-${p.percentOff}%`;
    if (p.amountOffUSD) return `-${formatUSD(p.amountOffUSD)}${p.kind === 'AUTOMATIC' ? ' c/u' : ''}`;
    return '';
}

export default function Promociones() {
    const { confirm } = useConfirm();
    const [promos, setPromos] = useState<Promocion[]>([]);
    const [productos, setProductos] = useState<Map<string, ProductoRef>>(new Map());
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [cargando, setCargando] = useState(true);
    const [recargas, setRecargas] = useState(0);
    const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['value']>('vigentes');
    const [form, setForm] = useState<Formulario | null>(null);
    const [editando, setEditando] = useState<Promocion | null>(null);
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [guardando, setGuardando] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [resultados, setResultados] = useState<ProductoRef[]>([]);

    useBodyScrollLock(form !== null);

    useEffect(() => {
        let vigente = true;
        Promise.all([
            fetch('/api/admin/promotions').then((r) => (r.ok ? r.json() : null)),
            fetch('/api/categories').then((r) => (r.ok ? r.json() : [])),
        ]).then(([data, cats]) => {
            if (!vigente) return;
            if (!data) toast.error('No se pudieron cargar las ofertas');
            setPromos(data?.promotions ?? []);
            setProductos(new Map((data?.products ?? []).map((p: ProductoRef) => [p.id, p])));
            setCategorias(Array.isArray(cats) ? cats.map((c: Categoria) => ({ id: c.id, name: c.name })) : []);
            setCargando(false);
        });
        return () => { vigente = false; };
    }, [recargas]);

    // Búsqueda de productos del formulario (con pausa para no pedir en cada tecla)
    useEffect(() => {
        const q = busqueda.trim();
        if (!form || form.scope !== 'PRODUCT' || q.length < 2) return;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(`/api/products?search=${encodeURIComponent(q)}&limit=8`, { signal: controller.signal })
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => setResultados((data?.products ?? [])
                    .filter((p: { productType: string }) => p.productType !== 'DIGITAL')
                    .map((p: ProductoRef) => ({ id: p.id, name: p.name, priceUSD: p.priceUSD }))))
                .catch(() => { });
        }, 300);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [busqueda, form]);

    const visibles = useMemo(() => promos.filter((p) =>
        filtro === 'todas' ? true
            : filtro === 'vigentes' ? ['ACTIVA', 'PROGRAMADA', 'PAUSADA'].includes(p.status)
                : ['VENCIDA', 'AGOTADA'].includes(p.status)), [promos, filtro]);
    const ahorroTotal = promos.reduce((sum, p) => sum + p.savedUSD, 0);
    const activas = promos.filter((p) => p.status === 'ACTIVA');

    const abrir = (kind: 'AUTOMATIC' | 'COUPON', p?: Promocion) => {
        setErrores({});
        setBusqueda('');
        setResultados([]);
        setEditando(p ?? null);
        setForm(p ? {
            kind: p.kind, name: p.name, label: p.label ?? '', code: p.code ?? '', isPublic: p.isPublic,
            valueType: p.percentOff ? 'PERCENT' : 'AMOUNT', value: String(p.percentOff ?? p.amountOffUSD ?? ''),
            scope: p.scope, categoryIds: p.categoryIds,
            products: p.productIds.map((id) => productos.get(id) ?? { id, name: 'Producto', priceUSD: 0 }),
            minSubtotalUSD: p.minSubtotalUSD ? String(p.minSubtotalUSD) : '', startsAt: aLocal(p.startsAt), endsAt: aLocal(p.endsAt),
            maxUses: p.maxUses ? String(p.maxUses) : '', maxUsesPerUser: p.maxUsesPerUser ? String(p.maxUsesPerUser) : '',
        } : vacio(kind));
    };
    const cerrar = () => { if (!guardando) { setForm(null); setEditando(null); } };

    const guardar = async () => {
        if (!form) return;
        setGuardando(true);
        setErrores({});
        const body = {
            kind: form.kind, name: form.name, label: form.label || null, code: form.kind === 'COUPON' ? form.code : null,
            isPublic: form.isPublic, valueType: form.valueType, value: form.value, scope: form.scope,
            categoryIds: form.categoryIds, productIds: form.products.map((p) => p.id),
            minSubtotalUSD: form.minSubtotalUSD || null,
            startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
            endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
            maxUses: form.maxUses || null, maxUsesPerUser: form.maxUsesPerUser || null,
            isActive: editando ? editando.isActive : true,
        };
        try {
            const res = await fetch(editando ? `/api/admin/promotions/${editando.id}` : '/api/admin/promotions', {
                method: editando ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErrores(data.fields ?? {});
                toast.error(data.error || 'No se pudo guardar');
                return;
            }
            toast.success(editando ? 'Cambios guardados' : form.kind === 'COUPON' ? 'Cupón creado' : 'Oferta creada');
            setForm(null);
            setEditando(null);
            setRecargas((n) => n + 1);
        } finally {
            setGuardando(false);
        }
    };

    const pausar = async (p: Promocion) => {
        const res = await fetch(`/api/admin/promotions/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !p.isActive }) });
        if (res.ok) {
            toast.success(p.isActive ? 'Pausada: ya no aplica en la tienda' : 'Reanudada');
            setRecargas((n) => n + 1);
        } else toast.error('No se pudo cambiar');
    };

    const eliminar = async (p: Promocion) => {
        const ok = await confirm({
            title: p.usesCount > 0 ? 'Terminar esta promoción' : 'Eliminar esta promoción',
            message: p.usesCount > 0
                ? 'Ya se usó en compras: se pausará para conservar el historial de ahorro.'
                : `"${p.name}" dejará de aplicar y se borrará.`,
            confirmText: p.usesCount > 0 ? 'Pausar' : 'Eliminar',
            cancelText: 'Cancelar',
            type: 'danger',
        });
        if (!ok) return;
        const res = await fetch(`/api/admin/promotions/${p.id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            toast.success(data.message || 'Eliminada');
            setRecargas((n) => n + 1);
        } else toast.error(data.error || 'No se pudo eliminar');
    };

    const alcance = (p: Promocion) =>
        p.scope === 'ALL' ? 'Toda la tienda (productos físicos)'
            : p.scope === 'CATEGORY' ? p.categoryIds.map((id) => categorias.find((c) => c.id === id)?.name ?? 'Categoría').join(', ')
                : p.productIds.length === 1 ? (productos.get(p.productIds[0])?.name ?? '1 producto') : `${p.productIds.length} productos`;

    // Vista previa: cómo queda un precio de ejemplo
    const ejemplo = form && Number(form.value.replace(',', '.')) > 0
        ? (() => {
            const precio = form.products[0]?.priceUSD || 100;
            const v = Number(form.value.replace(',', '.'));
            const desc = form.valueType === 'PERCENT' ? precio * Math.min(v, PORCENTAJE_MAXIMO) / 100 : Math.min(v, precio);
            return { precio, final: Math.max(precio - desc, 0) };
        })()
        : null;

    const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className={adminCard}>
                    <p className="text-sm text-muted">Activas ahora</p>
                    <p className="text-2xl font-bold tabular-nums text-ink">{activas.length}</p>
                    <p className="text-xs text-muted">{activas.filter((p) => p.kind === 'AUTOMATIC').length} ofertas · {activas.filter((p) => p.kind === 'COUPON').length} cupones</p>
                </div>
                <div className={adminCard}>
                    <p className="text-sm text-muted">Ahorro de los clientes</p>
                    <p className="text-2xl font-bold tabular-nums text-success-strong">{formatUSD(ahorroTotal)}</p>
                    <p className="text-xs text-muted">Suma de compras que usaron una oferta o cupón (sin las canceladas)</p>
                </div>
                <div className={`${adminNotice('brand')} text-sm`}>
                    <p><strong>Oferta:</strong> baja el precio y la tienda lo muestra tachado.</p>
                    <p><strong>Cupón:</strong> se aplica con un código al pagar.</p>
                    <p className="mt-1 text-xs">Si un producto tiene varios descuentos, gana el mayor. Los digitales nunca llevan descuento.</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => abrir('AUTOMATIC')} className={adminPrimaryButton}>
                    <FiTag className="h-4 w-4" aria-hidden="true" /> Nueva oferta
                </button>
                <button type="button" onClick={() => abrir('COUPON')} className={adminSecondaryButton}>
                    <FiScissors className="h-4 w-4" aria-hidden="true" /> Nuevo cupón
                </button>
                <div className="ml-auto flex gap-1" role="group" aria-label="Filtrar">
                    {FILTROS.map((f) => (
                        <button key={f.value} type="button" aria-pressed={filtro === f.value} onClick={() => setFiltro(f.value)}
                            className={`${adminChoice(filtro === f.value)} min-h-11 px-3 text-sm`}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {cargando ? (
                <p className="py-10 text-center text-sm text-muted">Cargando…</p>
            ) : visibles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
                    <p className="font-semibold text-ink">{promos.length === 0 ? 'Todavía no hay ofertas ni cupones' : 'Nada en este filtro'}</p>
                    <p className="mt-1 text-sm text-muted">Crea una oferta para rebajar productos o un cupón para una campaña.</p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {visibles.map((p) => (
                        <li key={p.id} className={`${adminCard} flex flex-col gap-3`}>
                            <div className="flex items-start gap-3">
                                <span className={`flex h-12 min-w-16 shrink-0 items-center justify-center rounded-xl px-2 text-base font-bold ${p.kind === 'COUPON' ? 'bg-success-strong/10 text-success-strong' : 'bg-deal-bg text-deal'}`}>
                                    {valorTexto(p)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-ink">{p.name}</span>
                                        <span className={adminBadge(ESTADO[p.status].tone)}>{ESTADO[p.status].label}</span>
                                    </p>
                                    <p className="text-sm text-muted">{p.kind === 'COUPON' ? 'Cupón' : 'Oferta'}{p.label ? ` · "${p.label}"` : ''} · {alcance(p)}</p>
                                </div>
                            </div>
                            {p.code && (
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="rounded-lg border border-dashed border-line bg-surface px-2 py-1 font-mono font-semibold text-ink">{p.code}</span>
                                    <button type="button" className={`${adminIconButton} h-11 w-11`} aria-label={`Copiar el código ${p.code}`}
                                        onClick={() => { navigator.clipboard?.writeText(p.code ?? '').then(() => toast.success('Código copiado'), () => toast.error('No se pudo copiar')); }}>
                                        <FiCopy className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                    <span className="text-xs text-muted">{p.isPublic ? 'Visible en la ficha del producto' : 'Solo con el código'}</span>
                                </div>
                            )}
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                                <div><dt className="text-muted">Desde</dt><dd className="text-ink">{fechaCorta(p.startsAt)}</dd></div>
                                <div><dt className="text-muted">Hasta</dt><dd className="text-ink">{p.endsAt ? fechaCorta(p.endsAt) : 'Sin fecha'}</dd></div>
                                <div><dt className="text-muted">Usos</dt><dd className="tabular-nums text-ink">{p.usesCount}{p.maxUses ? ` de ${p.maxUses}` : ''}</dd></div>
                                <div><dt className="text-muted">Ahorro dado</dt><dd className="tabular-nums text-ink">{formatUSD(p.savedUSD)}</dd></div>
                            </dl>
                            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                                <button type="button" onClick={() => abrir(p.kind, p)} className={adminSecondaryButton}><FiEdit2 className="h-4 w-4" aria-hidden="true" /> Editar</button>
                                {p.status !== 'VENCIDA' && (
                                    <button type="button" onClick={() => pausar(p)} className={adminSecondaryButton}>
                                        {p.isActive ? <><FiPause className="h-4 w-4" aria-hidden="true" /> Pausar</> : <><FiPlay className="h-4 w-4" aria-hidden="true" /> Reanudar</>}
                                    </button>
                                )}
                                <button type="button" onClick={() => eliminar(p)} className={`${adminSecondaryButton} text-deal`}><FiTrash2 className="h-4 w-4" aria-hidden="true" /> Eliminar</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {form && createPortal(
                <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="promo-titulo" onKeyDown={(e) => { if (e.key === 'Escape') cerrar(); }}>
                    <div className={`${adminModalPanel} max-w-2xl`}>
                        <div className={adminModalHeader}>
                            <h2 id="promo-titulo" className={adminModalTitle}>
                                {editando ? (form.kind === 'COUPON' ? 'Editar cupón' : 'Editar oferta') : form.kind === 'COUPON' ? 'Nuevo cupón' : 'Nueva oferta'}
                            </h2>
                            <button type="button" onClick={cerrar} className={`${adminIconButton} h-11 w-11`} aria-label="Cerrar"><FiX className="h-5 w-5" aria-hidden="true" /></button>
                        </div>
                        <div className={`${adminModalBody} space-y-5`}>
                            {!editando && (
                                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
                                    {(['AUTOMATIC', 'COUPON'] as const).map((k) => (
                                        <button key={k} type="button" role="radio" aria-checked={form.kind === k} onClick={() => setForm({ ...vacio(k), name: form.name, value: form.value, valueType: form.valueType })}
                                            className={`${adminChoice(form.kind === k)} p-3`}>
                                            <span className="block text-sm font-semibold text-ink">{k === 'AUTOMATIC' ? 'Oferta' : 'Cupón'}</span>
                                            <span className="block text-xs text-muted">{k === 'AUTOMATIC' ? 'Precio rebajado para todos, sin código' : 'Descuento al pagar con un código'}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="promo-nombre" className={adminLabel}>Nombre interno</label>
                                    <input id="promo-nombre" className={adminInput(Boolean(errores.name))} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej.: Semana del audio" maxLength={80} />
                                    {errores.name && <p className={adminError}>{errores.name}</p>}
                                </div>
                                <div>
                                    <label htmlFor="promo-label" className={adminLabel}>Texto para el cliente (opcional)</label>
                                    <input id="promo-label" className={adminInput(Boolean(errores.label))} value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Ej.: Semana Tech" maxLength={40} />
                                    <p className={adminHint}>Se ve junto al precio.</p>
                                </div>
                            </div>

                            {form.kind === 'COUPON' && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="promo-codigo" className={adminLabel}>Código</label>
                                        <input id="promo-codigo" className={`${adminInput(Boolean(errores.code))} font-mono uppercase`} value={form.code}
                                            onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s+/g, ''))} placeholder="HOLA10" maxLength={30} autoComplete="off" />
                                        {errores.code ? <p className={adminError}>{errores.code}</p> : <p className={adminHint}>Letras, números o guiones.{editando && editando.usesCount > 0 ? ' Ya se usó: no se puede cambiar.' : ''}</p>}
                                    </div>
                                    <label className="flex min-h-11 items-start gap-2 pt-7 text-sm text-ink">
                                        <input type="checkbox" className="mt-1 h-4 w-4" checked={form.isPublic} onChange={(e) => set('isPublic', e.target.checked)} />
                                        <span>Mostrarlo en la ficha del producto con &quot;Aplicar cupón&quot;<span className="block text-xs text-muted">Desmárcalo para códigos de campañas o promotores.</span></span>
                                    </label>
                                </div>
                            )}

                            <fieldset>
                                <legend className={adminLabel}>Descuento</legend>
                                <div className="flex gap-2">
                                    <div className="flex overflow-hidden rounded-lg border border-line" role="radiogroup" aria-label="Tipo de descuento">
                                        {(['PERCENT', 'AMOUNT'] as const).map((t) => (
                                            <button key={t} type="button" role="radio" aria-checked={form.valueType === t} onClick={() => set('valueType', t)}
                                                className={`h-11 w-12 text-sm font-semibold ${form.valueType === t ? 'bg-brand-500 text-white' : 'bg-white text-ink-soft'}`}>
                                                {t === 'PERCENT' ? '%' : '$'}
                                            </button>
                                        ))}
                                    </div>
                                    <input aria-label="Valor del descuento" inputMode="decimal" className={`${adminInput(Boolean(errores.value))} max-w-40`} value={form.value}
                                        onChange={(e) => set('value', e.target.value.replace(/[^0-9.,]/g, ''))} placeholder={form.valueType === 'PERCENT' ? '15' : '10'} />
                                </div>
                                {errores.value ? <p className={adminError}>{errores.value}</p> : (
                                    <p className={adminHint}>
                                        {form.valueType === 'PERCENT' ? `De 1 a ${PORCENTAJE_MAXIMO}%.` : form.kind === 'AUTOMATIC' ? 'Monto que baja cada unidad.' : 'Monto que se descuenta de la compra, repartido entre los productos que aplican.'}
                                        {ejemplo && form.kind === 'AUTOMATIC' && ` Un producto de ${formatUSD(ejemplo.precio)} queda en ${formatUSD(ejemplo.final)}.`}
                                    </p>
                                )}
                            </fieldset>

                            <fieldset>
                                <legend className={adminLabel}>Aplica a</legend>
                                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Alcance">
                                    {([['ALL', 'Toda la tienda'], ['CATEGORY', 'Categorías'], ['PRODUCT', 'Productos']] as const).map(([v, l]) => (
                                        <button key={v} type="button" role="radio" aria-checked={form.scope === v} onClick={() => set('scope', v)}
                                            className={`${adminChoice(form.scope === v)} min-h-11 px-2 text-sm font-semibold text-ink`}>{l}</button>
                                    ))}
                                </div>
                                {form.scope === 'CATEGORY' && (
                                    <div className="mt-3 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
                                        {categorias.map((c) => (
                                            <label key={c.id} className="flex min-h-11 items-center gap-2 rounded px-2 text-sm text-ink hover:bg-surface">
                                                <input type="checkbox" className="h-4 w-4" checked={form.categoryIds.includes(c.id)}
                                                    onChange={(e) => set('categoryIds', e.target.checked ? [...form.categoryIds, c.id] : form.categoryIds.filter((id) => id !== c.id))} />
                                                {c.name}
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {form.scope === 'PRODUCT' && (
                                    <div className="mt-3 space-y-2">
                                        <div className="relative">
                                            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                                            <input aria-label="Buscar productos" className={`${adminInput()} pl-9`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o SKU" />
                                        </div>
                                        {busqueda.trim().length >= 2 && resultados.length > 0 && (
                                            <ul className="max-h-48 overflow-y-auto rounded-lg border border-line">
                                                {resultados.filter((r) => !form.products.some((p) => p.id === r.id)).map((r) => (
                                                    <li key={r.id}>
                                                        <button type="button" onClick={() => { set('products', [...form.products, r]); setBusqueda(''); setResultados([]); }}
                                                            className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm hover:bg-surface">
                                                            <span className="truncate text-ink">{r.name}</span>
                                                            <span className="shrink-0 text-muted">{formatUSD(r.priceUSD)}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        <p className={adminHint}>Solo productos físicos.</p>
                                        {form.products.length > 0 && (
                                            <ul className="flex flex-wrap gap-2">
                                                {form.products.map((p) => (
                                                    <li key={p.id} className="inline-flex items-center gap-1 rounded-full bg-surface py-1 pl-3 pr-1 text-sm text-ink">
                                                        <span className="max-w-48 truncate">{p.name}</span>
                                                        <button type="button" onClick={() => set('products', form.products.filter((x) => x.id !== p.id))}
                                                            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-line" aria-label={`Quitar ${p.name}`}>
                                                            <FiX className="h-4 w-4" aria-hidden="true" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                                {(errores.categoryIds || errores.productIds) && <p className={adminError}>{errores.categoryIds || errores.productIds}</p>}
                            </fieldset>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="promo-desde" className={adminLabel}>Empieza</label>
                                    <input id="promo-desde" type="datetime-local" className={adminInput(Boolean(errores.startsAt))} value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
                                    <p className={adminHint}>Vacío: ahora mismo.</p>
                                </div>
                                <div>
                                    <label htmlFor="promo-hasta" className={adminLabel}>Termina</label>
                                    <input id="promo-hasta" type="datetime-local" className={adminInput(Boolean(errores.endsAt))} value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
                                    {errores.endsAt ? <p className={adminError}>{errores.endsAt}</p> : <p className={adminHint}>Vacío: hasta que la pauses. Si faltan menos de 7 días, la tienda lo avisa.</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label htmlFor="promo-usos" className={adminLabel}>Tope de compras</label>
                                    <input id="promo-usos" inputMode="numeric" className={adminInput(Boolean(errores.maxUses))} value={form.maxUses} onChange={(e) => set('maxUses', e.target.value.replace(/\D/g, ''))} placeholder="Sin tope" />
                                    {errores.maxUses && <p className={adminError}>{errores.maxUses}</p>}
                                </div>
                                {form.kind === 'COUPON' && (
                                    <>
                                        <div>
                                            <label htmlFor="promo-por-cliente" className={adminLabel}>Usos por cliente</label>
                                            <input id="promo-por-cliente" inputMode="numeric" className={adminInput(Boolean(errores.maxUsesPerUser))} value={form.maxUsesPerUser} onChange={(e) => set('maxUsesPerUser', e.target.value.replace(/\D/g, ''))} placeholder="Sin límite" />
                                            {errores.maxUsesPerUser && <p className={adminError}>{errores.maxUsesPerUser}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="promo-minimo" className={adminLabel}>Compra mínima (USD)</label>
                                            <input id="promo-minimo" inputMode="decimal" className={adminInput(Boolean(errores.minSubtotalUSD))} value={form.minSubtotalUSD} onChange={(e) => set('minSubtotalUSD', e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="Sin mínimo" />
                                            {errores.minSubtotalUSD && <p className={adminError}>{errores.minSubtotalUSD}</p>}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className={adminModalFooter}>
                            <button type="button" onClick={cerrar} className={adminSecondaryButton} disabled={guardando}>Cancelar</button>
                            <button type="button" onClick={guardar} className={adminPrimaryButton} disabled={guardando}>
                                <FiPlus className="h-4 w-4" aria-hidden="true" />{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : form.kind === 'COUPON' ? 'Crear cupón' : 'Crear oferta'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
