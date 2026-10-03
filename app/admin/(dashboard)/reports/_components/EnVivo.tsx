'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiActivity, FiMonitor, FiShoppingCart, FiSmartphone, FiTablet, FiUser, FiUsers } from 'react-icons/fi';
import { adminBadge } from '@/lib/admin-ui';
import { formatUSD } from '@/lib/currency';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useTiempoReal } from '@/lib/realtime/hooks';
import type { ResumenVisitantes } from '@/lib/visitantes';

// C-173: Reportes en vivo. Arriba de todo: cuántas personas están conectadas a la tienda ahora, cuántas con cuenta y cuántas sin ella,
// qué miran, de dónde llegaron y quién es cada una; y lo cobrado hoy. Los visitantes se piden cada 5 s mientras la pestaña está a la
// vista (salen de la memoria del servidor: no pesan); lo cobrado, cada vez que entra una orden o se confirma un pago (canal en vivo).

interface Hoy {
  hoyUSD: number;
  hoyOrdenes: number;
  mesUSD: number;
  mesOrdenes: number;
  pagosPorConfirmar: number;
}

type Filtro = 'todos' | 'cliente' | 'visitante';

const REFRESCO_MS = 5_000;
const ICONO_DISPOSITIVO = { desktop: FiMonitor, mobile: FiSmartphone, tablet: FiTablet } as const;
const NOMBRE_DISPOSITIVO = { desktop: 'Computadora', mobile: 'Teléfono', tablet: 'Tableta' } as const;
const hora = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', hour: 'numeric', minute: '2-digit', second: '2-digit' });

function hace(segundos: number): string {
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

function Cifra({ titulo, valor, detalle, icono: Icono }: { titulo: string; valor: number | string; detalle?: string; icono: typeof FiUsers }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted"><Icono className="h-3.5 w-3.5" aria-hidden="true" />{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{valor}</p>
      {detalle && <p className="text-xs text-muted">{detalle}</p>}
    </div>
  );
}

