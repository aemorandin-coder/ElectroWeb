'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  IconoArchivar, IconoCopiar, IconoCupon, IconoEditar, IconoEliminar, IconoLista, IconoOferta, IconoPausa, IconoPlay,
} from '@/components/iconos';
import Filtros from '@/components/admin/Filtros';
import { adminBadge, adminCard, adminNotice, adminPrimaryButton, adminSecondaryButton, adminIconButton } from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { formatUSD } from '@/lib/currency';
import { ESTADO, fechaCorta, valorTexto, type Categoria, type ProductoRef, type Promocion } from './promocion';

// Ofertas y cupones de la tienda (C-102).
// C-249b: crear y cambiar van por pasos en su propia página (/admin/discount-requests/nuevo y /[id], PLAN.md §1.9);
// aquí queda la lista con sus números, los filtros, pausar o reanudar y eliminar.

// C-245: en píldoras con ícono y lo que juntan (PLAN.md §1.7)
const FILTROS = [
    { value: 'vigentes', label: 'Vigentes', ayuda: 'Activas, programadas o en pausa', Icono: IconoOferta },
    { value: 'todas', label: 'Todas', ayuda: 'Desde la primera', Icono: IconoLista },
    { value: 'terminadas', label: 'Terminadas', ayuda: 'Vencidas o agotadas', Icono: IconoArchivar },
] as const;

export default function Promociones() {
    const { confirm } = useConfirm();
    const [promos, setPromos] = useState<Promocion[]>([]);
    const [productos, setProductos] = useState<Map<string, ProductoRef>>(new Map());
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [cargando, setCargando] = useState(true);
    const [recargas, setRecargas] = useState(0);
    const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['value']>('vigentes');
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

    const visibles = useMemo(() => promos.filter((p) =>
        filtro === 'todas' ? true
            : filtro === 'vigentes' ? ['ACTIVA', 'PROGRAMADA', 'PAUSADA'].includes(p.status)
                : ['VENCIDA', 'AGOTADA'].includes(p.status)), [promos, filtro]);
    const ahorroTotal = promos.reduce((sum, p) => sum + p.savedUSD, 0);
    const activas = promos.filter((p) => p.status === 'ACTIVA');

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
        let res = await fetch(`/api/admin/promotions/${p.id}`, { method: 'DELETE' });
        let data = await res.json().catch(() => ({}));
        // C-170: otra persona la tiene abierta ahora: se pregunta antes de eliminarla
        if (res.status === 409 && data?.conflicto === 'en_edicion') {
            const seguir = await confirm({ title: 'La están editando ahora', message: `${data.error}. Si la eliminas, verá un aviso. ¿Eliminarla igual?`, confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'warning' });
            if (!seguir) return;
            res = await fetch(`/api/admin/promotions/${p.id}?forzar=1`, { method: 'DELETE' });
            data = await res.json().catch(() => ({}));
        }
        if (res.ok) {
            toast.success(data.message || 'Eliminada');
            setRecargas((n) => n + 1);
        } else toast.error(data.error || 'No se pudo eliminar');
    };

    const alcance = (p: Promocion) =>
        p.scope === 'ALL' ? 'Toda la tienda (productos físicos)'
            : p.scope === 'CATEGORY' ? p.categoryIds.map((id) => categorias.find((c) => c.id === id)?.name ?? 'Categoría').join(', ')
                : p.productIds.length === 1 ? (productos.get(p.productIds[0])?.name ?? '1 producto') : `${p.productIds.length} productos`;

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
                    <p className="text-2xl font-bold tabular-nums text-ink">{formatUSD(ahorroTotal)}</p>
                    <p className="text-xs text-muted">Suma de compras que usaron una oferta o cupón (sin las canceladas)</p>
                </div>
                <div className={`${adminNotice('brand')} text-sm`}>
                    <p><strong>Oferta:</strong> baja el precio y la tienda lo muestra tachado.</p>
                    <p><strong>Cupón:</strong> se aplica con un código al pagar.</p>
                    <p className="mt-1 text-xs">Si un producto tiene varios descuentos, gana el mayor. Los digitales nunca llevan descuento.</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Link href="/admin/discount-requests/nuevo" className={adminPrimaryButton}>
                    <IconoOferta className="h-4 w-4" aria-hidden="true" /> Nueva oferta
                </Link>
                <Link href="/admin/discount-requests/nuevo?tipo=cupon" className={adminSecondaryButton}>
                    <IconoCupon className="h-4 w-4" aria-hidden="true" /> Nuevo cupón
                </Link>
                <div className="w-full sm:ml-auto sm:w-auto">
                    <Filtros etiqueta="Filtrar" valor={filtro} onCambiar={setFiltro}
                        filtros={FILTROS.map((f) => ({ valor: f.value, etiqueta: f.label, ayuda: f.ayuda, Icono: f.Icono }))} />
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
                                <span className={`flex h-12 min-w-16 shrink-0 items-center justify-center rounded-xl px-2 text-base font-bold ${p.kind === 'COUPON' ? 'bg-brand-50 text-brand-700' : 'bg-deal-bg text-deal'}`}>
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
                                        <IconoCopiar className="h-4 w-4" aria-hidden="true" />
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
                                <Link href={`/admin/discount-requests/${p.id}`} className={adminSecondaryButton}><IconoEditar className="h-4 w-4" aria-hidden="true" /> Editar</Link>
                                {p.status !== 'VENCIDA' && (
                                    <button type="button" onClick={() => pausar(p)} className={adminSecondaryButton}>
                                        {p.isActive ? <><IconoPausa className="h-4 w-4" aria-hidden="true" /> Pausar</> : <><IconoPlay className="h-4 w-4" aria-hidden="true" /> Reanudar</>}
                                    </button>
                                )}
                                <button type="button" onClick={() => eliminar(p)} className={`${adminSecondaryButton} text-deal!`}><IconoEliminar className="h-4 w-4" aria-hidden="true" /> Eliminar</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

        </div>
    );
}
