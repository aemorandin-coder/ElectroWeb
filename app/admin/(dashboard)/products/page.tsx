'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  IconoBaseDeDatos, IconoBuscar, IconoCerrar, IconoDescargar, IconoEditar, IconoEliminar, IconoMas, IconoMasOpciones,
  IconoPaquete, IconoPorcentaje, IconoSubir, IconoVariantes,
} from '@/components/iconos';
import {
  adminChoice, adminInput, adminNotice, adminPageHeader, adminPageSubtitle, adminPageTitle, adminPrimaryButton, adminSecondaryButton, adminTab,
} from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { parseProductImages } from '@/lib/product-utils';
import { normalizar } from '@/lib/cotizaciones/busqueda';
import { hasPermission } from '@/lib/auth-helpers';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import type { PersonaEnLinea } from '@/lib/realtime/eventos';
import { useTiempoReal } from '@/lib/realtime/hooks';
import ListaProductos, { type CambiosRapidos } from './_components/lista/ListaProductos';
import { EdicionMasiva, VistaRapida } from './_components/lista/Modales';
import PapeleraProductos from './_components/lista/PapeleraProductos';
import SadesPanel from './_components/lista/SadesPanel';
import {
  enCatalogo, esFiltroRevisar, FILTROS_REVISAR, REVISAR, sinStock,
  type CampoMasivo, type Categoria, type EstadoProducto, type FiltroEstado, type ProductoLista,
} from './_components/lista/tipos';
import { direccionDeVista, recordarVista, type Pestana } from './_components/lista/vista';

// Productos del admin (C-51). Antes: precio "16.5 USD", "Destacado" en inactivos, acciones masivas sin casillas para
// elegir, "Edición rápida" sin campos, botón de estado que no guardaba nada (mandaba isActive a un PATCH que no lo
// aceptaba), "Inactivos" siempre en 0 y "Duplicar" armado en el navegador (salía sin especificaciones ni montos).
// C-187: lo archivado va aparte (antes llenaba "Todos" de productos que no se podían eliminar), "Por revisar" con los
// avisos del Dashboard, la vista en la dirección, "Deshacer" al cambiar el estado y la estrella de Destacado en la lista.

interface ProductoApi {
  id: string; name: string; sku: string; slug: string; priceUSD: number | string; compareAtPriceUSD: number | string | null;
  stock: number; status: EstadoProducto; productType: 'PHYSICAL' | 'DIGITAL'; isFeatured: boolean; images: unknown;
  mainImage: string | null; description: string | null; category: { id: string; name: string } | null; specs: string | null;
  brandId: string | null; weightKg: number | string | null; dimensions: string | null; barcode: string | null;
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
    brandId: p.brandId ?? null,
    weightKg: p.weightKg === null || p.weightKg === undefined ? null : Number(p.weightKg),
    dimensions: p.dimensions || null,
    barcode: p.barcode || null,
  };
}

// C-187: "Archivados" va al final y aparte: no cuenta en "Todos" ni en "Sin stock"
const FILTROS: Array<{ value: FiltroEstado; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'publicados', label: 'Activos' },
  { value: 'borradores', label: 'Borradores' },
  { value: 'sin-stock', label: 'Sin stock' },
  { value: 'archivados', label: 'Archivados' },
];
const FILTROS_VALIDOS = new Set<string>([...FILTROS.map((f) => f.value), ...FILTROS_REVISAR]);
/** C-187: a 360 px las tres pestañas (con el número de la papelera) no cabían: un poco menos de aire en el teléfono */
const TAB_TELEFONO = 'max-sm:gap-1.5 max-sm:px-2';
const PESTANAS = new Set<string>(['local', 'sades', 'papelera']);

function pasaFiltro(p: ProductoLista, filtro: FiltroEstado): boolean {
  if (esFiltroRevisar(filtro)) return REVISAR[filtro].falta(p);
  switch (filtro) {
    case 'todos': return enCatalogo(p);
    case 'publicados': return p.status === 'PUBLISHED';
    case 'borradores': return p.status === 'DRAFT';
    case 'archivados': return p.status === 'ARCHIVED';
    case 'sin-stock': return sinStock(p);
  }
}

