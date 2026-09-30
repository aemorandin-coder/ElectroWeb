'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiPackage, FiRefreshCw, FiSearch, FiShoppingBag } from 'react-icons/fi';
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
      const res = await fetch('/api/orders?mine=1');
      if (!res.ok) throw new Error(String(res.status));
      const datos = await res.json();
      const lista = (Array.isArray(datos) ? datos : datos.orders || []).map(normalizar);
      setPedidos(lista);
      setError(false);
      // C-128: desde el inicio del panel se llega con ?orden=<id> y se abre ese pedido
      const pedida = silencioso ? null : new URLSearchParams(window.location.search).get('orden');
      if (pedida && lista.some((p: PedidoCliente) => p.id === pedida)) setAbierto(pedida);
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

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
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
          <FiRefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </header>

      {pedidos.length > 0 && (
        <div className="space-y-2">
          <label className="relative block">
            <span className="sr-only">Buscar por número o producto</span>
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número o producto"
              className="h-11 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar pedidos">
            {FILTROS_PEDIDOS.map((f) => {
              const cuenta = f.id === 'TODOS' ? pedidos.length : pedidos.filter((o) => pasaFiltro(o, f.id)).length;
              if (f.id !== 'TODOS' && cuenta === 0) return null;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filtro === f.id}
                  onClick={() => setFiltro(f.id)}
                  className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold ${filtro === f.id ? 'bg-brand-500 text-white' : 'border border-line bg-white text-ink-soft hover:bg-surface'}`}
                >
                  {f.label} <span className={filtro === f.id ? 'text-white/80' : 'text-muted'}>{cuenta}</span>
                </button>
              );
            })}
          </div>
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
          <FiPackage className="mx-auto h-8 w-8 text-subtle" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-ink">{pedidos.length === 0 ? 'Todavía no tienes pedidos' : 'No hay pedidos con ese filtro'}</p>
          {pedidos.length === 0 ? (
            <Link href="/productos" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">
              <FiShoppingBag className="h-4 w-4" aria-hidden="true" /> Explorar la tienda
            </Link>
          ) : (
            <button type="button" onClick={() => { setFiltro('TODOS'); setBusqueda(''); }} className="mt-3 text-sm font-semibold text-brand-600">Ver todos</button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {visibles.map((p) => (
            <li key={p.id}>
              <PedidoCard pedido={p} onDetalle={() => setAbierto(p.id)} />
            </li>
          ))}
        </ul>
      )}

      {montado && detalle && <DetallePedido pedido={detalle} onCerrar={() => setAbierto(null)} />}
    </div>
  );
}
