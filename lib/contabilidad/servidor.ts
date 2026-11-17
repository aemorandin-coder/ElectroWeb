// C-229: las facturas de talonario en la base. La web no emite la factura: el equipo la escribe en el papel con los datos
// que prepara el panel, y aquí queda registrada con su número y su control (docs/plan/CONTABILIDAD.md §6).
//
// Reglas:
// - Los montos de una orden, el número que toca y su control los pone el servidor; del navegador solo llegan elecciones,
//   textos y, en una venta sin orden, los renglones que escribe el equipo.
// - Una factura emitida no se cambia: se anula con motivo (Providencia 00093, art. 21: el papel anulado se guarda).
// - Dos personas no pueden registrar el mismo número: la próxima del talonario sube dentro de la misma transacción, y la
//   base no acepta dos facturas con el mismo número en un talonario.

import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { conceptoEntrega } from '@/lib/facturacion';
import { describirPago } from '@/lib/order-pago';
import { porcentajeIva } from '@/lib/pricing';
import { rangoMes } from '@/lib/relacion-ventas';
import { facturaDTO, talonarioDTO, type CompradorDTO, type FacturaDTO, type TalonarioDTO } from '@/lib/dto/contabilidad';
import {
  fechaDesdeTexto, hoyVe, montosDeOrdenes, nombreMes, normalizarDocumento, periodoDe, r2, renglonDesdeUSD, tipoComprador,
  totales as totalesDe, type Renglon, type TotalesFactura,
} from './montos';
import type { DatosTalonario, PedidoFactura } from './esquemas';
import { armarLibro, type LibroVentas } from './libro';
import { etiquetaFactura, numeroControl, numeroFactura, problemasTalonario } from './talonario';

type Db = PrismaClient | Prisma.TransactionClient;

export type Resultado<T> = { ok: true; datos: T } | { ok: false; status: number; error: string; campo?: string; extra?: Record<string, unknown> };

const falla = (status: number, error: string, campo?: string, extra?: Record<string, unknown>) => ({ ok: false as const, status, error, campo, extra });

/** Una orden que no se puede facturar: cancelada o devuelta */
const ESTADOS_SIN_FACTURA = ['CANCELLED', 'REFUNDED'];

// ── El talonario ─────────────────────────────────────────────────────────────────────────

/** El talonario en uso: el más viejo que todavía tiene facturas */
export async function talonarioActivo(db: Db = prisma) {
  const lista = await db.talonario.findMany({ where: { estado: 'EN_USO' }, orderBy: { createdAt: 'asc' } });
  return lista.find((t) => t.proximo <= t.numeroHasta) ?? null;
}

export async function talonarios(): Promise<TalonarioDTO[]> {
  const lista = await prisma.talonario.findMany({ orderBy: { createdAt: 'desc' } });
  return lista.map(talonarioDTO);
}

/** Lo que se precarga al cargar un talonario: los datos de la empresa que tiene Configuración */
export async function datosEmpresa(): Promise<{ nombre: string; rif: string; domicilio: string; telefono: string }> {
  const s = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { legalName: true, companyName: true, rif: true, address: true, phone: true } });
  return { nombre: s?.legalName || s?.companyName || '', rif: s?.rif || '', domicilio: s?.address || '', telefono: s?.phone || '' };
}

export async function crearTalonario(datos: DatosTalonario, usuarioId: string): Promise<Resultado<TalonarioDTO>> {
  const problemas = problemasTalonario(datos);
  const primero = Object.entries(problemas)[0];
  if (primero) return falla(400, primero[1] as string, primero[0]);

  // Otro talonario de la misma serie con números que se cruzan: casi seguro es el mismo, cargado dos veces
  const cruzado = await prisma.talonario.findFirst({
    where: { serie: datos.serie, numeroDesde: { lte: datos.numeroHasta }, numeroHasta: { gte: datos.numeroDesde } },
    select: { numeroDesde: true, numeroHasta: true },
  });
  if (cruzado) {
    return falla(409, `Ya hay un talonario de la Serie ${datos.serie} con las facturas ${cruzado.numeroDesde} a ${cruzado.numeroHasta}.`, 'numeroDesde');
  }

  const creado = await prisma.talonario.create({
    data: {
      serie: datos.serie,
      numeroDesde: datos.numeroDesde,
      numeroHasta: datos.numeroHasta,
      proximo: datos.proximo,
      controlSerie: datos.controlSerie,
      controlDesde: datos.controlDesde,
      controlHasta: datos.controlHasta,
      emisorNombre: datos.emisorNombre,
      emisorRif: datos.emisorRif,
      emisorDomicilio: datos.emisorDomicilio,
      emisorTelefono: datos.emisorTelefono || null,
      imprenta: datos.imprenta,
      imprentaRif: datos.imprentaRif,
      autorizacion: datos.autorizacion,
      elaboradoEl: datos.elaboradoEl ? fechaDesdeTexto(datos.elaboradoEl) : null,
      creadoPorId: usuarioId,
    },
  });
  return { ok: true, datos: talonarioDTO(creado) };
}

