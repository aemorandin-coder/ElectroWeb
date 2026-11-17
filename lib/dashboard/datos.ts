// C-171: los datos de los widgets nuevos del Dashboard. Solo servidor. Cada función se llama solo si la persona tiene puesto ese widget.
// Nada de aquí sale con costos, correos ni IP: son cifras y nombres abreviados.

import { OrderStatus, PaymentStatus } from '@prisma/client';
import { ETIQUETA_ACCION } from '@/lib/audit-labels';
import { formatPaymentMethod } from '@/lib/format-helpers';
import { hoyCaracas } from '@/lib/pago-movil/monto';
import { prisma } from '@/lib/prisma';
import { resumenDelSorteo } from '@/lib/sorteo/servidor';
import { abreviarNombre } from '@/lib/visitantes';

const DIA_MS = 24 * 60 * 60 * 1000;
const inicioDeHoy = () => new Date(`${hoyCaracas()}T00:00:00-04:00`);
const VENTA = { paymentStatus: PaymentStatus.PAID, status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] } };

export interface DatosEmbudo { visitas: number; carrito: number; pago: number; compras: number }

/** Personas distintas (por sesión) que hoy vieron la tienda, agregaron al carrito, empezaron a pagar y compraron */
export async function datosEmbudo(): Promise<DatosEmbudo> {
  const filas = await prisma.analyticsEvent.groupBy({
    by: ['eventType', 'sessionId'],
    where: { createdAt: { gte: inicioDeHoy() }, sessionId: { not: null }, eventType: { in: ['page_view', 'add_to_cart', 'begin_checkout', 'purchase'] } },
  });
  const contar = (tipo: string) => filas.filter((f) => f.eventType === tipo).length;
  return { visitas: contar('page_view'), carrito: contar('add_to_cart'), pago: contar('begin_checkout'), compras: contar('purchase') };
}

export async function datosTasa(): Promise<{ tasa: number | null; actualizada: string | null; automatica: boolean }> {
  const s = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true, lastRateUpdate: true, autoExchangeRates: true } });
  return { tasa: s?.exchangeRateVES ? Number(s.exchangeRateVES) : null, actualizada: s?.lastRateUpdate?.toISOString() ?? null, automatica: s?.autoExchangeRates ?? false };
}

