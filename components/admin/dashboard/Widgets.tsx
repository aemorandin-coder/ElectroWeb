import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  FiAlertTriangle, FiBarChart2, FiBox, FiCheckCircle, FiChevronRight, FiClipboard, FiClock, FiDollarSign, FiFileText, FiFilm,
  FiLayers, FiLifeBuoy, FiMail, FiMessageSquare, FiPercent, FiPlus, FiSettings, FiShare2, FiShield, FiStar, FiTag, FiTool, FiTruck,
  FiUpload, FiUsers,
} from 'react-icons/fi';
import { adminBadge } from '@/lib/admin-ui';
import { formatUSD, formatVES } from '@/lib/currency';
import type { DatosEmbudo, FilaActividad } from '@/lib/dashboard/datos';
import type { AccesoDef } from '@/lib/dashboard/widgets';
import { ETIQUETA_ESTADO } from '@/lib/order-admin';
import { estadoPago, tonoEstadoOrden } from '@/lib/order-pago';
import type { DashboardData } from '@/lib/queries/dashboard';
import CifraAnimada from './CifraAnimada';

// C-171: el contenido de cada widget del Dashboard. Son piezas de servidor (salvo las que cuentan o se piden en vivo): la página
// las arma con los datos y el tablero editable las recibe ya hechas. La tarjeta (marco, título) es la misma para todos.

const fechaCorta = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** El marco de un widget: tarjeta redondeada con su título y, si tiene, un enlace arriba a la derecha */
export function Tarjeta({ id, titulo, detalle, enlace, pegado, children }: {
  id: string;
  titulo: string;
  detalle?: string;
  enlace?: { href: string; texto: string };
  /** El contenido llega hasta los bordes (listas) */
  pegado?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`w-${id}`} className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <h2 id={`w-${id}`} className="text-base font-semibold text-ink">{titulo}</h2>
          {detalle && <p className="text-xs text-muted">{detalle}</p>}
        </div>
        {enlace && <Link href={enlace.href} className="inline-flex h-9 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-brand-600 hover:bg-brand-50">{enlace.texto}</Link>}
      </div>
      <div className={pegado ? 'flex-1' : 'flex-1 px-4 pb-4'}>{children}</div>
    </section>
  );
}

const Vacio = ({ children }: { children: ReactNode }) => <p className="px-4 pb-4 text-sm text-muted">{children}</p>;

/* ── Accesos rápidos ── */
const ICONO_ACCESO: Record<string, ReactNode> = {
  'nuevo-producto': <FiPlus />, ordenes: <FiClipboard />, 'nueva-cotizacion': <FiFileText />, 'consultar-pago': <FiDollarSign />, oferta: <FiPercent />,
  'nueva-historia': <FiFilm />, importar: <FiUpload />, categorias: <FiTag />, 'relacion-ventas': <FiBarChart2 />, configuracion: <FiSettings />,
  productos: <FiBox />, clientes: <FiUsers />, mensajes: <FiMessageSquare />, promotores: <FiShare2 />, resenas: <FiStar />, garantias: <FiLifeBuoy />,
};

