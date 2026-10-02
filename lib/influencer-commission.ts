import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { emitAdminEvent } from '@/lib/admin-events';
import { createNotification } from '@/lib/notifications';
import { formatPuntos, formatUSD } from '@/lib/currency';
import { ivaIncluido, montoDecimal, porcentajeIva, roundMoney } from '@/lib/pricing';

export const REF_COOKIE = 'electroshop_ref';

/**
 * Reglas de comisiones de promotores (C-75, decisión de Andrés del 16/09):
 * - Solo generan comisión las **compras pagadas**. La comisión nace cuando la orden queda pagada
 *   (al crearse ya pagada o cuando el admin confirma el pago), nunca al crear una orden sin pagar.
 * - Las recargas no generan comisión: ese dinero se comisiona cuando se gasta. Antes una recarga y la
 *   compra hecha con ese saldo pagaban dos veces sobre el mismo dinero.
 * - Si la orden se cancela, su comisión pendiente se rechaza sola.
 * - Un registro queda como dato (sin comisión) y no espera aprobación.
 * - La comisión se acredita como saldo de la tienda, nunca como dinero.
 *
 * C-167 (decisiones de Andrés del 02/10):
 * - La comisión es sobre los **productos** (menos descuentos), **sin IVA ni envío**: antes era sobre el total pagado.
 * - Se paga en **Puntos ES, nunca en efectivo** (en efectivo se presta para lavar dinero; en Puntos ES compra en la tienda).
 * - Cuenta para el promotor la compra hecha con **su código** (aunque el cliente ya tuviera cuenta) o, si no se usó
 *   ningún código, la del cliente que se registró con **su enlace**. El código manda.
 * - Se acredita **sola 7 días después de entregada la orden** (cron diario). Se queda para revisión manual si hay
 *   señales de autocompra (el comprador comparte cédula, teléfono o dirección con el promotor), si pasa de $50, o si
 *   es mayor que la ganancia de la venta (cuando los productos tienen su costo cargado).
 */

export const DIAS_PARA_ACREDITAR = 7;
export const MONTO_REVISION_MANUAL = 50;

/** Base de la comisión: productos menos descuentos, sin el IVA que llevan dentro ni el envío. */
export function baseComision(o: { subtotalUSD: unknown; discountUSD: unknown; totalUSD: unknown; taxUSD: unknown }): number {
  const productos = Math.max(0, Number(o.subtotalUSD) - Number(o.discountUSD));
  const iva = porcentajeIva(Number(o.totalUSD), Number(o.taxUSD));
  return iva > 0 ? ivaIncluido(productos, iva).baseUSD : roundMoney(productos);
}

const soloDigitos = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '');
const mismaCedula = (a: string | null | undefined, b: string | null | undefined) => soloDigitos(a).length >= 6 && soloDigitos(a) === soloDigitos(b);
/** Teléfonos venezolanos con o sin +58 o el 0: se comparan los últimos 10 dígitos. */
const mismoTelefono = (a: string | null | undefined, b: string | null | undefined) => {
  const x = soloDigitos(a).slice(-10);
  return x.length === 10 && x === soloDigitos(b).slice(-10);
};

/**
 * Ganancia de la orden (lo cobrado por los productos sin IVA, menos su costo), o null si a algún producto le falta el costo.
 * Sirve para no acreditar sola una comisión mayor que la ganancia: pasa sobre todo en códigos y recargas, de margen chico.
 */
async function gananciaDeOrden(db: Cliente, orderId: string, base: number): Promise<number | null> {
  const items = await db.orderItem.findMany({
    where: { orderId },
    select: { quantity: true, product: { select: { costPerItem: true } }, digitalVariant: { select: { costUSD: true } } },
  });
  let costo = 0;
  for (const item of items) {
    const unitario = item.digitalVariant ? Number(item.digitalVariant.costUSD) : item.product.costPerItem === null ? 0 : Number(item.product.costPerItem);
    if (!(unitario > 0)) return null;
    costo += unitario * item.quantity;
  }
  return items.length > 0 ? roundMoney(base - costo) : null;
}

