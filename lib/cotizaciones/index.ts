// Cotizaciones (C-148), lado del servidor: numeración, guardado con totales del servidor y lo que ve cada quien.
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { montoDecimal } from '@/lib/pricing';
import { getPublicSettings } from '@/lib/site-settings';
import { apartadoPorOtros, descontarDisponible } from '@/lib/reservas';
import { publicarStock } from '@/lib/realtime/bus';
import { notifyStockCrossings } from '@/lib/stock-alerts';
import { createAuditLog } from '@/lib/audit-log';
import { estaVencida, totalesCotizacion, venceEl, type CotizacionEntrada, type EstadoCotizacion } from './core';

const conLineas = { items: { orderBy: { position: 'asc' } } } satisfies Prisma.QuoteInclude;
type CotizacionConLineas = Prisma.QuoteGetPayload<{ include: typeof conLineas }>;

/** PRES-2026-0001: consecutivo por año. Dos a la vez chocan en el índice único y se reintenta. */
async function siguienteNumero(tx: Prisma.TransactionClient): Promise<string> {
  const prefijo = `PRES-${new Date().getFullYear()}-`;
  const ultima = await tx.quote.findFirst({ where: { number: { startsWith: prefijo } }, orderBy: { number: 'desc' }, select: { number: true } });
  const n = ultima ? Number.parseInt(ultima.number.slice(prefijo.length), 10) || 0 : 0;
  return `${prefijo}${String(n + 1).padStart(4, '0')}`;
}

async function conNumero<T>(crear: (tx: Prisma.TransactionClient, numero: string) => Promise<T>): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await prisma.$transaction(async (tx) => crear(tx, await siguienteNumero(tx)));
    } catch (e) {
      const repetido = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
      if (!repetido || intento >= 4) throw e;
    }
  }
}

const lineasParaGuardar = (items: CotizacionEntrada['items']) => items.map((l, position) => ({
  productId: l.productId ?? null,
  title: l.title,
  description: l.description ?? null,
  quantity: l.quantity,
  unitPriceUSD: montoDecimal(l.unitPriceUSD),
  position,
}));

/** El IVA que va dentro de los precios hoy (Configuración → Precios). */
async function ivaVigente(): Promise<number> {
  const s = await getPublicSettings();
  return s.taxEnabled ? s.taxPercent : 0;
}

export async function crearCotizacion(datos: CotizacionEntrada, extra: { status: EstadoCotizacion; createdById?: string | null; userId?: string | null; requestNote?: string | null }) {
  const taxPercent = await ivaVigente();
  const { totalUSD } = totalesCotizacion(datos.items, taxPercent, datos.advancePercent);
  const { items, ...campos } = datos;
  return conNumero((tx, number) => tx.quote.create({
    data: {
      ...campos,
      number,
      token: randomBytes(18).toString('base64url'),
      status: extra.status,
      createdById: extra.createdById ?? null,
      userId: extra.userId ?? null,
      requestNote: extra.requestNote ?? null,
      totalUSD: montoDecimal(totalUSD),
      taxPercent: montoDecimal(taxPercent),
      items: { create: lineasParaGuardar(items) },
    },
    include: conLineas,
  }));
}

/** Guarda los cambios del panel. Una cotización aprobada ya no se toca. Devuelve null si no existe o está cerrada. */
export async function guardarCotizacion(id: string, datos: CotizacionEntrada) {
  const taxPercent = await ivaVigente();
  const { totalUSD } = totalesCotizacion(datos.items, taxPercent, datos.advancePercent);
  const { items, ...campos } = datos;
  return prisma.$transaction(async (tx) => {
    const r = await tx.quote.updateMany({
      where: { id, status: { not: 'APPROVED' } },
      data: { ...campos, totalUSD: montoDecimal(totalUSD), taxPercent: montoDecimal(taxPercent) },
    });
    if (r.count !== 1) return null;
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    await tx.quoteItem.createMany({ data: lineasParaGuardar(items).map((l) => ({ ...l, quoteId: id })) });
    return tx.quote.findUnique({ where: { id }, include: conLineas });
  });
}

export function buscarCotizacion(id: string) {
  return prisma.quote.findUnique({ where: { id }, include: conLineas });
}

/* ── Lo que ve cada quien ── */