function Barras({ titulo, filas, vacio }: { titulo: string; filas: Array<{ nombre: string; cantidad: number }>; vacio: string }) {
  const maximo = Math.max(1, ...filas.map((f) => f.cantidad));
  return (
    <div className="min-w-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{titulo}</h3>
      {filas.length === 0 ? <p className="mt-2 text-sm text-muted">{vacio}</p> : (
        <ul className="mt-2 space-y-1.5">
          {filas.slice(0, 5).map((f) => (
            <li key={f.nombre} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-ink-soft">{f.nombre}</span>
                <span className="font-semibold tabular-nums text-ink">{f.cantidad}</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${(f.cantidad / maximo) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function EnVivo() {
  const [datos, setDatos] = useState<ResumenVisitantes | null>(null);
  const [hoy, setHoy] = useState<Hoy | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [fallo, setFallo] = useState(false);
  const temporizadorHoy = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cargarVisitantes = useCallback(async () => {
    const res = await fetch('/api/admin/visitantes', { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) { setFallo(true); return; }
    setFallo(false);
    setDatos((await res.json().catch(() => null)) as ResumenVisitantes | null);
  }, []);
  const cargarHoy = useCallback(async () => {
    const res = await fetch('/api/admin/hoy', { cache: 'no-store' }).catch(() => null);
    if (res?.ok) setHoy((await res.json().catch(() => null)) as Hoy | null);
  }, []);

  useCargarAlMontar(() => Promise.all([cargarVisitantes(), cargarHoy()]));
  useEffect(() => {
    const cada = setInterval(() => { if (document.visibilityState === 'visible') void cargarVisitantes(); }, REFRESCO_MS);
    // Al volver a la pestaña se pone al día al instante
    const alVolver = () => { if (document.visibilityState === 'visible') { void cargarVisitantes(); void cargarHoy(); } };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(cada); document.removeEventListener('visibilitychange', alVolver); };
  }, [cargarVisitantes, cargarHoy]);
  // Una orden nueva o un pago confirmado actualizan "Hoy" en 1,5 s (varios seguidos cuentan como uno)
  const estado = useTiempoReal((evento) => {
    if (evento.tipo !== 'order:status_updated' && evento.tipo !== 'payment:verified') return;
    if (temporizadorHoy.current) clearTimeout(temporizadorHoy.current);
    temporizadorHoy.current = setTimeout(() => void cargarHoy(), 1500);
  }, { onReconectar: () => { void cargarHoy(); } });

  const lista = (datos?.lista ?? []).filter((p) => filtro === 'todos' || p.tipo === filtro);
  const total = datos?.total ?? 0;
  const pctCuenta = total > 0 ? Math.round(((datos?.conCuenta ?? 0) / total) * 100) : 0;

  return (
    <section aria-labelledby="envivo-titulo" className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3">
        <span className="relative flex h-3 w-3" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
        </span>
        <h2 id="envivo-titulo" className="text-base font-semibold text-ink">En vivo</h2>
        <p className="text-xs text-muted">
          {fallo ? 'No se pudo actualizar. Reintentando…' : datos ? `Actualizado a las ${hora.format(new Date(datos.ahora))}` : 'Cargando…'}
          {estado === 'conectado' ? ' · conexión en vivo' : ''}
        </p>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Cifra titulo="Conectados ahora" valor={datos ? total : '…'} detalle="en la tienda" icono={FiActivity} />
          <Cifra titulo="Con cuenta" valor={datos ? datos.conCuenta : '…'} detalle="clientes que iniciaron sesión" icono={FiUser} />
          <Cifra titulo="Sin cuenta" valor={datos ? datos.sinCuenta : '…'} detalle="visitantes" icono={FiUsers} />
          <Cifra titulo="Con productos en el carrito" valor={datos ? datos.conCarrito : '…'} detalle="listos para comprar" icono={FiShoppingCart} />
        </div>

        {total > 0 && (
          <div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div className="bg-brand-500 transition-[width] duration-500" style={{ width: `${pctCuenta}%` }} />
              <div className="bg-subtle transition-[width] duration-500" style={{ width: `${100 - pctCuenta}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">{pctCuenta} % con cuenta · {100 - pctCuenta} % sin cuenta</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Barras titulo="Qué están mirando" filas={(datos?.paginas ?? []).map((p) => ({ nombre: p.pagina, cantidad: p.cantidad }))} vacio="Nadie en la tienda ahora." />
          <Barras titulo="De dónde llegaron" filas={(datos?.origenes ?? []).map((o) => ({ nombre: o.origen, cantidad: o.cantidad }))} vacio="Sin visitas ahora." />
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Desde qué equipo</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {(['desktop', 'mobile', 'tablet'] as const).map((d) => {
                const Icono = ICONO_DISPOSITIVO[d];
                return (
                  <li key={d} className="flex items-center justify-between gap-2 text-ink-soft">
                    <span className="inline-flex items-center gap-2"><Icono className="h-4 w-4 text-muted" aria-hidden="true" />{NOMBRE_DISPOSITIVO[d]}</span>
                    <span className="font-semibold tabular-nums text-ink">{datos?.dispositivos[d] ?? 0}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {hoy && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-brand-50 p-3 text-sm lg:grid-cols-4" aria-label="Cobrado hoy">
            <div><dt className="text-xs text-brand-700">Cobrado hoy</dt><dd className="font-bold tabular-nums text-ink">{formatUSD(hoy.hoyUSD)} <span className="text-xs font-normal text-muted">· {hoy.hoyOrdenes} {hoy.hoyOrdenes === 1 ? 'orden' : 'órdenes'}</span></dd></div>
            <div><dt className="text-xs text-brand-700">Este mes</dt><dd className="font-bold tabular-nums text-ink">{formatUSD(hoy.mesUSD)} <span className="text-xs font-normal text-muted">· {hoy.mesOrdenes} {hoy.mesOrdenes === 1 ? 'orden' : 'órdenes'}</span></dd></div>
            <div>
              <dt className="text-xs text-brand-700">Pagos por confirmar</dt>
              <dd className="font-bold tabular-nums text-ink">
                {hoy.pagosPorConfirmar > 0 ? <Link href="/admin/orders" className="text-brand-600 hover:text-brand-700">{hoy.pagosPorConfirmar} ver órdenes</Link> : '0'}
              </dd>
            </div>
            <div><dt className="text-xs text-brand-700">Se actualiza solo</dt><dd className="text-xs text-muted">con cada orden o pago nuevo</dd></div>
          </dl>
        )}

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">Quién está conectado</h3>
            <div className="flex gap-1" role="group" aria-label="Filtrar conectados">
              {([['todos', 'Todos'], ['cliente', 'Con cuenta'], ['visitante', 'Sin cuenta']] as const).map(([valor, texto]) => (
                <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${filtro === valor ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink-soft hover:bg-surface'}`}>
                  {texto}
                </button>
              ))}
            </div>
          </div>
          {lista.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{total === 0 ? 'No hay nadie en la tienda ahora mismo.' : 'Nadie con este filtro.'}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {lista.map((p, i) => {
                const Icono = ICONO_DISPOSITIVO[p.dispositivo];
                return (
                  <li key={`${p.tipo}-${p.etiqueta}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm animate-fadeIn">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${p.tipo === 'cliente' ? 'bg-brand-500 text-white' : 'bg-surface text-muted'}`} aria-hidden="true">
                      {p.tipo === 'cliente' ? p.etiqueta[0]?.toUpperCase() : <FiUser className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1 basis-40">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-ink">{p.etiqueta}</span>
                        <span className={adminBadge(p.tipo === 'cliente' ? 'brand' : 'neutral')}>{p.tipo === 'cliente' ? 'Con cuenta' : 'Sin cuenta'}</span>
                        {p.carrito > 0 && <span className={adminBadge('success')}><FiShoppingCart className="h-3 w-3" aria-hidden="true" />{p.carrito} en el carrito</span>}
                      </span>
                      <span className="block truncate text-xs text-muted">{p.pagina}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-ink-soft"><Icono className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">{NOMBRE_DISPOSITIVO[p.dispositivo]}</span></span>
                    <span className="text-xs text-muted">{p.origen}</span>
                    <span className="w-16 text-right text-xs tabular-nums text-muted">hace {hace(p.segundos)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {datos && datos.total > datos.lista.length && <p className="mt-1 text-xs text-muted">Se muestran los {datos.lista.length} más recientes de {datos.total}.</p>}
        </div>
      </div>
    </section>
  );
}