// ── Preparar una factura ─────────────────────────────────────────────────────────────────

export interface Borrador {
  origen: 'ORDEN' | 'TIENDA';
  talonario: TalonarioDTO | null;
  numero: number | null;
  numeroTexto: string | null;
  numeroControl: string | null;
  fecha: string;
  periodo: string;
  comprador: CompradorDTO;
  /** Lo que dice la orden, para avisar si se cambió */
  compradorDeLaOrden: CompradorDTO | null;
  /** Lo que falta para poder emitirla (vacío: lista) */
  falta: string[];
  condicionPago: 'CONTADO' | 'CREDITO';
  renglones: Renglon[];
  totales: TotalesFactura;
  alicuota: number;
  /** C-230: la tasa BCV del día de la factura (la contadora, 16/11) */
  tasa: number;
  /** La tasa con la que se cobró la orden, si es otra: solo para que se vea */
  tasaOrden: number | null;
  totalUSD: number;
  /** Lo que pagó el cliente en bolívares (solo con órdenes) y la diferencia con el total de la factura */
  cobradoBs: number | null;
  diferenciaBs: number;
  ordenes: Array<{ id: string; orderNumber: string; pagadaEl: string | null; metodo: string | null }>;
  avisos: string[];
}

const SELECT_ORDEN = {
  id: true, orderNumber: true, userId: true, guestName: true, guestEmail: true, guestPhone: true, status: true, paymentStatus: true,
  paymentMethod: true, deliveryMethod: true, subtotalUSD: true, taxUSD: true, shippingUSD: true, totalUSD: true, discountUSD: true,
  exchangeRate: true, exchangeRateVES: true, totalVES: true, billingType: true, billingName: true, billingTaxId: true, billingAddress: true,
  invoiceNumber: true, documentoFiscalId: true, paidAt: true, createdAt: true, recipientPhone: true, pointsUSD: true,
  user: { select: { name: true, email: true, profile: { select: { phone: true, idNumber: true } } } },
  items: { select: { quantity: true, priceUSD: true, productName: true, digitalVariantLabel: true, product: { select: { name: true } } } },
} satisfies Prisma.OrderSelect;

type OrdenLeida = Prisma.OrderGetPayload<{ select: typeof SELECT_ORDEN }>;

/** "Gift card PlayStation · $25": el nombre de la orden y, si no lo trae, la variante */
function descripcionItem(item: OrdenLeida['items'][number]): string {
  const nombre = (item.productName || item.product?.name || 'Producto').trim();
  const variante = item.digitalVariantLabel?.trim();
  return variante && !nombre.toLowerCase().includes(variante.toLowerCase()) ? `${nombre} · ${variante}` : nombre;
}

function compradorDeOrden(o: OrdenLeida): CompradorDTO {
  const documento = normalizarDocumento(o.billingTaxId || o.user?.profile?.idNumber || '') ?? '';
  return {
    tipo: o.billingType === 'COMPANY' ? 'EMPRESA' : documento ? tipoComprador(documento) : 'PERSONA',
    nombre: (o.billingName || o.user?.name || o.guestName || '').trim(),
    documento,
    domicilio: (o.billingAddress || '').trim(),
    telefono: (o.user?.profile?.phone || o.guestPhone || o.recipientPhone || '').trim(),
  };
}

function faltaDe(c: CompradorDTO): string[] {
  const falta: string[] = [];
  if (c.nombre.length < 2) falta.push('El nombre o la razón social');
  if (!normalizarDocumento(c.documento)) falta.push('El RIF o la cédula');
  if (c.tipo === 'EMPRESA' && c.domicilio.length < 10) falta.push('El domicilio fiscal de la empresa');
  return falta;
}

