'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import {
  FiActivity, FiArrowDown, FiArrowUp, FiChevronRight, FiCreditCard, FiHeart, FiInfo, FiLogIn, FiPackage, FiPlus,
  FiShield, FiTag, FiTruck, FiUser, FiXCircle,
} from 'react-icons/fi';
import CustomerOnboarding from '@/components/customer/CustomerOnboarding';
import OrderStepper from '@/components/customer/OrderStepper';
import { EnVivo } from '@/components/ui/EnVivo';
import { formatUSD } from '@/lib/currency';
import { adminBadge, adminPrimaryButton, type AdminTone } from '@/lib/admin-ui';
import { ETIQUETA_ESTADO } from '@/lib/order-admin';
import { pasosPedido } from '@/lib/order-pasos';
import { useDelNavegador } from '@/lib/hooks/useMontado';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { useTiempoReal } from '@/lib/realtime/hooks';

// C-128: inicio de la cuenta del cliente. Arriba lo que más se consulta (saldo, compras activas, garantías), después
// los pedidos en curso con su avance paso a paso, y al final el historial. Antes: un banner con contadores sin
// etiqueta (12, 1, 1), tarjetas dentro de tarjetas y el avance de un pedido solo dentro de "Mis pedidos".

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
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
  enOficina: boolean;
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
  wishlist: number;
  tieneDireccion?: boolean;
  datosCompletos?: boolean;
  totalSpentThisMonth: number;
  totalPurchased: number;
  recentOrders: RecentOrder[];
  recentActivity: RecentActivity[];
  activeCount: number;
  activeOrders: ActiveOrder[];
  warranties: { active: number; nextExpiry: string | null; openClaims: number };
}

const fechaCorta = new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', timeZone: 'America/Caracas' });

function tonoEstado(status: string): AdminTone {
  if (status === 'DELIVERED') return 'success';
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'danger';
  if (status === 'PENDING') return 'warning';
  return 'brand';
}

