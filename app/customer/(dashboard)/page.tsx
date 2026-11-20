'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import {
  IconoChevronDerecha, IconoCuenta, IconoEnVivo, IconoEntrar, IconoEnvio, IconoFavoritos, IconoFlechaAbajo,
  IconoFlechaArriba, IconoGarantia, IconoInfo, IconoMas, IconoOferta, IconoPaquete, IconoRechazado, IconoTarjeta,
} from '@/components/iconos';
import CustomerOnboarding from '@/components/customer/CustomerOnboarding';
import PreguntarPromociones from '@/components/promociones/PreguntarPromociones';
import TarjetaSorteo, { conPiezaDelSorteo, type DatosSorteoCliente } from '@/components/sorteo/TarjetaSorteo';
import OrderStepper from '@/components/customer/OrderStepper';
import { formatUSD } from '@/lib/currency';
import { adminBadge, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { estadoParaCliente, lineaDeSalida, pasosPedido } from '@/lib/order-pasos';
import { calendarioDe } from '@/lib/horarios';
import { useSettings } from '@/contexts/SettingsContext';
import { useDelNavegador } from '@/lib/hooks/useMontado';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useTiempoReal } from '@/lib/realtime/hooks';

// C-128: inicio de la cuenta del cliente. Arriba lo que más se consulta (saldo, compras activas, garantías), después
// los pedidos en curso con su avance paso a paso, y al final el historial. Antes: un banner con contadores sin
// etiqueta (12, 1, 1), tarjetas dentro de tarjetas y el avance de un pedido solo dentro de "Mis pedidos".
// C-265 (la A que eligió el equipo): los pedidos en curso en dos columnas en la computadora, con sus fotos; "Pedidos
// anteriores" en lugar de "Últimos pedidos" (repetía los de arriba); y una sola pieza fuerte: los boletos mientras dura el
// sorteo (Puntos ES en blanco), Puntos ES en el azul oscuro del logo cuando no hay boletos.

interface RecentOrder {
  items?: Array<{ productName: string; productImage: string | null; quantity: number }>;
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  paymentReference?: boolean;
  itemCount: number;
  total: number;
  createdAt: string;
}

interface ActiveOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  deliveryMethod: string | null;
  shippingCarrier: string | null;
  shippingMode: string | null;
  courierOfficeName: string | null;
  trackingNumber: string | null;
  total: number;
  createdAt: string;
  itemCount: number;
  firstItem: string | null;
  /** C-265: hasta 4 fotos, como en Mis pedidos */
  fotos?: Array<{ nombre: string; foto: string | null; cantidad: number }>;
  productos?: number;
  enOficina: boolean;
  paidAt?: string | null;
  dispatchCityName?: string | null;
  dispatchStateName?: string | null;
  paymentReference?: boolean;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  amount?: number | null;
}

interface DashboardStats {
  balance: number;
  totalRecharges: number;
  totalSpent: number;
  orders: number;
  pending: number;
  porPagar?: number;
  wishlist: number;
  tieneDireccion?: boolean;
  datosCompletos?: boolean;
  totalSpentThisMonth: number;
  totalPurchased: number;
  previousOrders: RecentOrder[];
  recentActivity: RecentActivity[];
  activeCount: number;
  activeOrders: ActiveOrder[];
  warranties: { active: number; nextExpiry: string | null; openClaims: number; waitingCustomer?: number };
}

const fechaCorta = new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', timeZone: 'America/Caracas' });

function Foto({ src, nombre, cantidad, chica = false }: { src: string | null | undefined; nombre: string; cantidad?: number; chica?: boolean }) {
  return (
    <span className={`relative shrink-0 overflow-hidden rounded-lg border border-line bg-white ${chica ? 'h-10 w-10' : 'h-12 w-12'}`} title={nombre}>
      {src ? <Image src={src} alt={nombre} fill sizes="48px" className="object-contain" /> : <span className="flex h-full items-center justify-center text-subtle"><IconoPaquete className="h-5 w-5" aria-hidden="true" /></span>}
      {(cantidad ?? 1) > 1 && <span className="absolute bottom-0 right-0 rounded-tl-md bg-ink/80 px-1 text-[11px] font-semibold text-white">×{cantidad}</span>}
    </span>
  );
}

