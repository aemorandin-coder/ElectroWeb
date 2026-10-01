import Link from 'next/link';
import { getServerSession } from 'next-auth';
import type { ReactNode } from 'react';
import {
  FiAlertTriangle, FiBarChart2, FiBox, FiCheckCircle, FiChevronRight, FiClipboard, FiClock, FiDollarSign, FiFileText, FiFilm,
  FiLayers, FiLifeBuoy, FiMail, FiPercent, FiPlus, FiSettings, FiShare2, FiShield, FiStar, FiTag, FiTool, FiTruck, FiUpload, FiUsers,
} from 'react-icons/fi';
import { adminBadge, adminCard, adminCardFlush, adminPageHeader, adminPageSubtitle, adminPageTitle, adminSectionTitle } from '@/lib/admin-ui';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { formatUSD } from '@/lib/currency';
import { ETIQUETA_ESTADO } from '@/lib/order-admin';
import { estadoPago, tonoEstadoOrden } from '@/lib/order-pago';
import { getDashboard, type DashboardData } from '@/lib/queries/dashboard';

// Siempre al día: son los pendientes y las ventas de este momento
export const dynamic = 'force-dynamic';

/**
 * Dashboard del panel (C-150): una pantalla de trabajo. Arriba, lo que se hace más seguido y lo que espera al equipo;
 * las ventas en números (hoy y este mes) con una gráfica mínima de la semana. Las gráficas completas están en Reportes.
 * Server Component: lee la base directamente (antes pedía /api/stats desde el navegador).
 */

type Permiso = 'MANAGE_PRODUCTS' | 'MANAGE_ORDERS' | 'MANAGE_CONTENT' | 'MANAGE_USERS' | 'VIEW_REPORTS' | 'MANAGE_SETTINGS';

const ACCIONES: Array<{ titulo: string; href: string; icono: ReactNode; permiso: Permiso }> = [
  { titulo: 'Nuevo producto', href: '/admin/products/new', icono: <FiPlus />, permiso: 'MANAGE_PRODUCTS' },
  { titulo: 'Ver órdenes', href: '/admin/orders', icono: <FiClipboard />, permiso: 'MANAGE_ORDERS' },
  { titulo: 'Nueva cotización', href: '/admin/cotizaciones/nueva', icono: <FiFileText />, permiso: 'MANAGE_ORDERS' },
  { titulo: 'Consultar un pago', href: '/admin/transactions', icono: <FiDollarSign />, permiso: 'MANAGE_ORDERS' },
  { titulo: 'Oferta o cupón', href: '/admin/discount-requests', icono: <FiPercent />, permiso: 'MANAGE_CONTENT' },
  { titulo: 'Nueva historia', href: '/admin/studio/nueva', icono: <FiFilm />, permiso: 'MANAGE_CONTENT' },
  { titulo: 'Importar productos', href: '/admin/products/importar', icono: <FiUpload />, permiso: 'MANAGE_PRODUCTS' },
  { titulo: 'Categorías', href: '/admin/categories', icono: <FiTag />, permiso: 'MANAGE_PRODUCTS' },
  { titulo: 'Relación de ventas', href: '/admin/reports', icono: <FiBarChart2 />, permiso: 'VIEW_REPORTS' },
  { titulo: 'Configuración', href: '/admin/settings', icono: <FiSettings />, permiso: 'MANAGE_SETTINGS' },
];

type Pendiente = { clave: keyof DashboardData['porAtender']; uno: string; varios: string; href: string; icono: ReactNode; permiso: Permiso; urgente?: boolean };