async function alicuotaGeneral(db: Db): Promise<number> {
  const s = await db.companySettings.findUnique({ where: { id: 'default' }, select: { taxPercent: true } });
  const p = Number(s?.taxPercent);
  return Number.isFinite(p) && p > 0 ? p : 16;
}

const numeroTasa = (n: number) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);

/**
 * C-230: la factura va a la tasa BCV del día en que se escribe (la contadora, 16/11), no a la de la orden. La de hoy sale
 * de Configuración (la automática del BCV); la de otro día la escribe quien factura. Una tasa a más del triple o a menos
 * de un tercio de la de hoy es casi siempre una coma corrida: se rechaza.
 */
async function tasaDeLaFactura(fecha: string, enviada: number | undefined, db: Db): Promise<Resultado<number>> {
  const s = await db.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true } });
  const n = Number(s?.exchangeRateVES);
  const deHoy = Number.isFinite(n) && n > 0 ? n : null;
  if (enviada === undefined) {
    if (fecha === hoyVe() && deHoy) return { ok: true, datos: deHoy };
    return falla(400, fecha === hoyVe()
      ? 'No hay una tasa BCV en Configuración: escribe la de hoy.'
      : `Escribe la tasa BCV del ${fecha.split('-').reverse().join('/')}: la factura va a la tasa del día en que se escribe.`, 'tasa');
  }
  if (deHoy && (enviada > deHoy * 3 || enviada < deHoy / 3)) {
    return falla(400, `La tasa ${numeroTasa(enviada)} está muy lejos de la de hoy (${numeroTasa(deHoy)}). Revisa la coma.`, 'tasa');
  }
  return { ok: true, datos: enviada };
}