function Movimiento({ actividad }: { actividad: RecentActivity }) {
  const entra = actividad.type === 'RECHARGE' || actividad.type === 'DEPOSIT' || actividad.type === 'REFUND';
  const sale = actividad.type === 'PURCHASE';
  const Icono = actividad.type === 'LOGIN' ? FiLogIn : actividad.type === 'ORDER' ? FiPackage : actividad.type === 'ACCOUNT' ? FiUser : entra ? FiArrowUp : sale ? FiArrowDown : FiActivity;
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
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

  useCargarAlMontar(() => {
    void fetchDashboardData();
  }, []);

  // C-127: el avance de los pedidos y el saldo se actualizan solos
  const enVivo = useTiempoReal((evento) => {
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

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted">{greeting},</p>
          <h1 className="text-2xl font-bold text-ink lg:text-3xl">{nombre}</h1>
        </div>
        <EnVivo estado={enVivo} />
      </header>

      {/* Resumen: saldo, compras activas y garantías */}
      <section aria-label="Resumen de tu cuenta" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white lg:col-span-1">
          <p className="flex items-center gap-2 text-sm text-white/80">
            <FiCreditCard className="h-4 w-4" aria-hidden="true" /> Tu saldo para compras
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{formatUSD(stats?.balance ?? 0)}</p>
          <div className="mt-4 flex gap-2">
            <Link href="/customer/balance?recargar=1" className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              <FiPlus className="h-4 w-4" aria-hidden="true" /> Recargar
            </Link>
            <Link href="/customer/balance" className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-white/40 px-4 text-sm font-semibold text-white hover:bg-white/10">
              Movimientos
            </Link>
          </div>
        </div>

        <Link href="/customer/orders" className="group rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-200 lg:p-5">
          <p className="flex items-center gap-2 text-sm text-muted">
            <FiTruck className="h-4 w-4 text-brand-600" aria-hidden="true" /> Compras activas
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink lg:text-3xl">{stats?.activeCount ?? 0}</p>
          <p className="mt-2 flex items-center justify-between gap-1 text-xs text-ink-soft lg:text-sm">
            {stats?.pending ? `${stats.pending} con el pago por validar` : 'En preparación o en camino'}
            <FiChevronRight className="h-4 w-4 shrink-0 text-muted group-hover:text-brand-600" aria-hidden="true" />
          </p>
        </Link>

        <Link href="/customer/warranty" className="group rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-200 lg:p-5">
          <p className="flex items-center gap-2 text-sm text-muted">
            <FiShield className="h-4 w-4 text-brand-600" aria-hidden="true" /> Garantías vigentes
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink lg:text-3xl">{garantias.active}</p>
          <p className="mt-2 flex items-center justify-between gap-1 text-xs text-ink-soft lg:text-sm">
            {garantias.openClaims > 0
              ? `${garantias.openClaims} ${garantias.openClaims === 1 ? 'solicitud' : 'solicitudes'} en revisión`
              : garantias.nextExpiry ? `La primera vence el ${fechaCorta.format(new Date(garantias.nextExpiry))}` : 'Productos cubiertos por la tienda'}
            <FiChevronRight className="h-4 w-4 shrink-0 text-muted group-hover:text-brand-600" aria-hidden="true" />
          </p>
        </Link>
      </section>

      <CustomerOnboarding stats={stats} />

      {/* Pedidos en curso, con su avance */}
      <section aria-labelledby="pedidos-en-curso">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="pedidos-en-curso" className="text-lg font-semibold text-ink lg:text-xl">Pedidos en curso</h2>
          <Link href="/customer/orders" className="inline-flex h-11 items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            Ver todos <FiChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {activos.length > 0 ? (
          <ul className="space-y-3">
            {activos.slice(0, 3).map((orden) => {
              const { pasos, nota } = pasosPedido(orden);
              return (
                <li key={orden.id}>
                  <Link href={`/customer/orders?orden=${orden.id}`} className="block rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-200 lg:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">#{orden.orderNumber}</p>
                        <p className="truncate text-sm text-muted">
                          {orden.firstItem ?? 'Pedido'}{orden.itemCount > 1 ? ` y ${orden.itemCount - 1} más` : ''} · {fechaCorta.format(new Date(orden.createdAt))}
                        </p>
                      </div>
                      <p className="shrink-0 text-lg font-bold tabular-nums text-ink">{formatUSD(orden.total)}</p>
                    </div>
                    <div className="mt-4">
                      <OrderStepper pasos={pasos} />
                    </div>
                    {nota && (
                      <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface px-3 py-2 text-sm text-ink-soft">
                        <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                        <span>
                          {nota}
                          {orden.trackingNumber && orden.status === 'SHIPPED' ? ` · Guía ${orden.trackingNumber}` : ''}
                        </span>
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
            {(stats?.activeCount ?? 0) > 3 && (
              <li>
                <Link href="/customer/orders" className="flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-brand-600 hover:bg-brand-50">
                  Ver los otros {(stats?.activeCount ?? 0) - 3} pedidos en curso
                </Link>
              </li>
            )}
          </ul>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-white px-6 py-10 text-center">
            <FiPackage className="h-8 w-8 text-subtle" aria-hidden="true" />
            <p className="mt-3 font-semibold text-ink">No tienes pedidos en camino</p>
            <p className="mt-1 text-sm text-muted">Cuando compres, aquí verás cada paso hasta que lo recibas.</p>
            <Link href="/productos" className={`${adminPrimaryButton} mt-4`}>
              <FiTag className="h-4 w-4" aria-hidden="true" /> Ver ofertas de hoy
            </Link>
          </div>
        )}
      </section>

      {/* Historial */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="ultimos-pedidos" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 id="ultimos-pedidos" className="font-semibold text-ink">Últimos pedidos</h2>
            <span className="text-xs text-muted">{stats?.orders ?? 0} en total</span>
          </div>
          {stats?.recentOrders?.length ? (
            <ul className="divide-y divide-line">
              {stats.recentOrders.slice(0, 4).map((order) => (
                <li key={order.id}>
                  <Link href={`/customer/orders?orden=${order.id}`} className="flex min-h-11 items-center gap-3 py-2.5 hover:text-brand-700">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink">#{order.orderNumber}</span>
                        <span className={adminBadge(tonoEstado(order.status))}>
                          {order.status === 'CANCELLED' && <FiXCircle className="h-3 w-3" aria-hidden="true" />}
                          {ETIQUETA_ESTADO[order.status as keyof typeof ETIQUETA_ESTADO] ?? order.status}
                        </span>
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
            <p className="py-6 text-center text-sm text-muted">Todavía no tienes pedidos.</p>
          )}
          {(stats?.wishlist ?? 0) > 0 && (
            <Link href="/customer/wishlist" className="mt-2 flex min-h-11 items-center gap-2 border-t border-line pt-3 text-sm font-medium text-brand-600 hover:text-brand-700">
              <FiHeart className="h-4 w-4" aria-hidden="true" /> {stats?.wishlist} en tu lista de deseos
            </Link>
          )}
        </section>

        <section aria-labelledby="movimientos" className="rounded-2xl border border-line bg-white p-4 lg:p-5">
          <h2 id="movimientos" className="mb-1 font-semibold text-ink">Movimientos</h2>
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
              <dd className="text-sm font-semibold tabular-nums text-success-strong">{formatUSD(stats?.totalRecharges ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">En compras</dt>
              <dd className="text-sm font-semibold tabular-nums text-ink">{formatUSD(stats?.totalPurchased ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Este mes</dt>
              <dd className="text-sm font-semibold tabular-nums text-brand-600">{formatUSD(stats?.totalSpentThisMonth ?? 0)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