// En el orden en que conviene atenderlos: primero el dinero y lo que espera un cliente
const PENDIENTES: Pendiente[] = [
  { clave: 'pagosPorConfirmar', uno: 'pago por confirmar', varios: 'pagos por confirmar', href: '/admin/orders', icono: <FiClock />, permiso: 'MANAGE_ORDERS', urgente: true },
  { clave: 'porPreparar', uno: 'pedido pagado por preparar o entregar', varios: 'pedidos pagados por preparar o entregar', href: '/admin/orders', icono: <FiTruck />, permiso: 'MANAGE_ORDERS', urgente: true },
  { clave: 'recargas', uno: 'recarga de Puntos ES por confirmar', varios: 'recargas de Puntos ES por confirmar', href: '/admin/transactions', icono: <FiDollarSign />, permiso: 'MANAGE_ORDERS', urgente: true },
  { clave: 'pagosSinOrden', uno: 'Pago Móvil sin orden', varios: 'Pagos Móvil sin orden', href: '/admin/transactions', icono: <FiAlertTriangle />, permiso: 'MANAGE_ORDERS', urgente: true },
  { clave: 'cotizaciones', uno: 'cotización por armar', varios: 'cotizaciones por armar', href: '/admin/cotizaciones', icono: <FiFileText />, permiso: 'MANAGE_ORDERS' },
  { clave: 'garantias', uno: 'garantía por atender', varios: 'garantías por atender', href: '/admin/garantias', icono: <FiLifeBuoy />, permiso: 'MANAGE_ORDERS' },
  { clave: 'facturasEmpresa', uno: 'compra de empresa sin número de factura', varios: 'compras de empresa sin número de factura', href: '/admin/orders', icono: <FiFileText />, permiso: 'MANAGE_ORDERS' },
  { clave: 'mensajes', uno: 'mensaje de cliente', varios: 'mensajes de clientes', href: '/admin/inquiries', icono: <FiMail />, permiso: 'MANAGE_CONTENT' },
  { clave: 'solicitudes', uno: 'solicitud de producto', varios: 'solicitudes de producto', href: '/admin/inquiries?tab=requests', icono: <FiLayers />, permiso: 'MANAGE_CONTENT' },
  { clave: 'sinStock', uno: 'producto publicado sin existencias', varios: 'productos publicados sin existencias', href: '/admin/products', icono: <FiBox />, permiso: 'MANAGE_PRODUCTS' },
  { clave: 'resenas', uno: 'reseña por moderar', varios: 'reseñas por moderar', href: '/admin/reviews', icono: <FiStar />, permiso: 'MANAGE_CONTENT' },
  { clave: 'descuentos', uno: 'descuento por aprobar', varios: 'descuentos por aprobar', href: '/admin/discount-requests', icono: <FiPercent />, permiso: 'MANAGE_CONTENT' },
  { clave: 'verificaciones', uno: 'empresa por verificar', varios: 'empresas por verificar', href: '/admin/verifications', icono: <FiShield />, permiso: 'MANAGE_USERS' },
  { clave: 'referidos', uno: 'comisión de promotor por aprobar', varios: 'comisiones de promotores por aprobar', href: '/admin/marketing', icono: <FiShare2 />, permiso: 'MANAGE_CONTENT' },
  { clave: 'creadores', uno: 'solicitud de creador de cursos', varios: 'solicitudes de creadores de cursos', href: '/admin/creators', icono: <FiUsers />, permiso: 'MANAGE_USERS' },
  { clave: 'cursos', uno: 'curso por aprobar', varios: 'cursos por aprobar', href: '/admin/cursos', icono: <FiTool />, permiso: 'MANAGE_CONTENT' },
];

