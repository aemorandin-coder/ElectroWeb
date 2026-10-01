'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiDatabase, FiDownload, FiEdit3, FiMoreHorizontal, FiPercent, FiPlus, FiSearch, FiTag, FiTrash2, FiUpload, FiX, FiBox } from 'react-icons/fi';
import {
  adminChoice, adminInput, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton, adminTab,
} from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { parseProductImages } from '@/lib/product-utils';
import { normalizar } from '@/lib/cotizaciones/busqueda';
import ListaProductos, { type CambiosRapidos } from './_components/lista/ListaProductos';
import { EdicionMasiva, VistaRapida } from './_components/lista/Modales';
import SadesPanel from './_components/lista/SadesPanel';
import { sinStock, type CampoMasivo, type Categoria, type EstadoProducto, type FiltroEstado, type ProductoLista } from './_components/lista/tipos';

// Productos del admin (C-51). Antes: precio "16.5 USD", "Destacado" en inactivos, acciones masivas sin casillas para
// elegir, "Edición rápida" sin campos, botón de estado que no guardaba nada (mandaba isActive a un PATCH que no lo
// aceptaba), "Inactivos" siempre en 0 y "Duplicar" armado en el navegador (salía sin especificaciones ni montos).

interface ProductoApi {
  id: string; name: string; sku: string; slug: string; priceUSD: number | string; compareAtPriceUSD: number | string | null;
  stock: number; status: EstadoProducto; productType: 'PHYSICAL' | 'DIGITAL'; isFeatured: boolean; images: unknown;
  mainImage: string | null; description: string | null; category: { id: string; name: string } | null; specs: string | null;
  _count?: { digitalVariants: number };
}

/** Digital con montos: los de la tabla (C-60) o, en productos viejos, los de specs.digitalPricing */
function tieneMontos(p: ProductoApi): boolean {
  if (p.productType !== 'DIGITAL') return false;
  if ((p._count?.digitalVariants ?? 0) > 0) return true;
  try {
    const specs = p.specs ? JSON.parse(p.specs) : null;
    return Array.isArray(specs?.digitalPricing) && specs.digitalPricing.length > 0;
  } catch {
    return false;
  }
}

function aLista(p: ProductoApi): ProductoLista {
  return {
    id: p.id, name: p.name, sku: p.sku, slug: p.slug, priceUSD: Number(p.priceUSD),
    compareAtPriceUSD: p.compareAtPriceUSD === null ? null : Number(p.compareAtPriceUSD),
    stock: p.stock, status: p.status, productType: p.productType, isFeatured: p.isFeatured,
    images: parseProductImages(p.images as string), mainImage: p.mainImage, description: p.description ?? '',
    category: p.category ? { id: p.category.id, name: p.category.name } : null,
    hasVariants: tieneMontos(p),
  };
}

const FILTROS: Array<{ value: FiltroEstado; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'publicados', label: 'Activos' },
  { value: 'borradores', label: 'Borradores' },
  { value: 'archivados', label: 'Archivados' },
  { value: 'sin-stock', label: 'Sin stock' },
];

