'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiArrowDownLeft, FiArrowUpRight, FiChevronRight, FiClock, FiDollarSign, FiInfo, FiPlus, FiRefreshCw, FiShoppingBag, FiSlash, FiXCircle } from 'react-icons/fi';
import RechargeModal from '@/components/modals/RechargeModalV2';
import { formatUSD } from '@/lib/currency';
import { useTiempoReal } from '@/lib/realtime/hooks';
import { useMontado } from '@/lib/hooks/useMontado';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import type { EstadoMovimiento, MovimientoDTO } from '@/lib/dto/movimiento';

// Puntos ES (C-139). Una sola maqueta para teléfono y escritorio (antes había dos, duplicadas, que mostraban 10 y 5
// movimientos y nada más). Ahora: historial completo con "Cargar más", recargas por confirmar y rechazadas claras
// (con el motivo y sin sumarlas en verde), enlace al pedido en cada compra o devolución y "Cómo funcionan".
// Se conserva todo lo de antes: Puntos ES disponibles, recargado, usado, los filtros, "Recargar", ?recargar=1 y el
// tiempo real (C-127).

interface Resumen {
  puntos: number;
  recargado: number;
  usado: number;
  porConfirmar: { cantidad: number; monto: number };
}

const FILTROS = [
  { id: '', label: 'Todos', vacio: 'Todavía no tienes movimientos.' },
  { id: 'RECHARGE', label: 'Recargas', vacio: 'No tienes recargas.' },
  { id: 'PURCHASE', label: 'Compras', vacio: 'No tienes compras con Puntos ES.' },
  { id: 'REFUND', label: 'Devoluciones', vacio: 'No tienes devoluciones.' },
  { id: 'DEPOSIT', label: 'Abonos', vacio: 'No tienes abonos (gift cards, comisiones o ajustes de la tienda).' },
] as const;
type Filtro = (typeof FILTROS)[number]['id'];

const ESTADOS: Record<Exclude<EstadoMovimiento, 'COMPLETADO'>, { texto: string; clase: string }> = {
  POR_CONFIRMAR: { texto: 'Por confirmar', clase: 'bg-warning/15 text-warning-strong' },
  RECHAZADO: { texto: 'Rechazada', clase: 'bg-deal-bg text-deal' },
  NO_COMPLETADO: { texto: 'No completada', clase: 'bg-surface text-ink-soft' },
};

const fecha = (iso: string) => new Date(iso).toLocaleString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function Movimiento({ m }: { m: MovimientoDTO }) {
  const hecho = m.estado === 'COMPLETADO';
  const Icono = m.estado === 'POR_CONFIRMAR' ? FiClock : m.estado === 'RECHAZADO' ? FiXCircle : m.estado === 'NO_COMPLETADO' ? FiSlash : m.entra ? FiArrowDownLeft : FiArrowUpRight;
  const color = !hecho ? 'bg-surface text-muted' : m.entra ? 'bg-success-strong/10 text-success-strong' : 'bg-brand-50 text-brand-600';
  return (
    <li className="flex gap-3 px-4 py-3">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`} aria-hidden="true">
        <Icono className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 break-words text-sm font-semibold text-ink">{m.descripcion}</p>
          {/* Solo lo completado suma o resta: una recarga por confirmar o rechazada no se pinta como Puntos ES ganados */}
          <p className={`shrink-0 text-sm font-bold ${!hecho ? 'text-muted' : m.entra ? 'text-success-strong' : 'text-ink'} ${m.estado === 'RECHAZADO' || m.estado === 'NO_COMPLETADO' ? 'line-through' : ''}`}>
            {hecho ? (m.entra ? '+' : '-') : ''}{formatUSD(m.monto)}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {fecha(m.fecha)}
          {m.metodo && <> · {m.metodo}</>}
          {m.referencia && <> · Ref. {m.referencia}</>}
        </p>
        {m.estado !== 'COMPLETADO' && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${ESTADOS[m.estado].clase}`}>{ESTADOS[m.estado].texto}</span>
            {m.estado === 'POR_CONFIRMAR' && <span>La tienda está confirmando tu pago. Te avisamos cuando tus Puntos ES estén disponibles.</span>}
            {m.estado === 'RECHAZADO' && <span>{m.motivo ? <>Motivo: {m.motivo}</> : 'No pudimos confirmar este pago. Escríbenos si crees que es un error.'}</span>}
            {m.estado === 'NO_COMPLETADO' && <span>Cerraste la recarga antes de terminarla. No se sumó nada.</span>}
          </p>
        )}
        {m.pedido && (
          <Link href={`/customer/orders?orden=${m.pedido.id}`} className="mt-1.5 inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
            Ver el pedido {m.pedido.numero}
            <FiChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </li>
  );
}

