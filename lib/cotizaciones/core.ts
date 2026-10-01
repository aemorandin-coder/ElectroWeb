// Cotizaciones (C-148): lo que comparten el panel, la vista del cliente y el servidor. Sin Prisma ni APIs del navegador.
import { z } from 'zod';
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

export interface LineaCotizacion {
  id?: string;
  productId?: string | null;
  title: string;
  description?: string | null;
  quantity: number;
  unitPriceUSD: number;
}

export interface TotalesCotizacion {
  totalUSD: number;
  baseUSD: number;
  ivaUSD: number;
  /** Anticipo y saldo, solo si la cotización pide anticipo */
  anticipoUSD: number | null;
  saldoUSD: number | null;
}

const centimos = (n: number) => Math.round(n * 100) / 100;

/** Total de las líneas, el IVA que ya va dentro (C-146) y el anticipo. El servidor lo usa como fuente de verdad. */
export function totalesCotizacion(lineas: Pick<LineaCotizacion, 'quantity' | 'unitPriceUSD'>[], taxPercent: number, advancePercent: number | null | undefined): TotalesCotizacion {
  const totalUSD = centimos(lineas.reduce((suma, l) => suma + centimos(l.unitPriceUSD * l.quantity), 0));
  const { baseUSD, ivaUSD } = ivaIncluido(totalUSD, taxPercent);
  const pct = advancePercent && advancePercent > 0 && advancePercent < 100 ? advancePercent : null;
  const anticipoUSD = pct ? centimos(totalUSD * (pct / 100)) : null;
  return { totalUSD, baseUSD, ivaUSD, anticipoUSD, saldoUSD: anticipoUSD === null ? null : centimos(totalUSD - anticipoUSD) };
}

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
  conditions: opcional(3000),
  terms: opcional(3000),
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
