// Cotizaciones (C-148): lo que comparten el panel, la vista del cliente y el servidor. Sin Prisma ni APIs del navegador.
import { z } from '@/lib/zod';
import { ivaIncluido } from '@/lib/pricing';

/**
 * - REQUESTED: el cliente la pidió desde la tienda; el equipo todavía no le puso precios.
 * - DRAFT: el equipo la está armando.
 * - SENT: el cliente ya puede abrirla con su enlace y aprobarla.
 * - APPROVED: el cliente dio su conformidad. Ya no se edita.
 * - REJECTED: no se concretó.
 * "Vencida" no es un estado guardado: es una SENT a la que se le pasó la validez.
 */
export const ESTADOS_COTIZACION = ['REQUESTED', 'DRAFT', 'SENT', 'APPROVED', 'REJECTED'] as const;
export type EstadoCotizacion = (typeof ESTADOS_COTIZACION)[number];

export const ESTADO_TEXTO: Record<EstadoCotizacion | 'EXPIRED', { texto: string; tono: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' }> = {
  REQUESTED: { texto: 'Pedida por el cliente', tono: 'warning' },
  DRAFT: { texto: 'Borrador', tono: 'neutral' },
  SENT: { texto: 'Enviada', tono: 'brand' },
  APPROVED: { texto: 'Aprobada', tono: 'success' },
  REJECTED: { texto: 'No se concretó', tono: 'danger' },
  EXPIRED: { texto: 'Vencida', tono: 'danger' },
};

/** C-184: la mano de obra ("LABOR") va en su propia tabla. Las demás líneas (sin tipo) son equipos o productos. */
export const TIPOS_LINEA = ['LABOR'] as const;
export type TipoLinea = (typeof TIPOS_LINEA)[number];

export interface LineaCotizacion {
  id?: string;
  productId?: string | null;
  title: string;
  description?: string | null;
  quantity: number;
  unitPriceUSD: number;
  /** C-184: el precio de lista antes del descuento (los equipos del convenio CCIET) */
  listPriceUSD?: number | null;
  kind?: TipoLinea | null;
}

/**
 * Retención del IVA (C-159). La practica el cliente al pagar, solo si es sujeto pasivo especial (Providencia
 * SNAT/2025/000054): el 75 % del IVA, o el 100 % en los casos del art. 5 (factura sin el IVA discriminado o sin los
 * requisitos, proveedor no inscrito o con consulta negativa en el Portal Fiscal). No la practican los órganos de la
 * República, los estados y los municipios ni los entes públicos sin fines empresariales (art. 3, numerales 11 y 12).
 * La marca el equipo en la cotización; el cliente no la elige.
 */
export const RETENCIONES_IVA = [0, 75, 100] as const;
export type RetencionIva = (typeof RETENCIONES_IVA)[number];

export interface TotalesCotizacion {
  totalUSD: number;
  baseUSD: number;
  ivaUSD: number;
  /** IVA que retiene el cliente al pagar (0 si no retiene) */
  retencionUSD: number;
  /** Lo que el cliente le paga a la tienda: el total menos la retención. Sin retención, es el total. */
  netoUSD: number;
  /** Anticipo y saldo, solo si la cotización pide anticipo. Se calculan sobre lo que se paga (el neto). */
  anticipoUSD: number | null;
  saldoUSD: number | null;
}

const centimos = (n: number) => Math.round(n * 100) / 100;

/**
 * Total de las líneas, el IVA que ya va dentro (C-146), la retención del IVA (C-159) y el anticipo.
 * El servidor lo usa como fuente de verdad. La retención es una parte del IVA: sin IVA no hay retención.
 */