/** Los datos de la factura, calculados desde la base. No guarda nada. */
export async function prepararFactura(pedido: PedidoFactura, db: Db = prisma): Promise<Resultado<Borrador>> {
  const fecha = fechaDesdeTexto(pedido.fecha);
  if (!fecha) return falla(400, 'La fecha de emisión no es válida.', 'fecha');
  if (pedido.fecha > hoyVe()) return falla(400, 'La fecha de emisión no puede ser de un día que no ha llegado.', 'fecha');
  const periodo = periodoDe(fecha);
  const alicuota = await alicuotaGeneral(db);
  const t = await talonarioActivo(db);
  const avisos: string[] = [];

  const laTasa = await tasaDeLaFactura(pedido.fecha, pedido.tasa, db);
  if (!laTasa.ok) return laTasa;
  const tasa = laTasa.datos;
  let tasaOrden: number | null = null;
  let renglones: Renglon[];
  let totales: TotalesFactura;
  let totalUSD: number;
  let cobradoBs: number | null = null;
  let comprador: CompradorDTO;
  let compradorDeLaOrden: CompradorDTO | null = null;
  let ordenes: Borrador['ordenes'] = [];

  if (pedido.origen === 'ORDEN') {
    const ids = [...new Set(pedido.ordenIds)];
    const leidas = await db.order.findMany({ where: { id: { in: ids } }, select: SELECT_ORDEN, orderBy: { createdAt: 'asc' } });
    if (leidas.length !== ids.length) return falla(404, 'No se encontró la orden.', 'ordenIds');

    const cliente = (o: OrdenLeida) => o.userId ?? o.guestEmail ?? o.id;
    if (new Set(leidas.map(cliente)).size > 1) return falla(400, 'Una factura junta solo órdenes del mismo cliente.', 'ordenIds');
    for (const o of leidas) {
      if (o.documentoFiscalId) return falla(409, `La orden ${o.orderNumber} ya tiene su factura (${o.invoiceNumber ?? 'registrada'}).`, 'ordenIds');
      if (ESTADOS_SIN_FACTURA.includes(o.status)) return falla(400, `La orden ${o.orderNumber} está cancelada o devuelta: no se factura.`, 'ordenIds');
      if (o.paymentStatus !== 'PAID' && pedido.condicionPago !== 'CREDITO') {
        return falla(400, `La orden ${o.orderNumber} todavía no está pagada. Si es a crédito, elige "Crédito".`, 'condicionPago');
      }
      if (o.invoiceNumber) avisos.push(`La orden ${o.orderNumber} tenía anotada la factura "${o.invoiceNumber}" a mano: queda la de este talonario.`);
    }

    // La tasa de la orden ya no pone los montos (C-230): queda a la vista si es otra
    const cobrada = Number(leidas[0].exchangeRateVES ?? leidas[0].exchangeRate) || 0;
    if (cobrada > 0 && Math.abs(cobrada - tasa) >= 0.005) tasaOrden = cobrada;

    const montos = montosDeOrdenes(
      leidas.map((o) => ({
        orderNumber: o.orderNumber,
        deliveryMethod: o.deliveryMethod,
        items: o.items.map((i) => ({ quantity: i.quantity, priceUSD: Number(i.priceUSD) || 0, descripcion: descripcionItem(i) })),
        discountUSD: Number(o.discountUSD) || 0,
        shippingUSD: Number(o.shippingUSD) || 0,
        taxUSD: Number(o.taxUSD) || 0,
        totalUSD: Number(o.totalUSD) || 0,
      })),
      tasa,
      alicuota,
      conceptoEntrega,
    );
    renglones = montos.renglones;
    totales = montos.totales;
    totalUSD = montos.totalUSD;
    cobradoBs = montos.cobradoBs;
    for (const numero of montos.sinIva) {
      const o = leidas.find((x) => x.orderNumber === numero);
      const fisico = o?.items.some((i) => !i.digitalVariantLabel);
      avisos.push(fisico
        ? `La orden ${numero} no guardó IVA: sus renglones van como exentos (E). Si no lo son, consúltalo con la contadora.`
        : `La orden ${numero} es de productos digitales, que la tienda vende sin IVA (C-151): van como exentos (E).`);
    }
    for (const o of leidas) {
      const p = porcentajeIva(Number(o.totalUSD) || 0, Number(o.taxUSD) || 0);
      if (p > 0 && p !== alicuota) avisos.push(`La orden ${o.orderNumber} se cobró con IVA del ${p} % y la alícuota de hoy es ${alicuota} %.`);
      const pagada = o.paidAt ?? (o.paymentStatus === 'PAID' ? o.createdAt : null);
      if (pagada && periodoDe(pagada) !== periodo) {
        avisos.push(`La orden ${o.orderNumber} se cobró en ${nombreMes(periodoDe(pagada))}: con esta fecha, la factura va en el libro de ${nombreMes(periodo)}. Si no es así, consúltalo con la contadora.`);
      }
    }
    if (pedido.descripciones) {
      if (pedido.descripciones.length !== renglones.length) return falla(400, 'Las descripciones no coinciden con los renglones: vuelve a abrir el paso.', 'descripciones');
      renglones = renglones.map((r, i) => ({ ...r, descripcion: pedido.descripciones![i] }));
    }
    compradorDeLaOrden = compradorDeOrden(leidas[0]);
    comprador = pedido.comprador
      ? { ...pedido.comprador, tipo: tipoComprador(pedido.comprador.documento) }
      : compradorDeLaOrden;
    ordenes = leidas.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      pagadaEl: (o.paidAt ?? null)?.toISOString() ?? null,
      metodo: describirPago(o.paymentMethod, [], { puntosUSD: Number(o.pointsUSD) || 0 }).titulo,
    }));
  } else {
    renglones = pedido.renglones.map((r) => renglonDesdeUSD(r.cantidad, r.descripcion, r.exento, r.precioUSD, tasa, alicuota));
    totales = totalesDe(renglones, alicuota);
    totalUSD = r2(pedido.renglones.reduce((s, r) => s + r.precioUSD * r.cantidad, 0));
    comprador = { ...pedido.comprador, tipo: tipoComprador(pedido.comprador.documento) };
  }

  if (renglones.length > 12) avisos.push(`Son ${renglones.length} renglones y el talonario tiene 12: hacen falta dos facturas.`);
  if (!t) avisos.push('No hay un talonario con facturas por usar: el dueño lo carga en Facturas.');
  const diferenciaBs = cobradoBs === null ? 0 : r2(totales.totalBs - cobradoBs);
  if (Math.abs(diferenciaBs) >= 0.01) {
    avisos.push(`El total de la factura difiere en Bs ${diferenciaBs.toFixed(2).replace('.', ',')} de lo que pagó el cliente: es el redondeo de los precios sin IVA.`);
  }

  return {
    ok: true,
    datos: {
      origen: pedido.origen,
      talonario: t ? talonarioDTO(t) : null,
      numero: t ? t.proximo : null,
      numeroTexto: t ? numeroFactura(t, t.proximo) : null,
      numeroControl: t ? numeroControl(t, t.proximo) : null,
      fecha: pedido.fecha,
      periodo,
      comprador,
      compradorDeLaOrden,
      falta: faltaDe(comprador),
      condicionPago: pedido.condicionPago,
      renglones,
      totales,
      alicuota,
      tasa,
      tasaOrden,
      totalUSD,
      cobradoBs,
      diferenciaBs,
      ordenes,
      avisos,
    },
  };
}

