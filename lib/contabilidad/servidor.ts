// C-229 y G-76: núcleo de facturación y documentos fiscales (Talonario, Contingencia, Portal SENIAT, Imprenta Digital,
// Notas de Crédito/Débito y Retenciones de IVA).
//
// Reglas de dinero y seguridad:
// - Los montos de una orden, el número correlativo y su control los calcula el servidor (nunca confía en totales del cliente).
// - Un mes con cierre firmado (PeriodoContable.estado === 'CERRADO') bloquea emitir, anular o registrar retenciones en ese período.
// - Dos personas no pueden registrar el mismo número de talonario o digital a la vez (incremento atómico + índice único).

import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { conceptoEntrega } from '@/lib/facturacion';
import { describirPago } from '@/lib/order-pago';
import { porcentajeIva } from '@/lib/pricing';
import { rangoMes } from '@/lib/relacion-ventas';
import { etiquetaDocumento, facturaDTO, talonarioDTO, type CompradorDTO, type FacturaDTO, type TalonarioDTO } from '@/lib/dto/contabilidad';
import { timbrarConImprentaDigital } from './emisores/imprenta-digital';
import {
  fechaDesdeTexto, horaActualVe, hoyVe, montosDeOrdenes, nombreMes, normalizarDocumento, periodoDe, r2, renglonDesdeUSD,
  tipoComprador, totales as totalesDe, type Renglon, type TotalesFactura,
} from './montos';
import type { DatosTalonario, PedidoFactura, PedidoNotaFiscal } from './esquemas';
import { armarLibro, type LibroVentas } from './libro';
import { etiquetaFactura, numeroControl, numeroFactura, problemasTalonario } from './talonario';

type Db = PrismaClient | Prisma.TransactionClient;

export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; status: number; error: string; campo?: string; extra?: Record<string, unknown> };

const falla = (status: number, error: string, campo?: string, extra?: Record<string, unknown>) => ({
  ok: false as const,
  status,
  error,
  campo,
  extra,
});

const ESTADOS_SIN_FACTURA = ['CANCELLED', 'REFUNDED'];

// ── Candado de período cerrado ───────────────────────────────────────────────────────────

export async function verificarPeriodoAbierto(periodo: string, db: Db = prisma): Promise<Resultado<true>> {
  const cierre = await db.periodoContable.findUnique({ where: { periodo }, select: { estado: true } });
  if (cierre?.estado === 'CERRADO') {
    return falla(409, `El mes ${nombreMes(periodo)} está cerrado y firmado: no se puede modificar. Emite una Nota de Crédito o Débito en el mes actual.`, 'fecha');
  }
  return { ok: true, datos: true };
}

// ── El talonario ─────────────────────────────────────────────────────────────────────────

/** El talonario en uso (por defecto NORMAL; si se pide CONTINGENCIA, busca ese primero). */
export async function talonarioActivo(db: Db = prisma, uso: 'NORMAL' | 'CONTINGENCIA' = 'NORMAL') {
  const lista = await db.talonario.findMany({ where: { estado: 'EN_USO', uso }, orderBy: { createdAt: 'asc' } });
  const encontrado = lista.find((t) => t.proximo <= t.numeroHasta);
  if (encontrado || uso === 'NORMAL') return encontrado ?? null;
  // Respaldo si aún no se cargó uno específico de contingencia
  const normales = await db.talonario.findMany({ where: { estado: 'EN_USO', uso: 'NORMAL' }, orderBy: { createdAt: 'asc' } });
  return normales.find((t) => t.proximo <= t.numeroHasta) ?? null;
}

export async function talonarios(): Promise<TalonarioDTO[]> {
  const lista = await prisma.talonario.findMany({ orderBy: { createdAt: 'desc' } });
  return lista.map(talonarioDTO);
}

/** Lo que se precarga al cargar un talonario: los datos de la empresa que tiene Ajustes */
export async function datosEmpresa(): Promise<{ nombre: string; rif: string; domicilio: string; telefono: string }> {
  const s = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: { legalName: true, companyName: true, rif: true, address: true, phone: true },
  });
  return { nombre: s?.legalName || s?.companyName || '', rif: s?.rif || '', domicilio: s?.address || '', telefono: s?.phone || '' };
}