/** Por qué una comisión no se acredita sola, o null si no hay nada raro. */
async function motivoDeRevision(db: Cliente, promotorUserId: string, compradorId: string, envio: { deliveryMethod: string | null; shippingAddress: string | null }, comision: number, orderId: string, base: number): Promise<string | null> {
  const [promotor, comprador] = await Promise.all([
    db.profile.findUnique({ where: { userId: promotorUserId }, select: { idNumber: true, phone: true } }),
    db.profile.findUnique({ where: { userId: compradorId }, select: { idNumber: true, phone: true } }),
  ]);
  if (mismaCedula(promotor?.idNumber, comprador?.idNumber)) return 'El comprador tiene la misma cédula que el promotor.';
  if (mismoTelefono(promotor?.phone, comprador?.phone)) return 'El comprador tiene el mismo teléfono que el promotor.';
  // Solo en envíos: en retiro en tienda (y en lo digital) todas las órdenes llevan la misma dirección, la de la tienda
  const esEnvio = envio.deliveryMethod !== 'PICKUP' && envio.deliveryMethod !== 'DIGITAL';
  const direccion = (envio.shippingAddress ?? '').trim().toLowerCase();
  if (esEnvio && direccion.length > 10) {
    const usadas = await db.order.findMany({
      where: { userId: promotorUserId, deliveryMethod: { notIn: ['PICKUP', 'DIGITAL'] } },
      select: { shippingAddress: true }, take: 30, orderBy: { createdAt: 'desc' },
    });
    if (usadas.some((u) => (u.shippingAddress ?? '').trim().toLowerCase() === direccion)) return 'Se envía a una dirección que el promotor usó en sus propias compras.';
  }
  if (comision > MONTO_REVISION_MANUAL) return `Comisión de más de ${formatUSD(MONTO_REVISION_MANUAL)}: se revisa a mano.`;
  const ganancia = await gananciaDeOrden(db, orderId, base);
  if (ganancia !== null && comision >= ganancia) {
    return `La comisión (${formatUSD(comision)}) es mayor o igual que la ganancia de esta venta (${formatUSD(Math.max(ganancia, 0))}).`;
  }
  return null;
}

type Cliente = Prisma.TransactionClient | typeof prisma;

async function promotorDe(db: Cliente, referredUserId: string) {
  const user = await db.user.findUnique({ where: { id: referredUserId }, select: { referredByCode: true } });
  if (!user?.referredByCode) return null;
  const influencer = await db.influencer.findUnique({
    where: { code: user.referredByCode, status: 'ACTIVE' },
    select: { id: true, userId: true, commissionRate: true, name: true, code: true },
  });
  // Sin autocomisión
  if (!influencer || influencer.userId === referredUserId) return null;
  return influencer;
}