// ── Emitir, anular y anular en blanco ────────────────────────────────────────────────────

class Conflicto extends Error {
  constructor(public resultado: { ok: false; status: number; error: string; campo?: string; extra?: Record<string, unknown> }) {
    super(resultado.error);
  }
}

export interface Emitida { id: string; etiqueta: string; ordenIds: string[]; compradorCambiado: boolean }

/**
 * Registra la factura que el equipo escribió en el papel. `numeroEsperado` es el que vio en pantalla: si otra persona
 * registró ese número mientras tanto, no se guarda nada y se le dice cuál escribir.
 */
export async function emitirFactura(pedido: PedidoFactura, numeroEsperado: number, usuarioId: string): Promise<Resultado<Emitida>> {
  try {
    const datos = await prisma.$transaction(async (tx) => {
      const preparado = await prepararFactura(pedido, tx);
      if (!preparado.ok) throw new Conflicto(preparado);
      const b = preparado.datos;
      const t = await talonarioActivo(tx);
      if (!t) throw new Conflicto(falla(409, 'No hay un talonario con facturas por usar: el dueño lo carga en Facturas.'));
      if (t.proximo !== numeroEsperado) {
        throw new Conflicto(falla(409, `La ${numeroFactura(t, numeroEsperado)} ya está registrada. Escribe la ${numeroFactura(t, t.proximo)}.`, 'numeroEsperado', { numero: t.proximo }));
      }
      if (b.falta.length) throw new Conflicto(falla(400, `Falta: ${b.falta.join(', ').toLowerCase()}.`, 'comprador'));
      if (b.renglones.length > 12) throw new Conflicto(falla(400, 'Son más de 12 renglones: no caben en una factura.', 'renglones'));

      // La próxima sube solo si nadie la tomó (si otro la subió, count es 0 y no se guarda nada)
      const subio = await tx.talonario.updateMany({
        where: { id: t.id, proximo: numeroEsperado },
        data: { proximo: numeroEsperado + 1, ...(numeroEsperado + 1 > t.numeroHasta ? { estado: 'AGOTADO' } : {}) },
      });
      if (subio.count !== 1) throw new Conflicto(falla(409, 'Otra persona acaba de registrar una factura. Vuelve a revisar el número.', 'numeroEsperado'));

      const numeroTexto = numeroFactura(t, numeroEsperado);
      const doc = await tx.documentoFiscal.create({
        data: {
          talonarioId: t.id,
          serie: t.serie,
          numero: numeroEsperado,
          numeroControl: numeroControl(t, numeroEsperado),
          emitidaEl: fechaDesdeTexto(b.fecha)!,
          periodo: b.periodo,
          origen: b.origen,
          compradorTipo: b.comprador.tipo,
          compradorNombre: b.comprador.nombre,
          compradorDocumento: normalizarDocumento(b.comprador.documento),
          compradorDomicilio: b.comprador.domicilio || null,
          compradorTelefono: b.comprador.telefono || null,
          condicionPago: b.condicionPago,
          renglones: b.renglones as unknown as Prisma.InputJsonValue,
          descuentoBs: b.totales.descuentoBs.toFixed(2),
          baseBs: b.totales.baseBs.toFixed(2),
          alicuota: b.alicuota.toFixed(2),
          ivaBs: b.totales.ivaBs.toFixed(2),
          exentoBs: b.totales.exentoBs.toFixed(2),
          totalBs: b.totales.totalBs.toFixed(2),
          totalUSD: b.totalUSD.toFixed(2),
          tasa: String(b.tasa),
          creadoPorId: usuarioId,
        },
        select: { id: true },
      });

      const etiqueta = etiquetaFactura(t.serie, numeroTexto);
      const ordenIds = b.ordenes.map((o) => o.id);
      if (ordenIds.length) {
        const unidas = await tx.order.updateMany({
          where: { id: { in: ordenIds }, documentoFiscalId: null },
          data: { documentoFiscalId: doc.id, invoiceNumber: etiqueta, invoicedAt: new Date() },
        });
        if (unidas.count !== ordenIds.length) throw new Conflicto(falla(409, 'Otra persona acaba de facturar esa orden.', 'ordenIds'));
      }
      const o = b.compradorDeLaOrden;
      const compradorCambiado = Boolean(o && (o.nombre !== b.comprador.nombre || o.documento !== normalizarDocumento(b.comprador.documento)));
      return { id: doc.id, etiqueta, ordenIds, compradorCambiado };
    });
    return { ok: true, datos };
  } catch (error) {
    if (error instanceof Conflicto) return error.resultado;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return falla(409, 'Ese número ya está registrado en el talonario. Vuelve a revisar el número.', 'numeroEsperado');
    }
    throw error;
  }
}