const csv = (v: string | number | boolean | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function ProductsPage() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [tab, setTab] = useState<'local' | 'sades'>('local');
  const [productos, setProductos] = useState<ProductoLista[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tasaVES, setTasaVES] = useState(0);
  const [stockBajo, setStockBajo] = useState(5);
  const [cargando, setCargando] = useState(true);
  const [recargas, setRecargas] = useState(0);

  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstado>('todos');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const [edicionRapida, setEdicionRapida] = useState(false);
  const [cambios, setCambios] = useState<Record<string, CambiosRapidos>>({});
  const [guardando, setGuardando] = useState(false);

  const [vista, setVista] = useState<ProductoLista | null>(null);
  const [masivo, setMasivo] = useState<{ campo: CampoMasivo; valor: string } | null>(null);
  const [masAcciones, setMasAcciones] = useState(false);
  const [duplicando, setDuplicando] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      fetch('/api/products?all=true').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/categories').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/settings').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([lista, cats, ajustes]) => {
      if (!vigente) return;
      if (!Array.isArray(lista)) {
        toast.error('No se pudieron cargar los productos');
      } else {
        setProductos((lista as ProductoApi[]).map(aLista));
      }
      setCategorias(Array.isArray(cats) ? cats.map((c: Categoria) => ({ id: c.id, name: c.name })) : []);
      setTasaVES(Number(ajustes?.exchangeRateVES) || 0);
      if (Number.isFinite(Number(ajustes?.lowStockThreshold))) setStockBajo(Number(ajustes.lowStockThreshold));
      setCargando(false);
    });
    return () => { vigente = false; };
  }, [recargas]);

  const recargar = () => setRecargas((n) => n + 1);

  const conteo = useMemo(() => ({
    todos: productos.length,
    publicados: productos.filter((p) => p.status === 'PUBLISHED').length,
    borradores: productos.filter((p) => p.status === 'DRAFT').length,
    archivados: productos.filter((p) => p.status === 'ARCHIVED').length,
    'sin-stock': productos.filter(sinStock).length,
  }), [productos]);

  const visibles = useMemo(() => {
    // Sin acentos ni mayúsculas (C-158): "audifonos" encuentra "Audífonos"
    const q = normalizar(busqueda.trim());
    return productos.filter((p) =>
      (!q || normalizar(p.name).includes(q) || normalizar(p.sku).includes(q)) &&
      (!categoria || p.category?.id === categoria) &&
      (filtro === 'todos' || (filtro === 'publicados' && p.status === 'PUBLISHED') || (filtro === 'borradores' && p.status === 'DRAFT')
        || (filtro === 'archivados' && p.status === 'ARCHIVED') || (filtro === 'sin-stock' && sinStock(p))));
  }, [productos, busqueda, categoria, filtro]);

  const seleccionados = productos.filter((p) => seleccion.has(p.id));

  const seleccionar = (id: string) => setSeleccion((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const seleccionarTodos = () => setSeleccion((s) => {
    const todos = visibles.every((p) => s.has(p.id));
    const n = new Set(s);
    visibles.forEach((p) => (todos ? n.delete(p.id) : n.add(p.id)));
    return n;
  });

  const cambiarEstado = async (p: ProductoLista) => {
    const nuevo: EstadoProducto = p.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const r = await fetch(`/api/products/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nuevo }) });
    if (!r.ok) { toast.error((await r.json().catch(() => ({}))).error || 'No se pudo cambiar el estado'); return; }
    setProductos((lista) => lista.map((x) => (x.id === p.id ? { ...x, status: nuevo } : x)));
    toast.success(nuevo === 'PUBLISHED' ? `"${p.name}" ya se ve en la tienda` : `"${p.name}" quedó en borrador`);
  };

  const eliminar = async (p: ProductoLista) => {
    const ok = await confirm({ title: 'Eliminar producto', message: `¿Eliminar "${p.name}"? Si tiene órdenes, se archiva en vez de borrarse.`, confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (!ok) return;
    const r = await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast.error(data.error || 'No se pudo eliminar'); return; }
    toast.success(data.archived ? 'Tenía órdenes: quedó archivado' : 'Producto eliminado');
    setSeleccion((s) => { const n = new Set(s); n.delete(p.id); return n; });
    recargar();
  };

  const eliminarSeleccion = async () => {
    const ok = await confirm({ title: `Eliminar ${seleccionados.length} productos`, message: 'Los que tengan órdenes se archivan en vez de borrarse.', confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (!ok) return;
    const resultados = await Promise.all(seleccionados.map((p) => fetch(`/api/products/${p.id}`, { method: 'DELETE' }).then(async (r) => ({ ok: r.ok, archived: (await r.json().catch(() => ({}))).archived }))));
    const fallos = resultados.filter((r) => !r.ok).length;
    const archivados = resultados.filter((r) => r.ok && r.archived).length;
    toast[fallos ? 'error' : 'success'](`${resultados.length - fallos} listos${archivados ? ` (${archivados} archivados por tener órdenes)` : ''}${fallos ? ` · ${fallos} con error` : ''}`);
    setSeleccion(new Set());
    recargar();
  };

  const aplicarMasivo = async (campo: CampoMasivo, valor: string): Promise<boolean> => {
    const body = { productIds: [...seleccion], field: campo, value: campo === 'status' || campo === 'category' ? valor : valor.replace(',', '.') };
    const r = await fetch('/api/products/bulk/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast.error(data.error || 'No se pudo aplicar'); return false; }
    toast.success(data.message || 'Listo');
    setSeleccion(new Set());
    recargar();
    return true;
  };

  const guardarRapida = async () => {
    const updates = Object.entries(cambios).map(([id, c]) => ({
      id,
      ...(c.priceUSD !== undefined ? { priceUSD: c.priceUSD.replace(',', '.') } : {}),
      ...(c.stock !== undefined ? { stock: c.stock } : {}),
    }));
    if (updates.length === 0) { setEdicionRapida(false); return; }
    setGuardando(true);
    try {
      const r = await fetch('/api/products/bulk/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
      const data = await r.json().catch(() => ({}));
      // Antes un 400 dejaba la edición abierta sin decir nada
      if (!r.ok) { toast.error(data.error || 'No se pudo guardar'); return; }
      toast.success(data.message || 'Cambios guardados');
      setCambios({});
      setEdicionRapida(false);
      recargar();
    } finally {
      setGuardando(false);
    }
  };

  const duplicar = async (p: ProductoLista) => {
    setDuplicando(p.id);
    try {
      const r = await fetch(`/api/products/${p.id}/duplicate`, { method: 'POST' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(data.error || 'No se pudo duplicar'); return; }
      toast.success(`Copia creada en borrador (${data.sku}). Revísala y publícala.`);
      router.push(`/admin/products/${data.id}`);
    } finally {
      setDuplicando(null);
    }
  };

  const exportar = () => {
    // Con comillas escapadas y BOM (antes una descripción con " rompía el archivo y Excel mostraba mal los acentos)
    const filas = [
      ['nombre', 'sku', 'descripcion', 'categoria', 'tipo', 'precioUSD', 'stock', 'estado', 'destacado'].join(','),
      ...productos.map((p) => [p.name, p.sku, p.description, p.category?.name, p.productType === 'DIGITAL' ? 'digital' : 'fisico', p.priceUSD.toFixed(2), p.stock, p.status, p.isFeatured ? 'si' : 'no'].map(csv).join(',')),
    ];
    const url = URL.createObjectURL(new Blob(['﻿' + filas.join('\n')], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `productos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cambiosPendientes = Object.keys(cambios).length;

  return (
    <div className="min-w-0 space-y-4">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Productos</h1>
          <p className={adminPageSubtitle}>{conteo.todos} en el catálogo · {conteo.publicados} activos</p>
        </div>
        {tab === 'local' && (
          <div className="flex flex-wrap items-center gap-2">
            {edicionRapida ? (
              <>
                <button type="button" onClick={() => { setEdicionRapida(false); setCambios({}); }} className={adminSecondaryButton}>Cancelar</button>
                <button type="button" onClick={guardarRapida} disabled={guardando || cambiosPendientes === 0} className={adminPrimaryButton}>
                  {guardando ? 'Guardando…' : `Guardar ${cambiosPendientes || ''}`.trim()}
                </button>
              </>
            ) : (
              <>
                <Link href="/admin/products/new" className={adminPrimaryButton}><FiPlus className="h-4 w-4" aria-hidden="true" /> Nuevo producto</Link>
                <button type="button" onClick={() => setEdicionRapida(true)} className={adminSecondaryButton}><FiEdit3 className="h-4 w-4" aria-hidden="true" /> Edición rápida</button>
                <div className="relative">
                  <button type="button" onClick={() => setMasAcciones((v) => !v)} aria-expanded={masAcciones} className={adminSecondaryButton}>
                    <FiMoreHorizontal className="h-4 w-4" aria-hidden="true" /> Más
                  </button>
                  {masAcciones && (
                    <div className="absolute right-0 z-[var(--z-dropdown)] mt-1 w-52 rounded-xl border border-line bg-white p-1 shadow-lg" role="menu">
                      <Link href="/admin/products/importar" role="menuitem" onClick={() => setMasAcciones(false)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-ink hover:bg-surface"><FiUpload className="h-4 w-4" aria-hidden="true" /> Importar (.json)</Link>
                      <button type="button" role="menuitem" onClick={() => { setMasAcciones(false); exportar(); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-ink hover:bg-surface"><FiDownload className="h-4 w-4" aria-hidden="true" /> Exportar CSV</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-line pb-2" role="tablist" aria-label="Origen de los productos">
        <button type="button" role="tab" aria-selected={tab === 'local'} onClick={() => setTab('local')} className={adminTab(tab === 'local')}><FiBox className="h-4 w-4" aria-hidden="true" /> Catálogo</button>
        <button type="button" role="tab" aria-selected={tab === 'sades'} onClick={() => setTab('sades')} className={adminTab(tab === 'sades')}><FiDatabase className="h-4 w-4" aria-hidden="true" /> ElectroCaja / SADES</button>
      </div>

      {tab === 'sades' ? (
        <SadesPanel onSincronizado={recargar} />
      ) : (
        <>
          {/* Estados como filtros rápidos: tocar "Sin stock" filtra */}
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button key={f.value} type="button" aria-pressed={filtro === f.value} onClick={() => setFiltro(f.value)}
                className={`${adminChoice(filtro === f.value)} flex min-h-11 shrink-0 items-center gap-2 px-3 text-sm`}>
                {f.label}<span className={`rounded-full px-2 text-xs font-semibold tabular-nums ${f.value === 'sin-stock' && conteo['sin-stock'] > 0 ? 'bg-deal-bg text-deal' : 'bg-surface text-muted'}`}>{cargando ? '…' : conteo[f.value]}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input type="search" aria-label="Buscar productos" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o SKU" className={`${adminInput()} pl-9`} />
            </div>
            <div className="sm:w-60">
              <label htmlFor="filtro-cat" className="sr-only">Categoría</label>
              <select id="filtro-cat" className={adminInput()} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Todas las categorías</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {edicionRapida && (
            <p className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
              Edición rápida: cambia precio y stock en la lista y toca Guardar. Los digitales con montos se editan en su producto.
            </p>
          )}

          {seleccion.size > 0 && (
            <div className="sticky top-2 z-[var(--z-sticky)] space-y-1 rounded-2xl bg-brand-600 p-2 text-white shadow-lg sm:flex sm:items-center sm:gap-2 sm:space-y-0">
              <div className="flex items-center justify-between gap-2 sm:contents">
                <span className="px-2 text-sm font-semibold">{seleccion.size} seleccionado{seleccion.size === 1 ? '' : 's'}</span>
                <button type="button" onClick={() => setSeleccion(new Set())} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm text-white/80 hover:text-white sm:order-last sm:ml-auto"><FiX className="h-4 w-4" aria-hidden="true" /> Quitar selección</button>
              </div>
              {/* En el teléfono las acciones se deslizan en una fila (antes ocupaban media pantalla) */}
              <div className="-mx-2 flex gap-2 overflow-x-auto px-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                <button type="button" onClick={() => aplicarMasivo('status', 'PUBLISHED')} className="min-h-11 shrink-0 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15">Activar</button>
                <button type="button" onClick={() => aplicarMasivo('status', 'DRAFT')} className="min-h-11 shrink-0 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15">Desactivar</button>
                <button type="button" onClick={() => setMasivo({ campo: 'pricePercent', valor: '' })} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15"><FiPercent className="h-4 w-4" aria-hidden="true" /> Precio</button>
                <button type="button" onClick={() => setMasivo({ campo: 'category', valor: '' })} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15"><FiTag className="h-4 w-4" aria-hidden="true" /> Categoría</button>
                <button type="button" onClick={() => setMasivo({ campo: 'stock', valor: '' })} className="min-h-11 shrink-0 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15">Más cambios</button>
                <button type="button" onClick={eliminarSeleccion} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15"><FiTrash2 className="h-4 w-4" aria-hidden="true" /> Eliminar</button>
              </div>
            </div>
          )}

          {cargando ? (
            <div className="flex justify-center py-12" role="status" aria-label="Cargando productos"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
          ) : visibles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
              <p className="font-semibold text-ink">{productos.length === 0 ? 'Todavía no hay productos' : 'Ningún producto con estos filtros'}</p>
              {productos.length === 0
                ? <Link href="/admin/products/new" className={`${adminPrimaryButton} mt-4`}><FiPlus className="h-4 w-4" aria-hidden="true" /> Nuevo producto</Link>
                : <button type="button" onClick={() => { setBusqueda(''); setCategoria(''); setFiltro('todos'); }} className={`${adminSecondaryButton} mt-4`}>Quitar filtros</button>}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted">Mostrando {visibles.length}{visibles.length !== productos.length ? ` de ${productos.length}` : ''}</p>
              <ListaProductos
                productos={visibles}
                seleccion={seleccion}
                onSeleccionar={seleccionar}
                onSeleccionarTodos={seleccionarTodos}
                tasaVES={tasaVES}
                stockBajo={stockBajo}
                edicionRapida={edicionRapida}
                cambios={cambios}
                onCambio={(id, campo, valor) => setCambios((c) => ({ ...c, [id]: { ...c[id], [campo]: valor } }))}
                onVer={setVista}
                onDuplicar={duplicar}
                onEstado={cambiarEstado}
                onEliminar={eliminar}
                duplicando={duplicando}
              />
            </>
          )}
        </>
      )}

      {vista && <VistaRapida p={vista} tasaVES={tasaVES} onClose={() => setVista(null)} onEstado={cambiarEstado} />}
      {masivo && (
        <EdicionMasiva
          cantidad={seleccion.size}
          digitales={seleccionados.filter((p) => p.productType === 'DIGITAL').length}
          campoInicial={masivo.campo}
          valorInicial={masivo.valor}
          categorias={categorias}
          onClose={() => setMasivo(null)}
          onAplicar={aplicarMasivo}
        />
      )}
    </div>
  );
}