/** Registro de un cliente referido: queda como dato, sin comisión ni aprobación pendiente. */
export async function recordRegistration(referredUserId: string) {
  const influencer = await promotorDe(prisma, referredUserId);
  if (!influencer) return null;
  return prisma.referralConversion.create({
    data: {
      influencerId: influencer.id,
      referredUserId,
      type: 'REGISTRATION',
      grossAmount: 0,
      commission: 0,
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });
}

/** El promotor de una orden: el de su código (C-167) o, si no se usó, el del enlace con que se registró el cliente. */
async function promotorDeOrden(db: Cliente, order: { userId: string; referralInfluencerId: string | null }) {
  if (order.referralInfluencerId) {
    const porCodigo = await db.influencer.findFirst({
      where: { id: order.referralInfluencerId, status: 'ACTIVE' },
      select: { id: true, userId: true, commissionRate: true, name: true, code: true },
    });
    if (porCodigo && porCodigo.userId !== order.userId) return { influencer: porCodigo, source: 'CODE' as const };
  }
  const porEnlace = await promotorDe(db, order.userId);
  return porEnlace ? { influencer: porEnlace, source: 'LINK' as const } : null;
}

/**
 * Comisión de una orden pagada. Idempotente: si la orden ya tiene comisión, no crea otra
 * (el admin puede confirmar el pago dos veces o la orden puede nacer pagada).
 */
export async function recordPaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, userId: true, orderNumber: true, subtotalUSD: true, discountUSD: true, totalUSD: true, taxUSD: true,
      paymentStatus: true, status: true, referralInfluencerId: true, shippingAddress: true, deliveryMethod: true,
    },
  });
  if (!order?.userId || order.paymentStatus !== 'PAID' || order.status === 'CANCELLED') return null;

  const encontrado = await promotorDeOrden(prisma, { userId: order.userId, referralInfluencerId: order.referralInfluencerId });
  if (!encontrado) return null;
  const { influencer, source } = encontrado;

  const existente = await prisma.referralConversion.findFirst({ where: { orderId: order.id }, select: { id: true } });
  if (existente) return null;

  const grossAmount = Number(order.totalUSD);
  const base = baseComision(order);
  const commission = roundMoney((base * Number(influencer.commissionRate)) / 100);
  if (!(commission > 0)) return null;
  const heldReason = await motivoDeRevision(prisma, influencer.userId, order.userId, order, commission, order.id, base);

  const conversion = await prisma.referralConversion.create({
    data: {
      influencerId: influencer.id,
      referredUserId: order.userId,
      type: 'PURCHASE',
      grossAmount: montoDecimal(grossAmount),
      baseAmount: montoDecimal(base),
      commission: montoDecimal(commission),
      orderId: order.id,
      status: 'PENDING',
      source,
      heldReason,
    },
  });

  emitAdminEvent({
    type: 'REFERRAL_CONVERSION',
    title: `Promotor ${influencer.name} · una compra`.slice(0, 150),
    summary: heldReason
      ? `Compra con ${source === 'CODE' ? 'el código' : 'el enlace'} ${influencer.code} (orden ${order.orderNumber}). Necesita tu revisión: ${heldReason}`
      : `Compra con ${source === 'CODE' ? 'el código' : 'el enlace'} ${influencer.code} (orden ${order.orderNumber}). Se acredita sola ${DIAS_PARA_ACREDITAR} días después de la entrega.`,
    fields: [
      ['Productos sin IVA', formatUSD(base)],
      ['Comisión', formatPuntos(commission)],
    ],
    link: '/admin/marketing#promotores',
  });

  void createNotification({
    userId: influencer.userId,
    type: 'REFERRAL_COMMISSION',
    title: `Ganaste ${formatPuntos(commission)}`,
    message: `Alguien compró con tu ${source === 'CODE' ? 'código' : 'enlace'}. Se acreditan ${DIAS_PARA_ACREDITAR} días después de que reciba su pedido.`,
    link: '/customer/referrals',
    icon: 'gift',
  });

  return conversion;
}

/**
 * Acredita las comisiones listas: pendientes, sin motivo de revisión y con la orden entregada hace 7 días o más.
 * La llama el cron diario (/api/cron/promotores). approveConversion vuelve a comprobar que la orden siga pagada.
 */
export async function acreditarComisionesListas(ahora: Date = new Date()): Promise<{ acreditadas: number; rechazadas: number; revisadas: number }> {
  const limite = new Date(ahora.getTime() - DIAS_PARA_ACREDITAR * 24 * 60 * 60_000);
  const pendientes = await prisma.referralConversion.findMany({
    // Con baseAmount: las de antes de C-167 no se acreditan solas (motivoEfectivo)
    where: { status: 'PENDING', type: 'PURCHASE', heldReason: null, baseAmount: { not: null }, orderId: { not: null } },
    select: { id: true, influencerId: true, orderId: true },
    take: 500,
  });
  if (pendientes.length === 0) return { acreditadas: 0, rechazadas: 0, revisadas: 0 };
  const ordenes = await prisma.order.findMany({
    where: { id: { in: pendientes.map((p) => p.orderId as string) } },
    select: { id: true, status: true, deliveredAt: true },
  });
  const porId = new Map(ordenes.map((o) => [o.id, o]));
  let acreditadas = 0;
  let rechazadas = 0;
  for (const p of pendientes) {
    const orden = porId.get(p.orderId as string);
    if (!orden || orden.status !== 'DELIVERED' || !orden.deliveredAt || orden.deliveredAt > limite) continue;
    try {
      await approveConversion(p.id, p.influencerId);
      acreditadas++;
    } catch {
      rechazadas++;
    }
  }
  return { acreditadas, rechazadas, revisadas: pendientes.length };
}

/**
 * Por qué una comisión pendiente espera al equipo. Además del motivo guardado, las anteriores a C-167 (sin `baseAmount`):
 * se calcularon sobre el total con IVA y envío, y no se acreditan solas con la regla nueva.
 */