export async function anularFactura(id: string, motivo: string, usuarioId: string): Promise<Resultado<{ etiqueta: string; ordenIds: string[] }>> {
  const doc = await prisma.documentoFiscal.findUnique({ where: { id }, include: { talonario: true, ordenes: { select: { id: true } } } });
  if (!doc) return falla(404, 'No se encontró la factura.');
  if (doc.estado === 'ANULADA') return falla(409, 'Esa factura ya está anulada.');
  const etiqueta = etiquetaFactura(doc.serie, doc.talonario ? numeroFactura(doc.talonario, doc.numero) : String(doc.numero));
  const ordenIds = doc.ordenes.map((o) => o.id);
  await prisma.$transaction([
    prisma.documentoFiscal.update({ where: { id }, data: { estado: 'ANULADA', motivoAnulacion: motivo, anuladaEl: new Date(), anuladaPorId: usuarioId } }),
    // La orden vuelve a quedar sin factura (y su pedido deja de mostrar el número)
    prisma.order.updateMany({ where: { documentoFiscalId: id }, data: { documentoFiscalId: null, invoiceNumber: null, invoicedAt: null } }),
  ]);
  return { ok: true, datos: { etiqueta, ordenIds } };
}

/** Un papel que se dañó antes de escribirlo (o se saltó): se anula sin datos y el talonario pasa a la siguiente. */
export async function anularEnBlanco(numeroEsperado: number, motivo: string, usuarioId: string): Promise<Resultado<{ id: string; etiqueta: string }>> {
  try {
    const datos = await prisma.$transaction(async (tx) => {
      const t = await talonarioActivo(tx);
      if (!t) throw new Conflicto(falla(409, 'No hay un talonario con facturas por usar.'));
      if (t.proximo !== numeroEsperado) {
        throw new Conflicto(falla(409, `La ${numeroFactura(t, numeroEsperado)} ya está registrada. La próxima es la ${numeroFactura(t, t.proximo)}.`, 'numeroEsperado', { numero: t.proximo }));
      }
      const subio = await tx.talonario.updateMany({
        where: { id: t.id, proximo: numeroEsperado },
        data: { proximo: numeroEsperado + 1, ...(numeroEsperado + 1 > t.numeroHasta ? { estado: 'AGOTADO' } : {}) },
      });
      if (subio.count !== 1) throw new Conflicto(falla(409, 'Otra persona acaba de registrar una factura. Vuelve a revisar el número.'));
      const hoy = hoyVe();
      const doc = await tx.documentoFiscal.create({
        data: {
          talonarioId: t.id, serie: t.serie, numero: numeroEsperado, numeroControl: numeroControl(t, numeroEsperado),
          emitidaEl: fechaDesdeTexto(hoy)!, periodo: hoy.slice(0, 7), origen: 'EN_BLANCO', estado: 'ANULADA',
          motivoAnulacion: motivo, anuladaEl: new Date(), anuladaPorId: usuarioId, creadoPorId: usuarioId,
        },
        select: { id: true },
      });
      return { id: doc.id, etiqueta: etiquetaFactura(t.serie, numeroFactura(t, numeroEsperado)) };
    });
    return { ok: true, datos };
  } catch (error) {
    if (error instanceof Conflicto) return error.resultado;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return falla(409, 'Ese número ya está registrado en el talonario.');
    throw error;
  }
}