/** Unidades vendidas por producto en órdenes cobradas de los últimos 7 días */
export async function datosMasVendidos(): Promise<Array<{ id: string; nombre: string; unidades: number }>> {
  const filas = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { ...VENTA, paidAt: { gte: new Date(Date.now() - 7 * DIA_MS) } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });
  if (filas.length === 0) return [];
  const nombres = new Map((await prisma.product.findMany({ where: { id: { in: filas.map((f) => f.productId) } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  return filas.map((f) => ({ id: f.productId, nombre: nombres.get(f.productId) ?? 'Producto', unidades: f._sum.quantity ?? 0 }));
}

export interface FilaActividad { id: string; quien: string; accion: string; detalle: string | null; en: string }

/** Lo último que hizo el equipo en el panel (sin inicios de sesión ni avisos de seguridad: eso está en Reportes → Seguridad) */
export async function datosActividad(): Promise<FilaActividad[]> {
  const filas = await prisma.auditLog.findMany({
    where: { userId: { not: null }, NOT: [{ action: { startsWith: 'AUTH_' } }, { action: { startsWith: 'SECURITY_' } }] },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { id: true, action: true, userId: true, details: true, createdAt: true },
  });
  const ids = [...new Set(filas.map((f) => f.userId).filter((x): x is string => !!x))];
  const usuarios = new Map((ids.length > 0 ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : [])
    .map((u) => [u.id, u.name?.trim() || u.email?.split('@')[0] || 'Alguien del equipo']));
  return filas.map((f) => {
    let detalle: string | null = null;
    try {
      const d = f.details ? (JSON.parse(f.details) as Record<string, unknown>) : null;
      const nombre = d?.producto ?? d?.registro ?? d?.nombre ?? d?.numero;
      if (typeof nombre === 'string') detalle = nombre.slice(0, 60);
    } catch {
      // Detalle ilegible: se muestra sin él
    }
    return { id: f.id, quien: usuarios.get(f.userId ?? '') ?? 'Alguien del equipo', accion: ETIQUETA_ACCION[f.action] ?? 'Cambio en el panel', detalle, en: f.createdAt.toISOString() };
  });
}

export async function datosPromotores(): Promise<{ porAcreditar: number; montoUSD: number; porRevisar: number }> {
  const [pendientes, porRevisar] = await Promise.all([
    prisma.referralConversion.aggregate({ where: { status: 'PENDING' }, _count: true, _sum: { commission: true } }),
    prisma.referralConversion.count({ where: { status: 'PENDING', heldReason: { not: null } } }),
  ]);
  return { porAcreditar: pendientes._count, montoUSD: Number(pendientes._sum.commission ?? 0), porRevisar };
}

export async function datosRespaldo(): Promise<{ encendido: boolean; ultimo: { ok: boolean; en: string } | null }> {
  const [ajustes, ultimo] = await Promise.all([
    prisma.backupSettings.findUnique({ where: { id: 'default' }, select: { enabled: true } }),
    prisma.backupRun.findFirst({ where: { kind: 'DB', status: { in: ['OK', 'FAILED'] } }, orderBy: { startedAt: 'desc' }, select: { status: true, startedAt: true } }),
  ]);
  return { encendido: ajustes?.enabled ?? false, ultimo: ultimo ? { ok: ultimo.status === 'OK', en: ultimo.startedAt.toISOString() } : null };
}

export async function datosResenas(): Promise<Array<{ id: string; estrellas: number; comentario: string | null; producto: string; autor: string; pendiente: boolean }>> {
  const filas = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    take: 4,
    select: { id: true, rating: true, comment: true, isApproved: true, rejectedAt: true, product: { select: { name: true } }, user: { select: { name: true } } },
  });
  return filas.map((r) => ({
    id: r.id, estrellas: r.rating, comentario: r.comment ? r.comment.slice(0, 120) : null, producto: r.product.name,
    autor: abreviarNombre(r.user.name) ?? 'Cliente', pendiente: !r.isApproved && r.rejectedAt === null,
  }));
}

export async function datosCotizaciones(): Promise<{ abiertas: number; lista: Array<{ id: string; numero: string; cliente: string; estado: string; totalUSD: number }> }> {
  const where = { status: { in: ['REQUESTED', 'DRAFT', 'SENT'] } };
  const [abiertas, lista] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 4, select: { id: true, number: true, clientName: true, status: true, totalUSD: true } }),
  ]);
  return { abiertas, lista: lista.map((q) => ({ id: q.id, numero: q.number, cliente: q.clientName, estado: q.status, totalUSD: Number(q.totalUSD) })) };
}

/* ── C-279: lo nuevo del Dashboard (la recepción) ── */

export interface PagoPendiente { id: string; numero: string; totalUSD: number; metodo: string; cliente: string }
export interface MensajePendiente { id: string; cliente: string; texto: string }

/**
 * Lo que "Por atender" muestra con detalle: los primeros pagos por confirmar (las mismas órdenes que cuenta: pendientes y sin
 * pagar) y el último mensaje sin responder. Nombres abreviados; nada de correos ni teléfonos.
 */
