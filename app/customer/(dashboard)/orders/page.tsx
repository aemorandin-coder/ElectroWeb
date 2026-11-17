'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { IconoActualizar, IconoBolsa, IconoBuscar, IconoEntregado, IconoEnvio, IconoLista, IconoPaquete, IconoRechazado, IconoTarjeta } from '@/components/iconos';
import Filtros from '@/components/admin/Filtros';
import { formatUSD } from '@/lib/currency';
import { useTiempoReal } from '@/lib/realtime/hooks';
import { useMontado } from '@/lib/hooks/useMontado';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { FILTROS_PEDIDOS, estadoParaCliente, pasaFiltro, type FiltroPedidos } from '@/lib/order-pasos';
import PedidoCard from '@/components/customer/PedidoCard';
import DetallePedido, { type PedidoCliente } from '@/components/customer/DetallePedido';

// Mis pedidos (C-137). Una sola maqueta para teléfono y escritorio (antes había dos, duplicadas) con tarjetas de
// pedido: número, fecha, estado en palabras, fotos de los productos, total en USD y Bs., el paso a paso mientras está
// en curso y las acciones directas (rastrear en ZOOM o MRW, códigos digitales, detalle y recibo).
// Se conserva todo lo de antes: resumen, búsqueda, filtros, actualizar, ?orden=<id> y el tiempo real (C-127).
// C-265 (la A que eligió el equipo): en dos columnas desde 1280 px, agrupados en "En curso" y lo que ya terminó; los
// filtros en una línea y solo cuando separan algo (con 3 entregados, "Todos 3 · Entregados 3" no separaba nada); la
// búsqueda desde 6 pedidos.

type Crudo = Omit<PedidoCliente, 'totalUSD' | 'items'> & {
  totalUSD?: number | string;
  items?: Array<Omit<PedidoCliente['items'][number], 'priceUSD' | 'totalUSD'> & { priceUSD?: number | string; totalUSD?: number | string }>;
};

function normalizar(o: Crudo): PedidoCliente {
  return {
    ...o,
    totalUSD: Number(o.totalUSD) || 0,
    items: (o.items ?? []).map((i) => ({ ...i, priceUSD: Number(i.priceUSD) || 0, totalUSD: Number(i.totalUSD) || 0 })),
  };
}

const AYUDA_FILTRO: Record<FiltroPedidos, { ayuda: string; Icono: typeof IconoLista }> = {
  TODOS: { ayuda: 'Todos tus pedidos', Icono: IconoLista },
  POR_PAGAR: { ayuda: 'Por pagar o por validar', Icono: IconoTarjeta },
  PREPARACION: { ayuda: 'Pagados, sin salir', Icono: IconoPaquete },
  DESPACHADO: { ayuda: 'En camino o por retirar', Icono: IconoEnvio },
  ENTREGADO: { ayuda: 'Ya los tienes', Icono: IconoEntregado },
  CANCELADO: { ayuda: 'Cancelados o devueltos', Icono: IconoRechazado },
};