function comun(q: CotizacionConLineas) {
  const taxPercent = Number(q.taxPercent);
  const items = q.items.map((l) => ({
    id: l.id,
    productId: l.productId,
    title: l.title,
    description: l.description,
    quantity: l.quantity,
    unitPriceUSD: Number(l.unitPriceUSD),
  }));
  return {
    number: q.number,
    status: (estaVencida(q.status, q.sentAt, q.validityDays) ? 'EXPIRED' : q.status) as EstadoCotizacion | 'EXPIRED',
    clientName: q.clientName,
    clientDoc: q.clientDoc,
    contactName: q.contactName,
    location: q.location,
    subject: q.subject,
    validityDays: q.validityDays,
    advancePercent: q.advancePercent,
    conditions: q.conditions,
    terms: q.terms,
    taxPercent,
    items,
    totales: totalesCotizacion(items, taxPercent, q.advancePercent),
    sentAt: q.sentAt?.toISOString() ?? null,
    venceEl: venceEl(q.sentAt, q.validityDays)?.toISOString() ?? null,
    approvedAt: q.approvedAt?.toISOString() ?? null,
    approvedName: q.approvedName,
    approvedDoc: q.approvedDoc,
    createdAt: q.createdAt.toISOString(),
  };
}

/** Para el cliente que abre su enlace: sin ids internos, sin su correo ni su teléfono, sin notas ni IP. */
export function aCotizacionPublica(q: CotizacionConLineas) {
  return comun(q);
}
export type CotizacionPublica = ReturnType<typeof aCotizacionPublica>;

/** Para el panel. */
export function aCotizacionAdmin(q: CotizacionConLineas) {
  return {
    ...comun(q),
    // Lo que se descontó del inventario al aprobarla, por línea (C-148b)
    inventario: q.items.filter((l) => l.stockDeducted > 0 || l.stockMissing > 0).map((l) => ({ title: l.title, quantity: l.quantity, descontado: l.stockDeducted, falto: l.stockMissing })),
    id: q.id,
    token: q.token,
    estadoGuardado: q.status as EstadoCotizacion,
    contactEmail: q.contactEmail,
    contactPhone: q.contactPhone,
    requestNote: q.requestNote,
    updatedAt: q.updatedAt.toISOString(),
  };
}
export type CotizacionAdmin = ReturnType<typeof aCotizacionAdmin>;

/** La cotización de un enlace, solo si ya se envió (un borrador no se ve con el enlace). */
export async function cotizacionPorToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null;
  const q = await prisma.quote.findUnique({ where: { token }, include: conLineas });
  return q && (q.status === 'SENT' || q.status === 'APPROVED') ? q : null;
}

/* ── Aprobar y cerrar: el inventario (C-148b) ──
 * Decisión de Andrés del 01/10: el pago de una cotización se coordina por fuera de la tienda, pero al aprobarse se
 * descuentan del inventario los productos del catálogo que se cotizaron, con el número del presupuesto como
 * referencia. Así la tienda no le vende a otro cliente lo que ya está comprometido. Si no se concreta, se devuelven.
 * Solo productos físicos (los digitales no llevan inventario) y sin tocar lo apartado por órdenes de la tienda. */

export interface MovimientoInventario {
  productId: string;
  title: string;
  /** Unidades cotizadas */
  quantity: number;
  /** Unidades que se pudieron descontar (menos que `quantity` si no había) */
  descontado: number;
}

/**
 * Aprueba la cotización y descuenta el inventario, todo o nada. `desde` son los estados desde los que se puede
 * aprobar; con `updatedAt`, solo si nadie la cambió desde que el cliente la vio. Devuelve null si no se pudo.
 */