export default function BalancePage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoDTO[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('');
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);
  const [recargar, setRecargar] = useState(false);
  const montado = useMontado();
  // Cambiar de filtro con una carga en camino: solo vale la respuesta del último pedido
  const pedido = useRef(0);

  /** Primera página del filtro: trae también el resumen. `silencioso` no borra la lista mientras llega (tiempo real). */
  async function cargar(tipo: Filtro, silencioso = false) {
    const turno = ++pedido.current;
    if (!silencioso) setCargando(true);
    try {
      const res = await fetch(`/api/customer/transactions${tipo ? `?tipo=${tipo}` : ''}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const datos = await res.json();
      if (turno !== pedido.current) return;
      setResumen(datos.resumen);
      setMovimientos(datos.movimientos);
      setSiguiente(datos.siguiente);
      setError(false);
    } catch {
      if (turno !== pedido.current) return;
      setError(true);
      if (!silencioso) toast.error('No se pudieron cargar tus Puntos ES');
    } finally {
      if (turno === pedido.current) setCargando(false);
    }
  }

  async function cargarMas() {
    if (!siguiente || cargandoMas) return;
    const turno = pedido.current;
    setCargandoMas(true);
    try {
      const res = await fetch(`/api/customer/transactions?cursor=${siguiente}${filtro ? `&tipo=${filtro}` : ''}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const datos = await res.json();
      if (turno !== pedido.current) return;
      // Sin repetidos: si entró un movimiento nuevo mientras tanto, las páginas se corren
      setMovimientos((antes) => [...antes, ...(datos.movimientos as MovimientoDTO[]).filter((m) => !antes.some((a) => a.id === m.id))]);
      setSiguiente(datos.siguiente);
    } catch {
      toast.error('No se pudieron cargar más movimientos');
    } finally {
      setCargandoMas(false);
    }
  }

  useCargarAlMontar(() => cargar(filtro), [filtro]);

  // C-128: "Recargar" del inicio llega con ?recargar=1 y abre el modal directo
  useCargarAlMontar(() => {
    if (new URLSearchParams(window.location.search).get('recargar') === '1') setRecargar(true);
  });

  // C-127: cuando el equipo aprueba o rechaza una recarga (o el banco la confirma), la página se actualiza sola
  useTiempoReal((evento) => {
    if (evento.tipo !== 'payment:verified' || evento.contexto !== 'RECHARGE') return;
    if (evento.transactionId && !recargar) toast.success(evento.aprobado ? 'Tu recarga fue aprobada: tus Puntos ES ya están disponibles.' : 'Tu recarga fue rechazada. Revisa el motivo en tus movimientos.');
    void cargar(filtro, true);
  }, { onReconectar: () => void cargar(filtro, true) });

  const actual = FILTROS.find((f) => f.id === filtro) ?? FILTROS[0];
  const pendientes = resumen?.porConfirmar.cantidad ?? 0;

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <header className="rounded-2xl bg-brand-600 p-4 text-white lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-sm font-semibold text-white/80">
              <FiDollarSign className="h-4 w-4" aria-hidden="true" />
              Puntos ES disponibles
            </h1>
            {resumen ? (
              <p className="mt-1 text-4xl font-bold tracking-tight">
                {formatUSD(resumen.puntos)} <span className="text-base font-semibold text-white/80">Puntos ES</span>
              </p>
            ) : (
              <div className="mt-2 h-10 w-44 animate-pulse rounded-lg bg-white/20" role="status" aria-label="Cargando" />
            )}
            <p className="mt-2 text-sm text-white/80">
              {resumen ? <>Recargado {formatUSD(resumen.recargado)} · Usado {formatUSD(resumen.usado)}</> : 'Tus Puntos ES para comprar en la tienda.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/productos" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/40 px-5 text-sm font-semibold text-white hover:bg-white/10">
              <FiShoppingBag className="h-4 w-4" aria-hidden="true" />
              Ir a la tienda
            </Link>
            <button type="button" onClick={() => setRecargar(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-brand-700 hover:bg-surface">
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Recargar Puntos ES
            </button>
          </div>
        </div>
      </header>

      {pendientes > 0 && resumen && (
        <p className="flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-strong" role="status">
          <FiClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>{pendientes === 1 ? 'Tienes 1 recarga por confirmar' : `Tienes ${pendientes} recargas por confirmar`}</strong> ({formatUSD(resumen.porConfirmar.monto)}).
            {' '}Todavía no están en tus Puntos ES: la tienda confirma el pago y te avisa.
          </span>
        </p>
      )}

      <section aria-labelledby="titulo-movimientos">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="titulo-movimientos" className="text-base font-bold text-ink">Movimientos</h2>
          <button
            type="button"
            onClick={() => void cargar(filtro)}
            disabled={cargando}
            aria-label="Actualizar movimientos"
            title="Actualizar"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-soft hover:bg-surface disabled:opacity-50"
          >
            <FiRefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold ${filtro === f.id ? 'bg-brand-500 text-white' : 'border border-line bg-white text-ink-soft hover:bg-surface'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {cargando ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white" aria-label="Cargando movimientos">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="flex animate-pulse items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 rounded-xl bg-surface" />
                <div className="flex-1"><div className="mb-2 h-3 w-40 max-w-full rounded-full bg-line" /><div className="h-2.5 w-24 rounded-full bg-surface" /></div>
                <div className="h-4 w-14 rounded-full bg-line" />
              </li>
            ))}
          </ul>
        ) : error && movimientos.length === 0 ? (
          <div className="rounded-2xl border border-deal/30 bg-deal-bg p-4 text-sm text-deal" role="alert">
            No pudimos cargar tus movimientos.{' '}
            <button type="button" onClick={() => void cargar(filtro)} className="font-semibold underline">Intentar de nuevo</button>
          </div>
        ) : movimientos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center">
            <FiDollarSign className="mx-auto h-10 w-10 text-subtle" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-ink">{actual.vacio}</p>
            {filtro === '' && (
              <>
                <p className="mt-1 text-sm text-muted">Recarga Puntos ES y paga tus compras sin esperar la confirmación de cada pago.</p>
                <button type="button" onClick={() => setRecargar(true)} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white hover:bg-brand-600">
                  <FiPlus className="h-4 w-4" aria-hidden="true" />
                  Recargar Puntos ES
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {movimientos.map((m) => <Movimiento key={m.id} m={m} />)}
            </ul>
            {siguiente ? (
              <button type="button" onClick={cargarMas} disabled={cargandoMas} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-line bg-white text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50">
                {cargandoMas ? 'Cargando…' : 'Cargar más'}
              </button>
            ) : (
              movimientos.length > 5 && <p className="mt-3 text-center text-xs text-muted">Ese es todo tu historial.</p>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-4 lg:p-5" aria-labelledby="titulo-como">
        <h2 id="titulo-como" className="flex items-center gap-2 text-base font-bold text-ink">
          <FiInfo className="h-4 w-4 text-brand-600" aria-hidden="true" />
          Cómo funcionan los Puntos ES
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">
          <li><strong className="text-ink">1 Punto ES paga 1 dólar de compras.</strong> Por eso se escriben con el signo de dólar: &quot;$12,50 Puntos ES&quot;.</li>
          <li><strong className="text-ink">Se recargan</strong> con los métodos de pago de la tienda. Quedan disponibles cuando confirmamos tu pago.</li>
          <li><strong className="text-ink">También llegan</strong> al canjear una gift card y cuando la tienda te devuelve una compra: un pedido cancelado, una garantía o un pago hecho de más.</li>
          <li><strong className="text-ink">Sirven solo para comprar en Electro Shop.</strong> No se cambian por dinero ni se pasan a otra persona.</li>
          <li><strong className="text-ink">No son reembolsables.</strong> Si cierras tu cuenta, los Puntos ES que te queden se pierden: úsalos antes en productos de la tienda.</li>
        </ul>
        <Link href="/customer/documentos" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Términos y condiciones de los Puntos ES
          <FiChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      {montado && createPortal(
        <RechargeModal isOpen={recargar} onClose={() => setRecargar(false)} onSuccess={() => void cargar(filtro, true)} />,
        document.body,
      )}
    </div>
  );
}