export function motivoEfectivo(c: { status: string; type: string; heldReason: string | null; baseAmount: unknown }): string | null {
  if (c.status !== 'PENDING' || c.type !== 'PURCHASE') return null;
  if (c.heldReason) return c.heldReason;
  return c.baseAmount === null ? 'Comisión anterior al cambio de reglas (se calculó sobre el total, con IVA y envío): revísala a mano.' : null;
}

/** Cuándo se acreditaría sola una comisión pendiente, o null si espera revisión o la entrega. */
export function fechaDeAcreditacion(c: { status: string; type: string; heldReason: string | null; baseAmount: unknown }, orden: { status: string; deliveredAt: Date | null } | null): Date | null {
  if (c.status !== 'PENDING' || motivoEfectivo(c) || !orden || orden.status !== 'DELIVERED' || !orden.deliveredAt) return null;
  return new Date(orden.deliveredAt.getTime() + DIAS_PARA_ACREDITAR * 24 * 60 * 60_000);
}

/** La orden se canceló: su comisión pendiente se rechaza. Una ya aprobada no se toca (el saldo ya se acreditó). */
export async function rejectOrderConversions(orderId: string, db: Cliente = prisma) {
  return db.referralConversion.updateMany({
    where: { orderId, status: 'PENDING' },
    data: { status: 'REJECTED' },
  });
}

/**
 * Aprueba una comisión y acredita el saldo del promotor, todo en una transacción.
 * El cambio de PENDING a APPROVED se hace primero y con condición: dos clics seguidos ya no acreditan dos veces
 * (antes el estado se leía fuera de la transacción).
 */
export async function approveConversion(conversionId: string, influencerId: string) {
  const resultado = await prisma.$transaction(async (tx) => {
    const conversion = await tx.referralConversion.findFirst({
      where: { id: conversionId, influencerId },
      include: { influencer: { select: { userId: true } } },
    });
    if (!conversion) throw new Error('La comisión no es de este promotor');

    // Una compra cuya orden se canceló o dejó de estar pagada no se paga
    if (conversion.type === 'PURCHASE' && conversion.orderId) {
      const order = await tx.order.findUnique({ where: { id: conversion.orderId }, select: { paymentStatus: true, status: true } });
      if (!order || order.paymentStatus !== 'PAID' || order.status === 'CANCELLED') {
        // Se devuelve en vez de lanzar: un throw aquí deshacía el rechazo junto con la transacción
        await tx.referralConversion.updateMany({ where: { id: conversionId, status: 'PENDING' }, data: { status: 'REJECTED' } });
        return { ok: false as const };
      }
    }

    const marcada = await tx.referralConversion.updateMany({
      where: { id: conversionId, influencerId, status: 'PENDING' },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    if (marcada.count === 0) throw new Error('La comisión ya no está pendiente');

    const monto = Number(conversion.commission);
    if (monto > 0) {
      const balance = await tx.userBalance.upsert({
        where: { userId: conversion.influencer.userId },
        create: { userId: conversion.influencer.userId, balance: 0, currency: 'USD' },
        update: {},
      });
      await tx.userBalance.update({ where: { id: balance.id }, data: { balance: { increment: montoDecimal(monto) } } });
      await tx.transaction.create({
        data: {
          balanceId: balance.id,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: montoDecimal(monto),
          currency: 'USD',
          description: 'Comisión de promotor por una compra referida (Puntos ES)',
          reference: `REF-${conversion.id}`,
          paymentMethod: 'REFERRAL',
        },
      });
    }

    return { ok: true as const, id: conversion.id, monto, promotorUserId: conversion.influencer.userId };
  });

  if (!resultado.ok) throw new Error('La orden de esta comisión ya no está pagada: se rechazó');
  if (resultado.monto > 0) {
    void createNotification({
      userId: resultado.promotorUserId,
      type: 'REFERRAL_COMMISSION',
      title: `Se acreditaron ${formatPuntos(resultado.monto)}`,
      message: 'Tu comisión por una compra ya está en tus Puntos ES. Úsalos en cualquier compra de la tienda.',
      link: '/customer/balance',
      icon: 'gift',
    });
  }
  return resultado.id;
}