export async function aprobarCotizacion(
  id: string,
  quien: { nombre: string; documento: string | null; ip: string | null },
  desde: { estados: EstadoCotizacion[]; updatedAt?: Date },
): Promise<{ number: string; movimientos: MovimientoInventario[] } | null> {
  const resultado = await prisma.$transaction(async (tx) => {
    const ahora = new Date();
    const r = await tx.quote.updateMany({
      where: { id, status: { in: desde.estados }, ...(desde.updatedAt ? { updatedAt: desde.updatedAt } : {}) },
      data: { status: 'APPROVED', approvedAt: ahora, approvedName: quien.nombre, approvedDoc: quien.documento, approvedIp: quien.ip },
    });
    if (r.count !== 1) return null;
    const q = await tx.quote.findUniqueOrThrow({ where: { id }, include: conLineas });
    // Aprobada sin haberse enviado (el cliente dijo que sí por WhatsApp): la validez cuenta desde hoy
    if (!q.sentAt) await tx.quote.update({ where: { id }, data: { sentAt: ahora } });

    const movimientos: MovimientoInventario[] = [];
    for (const linea of q.items) {
      if (!linea.productId) continue;
      const producto = await tx.product.findUnique({ where: { id: linea.productId }, select: { productType: true, stock: true } });
      if (!producto || producto.productType === 'DIGITAL') continue;
      let descontado = 0;
      if (await descontarDisponible(tx, linea.productId, linea.quantity)) {
        descontado = linea.quantity;
      } else {
        // No alcanza: se descuenta lo que haya sin apartar, y el aviso al equipo dice cuánto faltó
        const libre = Math.max(0, producto.stock - (await apartadoPorOtros(tx, linea.productId)));
        if (libre > 0 && (await descontarDisponible(tx, linea.productId, Math.min(libre, linea.quantity)))) descontado = Math.min(libre, linea.quantity);
      }
      await tx.quoteItem.update({ where: { id: linea.id }, data: { stockDeducted: descontado, stockMissing: linea.quantity - descontado } });
      movimientos.push({ productId: linea.productId, title: linea.title, quantity: linea.quantity, descontado });
    }
    return { number: q.number, movimientos };
  });
  if (!resultado) return null;

  const cambios = resultado.movimientos.filter((m) => m.descontado > 0);
  if (cambios.length > 0) {
    void publicarStock(cambios.map((m) => m.productId));
    notifyStockCrossings(cambios.map((m) => ({ productId: m.productId, quantity: m.descontado }))).catch((error) => console.error('Error enviando avisos de stock:', error));
    for (const m of cambios) {
      await createAuditLog({
        action: 'PRODUCT_STOCK_CHANGED',
        targetType: 'PRODUCT',
        targetId: m.productId,
        details: { motivo: `Cotización ${resultado.number} aprobada`, producto: m.title, descontado: m.descontado },
        severity: 'INFO',
      });
    }
  }
  return resultado;
}

/** "No se concretó": cierra la cotización y devuelve al inventario lo que se había descontado al aprobarla. */
export async function cerrarCotizacion(id: string): Promise<{ number: string; devuelto: MovimientoInventario[] } | null> {
  const resultado = await prisma.$transaction(async (tx) => {
    const r = await tx.quote.updateMany({ where: { id, status: { not: 'REJECTED' } }, data: { status: 'REJECTED' } });
    if (r.count !== 1) return null;
    const q = await tx.quote.findUniqueOrThrow({ where: { id }, include: conLineas });
    const devuelto: MovimientoInventario[] = [];
    await tx.quoteItem.updateMany({ where: { quoteId: id, stockMissing: { gt: 0 } }, data: { stockMissing: 0 } });
    for (const linea of q.items) {
      if (!linea.productId || linea.stockDeducted <= 0) continue;
      // Condicional: si dos personas la cierran a la vez, las unidades vuelven una sola vez
      const puesto = await tx.quoteItem.updateMany({ where: { id: linea.id, stockDeducted: linea.stockDeducted }, data: { stockDeducted: 0 } });
      if (puesto.count !== 1) continue;
      const existe = await tx.product.updateMany({ where: { id: linea.productId }, data: { stock: { increment: linea.stockDeducted } } });
      if (existe.count === 1) devuelto.push({ productId: linea.productId, title: linea.title, quantity: linea.quantity, descontado: linea.stockDeducted });
    }
    return { number: q.number, devuelto };
  });
  if (!resultado) return null;
  if (resultado.devuelto.length > 0) {
    void publicarStock(resultado.devuelto.map((m) => m.productId));
    for (const m of resultado.devuelto) {
      await createAuditLog({
        action: 'PRODUCT_STOCK_CHANGED',
        targetType: 'PRODUCT',
        targetId: m.productId,
        details: { motivo: `Cotización ${resultado.number} no se concretó`, producto: m.title, devuelto: m.descontado },
        severity: 'INFO',
      });
    }
  }
  return resultado;
}

/** "2 × Teclado" y, si faltó, "1 de 3 × Monitor", para los avisos y el panel. */
export function resumenInventario(movimientos: MovimientoInventario[]): { descontado: string; faltante: string } {
  return {
    descontado: movimientos.filter((m) => m.descontado > 0).map((m) => `${m.descontado} × ${m.title}`).join(', '),
    faltante: movimientos.filter((m) => m.descontado < m.quantity).map((m) => `${m.quantity - m.descontado} de ${m.quantity} × ${m.title}`).join(', '),
  };
}