const fechaCorta = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** La semana en siete barras: lo justo para ver el ritmo. Los montos van también escritos (no dependen del puntero). */
function Semana({ dias }: { dias: DashboardData['ventas']['semana'] }) {
  const maximo = Math.max(...dias.map((d) => d.totalUSD), 0);
  const total = dias.reduce((suma, d) => suma + Math.round(d.totalUSD * 100), 0) / 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-muted">Últimos 7 días</p>
        <p className="text-sm font-semibold tabular-nums text-ink">{formatUSD(total)}</p>
      </div>
      <ol className="mt-2 flex h-20 items-end gap-1.5" aria-label="Ventas cobradas por día">
        {dias.map((dia) => (
          <li key={dia.fecha} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1" title={`${dia.etiqueta}: ${formatUSD(dia.totalUSD)}`}>
            <span
              className={`block w-full rounded-t ${dia.totalUSD > 0 ? 'bg-brand-500' : 'bg-line'}`}
              style={{ height: dia.totalUSD > 0 && maximo > 0 ? `${Math.max(8, (dia.totalUSD / maximo) * 100)}%` : '2px' }}
              aria-hidden="true"
            />
            <span className="block whitespace-nowrap text-center text-xs text-muted" aria-hidden="true">{dia.etiqueta.split(' ')[0].replace('.', '')}</span>
            <span className="sr-only">{dia.etiqueta}: {formatUSD(dia.totalUSD)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  // El `proxy` ya exige admin con dos pasos; esto es el candado de la página (ventas y conteos del negocio)
  if (!hasPermission(session, 'VIEW_DASHBOARD')) return null;
  const puede = (permiso: Permiso) => hasPermission(session, permiso);

  const datos = await getDashboard();
  const acciones = ACCIONES.filter((a) => puede(a.permiso));
  const pendientes = PENDIENTES.filter((p) => puede(p.permiso) && datos.porAtender[p.clave] > 0);
  const totalPendientes = pendientes.reduce((suma, p) => suma + datos.porAtender[p.clave], 0);
  const tienda = datos.tienda.filter((t) => !t.soloDueno || puede('MANAGE_SETTINGS'));
  const hoy = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="space-y-4">
      <header className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>Dashboard</h1>
          <p className={adminPageSubtitle}>{hoy}</p>
        </div>
      </header>

      <section aria-labelledby="acciones-titulo">
        <h2 id="acciones-titulo" className="sr-only">Acciones rápidas</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {acciones.map((accion) => (
            <li key={accion.href + accion.titulo}>
              <Link
                href={accion.href}
                className="flex min-h-12 items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-brand-500 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:h-4 [&_svg]:w-4" aria-hidden="true">{accion.icono}</span>
                <span className="min-w-0 leading-tight">{accion.titulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section aria-labelledby="pendientes-titulo" className={adminCardFlush}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <h2 id="pendientes-titulo" className={adminSectionTitle}>Por atender</h2>
              {totalPendientes > 0 && <span className="text-sm text-muted">{totalPendientes} {totalPendientes === 1 ? 'pendiente' : 'pendientes'}</span>}
            </div>
            {pendientes.length === 0 ? (
              <p className="flex items-center gap-2 px-4 pb-4 text-sm text-ink-soft"><FiCheckCircle className="h-4 w-4 text-success-strong" aria-hidden="true" /> Todo al día</p>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {pendientes.map((p) => {
                  const cantidad = datos.porAtender[p.clave];
                  return (
                    <li key={p.clave}>
                      <Link href={p.href} className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4 ${p.urgente ? 'bg-warning/15 text-warning-strong' : 'bg-surface text-muted'}`} aria-hidden="true">{p.icono}</span>
                        <span className="min-w-0 flex-1 font-medium"><span className="tabular-nums">{cantidad}</span> {cantidad === 1 ? p.uno : p.varios}</span>
                        <FiChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {puede('MANAGE_ORDERS') && (
            <section aria-labelledby="recientes-titulo" className={adminCardFlush}>
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <h2 id="recientes-titulo" className={adminSectionTitle}>Órdenes recientes</h2>
                <Link href="/admin/orders" className="inline-flex h-9 items-center rounded-lg px-2 text-sm font-semibold text-brand-600 hover:bg-brand-50">Ver todas</Link>
              </div>
              {datos.ordenesRecientes.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted">Todavía no hay órdenes.</p>
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {datos.ordenesRecientes.map((orden) => {
                    const pago = estadoPago(orden.paymentStatus);
                    return (
                      <li key={orden.id}>
                        <Link href="/admin/orders" className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500">
                          <span className="min-w-0 flex-1 basis-40">
                            <span className="block truncate font-medium text-ink">{orden.cliente}</span>
                            <span className="block text-xs tabular-nums text-muted">{orden.orderNumber} · {fechaCorta.format(new Date(orden.createdAt))}</span>
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className={adminBadge(tonoEstadoOrden(orden.status))}>{ETIQUETA_ESTADO[orden.status]}</span>
                            {orden.paymentStatus !== 'PAID' && <span className={adminBadge(pago.tono)}>{pago.label}</span>}
                          </span>
                          <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-ink">{formatUSD(orden.totalUSD)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section aria-labelledby="ventas-titulo" className={adminCard}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="ventas-titulo" className={adminSectionTitle}>Ventas cobradas</h2>
              {puede('VIEW_REPORTS') && <Link href="/admin/reports" className="inline-flex h-9 items-center rounded-lg px-2 text-sm font-semibold text-brand-600 hover:bg-brand-50">Reportes</Link>}
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-muted">Hoy</dt>
                <dd className="text-xl font-bold tabular-nums text-ink [overflow-wrap:anywhere]">{formatUSD(datos.ventas.hoyUSD)}</dd>
                <dd className="text-xs text-muted">{datos.ventas.hoyOrdenes} {datos.ventas.hoyOrdenes === 1 ? 'orden' : 'órdenes'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Este mes</dt>
                <dd className="text-xl font-bold tabular-nums text-ink [overflow-wrap:anywhere]">{formatUSD(datos.ventas.mesUSD)}</dd>
                <dd className="text-xs text-muted">{datos.ventas.mesOrdenes} {datos.ventas.mesOrdenes === 1 ? 'orden' : 'órdenes'}</dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-line pt-3">
              <Semana dias={datos.ventas.semana} />
            </div>
            <p className="mt-3 text-xs text-muted">Solo órdenes pagadas, sin las canceladas ni las reembolsadas.</p>
          </section>

          {puede('MANAGE_PRODUCTS') && datos.pocoInventario.total > 0 && (
            <section aria-labelledby="inventario-titulo" className={adminCardFlush}>
              <div className="px-4 py-3">
                <h2 id="inventario-titulo" className={adminSectionTitle}>Poco inventario</h2>
                <p className="text-xs text-muted">Publicados con {datos.pocoInventario.umbral} unidades o menos</p>
              </div>
              <ul className="divide-y divide-line border-t border-line">
                {datos.pocoInventario.productos.map((producto) => (
                  <li key={producto.id}>
                    <Link href={`/admin/products/${producto.id}`} className="flex min-h-11 items-center gap-3 px-4 py-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500">
                      <span className="min-w-0 flex-1 truncate text-ink">{producto.name}</span>
                      <span className={adminBadge(producto.stock <= 2 ? 'danger' : 'warning')}>{producto.stock === 1 ? 'Queda 1' : `Quedan ${producto.stock}`}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {datos.pocoInventario.total > datos.pocoInventario.productos.length && (
                <p className="border-t border-line px-4 py-2 text-xs text-muted">Y {datos.pocoInventario.total - datos.pocoInventario.productos.length} más en <Link href="/admin/products" className="font-semibold text-brand-600 hover:text-brand-700">Productos</Link>.</p>
              )}
            </section>
          )}

          {tienda.length > 0 && (
            <section aria-labelledby="tienda-titulo" className={adminCardFlush}>
              <div className="px-4 py-3">
                <h2 id="tienda-titulo" className={adminSectionTitle}>Tu tienda: por completar</h2>
              </div>
              <ul className="divide-y divide-line border-t border-line">
                {tienda.map((item) => (
                  <li key={item.clave}>
                    <Link href={item.href} className="flex min-h-11 items-start gap-3 px-4 py-2.5 text-sm text-ink-soft hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500">
                      <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" aria-hidden="true" />
                      <span className="min-w-0 flex-1">{item.texto}</span>
                      <FiChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="totales-titulo" className={adminCard}>
            <h2 id="totales-titulo" className={`${adminSectionTitle} mb-3`}>En total</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-xs text-muted">Ventas cobradas</dt><dd className="font-semibold tabular-nums text-ink [overflow-wrap:anywhere]">{formatUSD(datos.totales.ventasUSD)}</dd></div>
              <div><dt className="text-xs text-muted">Órdenes</dt><dd className="font-semibold tabular-nums text-ink">{datos.totales.ordenes}</dd></div>
              <div><dt className="text-xs text-muted">Productos</dt><dd className="font-semibold tabular-nums text-ink">{datos.totales.productos} <span className="font-normal text-muted">· {datos.totales.publicados} {datos.totales.publicados === 1 ? 'publicado' : 'publicados'}</span></dd></div>
              <div><dt className="text-xs text-muted">Clientes</dt><dd className="font-semibold tabular-nums text-ink">{datos.totales.clientes}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