export async function crearTalonario(datos: DatosTalonario, usuarioId: string): Promise<Resultado<TalonarioDTO>> {
  const problemas = problemasTalonario(datos);
  const primero = Object.entries(problemas)[0];
  if (primero) return falla(400, primero[1] as string, primero[0]);

  const cruzado = await prisma.talonario.findFirst({
    where: { serie: datos.serie, numeroDesde: { lte: datos.numeroHasta }, numeroHasta: { gte: datos.numeroDesde } },
    select: { numeroDesde: true, numeroHasta: true },
  });
  if (cruzado) {
    return falla(409, `Ya hay un talonario de la Serie ${datos.serie} con las facturas ${cruzado.numeroDesde} a ${cruzado.numeroHasta}.`, 'numeroDesde');
  }

  const creado = await prisma.talonario.create({
    data: {
      uso: datos.uso ?? 'NORMAL',
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
  medio: 'TALONARIO' | 'PORTAL_SENIAT' | 'IMPRENTA_DIGITAL';
  talonario: TalonarioDTO | null;
  numero: number | null;
  numeroTexto: string | null;
  numeroControl: string | null;
  fecha: string;
  hora: string;
  periodo: string;
  comprador: CompradorDTO;
  compradorDeLaOrden: CompradorDTO | null;
  falta: string[];
  condicionPago: 'CONTADO' | 'CREDITO';
  renglones: Renglon[];
  totales: TotalesFactura;
  alicuota: number;
  tasa: number;
  tasaOrden: number | null;
  totalUSD: number;
  cobradoBs: number | null;
  diferenciaBs: number;
  ordenes: Array<{ id: string; orderNumber: string; pagadaEl: string | null; metodo: string | null }>;
  avisos: string[];
}

const SELECT_ORDEN = {
  id: true, orderNumber: true, compraId: true, userId: true, guestName: true, guestEmail: true, guestPhone: true, status: true,
  paymentStatus: true, paymentMethod: true, deliveryMethod: true, subtotalUSD: true, taxUSD: true, shippingUSD: true,
  totalUSD: true, discountUSD: true, exchangeRate: true, exchangeRateVES: true, totalVES: true, billingType: true,
  billingName: true, billingTaxId: true, billingAddress: true, invoiceNumber: true, documentoFiscalId: true, paidAt: true,
  createdAt: true, recipientPhone: true, pointsUSD: true,
  user: { select: { name: true, email: true, profile: { select: { phone: true, idNumber: true } } } },
  items: { select: { quantity: true, priceUSD: true, productName: true, digitalVariantLabel: true, product: { select: { name: true } } } },
} satisfies Prisma.OrderSelect;

type OrdenLeida = Prisma.OrderGetPayload<{ select: typeof SELECT_ORDEN }>;

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

async function tasaDeLaFactura(fecha: string, enviada: number | undefined, db: Db): Promise<Resultado<number>> {
  const s = await db.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true } });
  const n = Number(s?.exchangeRateVES);
  const deHoy = Number.isFinite(n) && n > 0 ? n : null;
  if (enviada === undefined) {
    if (fecha === hoyVe() && deHoy) return { ok: true, datos: deHoy };
    return falla(
      400,
      fecha === hoyVe()
        ? 'No hay una tasa BCV en Ajustes: escribe la de hoy.'
        : `Escribe la tasa BCV del ${fecha.split('-').reverse().join('/')}: la factura va a la tasa del día en que se escribe.`,
      'tasa',
    );
  }
  if (deHoy && (enviada > deHoy * 3 || enviada < deHoy / 3)) {
    return falla(400, `La tasa ${numeroTasa(enviada)} está muy lejos de la de hoy (${numeroTasa(deHoy)}). Revisa la coma.`, 'tasa');
  }
  return { ok: true, datos: enviada };
}

async function canalActivoContable(db: Db): Promise<'TALONARIO' | 'PORTAL_SENIAT' | 'IMPRENTA_DIGITAL'> {
  const cfg = await db.configContable.findUnique({ where: { id: 'default' }, select: { canalEmision: true } });
  if (cfg?.canalEmision === 'IMPRENTA_DIGITAL') return 'IMPRENTA_DIGITAL';
  if (cfg?.canalEmision === 'PORTAL_SENIAT') return 'PORTAL_SENIAT';
  return 'TALONARIO';
}