// ── Leer ─────────────────────────────────────────────────────────────────────────────────

async function nombresDe(ids: Array<string | null | undefined>): Promise<Record<string, string>> {
  const unicos = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (!unicos.length) return {};
  const usuarios = await prisma.user.findMany({ where: { id: { in: unicos } }, select: { id: true, name: true, email: true } });
  return Object.fromEntries(usuarios.map((u) => [u.id, u.name || u.email || 'Alguien del equipo']));
}

export async function facturasDelMes(periodo: string): Promise<FacturaDTO[]> {
  const docs = await prisma.documentoFiscal.findMany({
    where: { periodo },
    include: { talonario: true, ordenes: { select: { id: true, orderNumber: true } } },
    orderBy: [{ serie: 'asc' }, { numero: 'asc' }],
  });
  const nombres = await nombresDe(docs.flatMap((d) => [d.creadoPorId, d.anuladaPorId]));
  return docs.map((d) => facturaDTO(d, nombres));
}

export async function facturaPorId(id: string): Promise<FacturaDTO | null> {
  const d = await prisma.documentoFiscal.findUnique({ where: { id }, include: { talonario: true, ordenes: { select: { id: true, orderNumber: true } } } });
  if (!d) return null;
  return facturaDTO(d, await nombresDe([d.creadoPorId, d.anuladaPorId]));
}

export interface CompraSinFactura {
  /** Las órdenes de una misma compra (la física y la digital, o los paquetes de C-199) */
  ordenIds: string[];
  ordenes: string[];
  cliente: string;
  documento: string;
  totalUSD: number;
  totalBs: number;
  pagadaEl: string | null;
  metodo: string | null;
  productos: number;
  /** Solo digitales: sin IVA */
  digital: boolean;
}

/**
 * Las órdenes cobradas en el mes que todavía no tienen factura (ni del talonario ni anotada a mano en C-147), juntas
 * por compra: las órdenes del mismo cliente creadas en el mismo minuto son una sola compra (C-151 y C-199 la dividen).
 */