export default function OrdersPage() {
  const [pedidos, setPedidos] = useState<PedidoCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [filtro, setFiltro] = useState<FiltroPedidos>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const montado = useMontado();

  async function cargar(silencioso = false) {
    if (!silencioso) setCargando(true);
    try {
      // C-251: todos los suyos (`all`). Antes llegaban los 25 más nuevos: "Todos 25" con 29 pedidos, y un pedido viejo no
      // se abría desde Puntos ES (?orden=<id>)
      const res = await fetch('/api/orders?mine=1&all=true');
      if (!res.ok) throw new Error(String(res.status));
      const datos = await res.json();
      const lista = (Array.isArray(datos) ? datos : datos.orders || []).map(normalizar);
      setPedidos(lista);
      setError(false);
      // C-128: desde el inicio del panel se llega con ?orden=<id> y se abre ese pedido. C-281 (F-09): también con su número,
      // que es lo que tiene la confirmación de la compra
      const pedida = silencioso ? null : new URLSearchParams(window.location.search).get('orden');
      const elegido = pedida ? lista.find((p: PedidoCliente) => p.id === pedida || p.orderNumber === pedida) : undefined;
      if (elegido) setAbierto(elegido.id);
    } catch {
      setError(true);
      if (!silencioso) toast.error('No se pudieron cargar tus pedidos');
    } finally {
      setCargando(false);
    }
  }

  useCargarAlMontar(() => { void cargar(); });

  // C-127: cuando el equipo avanza un pedido (o ZOOM lo entrega), la lista y el detalle se actualizan solos
  useTiempoReal((evento) => {
    if (evento.tipo !== 'order:status_updated' || evento.nueva) return;
    const antes = pedidos.find((o) => o.id === evento.orderId);
    if (antes && antes.status !== evento.status) {
      toast.success(`Tu pedido #${evento.orderNumber} ahora está: ${estadoParaCliente({ ...antes, status: evento.status }).label}`);
    }
    void cargar(true);
  }, { onReconectar: () => void cargar(true), respaldoMs: 120_000 });

  const resumen = useMemo(() => ({
    enCurso: pedidos.filter((o) => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status)).length,
    entregados: pedidos.filter((o) => o.status === 'DELIVERED').length,
    productos: pedidos.reduce((s, o) => s + o.items.reduce((t, i) => t + i.quantity, 0), 0),
    comprado: pedidos.reduce((s, o) => (o.status === 'CANCELLED' || o.status === 'REFUNDED' ? s : s + o.totalUSD), 0),
  }), [pedidos]);

  const texto = busqueda.trim().toLowerCase();
  const visibles = pedidos.filter((o) => pasaFiltro(o, filtro)
    && (!texto || o.orderNumber.toLowerCase().includes(texto) || o.items.some((i) => i.productName.toLowerCase().includes(texto))));
  const detalle = abierto ? pedidos.find((o) => o.id === abierto) ?? null : null;
  const opcionesFiltro = FILTROS_PEDIDOS.map((f) => ({
    valor: f.id,
    etiqueta: f.label,
    ayuda: AYUDA_FILTRO[f.id].ayuda,
    Icono: AYUDA_FILTRO[f.id].Icono,
    cuenta: f.id === 'TODOS' ? pedidos.length : pedidos.filter((o) => pasaFiltro(o, f.id)).length,
  })).filter((f) => f.valor === 'TODOS' || f.valor === filtro || (f.cuenta ?? 0) > 0);
  const conFiltros = opcionesFiltro.length > 2 || filtro !== 'TODOS';
  const conBusqueda = pedidos.length >= 6 || busqueda !== '';
  const terminado = (o: PedidoCliente) => ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status);
  // Agrupados solo con "Todos" y sin buscar: con un filtro o una búsqueda, la lista va sola
  const grupos = filtro === 'TODOS' && !texto
    ? [
      { titulo: 'En curso', lista: visibles.filter((o) => !terminado(o)) },
      { titulo: visibles.some((o) => o.status === 'CANCELLED' || o.status === 'REFUNDED') ? (visibles.some((o) => o.status === 'DELIVERED') ? 'Entregados y cancelados' : 'Cancelados') : 'Entregados', lista: visibles.filter(terminado) },
    ].filter((g) => g.lista.length > 0)
    : [{ titulo: null, lista: visibles }];

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-ink lg:text-2xl">Mis pedidos</h1>
          {!cargando && pedidos.length > 0 && (
            <p className="mt-0.5 text-sm text-ink-soft">
              {resumen.enCurso} en curso · {resumen.entregados} {resumen.entregados === 1 ? 'entregado' : 'entregados'} · {resumen.productos} {resumen.productos === 1 ? 'producto' : 'productos'} · {formatUSD(resumen.comprado)} comprados
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void cargar()}
          disabled={cargando}
          aria-label="Actualizar pedidos"
          title="Actualizar"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-soft hover:bg-surface disabled:opacity-50"
        >
          <IconoActualizar className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </header>

      {(conBusqueda || conFiltros) && (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-3">
          {conBusqueda && <label className="relative block lg:w-full lg:max-w-sm">
            <span className="sr-only">Buscar por número o producto</span>
            <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número o producto"
              className="h-11 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>}
          {/* C-251b: en píldoras con su ícono y lo que juntan (PLAN.md §1.7). Las que no tienen pedidos no salen, como antes.
              C-265: en una línea (lo que junta la elegida, debajo) */}
          {conFiltros && <div className="min-w-0 lg:pt-1"><Filtros etiqueta="Filtrar pedidos" valor={filtro} onCambiar={setFiltro} filtros={opcionesFiltro} tamano="chica" /></div>}
        </div>
      )}

      {cargando && pedidos.length === 0 ? (
        <ul className="space-y-3" aria-label="Cargando pedidos">
          {[1, 2, 3].map((i) => (
            <li key={i} className="animate-pulse rounded-2xl border border-line bg-white p-4">
              <div className="flex justify-between"><div className="h-4 w-32 rounded bg-line" /><div className="h-5 w-24 rounded-full bg-surface" /></div>
              <div className="mt-4 flex gap-1.5">{[1, 2, 3].map((j) => <div key={j} className="h-12 w-12 rounded-lg bg-surface" />)}</div>
            </li>
          ))}
        </ul>
      ) : error && pedidos.length === 0 ? (
        <div className="rounded-2xl border border-deal/30 bg-deal-bg p-4 text-sm text-deal">
          No pudimos cargar tus pedidos.{' '}
          <button type="button" onClick={() => void cargar()} className="font-semibold underline">Reintentar</button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-white px-4 py-10 text-center">
          <IconoPaquete className="mx-auto h-8 w-8 text-subtle" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-ink">{pedidos.length === 0 ? 'Todavía no tienes pedidos' : 'No hay pedidos con ese filtro'}</p>
          {pedidos.length === 0 ? (
            <Link href="/productos" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">
              <IconoBolsa className="h-4 w-4" aria-hidden="true" /> Explorar la tienda
            </Link>
          ) : (
            <button type="button" onClick={() => { setFiltro('TODOS'); setBusqueda(''); }} className="mt-3 text-sm font-semibold text-brand-600">Ver todos</button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <section key={g.titulo ?? 'todos'} aria-label={g.titulo ?? undefined}>
              {g.titulo && (
                <h2 className="mb-2 text-base font-semibold text-ink">
                  {g.titulo}<span className="ml-1.5 font-medium text-muted">{g.lista.length}</span>
                </h2>
              )}
              <ul className="grid gap-3 xl:grid-cols-2">
                {g.lista.map((p) => (
                  <li key={p.id}>
                    <PedidoCard pedido={p} onDetalle={() => setAbierto(p.id)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {montado && detalle && <DetallePedido pedido={detalle} onCerrar={() => setAbierto(null)} />}
    </div>
  );
}