export function WidgetAccesos({ accesos }: { accesos: AccesoDef[] }) {
  return (
    <section aria-labelledby="w-accesos" className="h-full">
      <h2 id="w-accesos" className="sr-only">Accesos rápidos</h2>
      {accesos.length === 0 ? <p className="rounded-3xl border border-dashed border-line p-4 text-sm text-muted">Sin accesos rápidos. Toca Editar para elegir tus botones.</p> : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {accesos.map((a) => (
            <li key={a.id}>
              <Link href={a.href} className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-500 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 [&_svg]:h-4 [&_svg]:w-4" aria-hidden="true">{ICONO_ACCESO[a.id] ?? <FiChevronRight />}</span>
                <span className="min-w-0 leading-tight">{a.titulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Por atender ── */
type Permiso = 'MANAGE_PRODUCTS' | 'MANAGE_ORDERS' | 'MANAGE_CONTENT' | 'MANAGE_USERS';
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

export function WidgetPorAtender({ porAtender, puede }: { porAtender: DashboardData['porAtender']; puede: (permiso: string) => boolean }) {
  const pendientes = PENDIENTES.filter((p) => puede(p.permiso) && porAtender[p.clave] > 0);
  const total = pendientes.reduce((suma, p) => suma + porAtender[p.clave], 0);
  return (
    <Tarjeta id="por-atender" titulo="Por atender" detalle={total > 0 ? `${total} ${total === 1 ? 'pendiente' : 'pendientes'}` : undefined} pegado>
      {pendientes.length === 0 ? (
        <p className="flex items-center gap-2 px-4 pb-4 text-sm text-ink-soft"><FiCheckCircle className="h-4 w-4 text-success-strong" aria-hidden="true" /> Todo al día</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {pendientes.map((p) => {
            const cantidad = porAtender[p.clave];
            return (
              <li key={p.clave}>
                <Link href={p.href} className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full [&_svg]:h-4 [&_svg]:w-4 ${p.urgente ? 'bg-warning/15 text-warning-strong' : 'bg-surface text-muted'}`} aria-hidden="true">{p.icono}</span>
                  <span className="min-w-0 flex-1 font-medium"><span className="tabular-nums">{cantidad}</span> {cantidad === 1 ? p.uno : p.varios}</span>
                  <FiChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}

/* ── Ventas cobradas ── */
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
              className={`block w-full rounded-t-md ${dia.totalUSD > 0 ? 'bg-brand-500' : 'bg-line'}`}
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

export function WidgetVentas({ ventas, verReportes }: { ventas: DashboardData['ventas']; verReportes: boolean }) {
  return (
    <Tarjeta id="ventas" titulo="Ventas cobradas" enlace={verReportes ? { href: '/admin/reports', texto: 'Reportes' } : undefined}>
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-xs text-muted">Hoy</dt>
          <dd className="text-xl font-bold tabular-nums text-ink [overflow-wrap:anywhere]"><CifraAnimada valor={ventas.hoyUSD} formato="usd" /></dd>
          <dd className="text-xs text-muted">{ventas.hoyOrdenes} {ventas.hoyOrdenes === 1 ? 'orden' : 'órdenes'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Este mes</dt>
          <dd className="text-xl font-bold tabular-nums text-ink [overflow-wrap:anywhere]"><CifraAnimada valor={ventas.mesUSD} formato="usd" /></dd>
          <dd className="text-xs text-muted">{ventas.mesOrdenes} {ventas.mesOrdenes === 1 ? 'orden' : 'órdenes'}</dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-line pt-3"><Semana dias={ventas.semana} /></div>
      <p className="mt-3 text-xs text-muted">Solo órdenes pagadas, sin las canceladas ni las reembolsadas.</p>
    </Tarjeta>
  );
}

/* ── Los que ya existían ── */
export function WidgetOrdenes({ ordenes }: { ordenes: DashboardData['ordenesRecientes'] }) {
  return (
    <Tarjeta id="ordenes" titulo="Órdenes recientes" enlace={{ href: '/admin/orders', texto: 'Ver todas' }} pegado>
      {ordenes.length === 0 ? <Vacio>Todavía no hay órdenes.</Vacio> : (
        <ul className="divide-y divide-line border-t border-line">
          {ordenes.map((orden) => {
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
    </Tarjeta>
  );
}

export function WidgetInventario({ inventario }: { inventario: DashboardData['pocoInventario'] }) {
  return (
    <Tarjeta id="inventario" titulo="Poco inventario" detalle={`Publicados con ${inventario.umbral} unidades o menos`} pegado>
      {inventario.total === 0 ? <Vacio>Nada se está acabando.</Vacio> : (
        <>
          <ul className="divide-y divide-line border-t border-line">
            {inventario.productos.map((producto) => (
              <li key={producto.id}>
                <Link href={`/admin/products/${producto.id}`} className="flex min-h-11 items-center gap-3 px-4 py-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500">
                  <span className="min-w-0 flex-1 truncate text-ink">{producto.name}</span>
                  <span className={adminBadge(producto.stock <= 2 ? 'danger' : 'warning')}>{producto.stock === 1 ? 'Queda 1' : `Quedan ${producto.stock}`}</span>
                </Link>
              </li>
            ))}
          </ul>
          {inventario.total > inventario.productos.length && (
            <p className="border-t border-line px-4 py-2 text-xs text-muted">Y {inventario.total - inventario.productos.length} más en <Link href="/admin/products" className="font-semibold text-brand-600 hover:text-brand-700">Productos</Link>.</p>
          )}
        </>
      )}
    </Tarjeta>
  );
}

export function WidgetTienda({ tienda }: { tienda: DashboardData['tienda'] }) {
  return (
    <Tarjeta id="tienda" titulo="Tu tienda: por completar" pegado>
      {tienda.length === 0 ? <p className="flex items-center gap-2 px-4 pb-4 text-sm text-ink-soft"><FiCheckCircle className="h-4 w-4 text-success-strong" aria-hidden="true" /> Todo configurado</p> : (
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
      )}
    </Tarjeta>
  );
}

export function WidgetTotales({ totales }: { totales: DashboardData['totales'] }) {
  return (
    <Tarjeta id="totales" titulo="En total">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div><dt className="text-xs text-muted">Ventas cobradas</dt><dd className="font-semibold tabular-nums text-ink [overflow-wrap:anywhere]">{formatUSD(totales.ventasUSD)}</dd></div>
        <div><dt className="text-xs text-muted">Órdenes</dt><dd className="font-semibold tabular-nums text-ink">{totales.ordenes}</dd></div>
        <div><dt className="text-xs text-muted">Productos</dt><dd className="font-semibold tabular-nums text-ink">{totales.productos} <span className="font-normal text-muted">· {totales.publicados} {totales.publicados === 1 ? 'publicado' : 'publicados'}</span></dd></div>
        <div><dt className="text-xs text-muted">Clientes</dt><dd className="font-semibold tabular-nums text-ink">{totales.clientes}</dd></div>
      </dl>
    </Tarjeta>
  );
}

/* ── Los nuevos ── */
export function WidgetEmbudo({ embudo }: { embudo: DatosEmbudo }) {
  const pasos = [
    { nombre: 'Visitaron la tienda', valor: embudo.visitas },
    { nombre: 'Agregaron al carrito', valor: embudo.carrito },
    { nombre: 'Empezaron a pagar', valor: embudo.pago },
    { nombre: 'Compraron', valor: embudo.compras },
  ];
  const maximo = Math.max(1, embudo.visitas);
  return (
    <Tarjeta id="embudo" titulo="Embudo de hoy" detalle="Personas distintas en cada paso">
      <ol className="space-y-2">
        {pasos.map((p) => (
          <li key={p.nombre} className="text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-ink-soft">{p.nombre}</span>
              <CifraAnimada valor={p.valor} className="font-semibold tabular-nums text-ink" />
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (p.valor / maximo) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </Tarjeta>
  );
}

export function WidgetTasa({ tasa, actualizada, automatica, puedeCambiar }: { tasa: number | null; actualizada: string | null; automatica: boolean; puedeCambiar: boolean }) {
  return (
    <Tarjeta id="tasa" titulo="Tasa del día" enlace={puedeCambiar ? { href: '/admin/settings', texto: 'Cambiar' } : undefined}>
      {tasa ? (
        <>
          <p className="text-3xl font-bold tabular-nums text-ink">{formatVES(tasa)}</p>
          <p className="text-sm text-muted">por cada dólar</p>
          <p className="mt-2 text-xs text-muted">{actualizada ? `Actualizada el ${fechaCorta.format(new Date(actualizada))}` : 'Sin fecha de actualización'}{automatica ? ' · se actualiza sola' : ''}</p>
        </>
      ) : <p className="text-sm text-muted">La tienda no tiene tasa en bolívares.</p>}
    </Tarjeta>
  );
}

export function WidgetMasVendidos({ productos }: { productos: Array<{ id: string; nombre: string; unidades: number }> }) {
  return (
    <Tarjeta id="mas-vendidos" titulo="Más vendidos" detalle="Órdenes cobradas en 7 días" pegado>
      {productos.length === 0 ? <Vacio>Sin ventas esta semana.</Vacio> : (
        <ol className="divide-y divide-line border-t border-line">
          {productos.map((p, i) => (
            <li key={p.id}>
              <Link href={`/admin/products/${p.id}`} className="flex min-h-11 items-center gap-3 px-4 py-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold tabular-nums text-brand-700" aria-hidden="true">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{p.nombre}</span>
                <span className="shrink-0 font-semibold tabular-nums text-ink">{p.unidades} u.</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Tarjeta>
  );
}

export function WidgetActividad({ filas }: { filas: FilaActividad[] }) {
  return (
    <Tarjeta id="actividad" titulo="Actividad del equipo" enlace={{ href: '/admin/reports', texto: 'Bitácora' }} pegado>
      {filas.length === 0 ? <Vacio>Todavía no hay actividad.</Vacio> : (
        <ol className="divide-y divide-line border-t border-line">
          {filas.map((f) => (
            <li key={f.id} className="flex items-start gap-3 px-4 py-2 text-sm">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white" aria-hidden="true">{f.quien.trim()[0]?.toUpperCase() ?? '?'}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-ink"><span className="font-semibold">{f.quien}</span> · {f.accion}{f.detalle ? <span className="text-ink-soft">: {f.detalle}</span> : null}</span>
                <span className="block text-xs text-muted">{fechaCorta.format(new Date(f.en))}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Tarjeta>
  );
}

export function WidgetPromotores({ datos }: { datos: { porAcreditar: number; montoUSD: number; porRevisar: number } }) {
  return (
    <Tarjeta id="promotores" titulo="Promotores" enlace={{ href: '/admin/marketing', texto: 'Ver' }}>
      <p className="flex items-baseline gap-2"><CifraAnimada valor={datos.porAcreditar} className="text-3xl font-bold tabular-nums text-ink" /><span className="text-sm text-muted">{datos.porAcreditar === 1 ? 'comisión por acreditar' : 'comisiones por acreditar'}</span></p>
      <p className="mt-1 text-sm text-ink-soft">{formatUSD(datos.montoUSD)} en Puntos ES</p>
      {datos.porRevisar > 0
        ? <p className={`${adminBadge('warning')} mt-2`}>{datos.porRevisar} {datos.porRevisar === 1 ? 'espera' : 'esperan'} tu revisión</p>
        : <p className="mt-2 text-xs text-muted">Ninguna espera tu revisión.</p>}
    </Tarjeta>
  );
}

const ESTADO_COTIZACION: Record<string, string> = { REQUESTED: 'Por armar', DRAFT: 'Borrador', SENT: 'Enviada' };

export function WidgetCotizaciones({ datos }: { datos: { abiertas: number; lista: Array<{ id: string; numero: string; cliente: string; estado: string; totalUSD: number }> } }) {
  return (
    <Tarjeta id="cotizaciones" titulo="Cotizaciones abiertas" detalle={`${datos.abiertas} ${datos.abiertas === 1 ? 'abierta' : 'abiertas'}`} enlace={{ href: '/admin/cotizaciones', texto: 'Ver' }} pegado>
      {datos.lista.length === 0 ? <Vacio>No hay cotizaciones abiertas.</Vacio> : (
        <ul className="divide-y divide-line border-t border-line">
          {datos.lista.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/cotizaciones/${c.id}`} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-500">
                <span className="min-w-0 flex-1 basis-32"><span className="block truncate font-medium text-ink">{c.cliente}</span><span className="block text-xs tabular-nums text-muted">{c.numero} · {ESTADO_COTIZACION[c.estado] ?? c.estado}</span></span>
                <span className="shrink-0 font-semibold tabular-nums text-ink">{formatUSD(c.totalUSD)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

export function WidgetResenas({ resenas }: { resenas: Array<{ id: string; estrellas: number; comentario: string | null; producto: string; autor: string; pendiente: boolean }> }) {
  return (
    <Tarjeta id="resenas" titulo="Reseñas recientes" enlace={{ href: '/admin/reviews', texto: 'Ver' }} pegado>
      {resenas.length === 0 ? <Vacio>Todavía no hay reseñas.</Vacio> : (
        <ul className="divide-y divide-line border-t border-line">
          {resenas.map((r) => (
            <li key={r.id} className="px-4 py-2 text-sm">
              <p className="flex flex-wrap items-center gap-x-2">
                <span className="inline-flex items-center gap-0.5 font-semibold tabular-nums text-ink"><FiStar className="h-3.5 w-3.5 text-tag" aria-hidden="true" />{r.estrellas}<span className="sr-only"> de 5</span></span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{r.producto}</span>
                {r.pendiente && <span className={adminBadge('warning')}>Por moderar</span>}
              </p>
              {r.comentario && <p className="line-clamp-2 text-xs text-muted">{r.autor}: {r.comentario}</p>}
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

export function WidgetRespaldo({ datos }: { datos: { encendido: boolean; ultimo: { ok: boolean; en: string } | null } }) {
  return (
    <Tarjeta id="respaldo" titulo="Respaldo" enlace={{ href: '/admin/settings#respaldos', texto: 'Abrir' }}>
      {!datos.encendido ? (
        <p className="flex items-start gap-2 text-sm text-warning-strong"><FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Los respaldos automáticos están apagados.</p>
      ) : !datos.ultimo ? (
        <p className="text-sm text-muted">Encendido. Todavía no corrió ninguno.</p>
      ) : (
        <>
          <p className={`flex items-center gap-2 text-sm font-semibold ${datos.ultimo.ok ? 'text-success-strong' : 'text-deal'}`}>
            {datos.ultimo.ok ? <FiCheckCircle className="h-4 w-4" aria-hidden="true" /> : <FiAlertTriangle className="h-4 w-4" aria-hidden="true" />}
            {datos.ultimo.ok ? 'El último salió bien' : 'El último falló'}
          </p>
          <p className="mt-1 text-xs text-muted">{fechaCorta.format(new Date(datos.ultimo.en))}</p>
        </>
      )}
    </Tarjeta>
  );
}