/** C-265: un pedido en curso, como la tarjeta de Mis pedidos (fotos, número y producto, estado y monto, el paso a paso) */
function TarjetaEnCurso({ orden, salida }: { orden: ActiveOrder; salida: string | null }) {
  const { pasos, nota } = pasosPedido(orden);
  const estado = estadoParaCliente({ status: orden.status, paymentStatus: orden.paymentStatus, paymentReference: orden.paymentReference ? 'si' : null, deliveryMethod: orden.deliveryMethod });
  const fotos = orden.fotos ?? [];
  return (
    <Link href={`/customer/orders?orden=${orden.id}`} className="flex h-full flex-col rounded-2xl border border-line bg-white p-3 transition-colors hover:border-brand-200 sm:p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <span className="col-start-1 row-start-2 flex gap-1.5 sm:row-span-2 sm:row-start-1" aria-hidden={fotos.length === 0}>
          {fotos.map((f, i) => <Foto key={i} src={f.foto} nombre={f.nombre} cantidad={f.cantidad} />)}
          {(orden.productos ?? 0) > fotos.length && <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-xs font-semibold text-ink-soft">+{(orden.productos ?? 0) - fotos.length}</span>}
        </span>
        <span className="col-start-1 row-start-1 min-w-0 sm:col-start-2">
          <span className="block font-mono text-sm font-bold text-ink">#{orden.orderNumber}</span>
          <span className="block text-xs text-muted">{fechaCorta.format(new Date(orden.createdAt))} · {orden.itemCount} {orden.itemCount === 1 ? 'producto' : 'productos'}</span>
          <span className="mt-0.5 block truncate text-sm text-ink-soft">{orden.firstItem ?? 'Pedido'}{(orden.productos ?? 1) > 1 ? ` y ${(orden.productos ?? 1) - 1} más` : ''}</span>
        </span>
        <span className="col-start-2 row-start-1 justify-self-end sm:col-start-3"><span className={adminBadge(estado.tono)}>{estado.label}</span></span>
        <span className="col-start-2 row-start-2 self-end justify-self-end text-lg font-bold tabular-nums text-ink sm:col-start-3 sm:self-start">{formatUSD(orden.total)}</span>
      </div>
      <div className="mt-4">
        <OrderStepper pasos={pasos} />
      </div>
      {(nota || salida) && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface px-3 py-2 text-sm text-ink-soft">
          <IconoInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <span>
            {nota}
            {orden.trackingNumber && orden.status === 'SHIPPED' ? ` · Guía ${orden.trackingNumber}` : ''}
            {salida && <span className="block font-semibold text-brand-700">{salida}</span>}
          </span>
        </p>
      )}
    </Link>
  );
}

/**
 * C-251: el mismo estado que Mis pedidos ("Por pagar", "Verificando pago", "En preparación"). Antes eran los nombres del
 * panel ("Pendiente", "Pagada"): la misma orden se llamaba distinto en el inicio y en Mis pedidos.
 */
function SelloPedido({ pedido }: { pedido: RecentOrder }) {
  const estado = estadoParaCliente({ status: pedido.status, paymentStatus: pedido.paymentStatus, paymentReference: pedido.paymentReference ? 'si' : null });
  return (
    <span className={adminBadge(estado.tono)}>
      {pedido.status === 'CANCELLED' && <IconoRechazado className="h-3 w-3" aria-hidden="true" />}
      {estado.label}
    </span>
  );
}

function Movimiento({ actividad }: { actividad: RecentActivity }) {
  const entra = actividad.type === 'RECHARGE' || actividad.type === 'DEPOSIT' || actividad.type === 'REFUND';
  const sale = actividad.type === 'PURCHASE';
  const Icono = actividad.type === 'LOGIN' ? IconoEntrar : actividad.type === 'ORDER' ? IconoPaquete : actividad.type === 'ACCOUNT' ? IconoCuenta : entra ? IconoFlechaArriba : sale ? IconoFlechaAbajo : IconoEnVivo;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${entra ? 'bg-success-strong/10 text-success-strong' : sale ? 'bg-deal-bg text-deal' : 'bg-brand-50 text-brand-600'}`}>
        <Icono className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">{actividad.description}</span>
        <span className="block text-xs text-muted">{fechaCorta.format(new Date(actividad.createdAt))}</span>
      </span>
      {typeof actividad.amount === 'number' && actividad.amount > 0 && (
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${entra ? 'text-success-strong' : sale ? 'text-deal' : 'text-ink'}`}>
          {entra ? '+' : sale ? '−' : ''}{formatUSD(actividad.amount)}
        </span>
      )}
    </li>
  );
}