const csv = (v: string | number | boolean | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// useSearchParams pide un Suspense alrededor (la página se arma estática)
export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12" role="status" aria-label="Cargando productos"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>}>
      <Productos />
    </Suspense>
  );
}

function Productos() {
  const router = useRouter();
  const params = useSearchParams();
  const { confirm } = useConfirm();
  const { data: sesion } = useSession();
  const yo = sesion?.user?.id;
  // C-187: la vista sale de la dirección (también "Ver productos" de Categorías, que manda ?category=)
  const [tab, setTab] = useState<Pestana>(() => (PESTANAS.has(params.get('pestana') ?? '') ? params.get('pestana') as Pestana : 'local'));
  const [enPapelera, setEnPapelera] = useState(0);
  const [eliminados, setEliminados] = useState(0);
  // C-169: quién está editando cada producto ahora (id → nombres), por el canal en vivo
  const [editando, setEditando] = useState<Record<string, string[]>>({});
  const temporizadorRecarga = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [productos, setProductos] = useState<ProductoLista[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tasaVES, setTasaVES] = useState(0);
  const [stockBajo, setStockBajo] = useState(5);
  const [maxDestacados, setMaxDestacados] = useState(8);
  const [cargando, setCargando] = useState(true);
  const [recargas, setRecargas] = useState(0);

  const [busqueda, setBusqueda] = useState(() => params.get('q') ?? '');
  const [categoria, setCategoria] = useState(() => params.get('categoria') ?? params.get('category') ?? '');
  const [filtro, setFiltro] = useState<FiltroEstado>(() => (FILTROS_VALIDOS.has(params.get('filtro') ?? '') ? params.get('filtro') as FiltroEstado : 'todos'));
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const [edicionRapida, setEdicionRapida] = useState(false);
  const [cambios, setCambios] = useState<Record<string, CambiosRapidos>>({});
  const [guardando, setGuardando] = useState(false);

  const [vista, setVista] = useState<ProductoLista | null>(null);
  const [masivo, setMasivo] = useState<{ campo: CampoMasivo; valor: string } | null>(null);
  const [masAcciones, setMasAcciones] = useState(false);
  const menuMas = useRef<HTMLDivElement>(null);
  const [duplicando, setDuplicando] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      fetch('/api/products?all=true').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/products?papelera=conteo').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/categories').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/settings').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([lista, conteoPapelera, cats, ajustes]) => {
      if (!vigente) return;
      setEnPapelera(Number(conteoPapelera?.conteo) || 0);
      setEliminados(Number(conteoPapelera?.eliminados) || 0);
      if (!Array.isArray(lista)) {
        toast.error('No se pudieron cargar los productos');
      } else {
        setProductos((lista as ProductoApi[]).map(aLista));
      }
      setCategorias(Array.isArray(cats) ? cats.map((c: Categoria) => ({ id: c.id, name: c.name })) : []);
      setTasaVES(Number(ajustes?.exchangeRateVES) || 0);
      if (Number.isFinite(Number(ajustes?.lowStockThreshold))) setStockBajo(Number(ajustes.lowStockThreshold));
      if (Number(ajustes?.maxFeaturedProducts) > 0) setMaxDestacados(Number(ajustes.maxFeaturedProducts));
      setCargando(false);
    });
    return () => { vigente = false; };
  }, [recargas]);

  // C-187: la vista queda en la dirección (se puede compartir o recargar) y el editor vuelve a ella al guardar
  useEffect(() => {
    const direccion = direccionDeVista({ pestana: tab, filtro, categoria, busqueda });
    if (direccion !== window.location.pathname + window.location.search) window.history.replaceState(null, '', direccion);
    recordarVista(direccion);
  }, [tab, filtro, categoria, busqueda]);

  // El menú "Más" se cierra al tocar fuera o con Escape
  useEffect(() => {
    if (!masAcciones) return;
    const fuera = (e: PointerEvent) => { if (!menuMas.current?.contains(e.target as Node)) setMasAcciones(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setMasAcciones(false); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla); };
  }, [masAcciones]);

  const recargar = () => setRecargas((n) => n + 1);

  // C-169: quién está editando qué, y avisos de lo que otros mueven o restauran. Cada cambio ajeno vuelve a pedir la lista.
  useCargarAlMontar(async () => {
    const r = await fetch('/api/admin/presencia?tipo=product').catch(() => null);
    if (!r?.ok) return;
    const datos = (await r.json().catch(() => null)) as { presentes?: Record<string, PersonaEnLinea[]> } | null;
    setEditando(Object.fromEntries(Object.entries(datos?.presentes ?? {}).map(([recurso, personas]) => [recurso.slice('product:'.length), personas.map((x) => x.nombre)])));
  });
  useTiempoReal((evento) => {
    if (evento.tipo === 'admin:presencia' && evento.recurso.startsWith('product:')) {
      const id = evento.recurso.slice('product:'.length);
      const nombres = evento.editores.filter((e) => e.id !== yo).map((e) => e.nombre);
      setEditando((previo) => {
        const siguiente = { ...previo };
        if (nombres.length > 0) siguiente[id] = nombres;
        else delete siguiente[id];
        return siguiente;
      });
    }
    if (evento.tipo === 'admin:recurso_cambiado' && evento.recurso.startsWith('product:') && evento.por.id !== yo) {
      if (evento.accion === 'papelera') toast(`${evento.por.nombre} movió un producto a la papelera`);
      if (evento.accion === 'restaurado') toast(`${evento.por.nombre} restauró un producto`);
      if (temporizadorRecarga.current) clearTimeout(temporizadorRecarga.current);
      temporizadorRecarga.current = setTimeout(() => setRecargas((n) => n + 1), 800);
    }
  });

  const conteo = useMemo(() => {
    const porFiltro = Object.fromEntries([...FILTROS.map((f) => f.value), ...FILTROS_REVISAR].map((f) => [f, productos.filter((p) => pasaFiltro(p, f)).length])) as Record<FiltroEstado, number>;
    return { ...porFiltro, destacados: productos.filter((p) => p.isFeatured && p.status === 'PUBLISHED').length };
  }, [productos]);
  const porRevisar = FILTROS_REVISAR.filter((f) => conteo[f] > 0 || filtro === f);

  const visibles = useMemo(() => {
    // Sin acentos ni mayúsculas (C-158): "audifonos" encuentra "Audífonos". C-187: también por código de barras
    const q = normalizar(busqueda.trim());
    return productos.filter((p) =>
      (!q || normalizar(p.name).includes(q) || normalizar(p.sku).includes(q) || (p.barcode !== null && normalizar(p.barcode).includes(q))) &&
      (!categoria || p.category?.id === categoria) &&
      pasaFiltro(p, filtro));
  }, [productos, busqueda, categoria, filtro]);

  const seleccionados = productos.filter((p) => seleccion.has(p.id));

  const seleccionar = (id: string) => setSeleccion((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const seleccionarTodos = () => setSeleccion((s) => {
    const todos = visibles.every((p) => s.has(p.id));
    const n = new Set(s);
    visibles.forEach((p) => (todos ? n.delete(p.id) : n.add(p.id)));
    return n;
  });

  /**
   * Activar o pasar a borrador desde la lista o la vista rápida. C-187: con "Deshacer" durante 8 segundos (en el teléfono,
   * tocar el estado por error sacaba un producto de la tienda sin aviso).
   */
  const cambiarEstado = async (p: ProductoLista, destino?: EstadoProducto) => {
    const nuevo: EstadoProducto = destino ?? (p.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED');
    const r = await fetch(`/api/products/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nuevo }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast.error(data.error || 'No se pudo cambiar el estado'); return; }
    setProductos((lista) => lista.map((x) => (x.id === p.id ? { ...x, status: nuevo, isFeatured: typeof data.isFeatured === 'boolean' ? data.isFeatured : x.isFeatured } : x)));
    if (destino) { toast.success(`"${p.name}" quedó como estaba`); return; }
    const texto = nuevo === 'PUBLISHED' ? `"${p.name}" ya se ve en la tienda` : `"${p.name}" quedó en borrador: no se ve en la tienda`;
    toast((t) => (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {texto}
        <button type="button" onClick={() => { toast.dismiss(t.id); void cambiarEstado({ ...p, status: nuevo }, p.status); }} className="font-semibold text-brand-600 underline">Deshacer</button>
      </span>
    ), { duration: 8_000 });
  };

  /** C-187: destacar o quitar de Destacados sin abrir el producto. Un archivado no se destaca (lo dice el servidor) */
  const destacar = async (p: ProductoLista) => {
    const nuevo = !p.isFeatured;
    const r = await fetch(`/api/products/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isFeatured: nuevo }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { toast.error(data.error || 'No se pudo cambiar'); return; }
    setProductos((lista) => lista.map((x) => (x.id === p.id ? { ...x, isFeatured: nuevo } : x)));
    toast.success(!nuevo ? `"${p.name}" ya no está en Destacados` : p.status === 'PUBLISHED' ? `"${p.name}" sale en Destacados del inicio` : `"${p.name}" quedó destacado: sale en el inicio cuando lo actives`);
  };

  /** Mueve un producto a la papelera. Si otra persona lo está editando, se pregunta antes. Devuelve true si quedó en la papelera. */
  const moverAPapelera = async (p: ProductoLista): Promise<boolean> => {
    let r = await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
    let data = await r.json().catch(() => ({}));
    if (r.status === 409 && data.conflicto === 'en_edicion') {
      const seguir = await confirm({
        title: 'Lo están editando ahora',
        message: `${data.error}. Si lo mueves a la papelera, verá un aviso con la opción de restaurarlo y no perderá lo que escribió. ¿Moverlo igual?`,
        confirmText: 'Mover a la papelera', cancelText: 'Cancelar', type: 'warning',
      });
      if (!seguir) return false;
      r = await fetch(`/api/products/${p.id}?forzar=1`, { method: 'DELETE' });
      data = await r.json().catch(() => ({}));
    }
    if (!r.ok) { toast.error(data.error || 'No se pudo mover a la papelera'); return false; }
    return true;
  };

  // C-187: "Deshacer" solo saca de la papelera. Si mientras tanto se borró para siempre, no lo recupera (eso es otra decisión)
  const restaurarVarios = async (ids: string[]) => {
    const resultados = await Promise.all(ids.map((id) => fetch(`/api/products/${id}/restaurar?desde=papelera`, { method: 'POST' }).then((r) => r.ok).catch(() => false)));
    const listos = resultados.filter(Boolean).length;
    toast[listos === ids.length ? 'success' : 'error'](listos === ids.length ? (ids.length === 1 ? 'Producto restaurado' : `${listos} productos restaurados`) : `Se restauraron ${listos} de ${ids.length}`);
    recargar();
  };

  /** Aviso con "Deshacer" durante 10 segundos: lo movido a la papelera vuelve con un toque */
  const avisarConDeshacer = (ids: string[], texto: string) => {
    toast((t) => (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {texto}
        <button type="button" onClick={() => { toast.dismiss(t.id); void restaurarVarios(ids); }} className="font-semibold text-brand-600 underline">Deshacer</button>
      </span>
    ), { duration: 10_000 });
  };

  const eliminar = async (p: ProductoLista) => {
    const ok = await confirm({ title: 'Mover a la papelera', message: `¿Mover "${p.name}" a la papelera? Deja de verse en la tienda y se puede restaurar durante 30 días.`, confirmText: 'Mover a la papelera', cancelText: 'Cancelar', type: 'danger' });
    if (!ok) return;
    if (!(await moverAPapelera(p))) return;
    avisarConDeshacer([p.id], `"${p.name}" está en la papelera`);
    setSeleccion((s) => { const n = new Set(s); n.delete(p.id); return n; });
    recargar();
  };

  const eliminarSeleccion = async () => {
    const ok = await confirm({ title: `Mover ${seleccionados.length} productos a la papelera`, message: 'Dejan de verse en la tienda y se pueden restaurar durante 30 días.', confirmText: 'Mover a la papelera', cancelText: 'Cancelar', type: 'danger' });
    if (!ok) return;
    const movidos: string[] = [];
    for (const p of seleccionados) {
      if (await moverAPapelera(p)) movidos.push(p.id);
    }
    if (movidos.length > 0) avisarConDeshacer(movidos, movidos.length === 1 ? '1 producto está en la papelera' : `${movidos.length} productos están en la papelera`);
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
  const limpiarFiltros = () => { setBusqueda(''); setCategoria(''); setFiltro('todos'); };

  return (
    <div className="min-w-0 space-y-4">
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Productos</h1>
          <p className={adminPageSubtitle}>
            {conteo.todos} en el catálogo · {conteo.publicados} activos · {conteo.destacados} {conteo.destacados === 1 ? 'destacado' : 'destacados'}
            {conteo.destacados > maxDestacados && ` (el inicio muestra los ${maxDestacados} más nuevos)`}
          </p>
        </div>
        {tab === 'local' && (
          // Los botones no se parten en dos filas: si falta lugar, el que se acomoda es el texto de los conteos
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {edicionRapida ? (
              <>
                <button type="button" onClick={() => { setEdicionRapida(false); setCambios({}); }} className={adminSecondaryButton}>Cancelar</button>
                <button type="button" onClick={guardarRapida} disabled={guardando || cambiosPendientes === 0} className={adminPrimaryButton}>
                  {guardando ? 'Guardando…' : `Guardar ${cambiosPendientes || ''}`.trim()}
                </button>
              </>
            ) : (
              <>
                <Link href="/admin/products/new" className={adminPrimaryButton}><IconoMas className="h-4 w-4" aria-hidden="true" /> Nuevo producto</Link>
                <button type="button" onClick={() => setEdicionRapida(true)} className={adminSecondaryButton}><IconoEditar className="h-4 w-4" aria-hidden="true" /> Edición rápida</button>
                <div className="relative" ref={menuMas}>
                  <button type="button" onClick={() => setMasAcciones((v) => !v)} aria-expanded={masAcciones} className={adminSecondaryButton}>
                    <IconoMasOpciones className="h-4 w-4" aria-hidden="true" /> Más
                  </button>
                  {masAcciones && (
                    <div className="absolute right-0 z-[var(--z-dropdown)] mt-1 w-52 rounded-xl border border-line bg-white p-1 shadow-lg" role="menu">
                      <Link href="/admin/products/importar" role="menuitem" onClick={() => setMasAcciones(false)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-ink hover:bg-surface"><IconoSubir className="h-4 w-4" aria-hidden="true" /> Importar (.json)</Link>
                      <button type="button" role="menuitem" onClick={() => { setMasAcciones(false); exportar(); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-ink hover:bg-surface"><IconoDescargar className="h-4 w-4" aria-hidden="true" /> Exportar CSV</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* C-187: en el teléfono "SADES" a secas, para que la Papelera quepa a la vista (antes quedaba fuera, a la derecha) */}
      <div className="flex gap-1 overflow-x-auto border-b border-line pb-2" role="tablist" aria-label="Origen de los productos">
        <button type="button" role="tab" aria-selected={tab === 'local'} onClick={() => setTab('local')} className={`${adminTab(tab === 'local')} ${TAB_TELEFONO}`}><IconoPaquete className="h-4 w-4" aria-hidden="true" /> Catálogo</button>
        <button type="button" role="tab" aria-selected={tab === 'sades'} onClick={() => setTab('sades')} className={`${adminTab(tab === 'sades')} ${TAB_TELEFONO}`}>
          <IconoBaseDeDatos className="h-4 w-4" aria-hidden="true" /> <span><span className="hidden sm:inline">ElectroCaja / </span>SADES</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'papelera'} onClick={() => setTab('papelera')} className={`${adminTab(tab === 'papelera')} ${TAB_TELEFONO}`}>
          <IconoEliminar className="h-4 w-4" aria-hidden="true" /> Papelera{enPapelera > 0 && <span className="rounded-full bg-surface px-2 text-xs font-semibold tabular-nums text-muted">{enPapelera}</span>}
        </button>
      </div>

      {tab === 'sades' ? (
        <SadesPanel onSincronizado={recargar} />
      ) : tab === 'papelera' ? (
        <PapeleraProductos puedeBorrarParaSiempre={hasPermission(sesion ?? null, 'MANAGE_SETTINGS')} recargas={recargas} eliminados={eliminados} onCambio={recargar} />
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

          {/* C-187: lo mismo que avisa el Dashboard, a un toque. Solo aparece lo que tiene algo por arreglar */}
          {!cargando && porRevisar.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Por revisar">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">Por revisar</span>
              {porRevisar.map((f) => (
                <button key={f} type="button" aria-pressed={filtro === f} title={REVISAR[f].ayuda} onClick={() => setFiltro(filtro === f ? 'todos' : f)}
                  className={`${adminChoice(filtro === f)} flex min-h-11 shrink-0 items-center gap-2 px-3 text-sm`}>
                  {REVISAR[f].label}<span className="rounded-full bg-warning/15 px-2 text-xs font-semibold tabular-nums text-warning-strong">{conteo[f]}</span>
                </button>
              ))}
            </div>
          )}

          {filtro === 'archivados' && (
            <p className={adminNotice('neutral')}>
              Los archivados no se ven en la tienda ni en &quot;Todos&quot;. Para quitar uno del todo, muévelo a la papelera: si tiene ventas, al borrarlo se conserva oculto para que sus órdenes sigan completas.
            </p>
          )}
          {esFiltroRevisar(filtro) && <p className={adminNotice('warning')}>{REVISAR[filtro].ayuda}.</p>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input type="search" aria-label="Buscar productos" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, SKU o código de barras" className={`${adminInput()} pl-9`} />
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
                <button type="button" onClick={() => setSeleccion(new Set())} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm text-white/80 hover:text-white sm:order-last sm:ml-auto"><IconoCerrar className="h-4 w-4" aria-hidden="true" /> Quitar selección</button>
              </div>
              {/* En el teléfono las acciones se deslizan en una fila (antes ocupaban media pantalla) */}
              <div className="-mx-2 flex gap-2 overflow-x-auto px-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                <button type="button" onClick={() => aplicarMasivo('status', 'PUBLISHED')} className="min-h-11 shrink-0 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15">Activar</button>
                <button type="button" onClick={() => aplicarMasivo('status', 'DRAFT')} className="min-h-11 shrink-0 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15">Desactivar</button>
                <button type="button" onClick={() => setMasivo({ campo: 'pricePercent', valor: '' })} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15"><IconoPorcentaje className="h-4 w-4" aria-hidden="true" /> Precio</button>
                <button type="button" onClick={() => setMasivo({ campo: 'category', valor: '' })} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15"><IconoVariantes className="h-4 w-4" aria-hidden="true" /> Categoría</button>
                <button type="button" onClick={() => setMasivo({ campo: 'stock', valor: '' })} className="min-h-11 shrink-0 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15">Más cambios</button>
                <button type="button" onClick={eliminarSeleccion} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-white/30 px-3 text-sm hover:bg-white/15"><IconoEliminar className="h-4 w-4" aria-hidden="true" /> A la papelera</button>
              </div>
            </div>
          )}

          {cargando ? (
            <div className="flex justify-center py-12" role="status" aria-label="Cargando productos"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
          ) : visibles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
              <p className="font-semibold text-ink">{productos.length === 0 ? 'Todavía no hay productos' : 'Ningún producto con estos filtros'}</p>
              {productos.length === 0
                ? <Link href="/admin/products/new" className={`${adminPrimaryButton} mt-4`}><IconoMas className="h-4 w-4" aria-hidden="true" /> Nuevo producto</Link>
                : <button type="button" onClick={limpiarFiltros} className={`${adminSecondaryButton} mt-4`}>Quitar filtros</button>}
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
                onEstado={(p) => void cambiarEstado(p)}
                onDestacar={(p) => void destacar(p)}
                onEliminar={eliminar}
                duplicando={duplicando}
                editando={editando}
              />
            </>
          )}
        </>
      )}

      {vista && <VistaRapida p={vista} tasaVES={tasaVES} onClose={() => setVista(null)} onEstado={(p) => void cambiarEstado(p)} />}
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