export async function prepararFactura(pedido: PedidoFactura, db: Db = prisma): Promise<Resultado<Borrador>> {
  const fecha = fechaDesdeTexto(pedido.fecha);
  if (!fecha) return falla(400, 'La fecha de emisión no es válida.', 'fecha');
  if (pedido.fecha > hoyVe()) return falla(400, 'La fecha de emisión no puede ser de un día que no ha llegado.', 'fecha');
  const periodo = periodoDe(fecha);
  const medio = pedido.medio ?? (pedido.contingenciaCausal ? 'TALONARIO' : await canalActivoContable(db));
  const alicuota = await alicuotaGeneral(db);
  const t = medio === 'TALONARIO' ? await talonarioActivo(db, pedido.contingenciaCausal ? 'CONTINGENCIA' : 'NORMAL') : null;
  const cfgDigital = medio === 'IMPRENTA_DIGITAL'
    ? await db.configContable.findUnique({ where: { id: 'default' }, select: { imprentaSerieDigital: true, imprentaProximoNumero: true } })
    : null;
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
      if (o.invoiceNumber) avisos.push(`La orden ${o.orderNumber} tenía anotada la factura "${o.invoiceNumber}" a mano: queda la del sistema.`);
    }

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
      avisos.push(
        fisico
          ? `La orden ${numero} no guardó IVA: sus renglones van como exentos (E). Si no lo son, consúltalo con la contadora.`
          : `La orden ${numero} es de productos digitales, que la tienda vende sin IVA (C-151): van como exentos (E).`,
      );
    }
    for (const o of leidas) {
      const p = porcentajeIva(Number(o.totalUSD) || 0, Number(o.taxUSD) || 0);
      if (p > 0 && p !== alicuota) avisos.push(`La orden ${o.orderNumber} se cobró con IVA del ${p} % y la alícuota de hoy es ${alicuota} %.`);
      const pagada = o.paidAt ?? (o.paymentStatus === 'PAID' ? o.createdAt : null);
      if (pagada && periodoDe(pagada) !== periodo) {
        avisos.push(
          `La orden ${o.orderNumber} se cobró en ${nombreMes(periodoDe(pagada))}: con esta fecha, la factura va en el libro de ${nombreMes(periodo)}.`,
        );
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

  if (medio === 'TALONARIO') {
    if (renglones.length > 12) avisos.push(`Son ${renglones.length} renglones y el talonario tiene 12: hacen falta dos facturas.`);
    if (!t) avisos.push('No hay un talonario con facturas por usar: el dueño lo carga en Facturas o Ajustes 2027.');
  }
  const diferenciaBs = cobradoBs === null ? 0 : r2(totales.totalBs - cobradoBs);
  if (Math.abs(diferenciaBs) >= 0.01) {
    avisos.push(`El total de la factura difiere en Bs ${diferenciaBs.toFixed(2).replace('.', ',')} de lo que pagó el cliente: es el redondeo de los precios sin IVA.`);
  }

  const proximoDigital = cfgDigital?.imprentaProximoNumero ?? 1;
  const numero = medio === 'TALONARIO'
    ? (t ? t.proximo : null)
    : medio === 'IMPRENTA_DIGITAL'
      ? proximoDigital
      : (pedido.numeroExterno ?? null);
  const numeroTexto = medio === 'TALONARIO'
    ? (t ? numeroFactura(t, t.proximo) : null)
    : numero !== null ? String(numero).padStart(4, '0') : null;
  const numeroControlTexto = medio === 'TALONARIO'
    ? (t ? numeroControl(t, t.proximo) : null)
    : medio === 'IMPRENTA_DIGITAL'
      ? 'Asignado por la Imprenta Digital al timbrar'
      : (pedido.numeroControlExterno ?? null);

  return {
    ok: true,
    datos: {
      origen: pedido.origen,
      medio,
      talonario: t ? talonarioDTO(t) : null,
      numero,
      numeroTexto,
      numeroControl: numeroControlTexto,
      fecha: pedido.fecha,
      hora: pedido.horaEmision ?? horaActualVe(),
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

// ── Emitir, anular, notas de crédito/débito, retenciones y contingencia ──────────────────

class Conflicto extends Error {
  constructor(public resultado: { ok: false; status: number; error: string; campo?: string; extra?: Record<string, unknown> }) {
    super(resultado.error);
  }
}

export interface Emitida {
  id: string;
  etiqueta: string;
  numeroControl: string;
  ordenIds: string[];
  compradorCambiado: boolean;
}

/**
 * Registra o timbra la factura en el canal activo (`TALONARIO`, `PORTAL_SENIAT` o `IMPRENTA_DIGITAL`).
 * Respeta el candado de mes cerrado e incluye hora exacta (`America/Caracas`).
 */
export async function emitirFactura(pedido: PedidoFactura, numeroEsperado: number | undefined, usuarioId: string): Promise<Resultado<Emitida>> {
  try {
    const datos = await prisma.$transaction(async (tx) => {
      if (pedido.llaveIdempotencia) {
        const yaExiste = await tx.documentoFiscal.findUnique({
          where: { llaveIdempotencia: pedido.llaveIdempotencia },
          include: { talonario: true, ordenes: { select: { id: true } } },
        });
        if (yaExiste) {
          const { etiqueta } = etiquetaDocumento(yaExiste);
          return {
            id: yaExiste.id,
            etiqueta,
            numeroControl: yaExiste.numeroControl,
            ordenIds: yaExiste.ordenes.map((o) => o.id),
            compradorCambiado: false,
          };
        }
      }

      const preparado = await prepararFactura(pedido, tx);
      if (!preparado.ok) throw new Conflicto(preparado);
      const b = preparado.datos;

      const abierto = await verificarPeriodoAbierto(b.periodo, tx);
      if (!abierto.ok) throw new Conflicto(abierto);
      if (b.falta.length) throw new Conflicto(falla(400, `Falta: ${b.falta.join(', ').toLowerCase()}.`, 'comprador'));

      const horaEmision = pedido.horaEmision ?? b.hora;
      let talonarioId: string | null = null;
      let serie: string | null = null;
      let numero = 0;
      let numeroTexto = '';
      let numeroControlFinal = '';
      let imprentaProveedor: string | null = null;
      let idExterno: string | null = null;
      let qrVerificacion: string | null = null;
      let estadoTransmision = pedido.contingenciaCausal ? 'PENDIENTE_REPORTE' : 'REGISTRADO';

      if (b.medio === 'TALONARIO') {
        if (b.renglones.length > 12) throw new Conflicto(falla(400, 'Son más de 12 renglones: no caben en una factura de talonario.', 'renglones'));
        const t = await talonarioActivo(tx, pedido.contingenciaCausal ? 'CONTINGENCIA' : 'NORMAL');
        if (!t) throw new Conflicto(falla(409, 'No hay un talonario con facturas por usar: el dueño lo carga en Facturas.'));
        if (!numeroEsperado) throw new Conflicto(falla(400, 'Falta el número de la factura que se escribió.', 'numeroEsperado'));
        if (t.proximo !== numeroEsperado) {
          throw new Conflicto(falla(409, `La ${numeroFactura(t, numeroEsperado)} ya está registrada. Escribe la ${numeroFactura(t, t.proximo)}.`, 'numeroEsperado', { numero: t.proximo }));
        }
        const subio = await tx.talonario.updateMany({
          where: { id: t.id, proximo: numeroEsperado },
          data: { proximo: numeroEsperado + 1, ...(numeroEsperado + 1 > t.numeroHasta ? { estado: 'AGOTADO' } : {}) },
        });
        if (subio.count !== 1) throw new Conflicto(falla(409, 'Otra persona acaba de registrar una factura. Vuelve a revisar el número.', 'numeroEsperado'));

        talonarioId = t.id;
        serie = t.serie;
        numero = numeroEsperado;
        numeroTexto = numeroFactura(t, numeroEsperado);
        numeroControlFinal = numeroControl(t, numeroEsperado);
      } else if (b.medio === 'PORTAL_SENIAT') {
        if (!pedido.numeroExterno || !pedido.numeroControlExterno) {
          throw new Conflicto(falla(400, 'Escribe el número de factura y el número de control que asignó el Portal del SENIAT.', 'numeroControlExterno'));
        }
        serie = 'S';
        numero = pedido.numeroExterno;
        numeroTexto = String(numero).padStart(4, '0');
        numeroControlFinal = pedido.numeroControlExterno.trim();
        estadoTransmision = 'REPORTADO';
      } else {
        // IMPRENTA_DIGITAL: incremento atómico en ConfigContable + timbrado con adaptador
        const cfg = await tx.configContable.upsert({
          where: { id: 'default' },
          create: { id: 'default', canalEmision: 'IMPRENTA_DIGITAL' },
          update: {},
        });
        const actualizado = await tx.configContable.update({
          where: { id: 'default' },
          data: { imprentaProximoNumero: { increment: 1 } },
        });
        numero = actualizado.imprentaProximoNumero - 1;
        serie = cfg.imprentaSerieDigital || 'F';
        numeroTexto = String(numero).padStart(4, '0');
        const llave = pedido.llaveIdempotencia ?? `FAC-${serie}-${numero}-${Date.now()}`;
        const timbrado = await timbrarConImprentaDigital(
          {
            tipo: 'FACTURA',
            serie,
            numero,
            fecha: b.fecha,
            hora: horaEmision,
            monedaOperacion: pedido.monedaOperacion ?? 'VES',
            tasaBcv: b.tasa,
            comprador: b.comprador,
            condicionPago: b.condicionPago,
            renglones: b.renglones,
            totales: b.totales,
            alicuota: b.alicuota,
            llaveIdempotencia: llave,
          },
          {
            imprentaProveedor: cfg.imprentaProveedor,
            imprentaAmbiente: cfg.imprentaAmbiente === 'PRODUCCION' ? 'PRODUCCION' : 'SANDBOX',
            imprentaApiUrl: cfg.imprentaApiUrl,
          },
        );
        if (!timbrado.ok) throw new Conflicto(falla(502, timbrado.error, 'medio'));
        numeroControlFinal = timbrado.numeroControl;
        imprentaProveedor = timbrado.proveedor;
        idExterno = timbrado.idExterno;
        qrVerificacion = timbrado.qrVerificacion;
        estadoTransmision = timbrado.estadoTransmision;
      }

      const doc = await tx.documentoFiscal.create({
        data: {
          tipo: 'FACTURA',
          medio: b.medio,
          talonarioId,
          serie,
          numero,
          numeroControl: numeroControlFinal,
          emitidaEl: fechaDesdeTexto(b.fecha)!,
          emitidaHora: horaEmision,
          monedaOperacion: pedido.monedaOperacion ?? 'VES',
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
          imprentaProveedor,
          idExterno,
          llaveIdempotencia: pedido.llaveIdempotencia ?? null,
          pdfPrivadoRuta: pedido.pdfPrivadoRuta || null,
          qrVerificacion,
          estadoTransmision,
          contingenciaCausal: pedido.contingenciaCausal || null,
          creadoPorId: usuarioId,
        },
        select: { id: true },
      });

      const etiqueta = etiquetaFactura(serie, numeroTexto);
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
      return { id: doc.id, etiqueta, numeroControl: numeroControlFinal, ordenIds, compradorCambiado };
    });
    return { ok: true, datos };
  } catch (error) {
    if (error instanceof Conflicto) return error.resultado;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return falla(409, 'Ese número o llave ya está registrado. Vuelve a revisar.', 'numeroEsperado');
    }
    throw error;
  }
}

/** G-76: emite Nota de Crédito o Nota de Débito referenciando la factura original (SNAT/2026/00093 art. 12 y 13). */
export async function emitirNotaFiscal(pedido: PedidoNotaFiscal, usuarioId: string): Promise<Resultado<Emitida>> {
  try {
    const fecha = fechaDesdeTexto(pedido.fecha);
    if (!fecha) return falla(400, 'La fecha de la nota no es válida.', 'fecha');
    if (pedido.fecha > hoyVe()) return falla(400, 'La fecha no puede ser futura.', 'fecha');
    const periodo = periodoDe(fecha);

    const datos = await prisma.$transaction(async (tx) => {
      if (pedido.llaveIdempotencia) {
        const yaExiste = await tx.documentoFiscal.findUnique({
          where: { llaveIdempotencia: pedido.llaveIdempotencia },
          include: { talonario: true },
        });
        if (yaExiste) {
          const { etiqueta } = etiquetaDocumento(yaExiste);
          return {
            id: yaExiste.id,
            etiqueta,
            numeroControl: yaExiste.numeroControl,
            ordenIds: [],
            compradorCambiado: false,
          };
        }
      }

      const abierto = await verificarPeriodoAbierto(periodo, tx);
      if (!abierto.ok) throw new Conflicto(abierto);

      const original = await tx.documentoFiscal.findUnique({
        where: { id: pedido.documentoAfectadoId },
        include: { talonario: true },
      });
      if (!original) throw new Conflicto(falla(404, 'No se encontró la factura original.', 'documentoAfectadoId'));
      if (original.tipo !== 'FACTURA') throw new Conflicto(falla(400, 'Solo se pueden emitir notas sobre una factura.', 'documentoAfectadoId'));
      if (original.estado !== 'EMITIDA') throw new Conflicto(falla(409, 'La factura original está anulada.', 'documentoAfectadoId'));

      const tasaRes = await tasaDeLaFactura(pedido.fecha, pedido.tasa, tx);
      if (!tasaRes.ok) throw new Conflicto(tasaRes);
      const tasa = tasaRes.datos;
      const alicuota = Number(original.alicuota) || (await alicuotaGeneral(tx));

      let renglones: Renglon[];
      let totalUSD: number;
      if (pedido.renglones?.length) {
        renglones = pedido.renglones.map((r) => renglonDesdeUSD(r.cantidad, r.descripcion, r.exento, r.precioUSD, tasa, alicuota));
        totalUSD = r2(pedido.renglones.reduce((s, r) => s + r.precioUSD * r.cantidad, 0));
      } else if (pedido.montoUSD) {
        const desc = `${pedido.tipo === 'NOTA_CREDITO' ? 'NC' : 'ND'} sobre ${etiquetaDocumento(original).etiqueta}: ${pedido.motivo}`;
        renglones = [renglonDesdeUSD(1, desc.slice(0, 90), Boolean(pedido.exento), pedido.montoUSD, tasa, alicuota)];
        totalUSD = r2(pedido.montoUSD);
      } else {
        throw new Conflicto(falla(400, 'Indica los renglones o el monto en USD de la nota.', 'montoUSD'));
      }

      const totales = totalesDe(renglones, alicuota);
      if (pedido.tipo === 'NOTA_CREDITO') {
        const previas = await tx.documentoFiscal.findMany({
          where: { documentoAfectadoId: original.id, tipo: 'NOTA_CREDITO', estado: 'EMITIDA' },
          select: { totalBs: true },
        });
        const acumulado = r2(previas.reduce((s, p) => s + Number(p.totalBs), 0) + totales.totalBs);
        if (acumulado > Number(original.totalBs) + 0.05) {
          throw new Conflicto(falla(400, `Las notas de crédito (${acumulado.toFixed(2)} Bs) superan el monto total de la factura original (${Number(original.totalBs).toFixed(2)} Bs).`, 'montoUSD'));
        }
      }

      const cfg = await tx.configContable.upsert({
        where: { id: 'default' },
        create: { id: 'default' },
        update: {},
      });
      const medio = original.medio === 'IMPRENTA_DIGITAL' || cfg.canalEmision === 'IMPRENTA_DIGITAL'
        ? 'IMPRENTA_DIGITAL'
        : original.medio === 'PORTAL_SENIAT' || cfg.canalEmision === 'PORTAL_SENIAT'
          ? 'PORTAL_SENIAT'
          : 'TALONARIO';
      const horaEmision = pedido.horaEmision ?? horaActualVe();
      const serie = pedido.tipo === 'NOTA_CREDITO' ? 'NC' : 'ND';
      let numero: number;
      let numeroControlFinal: string;
      let imprentaProveedor: string | null = null;
      let idExterno: string | null = null;
      let qrVerificacion: string | null = null;
      let estadoTransmision = 'REGISTRADO';

      if (medio === 'IMPRENTA_DIGITAL') {
        const actualizado = await tx.configContable.update({
          where: { id: 'default' },
          data: { imprentaProximoNumero: { increment: 1 } },
        });
        numero = actualizado.imprentaProximoNumero - 1;
        const origEtiq = etiquetaDocumento(original);
        const timbrado = await timbrarConImprentaDigital(
          {
            tipo: pedido.tipo,
            serie,
            numero,
            fecha: pedido.fecha,
            hora: horaEmision,
            monedaOperacion: 'VES',
            tasaBcv: tasa,
            comprador: {
              tipo: original.compradorTipo === 'EMPRESA' ? 'EMPRESA' : 'PERSONA',
              nombre: original.compradorNombre || 'Cliente',
              documento: original.compradorDocumento || '',
              domicilio: original.compradorDomicilio || '',
              telefono: original.compradorTelefono || '',
            },
            condicionPago: original.condicionPago === 'CREDITO' ? 'CREDITO' : 'CONTADO',
            renglones,
            totales,
            alicuota,
            facturaAfectada: {
              numero: origEtiq.etiqueta,
              numeroControl: original.numeroControl,
              fecha: hoyVe(original.emitidaEl),
              totalBs: Number(original.totalBs),
            },
            llaveIdempotencia: pedido.llaveIdempotencia ?? `${serie}-${numero}-${Date.now()}`,
          },
          {
            imprentaProveedor: cfg.imprentaProveedor,
            imprentaAmbiente: cfg.imprentaAmbiente === 'PRODUCCION' ? 'PRODUCCION' : 'SANDBOX',
            imprentaApiUrl: cfg.imprentaApiUrl,
          },
        );
        if (!timbrado.ok) throw new Conflicto(falla(502, timbrado.error, 'medio'));
        numeroControlFinal = timbrado.numeroControl;
        imprentaProveedor = timbrado.proveedor;
        idExterno = timbrado.idExterno;
        qrVerificacion = timbrado.qrVerificacion;
        estadoTransmision = timbrado.estadoTransmision;
      } else {
        const ultima = await tx.documentoFiscal.findFirst({
          where: { tipo: pedido.tipo },
          orderBy: { numero: 'desc' },
          select: { numero: true },
        });
        numero = pedido.numeroExterno ?? (ultima ? ultima.numero + 1 : 1);
        numeroControlFinal = pedido.numeroControlExterno?.trim() || `${serie}-${String(numero).padStart(6, '0')}`;
        estadoTransmision = medio === 'PORTAL_SENIAT' ? 'REPORTADO' : 'REGISTRADO';
      }

      const doc = await tx.documentoFiscal.create({
        data: {
          tipo: pedido.tipo,
          medio,
          serie,
          numero,
          numeroControl: numeroControlFinal,
          emitidaEl: fecha,
          emitidaHora: horaEmision,
          monedaOperacion: 'VES',
          periodo,
          origen: 'TIENDA',
          compradorTipo: original.compradorTipo,
          compradorNombre: original.compradorNombre,
          compradorDocumento: original.compradorDocumento,
          compradorDomicilio: original.compradorDomicilio,
          compradorTelefono: original.compradorTelefono,
          condicionPago: original.condicionPago,
          renglones: renglones as unknown as Prisma.InputJsonValue,
          descuentoBs: totales.descuentoBs.toFixed(2),
          baseBs: totales.baseBs.toFixed(2),
          alicuota: alicuota.toFixed(2),
          ivaBs: totales.ivaBs.toFixed(2),
          exentoBs: totales.exentoBs.toFixed(2),
          totalBs: totales.totalBs.toFixed(2),
          totalUSD: totalUSD.toFixed(2),
          tasa: String(tasa),
          documentoAfectadoId: original.id,
          imprentaProveedor,
          idExterno,
          llaveIdempotencia: pedido.llaveIdempotencia ?? null,
          pdfPrivadoRuta: pedido.pdfPrivadoRuta || null,
          qrVerificacion,
          estadoTransmision,
          creadoPorId: usuarioId,
        },
        select: { id: true },
      });

      const etiqueta = etiquetaFactura(serie, String(numero).padStart(4, '0'));
      return { id: doc.id, etiqueta, numeroControl: numeroControlFinal, ordenIds: [], compradorCambiado: false };
    });

    return { ok: true, datos };
  } catch (error) {
    if (error instanceof Conflicto) return error.resultado;
    throw error;
  }
}

export async function anularFactura(id: string, motivo: string, usuarioId: string): Promise<Resultado<{ etiqueta: string; ordenIds: string[] }>> {
  const doc = await prisma.documentoFiscal.findUnique({ where: { id }, include: { talonario: true, ordenes: { select: { id: true } } } });
  if (!doc) return falla(404, 'No se encontró la factura.');
  if (doc.estado === 'ANULADA') return falla(409, 'Esa factura ya está anulada.');
  const abierto = await verificarPeriodoAbierto(doc.periodo);
  if (!abierto.ok) return abierto;

  const { etiqueta } = etiquetaDocumento(doc);
  const ordenIds = doc.ordenes.map((o) => o.id);
  await prisma.$transaction([
    prisma.documentoFiscal.update({ where: { id }, data: { estado: 'ANULADA', motivoAnulacion: motivo, anuladaEl: new Date(), anuladaPorId: usuarioId } }),
    prisma.order.updateMany({ where: { documentoFiscalId: id }, data: { documentoFiscalId: null, invoiceNumber: null, invoicedAt: null } }),
  ]);
  return { ok: true, datos: { etiqueta, ordenIds } };
}

export async function anularEnBlanco(numeroEsperado: number, motivo: string, usuarioId: string): Promise<Resultado<{ id: string; etiqueta: string }>> {
  try {
    const datos = await prisma.$transaction(async (tx) => {
      const hoy = hoyVe();
      const periodo = hoy.slice(0, 7);
      const abierto = await verificarPeriodoAbierto(periodo, tx);
      if (!abierto.ok) throw new Conflicto(abierto);

      const t = await talonarioActivo(tx, 'NORMAL');
      if (!t) throw new Conflicto(falla(409, 'No hay un talonario con facturas por usar.'));
      if (t.proximo !== numeroEsperado) {
        throw new Conflicto(falla(409, `La ${numeroFactura(t, numeroEsperado)} ya está registrada. La próxima es la ${numeroFactura(t, t.proximo)}.`, 'numeroEsperado', { numero: t.proximo }));
      }
      const subio = await tx.talonario.updateMany({
        where: { id: t.id, proximo: numeroEsperado },
        data: { proximo: numeroEsperado + 1, ...(numeroEsperado + 1 > t.numeroHasta ? { estado: 'AGOTADO' } : {}) },
      });
      if (subio.count !== 1) throw new Conflicto(falla(409, 'Otra persona acaba de registrar una factura. Vuelve a revisar el número.'));
      const doc = await tx.documentoFiscal.create({
        data: {
          talonarioId: t.id,
          serie: t.serie,
          numero: numeroEsperado,
          numeroControl: numeroControl(t, numeroEsperado),
          emitidaEl: fechaDesdeTexto(hoy)!,
          emitidaHora: horaActualVe(),
          periodo,
          origen: 'EN_BLANCO',
          estado: 'ANULADA',
          motivoAnulacion: motivo,
          anuladaEl: new Date(),
          anuladaPorId: usuarioId,
          creadoPorId: usuarioId,
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

/** G-76: registra comprobante de retención de IVA recibido de un contribuyente especial */
export async function registrarRetencionIva(
  id: string,
  datos: { ivaRetenidoBs: number; comprobanteRetencion: string; retencionFecha: string },
): Promise<Resultado<FacturaDTO>> {
  const doc = await prisma.documentoFiscal.findUnique({ where: { id }, include: { talonario: true, ordenes: { select: { id: true, orderNumber: true } } } });
  if (!doc) return falla(404, 'No se encontró la factura.');
  if (doc.estado === 'ANULADA') return falla(409, 'No se registra retención sobre una factura anulada.');
  const abierto = await verificarPeriodoAbierto(doc.periodo);
  if (!abierto.ok) return abierto;
  const ivaFactura = Number(doc.ivaBs);
  if (ivaFactura <= 0) return falla(400, 'Esta factura es exenta y no tiene IVA que retener.', 'ivaRetenidoBs');
  if (datos.ivaRetenidoBs > ivaFactura + 0.05) {
    return falla(400, `La retención (${datos.ivaRetenidoBs.toFixed(2)} Bs) no puede ser mayor al IVA de la factura (${ivaFactura.toFixed(2)} Bs).`, 'ivaRetenidoBs');
  }
  const fechaRet = fechaDesdeTexto(datos.retencionFecha);
  if (!fechaRet) return falla(400, 'La fecha del comprobante no es válida.', 'retencionFecha');

  const actualizado = await prisma.documentoFiscal.update({
    where: { id },
    data: {
      ivaRetenidoBs: datos.ivaRetenidoBs.toFixed(2),
      comprobanteRetencion: datos.comprobanteRetencion,
      retencionFecha: fechaRet,
    },
    include: { talonario: true, ordenes: { select: { id: true, orderNumber: true } } },
  });
  return { ok: true, datos: facturaDTO(actualizado) };
}

/** G-76: marca una factura de contingencia como reportada al día siguiente (00093 art. 7) */
export async function reportarContingencia(
  id: string,
  datos: { pdfPrivadoRuta?: string; numeroDigitalReferencia?: string },
): Promise<Resultado<FacturaDTO>> {
  const doc = await prisma.documentoFiscal.findUnique({ where: { id } });
  if (!doc) return falla(404, 'No se encontró el documento.');
  if (doc.estado === 'ANULADA') return falla(409, 'El documento está anulado.');
  const actualizado = await prisma.documentoFiscal.update({
    where: { id },
    data: {
      estadoTransmision: 'REPORTADO',
      contingenciaReportadaEl: new Date(),
      ...(datos.pdfPrivadoRuta ? { pdfPrivadoRuta: datos.pdfPrivadoRuta } : {}),
      ...(datos.numeroDigitalReferencia ? { idExterno: datos.numeroDigitalReferencia } : {}),
    },
    include: { talonario: true, ordenes: { select: { id: true, orderNumber: true } } },
  });
  return { ok: true, datos: facturaDTO(actualizado) };
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
    orderBy: [{ emitidaEl: 'desc' }, { numero: 'desc' }],
  });
  const nombres = await nombresDe(docs.flatMap((d) => [d.creadoPorId, d.anuladaPorId]));
  return docs.map((d) => facturaDTO(d, nombres));
}

export async function facturaPorId(id: string): Promise<FacturaDTO | null> {
  const d = await prisma.documentoFiscal.findUnique({
    where: { id },
    include: { talonario: true, ordenes: { select: { id: true, orderNumber: true } } },
  });
  if (!d) return null;
  return facturaDTO(d, await nombresDe([d.creadoPorId, d.anuladaPorId]));
}

export interface CompraSinFactura {
  ordenIds: string[];
  ordenes: string[];
  cliente: string;
  documento: string;
  totalUSD: number;
  totalBs: number;
  pagadaEl: string | null;
  metodo: string | null;
  productos: number;
  digital: boolean;
}

/**
 * Las órdenes cobradas en el mes que todavía no tienen factura, agrupadas por `compraId` (C-284) con respaldo a
 * ventana de 60 segundos para compras anteriores a C-284.
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
      id: true, orderNumber: true, compraId: true, userId: true, guestEmail: true, guestName: true, createdAt: true,
      paidAt: true, paymentMethod: true, pointsUSD: true, totalUSD: true, totalVES: true, taxUSD: true, billingName: true,
      billingTaxId: true,
      user: { select: { name: true, profile: { select: { idNumber: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });

  const compras: CompraSinFactura[] = [];
  const origen = new Map<CompraSinFactura, { compraId: string | null; clave: string; creada: number }>();
  for (const o of ordenes) {
    const clave = o.userId ?? o.guestEmail ?? o.id;
    const creada = o.createdAt.getTime();
    const misma = compras.find((c) => {
      const m = origen.get(c);
      if (!m) return false;
      if (o.compraId && m.compraId) return o.compraId === m.compraId;
      return !o.compraId && !m.compraId && m.clave === clave && Math.abs(m.creada - creada) <= 60_000;
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
    origen.set(nueva, { compraId: o.compraId, clave, creada });
    compras.push(nueva);
  }
  return compras.reverse();
}

export async function libroDeVentas(periodo: string): Promise<LibroVentas> {
  const docs = await prisma.documentoFiscal.findMany({
    where: { periodo },
    select: {
      id: true, tipo: true, estado: true, origen: true, serie: true, numero: true, numeroControl: true, emitidaEl: true,
      compradorDocumento: true, compradorNombre: true, totalBs: true, exentoBs: true, baseBs: true, alicuota: true, ivaBs: true,
      ivaRetenidoBs: true, comprobanteRetencion: true, talonario: true,
    },
  });
  return armarLibro(
    periodo,
    docs.map((d) => ({
      id: d.id,
      tipo: d.tipo,
      estado: d.estado,
      origen: d.origen,
      etiqueta: etiquetaDocumento(d).etiqueta,
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
    })),
  );
}

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
      select: { compraId: true, userId: true, guestEmail: true, id: true, createdAt: true },
      take: 2000,
    }),
  ]);
  const compras = new Set(
    sinFactura.map((o) => (o.compraId ? `C:${o.compraId}` : `${o.userId ?? o.guestEmail ?? o.id}·${Math.floor(o.createdAt.getTime() / 60_000)}`)),
  );
  return facturas + compras.size;
}

export async function tasaYAlicuota(): Promise<{ tasa: number | null; alicuota: number }> {
  const s = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true, taxPercent: true } });
  const tasa = Number(s?.exchangeRateVES);
  const p = Number(s?.taxPercent);
  return { tasa: Number.isFinite(tasa) && tasa > 0 ? tasa : null, alicuota: Number.isFinite(p) && p > 0 ? p : 16 };
}