export async function comprasSinFactura(periodo: string): Promise<CompraSinFactura[]> {
  const rango = rangoMes(periodo);
  if (!rango) return [];
  const enRango = { gte: rango.desde, lt: rango.hasta };
  const ordenes = await prisma.order.findMany({
    where: {
      paymentStatus: 'PAID',
      status: { notIn: ESTADOS_SIN_FACTURA as Prisma.EnumOrderStatusFilter['notIn'] },
      documentoFiscalId: null,
      invoiceNumber: null,
      OR: [{ paidAt: enRango }, { paidAt: null, createdAt: enRango }],
    },
    select: {
      id: true, orderNumber: true, userId: true, guestEmail: true, guestName: true, createdAt: true, paidAt: true, paymentMethod: true, pointsUSD: true,
      totalUSD: true, totalVES: true, taxUSD: true, billingName: true, billingTaxId: true,
      user: { select: { name: true, profile: { select: { idNumber: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });

  const compras: CompraSinFactura[] = [];
  /** De quién y cuándo es cada compra, para juntar sus órdenes */
  const origen = new Map<CompraSinFactura, { clave: string; creada: number }>();
  for (const o of ordenes) {
    const clave = o.userId ?? o.guestEmail ?? o.id;
    const creada = o.createdAt.getTime();
    const misma = compras.find((c) => {
      const m = origen.get(c);
      return m?.clave === clave && Math.abs(m.creada - creada) <= 60_000;
    });
    const totalUSD = Number(o.totalUSD) || 0;
    const totalBs = Number(o.totalVES) || 0;
    const digital = !(Number(o.taxUSD) > 0);
    if (misma) {
      misma.ordenIds.push(o.id);
      misma.ordenes.push(o.orderNumber);
      misma.totalUSD = r2(misma.totalUSD + totalUSD);
      misma.totalBs = r2(misma.totalBs + totalBs);
      misma.productos += o._count.items;
      misma.digital = misma.digital && digital;
      continue;
    }
    const nueva: CompraSinFactura = {
      ordenIds: [o.id],
      ordenes: [o.orderNumber],
      cliente: (o.billingName || o.user?.name || o.guestName || 'Sin nombre').trim(),
      documento: normalizarDocumento(o.billingTaxId || o.user?.profile?.idNumber || '') ?? '',
      totalUSD,
      totalBs,
      pagadaEl: (o.paidAt ?? o.createdAt).toISOString(),
      metodo: describirPago(o.paymentMethod, [], { puntosUSD: Number(o.pointsUSD) || 0 }).titulo,
      productos: o._count.items,
      digital,
    };
    origen.set(nueva, { clave, creada });
    compras.push(nueva);
  }
  return compras.reverse();
}

// ── El libro de ventas (C-230) ───────────────────────────────────────────────────────────

/** El libro del mes: una línea por factura, emitidas y anuladas (lib/contabilidad/libro.ts). Solo montos y datos del libro. */
export async function libroDeVentas(periodo: string): Promise<LibroVentas> {
  const docs = await prisma.documentoFiscal.findMany({
    where: { periodo },
    select: {
      id: true, tipo: true, estado: true, origen: true, serie: true, numero: true, numeroControl: true, emitidaEl: true,
      compradorDocumento: true, compradorNombre: true, totalBs: true, exentoBs: true, baseBs: true, alicuota: true, ivaBs: true,
      ivaRetenidoBs: true, comprobanteRetencion: true, talonario: { select: { numeroHasta: true } },
    },
  });
  return armarLibro(periodo, docs.map((d) => ({
    id: d.id,
    tipo: d.tipo,
    estado: d.estado,
    origen: d.origen,
    etiqueta: etiquetaFactura(d.serie, d.talonario ? numeroFactura(d.talonario, d.numero) : String(d.numero).padStart(4, '0')),
    numeroControl: d.numeroControl,
    emitidaEl: d.emitidaEl,
    compradorDocumento: d.compradorDocumento,
    compradorNombre: d.compradorNombre,
    totalBs: Number(d.totalBs),
    exentoBs: Number(d.exentoBs),
    baseBs: Number(d.baseBs),
    alicuota: Number(d.alicuota),
    ivaBs: Number(d.ivaBs),
    ivaRetenidoBs: d.ivaRetenidoBs === null ? null : Number(d.ivaRetenidoBs),
    comprobanteRetencion: d.comprobanteRetencion,
  })));
}

/**
 * Cuántas facturas pide un mes, para saber hasta cuándo alcanza el talonario: las registradas en los últimos 30 días
 * (las de la web y las de la tienda) más las compras de la web cobradas en esos días que todavía no tienen factura.
 * Desde el 16/11 se factura cada venta (la contadora), así que cada venta es un papel.
 */
export async function ventasDe30Dias(ahora: Date = new Date()): Promise<number> {
  const desde = new Date(ahora.getTime() - 30 * 86_400_000);
  const [facturas, sinFactura] = await Promise.all([
    prisma.documentoFiscal.count({ where: { tipo: 'FACTURA', origen: { not: 'EN_BLANCO' }, emitidaEl: { gte: desde } } }),
    prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        status: { notIn: ESTADOS_SIN_FACTURA as Prisma.EnumOrderStatusFilter['notIn'] },
        documentoFiscalId: null,
        invoiceNumber: null,
        OR: [{ paidAt: { gte: desde } }, { paidAt: null, createdAt: { gte: desde } }],
      },
      select: { userId: true, guestEmail: true, id: true, createdAt: true },
      take: 2000,
    }),
  ]);
  // Las órdenes de una misma compra (del mismo cliente, en el mismo minuto) llevan una sola factura
  const compras = new Set(sinFactura.map((o) => `${o.userId ?? o.guestEmail ?? o.id}·${Math.floor(o.createdAt.getTime() / 60_000)}`));
  return facturas + compras.size;
}

/** La tasa de hoy (Configuración) y la alícuota general, para una venta sin orden */
export async function tasaYAlicuota(): Promise<{ tasa: number | null; alicuota: number }> {
  const s = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true, taxPercent: true } });
  const tasa = Number(s?.exchangeRateVES);
  const p = Number(s?.taxPercent);
  return { tasa: Number.isFinite(tasa) && tasa > 0 ? tasa : null, alicuota: Number.isFinite(p) && p > 0 ? p : 16 };
}