export function totalesCotizacion(
  lineas: Pick<LineaCotizacion, 'quantity' | 'unitPriceUSD'>[],
  taxPercent: number,
  advancePercent: number | null | undefined,
  retentionPercent: number = 0,
): TotalesCotizacion {
  const totalUSD = centimos(lineas.reduce((suma, l) => suma + centimos(l.unitPriceUSD * l.quantity), 0));
  const { baseUSD, ivaUSD } = ivaIncluido(totalUSD, taxPercent);
  const porcentaje = (RETENCIONES_IVA as readonly number[]).includes(retentionPercent) ? retentionPercent : 0;
  const retencionUSD = centimos(ivaUSD * (porcentaje / 100));
  const netoUSD = centimos(totalUSD - retencionUSD);
  const pct = advancePercent && advancePercent > 0 && advancePercent < 100 ? advancePercent : null;
  const anticipoUSD = pct ? centimos(netoUSD * (pct / 100)) : null;
  return { totalUSD, baseUSD, ivaUSD, retencionUSD, netoUSD, anticipoUSD, saldoUSD: anticipoUSD === null ? null : centimos(netoUSD - anticipoUSD) };
}

/** "Viernes, 17 de octubre de 2026" y "17 de octubre de 2026", en hora de Venezuela (la hoja y el PDF, C-182) */
export const fechaLarga = (iso: string) => {
  const texto = new Date(iso).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
export const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', year: 'numeric' });
export const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-VE', { timeZone: 'America/Caracas', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const totalLinea = (precio: number, cantidad: number) => centimos(precio * cantidad);

/** C-184: el precio de lista sale tachado solo en un equipo cuyo precio de lista es mayor que su precio */
export const conPrecioDeLista = (l: Pick<LineaCotizacion, 'unitPriceUSD' | 'listPriceUSD' | 'kind'>) =>
  l.kind !== 'LABOR' && typeof l.listPriceUSD === 'number' && l.listPriceUSD > l.unitPriceUSD;

export interface DesgloseCotizacion {
  /** Los equipos a precio de lista (los que no lo traen, a su precio) */
  listaUSD: number;
  /** Los equipos a precio de lista menos los equipos a su precio */
  descuentoUSD: number;
  equiposUSD: number;
  manoDeObraUSD: number;
  /** Algún equipo trae precio de lista: va su columna y la fila del descuento */
  conLista: boolean;
  /** Hay mano de obra: va en su propia tabla */
  conObra: boolean;
}

/**
 * C-184 (Luis eligió la variante C sin la franja, 28/10): en las del convenio CCIET, lo que suman los equipos a precio
 * de lista, el descuento y la mano de obra aparte. null si no hay ni precio de lista ni mano de obra: la cotización se
 * muestra como siempre. El total sigue siendo la suma de las líneas (totalesCotizacion).
 */
export function desgloseCotizacion(lineas: Pick<LineaCotizacion, 'quantity' | 'unitPriceUSD' | 'listPriceUSD' | 'kind'>[]): DesgloseCotizacion | null {
  const equipos = lineas.filter((l) => l.kind !== 'LABOR');
  const obra = lineas.filter((l) => l.kind === 'LABOR');
  const conLista = equipos.some(conPrecioDeLista);
  if (!conLista && obra.length === 0) return null;
  const suma = (ls: typeof lineas, precio: (l: (typeof lineas)[number]) => number) => centimos(ls.reduce((s, l) => s + totalLinea(precio(l), l.quantity), 0));
  const equiposUSD = suma(equipos, (l) => l.unitPriceUSD);
  const listaUSD = suma(equipos, (l) => (conPrecioDeLista(l) ? (l.listPriceUSD as number) : l.unitPriceUSD));
  return { listaUSD, descuentoUSD: centimos(listaUSD - equiposUSD), equiposUSD, manoDeObraUSD: suma(obra, (l) => l.unitPriceUSD), conLista, conObra: obra.length > 0 };
}

/** C-184: cómo se llaman el descuento y la columna del precio con descuento ("Convenio" en las del convenio) */
export const textosDesglose = (discountLabel: string | null | undefined) => ({
  descuento: discountLabel?.trim() || 'Descuento',
  columnaPrecio: /convenio/i.test(discountLabel ?? '') ? 'Convenio' : 'Con descuento',
});

/** Hasta cuándo vale una cotización enviada. */
export function venceEl(sentAt: string | Date | null, validityDays: number): Date | null {
  if (!sentAt) return null;
  return new Date(new Date(sentAt).getTime() + validityDays * 24 * 60 * 60 * 1000);
}

export function estaVencida(status: string, sentAt: string | Date | null, validityDays: number, ahora = Date.now()): boolean {
  const vence = venceEl(sentAt, validityDays);
  return status === 'SENT' && vence !== null && vence.getTime() < ahora;
}

/** Texto de varias líneas → lista (una condición por línea, sin viñetas ni líneas vacías). */
export function lineasDeTexto(texto: string | null | undefined): string[] {
  return (texto ?? '').split('\n').map((l) => l.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);
}

/* ── Validación ── */

const texto = (max: number) => z.string().trim().max(max);
const opcional = (max: number) => texto(max).optional().nullable().transform((v) => (v ? v : null));

export const lineaSchema = z.object({
  productId: z.string().regex(/^[a-z0-9-]{3,40}$/i).optional().nullable(),
  title: texto(160).min(2, 'Escribe qué es cada línea'),
  description: opcional(1200),
  quantity: z.number().int('La cantidad va en enteros').min(1, 'La cantidad mínima es 1').max(9999),
  unitPriceUSD: z.number().min(0, 'El precio no puede ser negativo').max(1_000_000),
  // C-184: los manda Numen y el panel los conserva al guardar
  listPriceUSD: z.number().min(0, 'El precio de lista no puede ser negativo').max(1_000_000).nullish(),
  kind: z.enum(TIPOS_LINEA).nullish(),
});

/** Lo que guarda el equipo desde el panel. */
export const cotizacionSchema = z.object({
  clientName: texto(120).min(2, 'Escribe el nombre del cliente o de la empresa'),
  clientDoc: opcional(20),
  contactName: opcional(100),
  contactEmail: z.union([z.literal(''), z.string().trim().max(150).email('El correo no es válido')]).optional().nullable().transform((v) => (v ? v : null)),
  contactPhone: opcional(30),
  location: opcional(200),
  subject: opcional(200),
  validityDays: z.number().int().min(1, 'La validez mínima es 1 día').max(180, 'La validez máxima es 180 días'),
  advancePercent: z.number().int().min(1).max(99).optional().nullable().transform((v) => v ?? null),
  ivaRetentionPercent: z.union([z.literal(0), z.literal(75), z.literal(100)], { message: 'La retención del IVA es 0, 75 o 100 %' }).default(0),
  conditions: opcional(3000),
  terms: opcional(3000),
  // C-182: lo que no incluye y el anexo técnico (opcionales)
  notice: opcional(2000),
  annexTitle: opcional(120),
  annex: z.string().max(8000, 'El anexo admite hasta 8.000 letras').optional().nullable().transform((v) => (v && v.trim() ? v.replace(/\r\n/g, '\n').trim() : null)),
  // C-184: lo manda Numen. Si no llega (el panel no lo edita), al guardar queda el que tenía
  discountLabel: z.string().trim().max(80).nullish(),
  items: z.array(lineaSchema).max(60, 'Máximo 60 líneas'),
});
export type CotizacionEntrada = z.infer<typeof cotizacionSchema>;

/** Lo que manda un cliente al pedirla desde la tienda. Sin precios: los pone el servidor o el equipo. */
export const solicitudSchema = z.object({
  clientName: texto(120).min(2, 'Escribe tu nombre o el de tu empresa'),
  clientDoc: opcional(20),
  contactName: texto(100).min(2, 'Escribe con quién hablamos'),
  contactEmail: z.string().trim().max(150).email('El correo no es válido'),
  contactPhone: texto(30).min(7, 'Escribe un teléfono'),
  location: opcional(200),
  requestNote: texto(2000).min(10, 'Cuéntanos qué necesitas (10 letras o más)'),
  items: z.array(z.object({ productId: z.string().regex(/^[a-z0-9-]{3,40}$/i), quantity: z.number().int().min(1).max(9999) })).max(40).optional(),
  captchaToken: z.string().max(5000).optional().nullable(),
});

export const CONDICIONES_POR_DEFECTO = [
  'Precios finales por unidad, con el IVA incluido.',
  'Disponibilidad sujeta a existencia al momento de confirmar el pedido.',
  'Pagos en bolívares a la tasa oficial del BCV vigente a la fecha de pago.',
].join('\n');

export const TERMINOS_POR_DEFECTO = [
  'Garantía de la tienda contra defectos de fábrica, por el plazo de cada equipo.',
  'Soporte por WhatsApp durante la puesta en marcha.',
].join('\n');