export default function CustomerDashboard() {
  const { data: session } = useSession();
  const { settings: ajustes } = useSettings();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sorteo, setSorteo] = useState<DatosSorteoCliente | null>(null);
  const [loading, setLoading] = useState(true);
  // Saludo según la hora del navegador (en el HTML del servidor, "Hola"): C-111
  const greeting = useDelNavegador(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  }, 'Hola');

  async function fetchDashboardData() {
    try {
      const response = await fetch('/api/customer/dashboard');
      if (response.ok) setStats(await response.json());
    } catch {
      toast.error('No se pudieron cargar los datos del panel');
    } finally {
      setLoading(false);
    }
  }

  async function fetchTodo() {
    // C-265: el sorteo, junto con el resto: de él depende si Puntos ES va en blanco o en el azul oscuro (sin parpadeo)
    const sorteoPedido = fetch('/api/customer/sorteo').then((r) => (r.ok ? r.json() : null)).catch(() => null);
    try {
      const [response, datosSorteo] = await Promise.all([fetch('/api/customer/dashboard'), sorteoPedido]);
      if (response.ok) setStats(await response.json());
      setSorteo(datosSorteo);
    } catch {
      toast.error('No se pudieron cargar los datos del panel');
    } finally {
      setLoading(false);
    }
  }

  useCargarAlMontar(() => {
    void fetchTodo();
  }, []);

  // C-127: el avance de los pedidos y los Puntos ES se actualizan solos
  useTiempoReal((evento) => {
    if (evento.tipo === 'order:status_updated' || evento.tipo === 'payment:verified') void fetchDashboardData();
  }, { onReconectar: () => void fetchDashboardData(), respaldoMs: 120_000 });

  const nombre = session?.user?.name?.split(' ')[0] || 'Cliente';

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Cargando tu cuenta">
        <div className="h-16 w-48 animate-pulse rounded-xl bg-line" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-line" />)}
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-line" />
      </div>
    );
  }

  const activos = stats?.activeOrders ?? [];
  const garantias = stats?.warranties ?? { active: 0, nextExpiry: null, openClaims: 0 };
  const esperanRespuesta = garantias.waitingCustomer ?? 0;
  // C-251: "Por pagar" y "por validar" por separado (antes los dos decían "con el pago por validar")
  const porPagar = stats?.porPagar ?? 0;
  const porValidar = stats?.pending ?? 0;
  const lineaCompras = [porPagar > 0 && `${porPagar} por pagar`, porValidar > 0 && `${porValidar} con el pago por validar`].filter(Boolean).join(' · ');

  // C-265 (decisión del equipo): una sola pieza fuerte. Con los boletos del sorteo a la vista, ellos; Puntos ES va en blanco.
  // C-302: también con el boleto de muestra que invita a ganarlos, mientras el sorteo está abierto
  const puntosFuerte = !conPiezaDelSorteo(sorteo);
  const total = stats?.activeCount ?? 0;
  const otros = (cuantos: number) => (total > cuantos ? `Ver los otros ${total - cuantos} pedidos en curso` : null);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* C-265: el saludo en una línea (antes "Buenas noches," arriba y el nombre debajo) */}
      <h1 className="text-2xl font-bold text-ink lg:text-3xl">{greeting}, {nombre}</h1>

      {/* C-212 y C-263: el sorteo vigente, con sus boletos (sin sorteo activo no sale) */}
      <TarjetaSorteo datos={sorteo} />

      {/* Resumen: Puntos ES, compras activas y garantías */}
      <section aria-label="Resumen de tu cuenta" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {puntosFuerte ? (
          <div className="col-span-2 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-4 text-white lg:col-span-1 lg:p-5">
            <p className="flex items-center gap-2 text-sm text-white/80">
              <IconoTarjeta className="h-4 w-4" aria-hidden="true" /> Tus Puntos ES
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{formatUSD(stats?.balance ?? 0)} <span className="text-base font-semibold opacity-80">Puntos ES</span></p>
            <div className="mt-4 flex gap-2">
              <Link href="/customer/balance?recargar=1" className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                <IconoMas className="h-4 w-4" aria-hidden="true" /> Recargar
              </Link>
              <Link href="/customer/balance" className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-white/40 px-4 text-sm font-semibold text-white hover:bg-white/10">
                Movimientos
              </Link>
            </div>
          </div>
        ) : (
          <div className="col-span-2 rounded-2xl border border-line bg-white p-4 lg:col-span-1 lg:p-5">
            <p className="flex items-center gap-2 text-sm text-muted">
              <IconoTarjeta className="h-4 w-4 text-brand-600" aria-hidden="true" /> Tus Puntos ES
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink lg:text-3xl">{formatUSD(stats?.balance ?? 0)} <span className="text-base font-semibold text-muted">Puntos ES</span></p>
            <div className="mt-3 flex gap-2">
              <Link href="/customer/balance?recargar=1" className={`${adminPrimaryButton} flex-1 px-3`}>
                <IconoMas className="h-4 w-4" aria-hidden="true" /> Recargar
              </Link>
              <Link href="/customer/balance" className={`${adminSecondaryButton} flex-1 px-3`}>Movimientos</Link>
            </div>
          </div>
        )}

        <Link href="/customer/orders" className="group rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-200 lg:p-5">
          <p className="flex items-center gap-2 text-sm text-muted">
            <IconoEnvio className="h-4 w-4 text-brand-600" aria-hidden="true" /> Compras activas
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink lg:text-3xl">{total}</p>
          <p className="mt-2 flex items-center justify-between gap-1 text-xs text-ink-soft lg:text-sm">
            {lineaCompras || 'En preparación o en camino'}
            <IconoChevronDerecha className="h-4 w-4 shrink-0 text-muted group-hover:text-brand-600" aria-hidden="true" />
          </p>
        </Link>

        <Link href="/customer/warranty" className="group rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-200 lg:p-5">
          <p className="flex items-center gap-2 text-sm text-muted">
            <IconoGarantia className="h-4 w-4 text-brand-600" aria-hidden="true" /> Garantías vigentes
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink lg:text-3xl">{garantias.active}</p>
          <p className="mt-2 flex items-center justify-between gap-1 text-xs text-ink-soft lg:text-sm">
            {esperanRespuesta > 0
              ? <span className={adminBadge('warning')}>{esperanRespuesta === 1 ? 'Te toca responder' : `Responde ${esperanRespuesta}`}</span>
              : garantias.openClaims > 0
              ? `${garantias.openClaims} ${garantias.openClaims === 1 ? 'solicitud' : 'solicitudes'} en revisión`
              : garantias.nextExpiry ? `La primera vence el ${fechaCorta.format(new Date(garantias.nextExpiry))}` : 'Productos cubiertos por la tienda'}
            <IconoChevronDerecha className="h-4 w-4 shrink-0 text-muted group-hover:text-brand-600" aria-hidden="true" />
          </p>
        </Link>
      </section>

      <CustomerOnboarding stats={stats} />

      {/* C-191: una sola vez, a quien nunca decidió si quiere ofertas por correo */}
      <PreguntarPromociones />

      {/* Pedidos en curso, con su avance. C-265: dos columnas desde 1280 px (4 pedidos); 3 en lo más angosto */}
      <section aria-labelledby="pedidos-en-curso">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="pedidos-en-curso" className="text-lg font-semibold text-ink lg:text-xl">
            Pedidos en curso{total > 0 && <span className="ml-1.5 font-medium text-muted">{total}</span>}
          </h2>
          {total > 0 && (
            <Link href="/customer/orders" className="inline-flex h-11 items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              Ver todos <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        {activos.length > 0 ? (
          <>
            <ul className="grid gap-3 xl:grid-cols-2">
              {activos.slice(0, 4).map((orden, i) => (
                <li key={orden.id} className={i === 3 ? 'hidden xl:block' : undefined}>
                  {/* C-251 (C-234 y C-222): el día que sale y desde dónde, también en el inicio */}
                  <TarjetaEnCurso orden={orden} salida={lineaDeSalida(orden, calendarioDe(ajustes))} />
                </li>
              ))}
            </ul>
            {otros(3) && (
              <Link href="/customer/orders" className={`mt-2 flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-brand-600 hover:bg-brand-50 ${otros(4) ? '' : 'xl:hidden'}`}>
                <span className="xl:hidden">{otros(3)}</span>
                {otros(4) && <span className="hidden xl:inline">{otros(4)}</span>}
              </Link>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-white px-6 py-10 text-center">
            <IconoPaquete className="h-8 w-8 text-subtle" aria-hidden="true" />
            <p className="mt-3 font-semibold text-ink">No tienes pedidos en camino</p>
            <p className="mt-1 text-sm text-muted">Cuando compres, aquí verás cada paso hasta que lo recibas.</p>
            <Link href="/productos" className={`${adminPrimaryButton} mt-4`}>
              <IconoOferta className="h-4 w-4" aria-hidden="true" /> Ver ofertas de hoy
            </Link>
          </div>
        )}
      </section>

      {/* Historial */}
      {/* C-201: min-w-0 en las dos: sin él, a 360 px medían 570 (el texto largo ensanchaba la columna) y se salían */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* C-265: "Pedidos anteriores": los que ya no están en curso (antes "Últimos pedidos" repetía los de arriba) */}
        <section aria-labelledby="pedidos-anteriores" className="min-w-0 rounded-2xl border border-line bg-white p-4 lg:p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 id="pedidos-anteriores" className="font-semibold text-ink">Pedidos anteriores</h2>
            <span className="text-xs text-muted">{stats?.orders ?? 0} en total</span>
          </div>
          {stats?.previousOrders?.length ? (
            <ul className="divide-y divide-line">
              {stats.previousOrders.map((order) => (
                <li key={order.id}>
                  <Link href={`/customer/orders?orden=${order.id}`} className="flex min-h-11 items-center gap-3 py-2.5 hover:text-brand-700">
                    <Foto src={order.items?.[0]?.productImage} nombre={order.items?.[0]?.productName ?? 'Pedido'} chica />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink">#{order.orderNumber}</span>
                        <SelloPedido pedido={order} />
                      </span>
                      <span className="block text-xs text-muted">
                        {order.itemCount} {order.itemCount === 1 ? 'producto' : 'productos'} · {fechaCorta.format(new Date(order.createdAt))}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatUSD(order.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">{(stats?.orders ?? 0) > 0 ? 'Cuando recibas un pedido, aparece aquí.' : 'Todavía no tienes pedidos.'}</p>
          )}
          {(stats?.wishlist ?? 0) > 0 && (
            <Link href="/customer/wishlist" className="mt-2 flex min-h-11 items-center gap-2 border-t border-line pt-3 text-sm font-medium text-brand-600 hover:text-brand-700">
              <IconoFavoritos className="h-4 w-4" aria-hidden="true" /> {stats?.wishlist} en tus favoritos
            </Link>
          )}
        </section>

        {/* C-201: mezcla Puntos ES con inicios de sesión y pedidos: es la actividad de la cuenta, no solo dinero */}
        <section aria-labelledby="movimientos" className="min-w-0 rounded-2xl border border-line bg-white p-4 lg:p-5">
          <h2 id="movimientos" className="mb-1 font-semibold text-ink">Actividad reciente</h2>
          {stats?.recentActivity?.length ? (
            <ul className="divide-y divide-line">
              {stats.recentActivity.slice(0, 4).map((actividad) => <Movimiento key={actividad.id} actividad={actividad} />)}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">Sin movimientos recientes.</p>
          )}
          <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
            <div>
              <dt className="text-xs text-muted">Recargado</dt>
              <dd className="text-sm font-semibold tabular-nums text-ink">{formatUSD(stats?.totalRecharges ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">En compras</dt>
              <dd className="text-sm font-semibold tabular-nums text-ink">{formatUSD(stats?.totalPurchased ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Este mes</dt>
              <dd className="text-sm font-semibold tabular-nums text-ink">{formatUSD(stats?.totalSpentThisMonth ?? 0)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