export async function datosPendientes(verPagos: boolean, verMensajes: boolean): Promise<{ pagos: PagoPendiente[]; mensajes: MensajePendiente[] }> {
  const [pagos, mensajes] = await Promise.all([
    verPagos
      ? prisma.order.findMany({
        where: { status: OrderStatus.PENDING, paymentStatus: PaymentStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, orderNumber: true, totalUSD: true, paymentMethod: true, billingName: true, guestName: true, user: { select: { name: true } } },
      })
      : Promise.resolve([]),
    verMensajes
      ? prisma.contactMessage.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 2, select: { id: true, name: true, subject: true, message: true } })
      : Promise.resolve([]),
  ]);
  return {
    pagos: pagos.map((o) => ({
      id: o.id, numero: o.orderNumber, totalUSD: Number(o.totalUSD), metodo: formatPaymentMethod(o.paymentMethod),
      cliente: abreviarNombre(o.billingName || o.user?.name || o.guestName) ?? 'Cliente',
    })),
    mensajes: mensajes.map((c) => ({ id: c.id, cliente: abreviarNombre(c.name) ?? 'Un cliente', texto: (c.message || c.subject).replace(/\s+/g, ' ').trim().slice(0, 120) })),
  };
}

export interface DatosSorteo {
  titulo: string;
  premio: string;
  imagen: string | null;
  /** AAAA-MM-DD en Venezuela */
  desde: string;
  hasta: string;
  resultado: string;
  boletos: number;
  participantes: number;
}

/** El sorteo activo que todavía no se sorteó (null si no hay). Los boletos se cuentan solo si los va a mostrar el widget */
export async function datosSorteo(conBoletos: boolean): Promise<DatosSorteo | null> {
  const sorteo = await prisma.sorteo.findFirst({ where: { activo: true, sorteadoAt: null }, orderBy: { resultadoEl: 'asc' } });
  if (!sorteo) return null;
  const resumen = conBoletos ? await resumenDelSorteo(sorteo).catch(() => null) : null;
  return {
    titulo: sorteo.titulo, premio: sorteo.premio, imagen: sorteo.imagen,
    desde: hoyCaracas(sorteo.desde), hasta: hoyCaracas(sorteo.hasta), resultado: hoyCaracas(sorteo.resultadoEl),
    boletos: resumen?.boletos.length ?? 0, participantes: resumen?.participantes.length ?? 0,
  };
}

export interface DatosStudio {
  /** Lunes de esta semana (AAAA-MM-DD, Venezuela) */
  lunes: string;
  historias: Array<{ id: string; nombre: string; fecha: string }>;
  sugerida: { id: string; nombre: string; stock: number; precioUSD: number; foto: string | null } | null;
}

/** Las historias de ElectroStudio con fecha en esta semana y un producto para la próxima ("Última unidad") */
export async function datosStudio(): Promise<DatosStudio> {
  const hoy = hoyCaracas();
  const dia = new Date(`${hoy}T12:00:00-04:00`).getUTCDay();
  const lunes = hoyCaracas(new Date(new Date(`${hoy}T12:00:00-04:00`).getTime() - ((dia + 6) % 7) * DIA_MS));
  const domingo = hoyCaracas(new Date(new Date(`${lunes}T12:00:00-04:00`).getTime() + 6 * DIA_MS));
  const [historias, sugerida] = await Promise.all([
    prisma.studioFlyer.findMany({ where: { date: { gte: lunes, lte: domingo } }, orderBy: [{ date: 'asc' }, { updatedAt: 'desc' }], take: 21, select: { id: true, name: true, date: true } }),
    prisma.product.findFirst({
      where: { status: 'PUBLISHED', productType: 'PHYSICAL', stock: { gt: 0, lte: 2 }, mainImage: { not: null } },
      orderBy: [{ stock: 'asc' }, { priceUSD: 'desc' }],
      select: { id: true, name: true, stock: true, priceUSD: true, mainImage: true },
    }),
  ]);
  return {
    lunes,
    historias: historias.filter((h): h is typeof h & { date: string } => !!h.date).map((h) => ({ id: h.id, nombre: h.name, fecha: h.date })),
    sugerida: sugerida ? { id: sugerida.id, nombre: sugerida.name, stock: sugerida.stock, precioUSD: Number(sugerida.priceUSD), foto: sugerida.mainImage } : null,
  };
}
