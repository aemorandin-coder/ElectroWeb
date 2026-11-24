// C-229: los montos de una factura de talonario, en bolívares, y las fechas en hora de Venezuela. Módulo puro.
//
// La regla (docs/plan/CONTABILIDAD.md §5): el precio publicado lleva el IVA adentro (PLAN.md §7.2), y en el talonario se
// escribe sin IVA, como en la Factura 67:
// - renglón gravado: precio unitario = precio con IVA × tasa ÷ (1 + alícuota), al céntimo; monto = unitario × cantidad;
// - renglón exento ("(E)"): el precio × la tasa, sin quitar nada;
// - el descuento va en su casilla y se resta antes del IVA; el IVA es la alícuota sobre la base; el total, base + IVA +
//   exento. Si eso no da al céntimo lo que pagó el cliente, la pantalla lo dice.

export interface Renglon {
  cantidad: number;
  descripcion: string;
  /** Exento, exonerado o no gravado: lleva "(E)" (Providencia 00093, art. 8, num. 7) */
  exento: boolean;
  precioUnitarioBs: number;
  montoBs: number;
}

export interface TotalesFactura {
  /** Lo que va en "Descuento u otros ajustes al precio" (ya restado) */
  descuentoBs: number;
  baseBs: number;
  ivaBs: number;
  exentoBs: number;
  totalBs: number;
}

export const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Precio unitario que se escribe, de un precio publicado en dólares (con el IVA adentro si es gravado). */
export function unitarioBs(precioUSD: number, tasa: number, exento: boolean, alicuota: number): number {
  const bs = precioUSD * tasa;
  return r2(exento ? bs : bs / (1 + alicuota / 100));
}

export function renglonDesdeUSD(cantidad: number, descripcion: string, exento: boolean, precioUSD: number, tasa: number, alicuota: number): Renglon {
  const precioUnitarioBs = unitarioBs(precioUSD, tasa, exento, alicuota);
  return { cantidad, descripcion, exento, precioUnitarioBs, montoBs: r2(precioUnitarioBs * cantidad) };
}

/** Los descuentos vienen con el IVA adentro (como los precios): se pasan a bolívares sin IVA si son de lo gravado. */
export function descuentoBs(descuentoUSD: number, tasa: number, exento: boolean, alicuota: number): number {
  return descuentoUSD > 0 ? unitarioBs(descuentoUSD, tasa, exento, alicuota) : 0;
}

export function totales(renglones: Renglon[], alicuota: number, descuentoGravadoBs = 0, descuentoExentoBs = 0): TotalesFactura {
  const gravado = r2(renglones.filter((r) => !r.exento).reduce((s, r) => s + r.montoBs, 0));
  const exento = r2(renglones.filter((r) => r.exento).reduce((s, r) => s + r.montoBs, 0));
  const dGravado = r2(Math.min(Math.max(descuentoGravadoBs, 0), gravado));
  const dExento = r2(Math.min(Math.max(descuentoExentoBs, 0), exento));
  const baseBs = r2(gravado - dGravado);
  const exentoBs = r2(exento - dExento);
  const ivaBs = r2((baseBs * alicuota) / 100);
  return { descuentoBs: r2(dGravado + dExento), baseBs, ivaBs, exentoBs, totalBs: r2(baseBs + ivaBs + exentoBs) };
}

// ── Lo que se le pide a una orden para facturarla ──────────────────────────────────────────

export interface OrdenParaMontos {
  orderNumber: string;
  deliveryMethod?: string | null;
  items: Array<{ quantity: number; priceUSD: number; descripcion: string }>;
  discountUSD: number;
  shippingUSD: number;
  taxUSD: number;
  totalUSD: number;
}

export interface MontosDeOrdenes {
  renglones: Renglon[];
  totales: TotalesFactura;
  totalUSD: number;
  /** Lo que pagó el cliente en bolívares a esa tasa, para compararlo con el total de la factura */
  cobradoBs: number;
  /** Órdenes que no guardaron IVA: sus renglones van como exentos */
  sinIva: string[];
}

/**
 * Los renglones de una o dos órdenes (la física y la digital de una misma compra) a una tasa. Una orden con IVA guardado
 * es gravada entera (productos y embalaje); una sin IVA (los digitales, C-151) va exenta.
 */
export function montosDeOrdenes(ordenes: OrdenParaMontos[], tasa: number, alicuota: number, conceptoEntrega: (metodo: string | null | undefined) => string): MontosDeOrdenes {
  const renglones: Renglon[] = [];
  let dGravado = 0;
  let dExento = 0;
  const sinIva: string[] = [];
  for (const o of ordenes) {
    const exento = !(o.taxUSD > 0);
    if (exento) sinIva.push(o.orderNumber);
    for (const item of o.items) renglones.push(renglonDesdeUSD(item.quantity, item.descripcion, exento, item.priceUSD, tasa, alicuota));
    if (o.shippingUSD > 0) renglones.push(renglonDesdeUSD(1, conceptoEntrega(o.deliveryMethod), exento, o.shippingUSD, tasa, alicuota));
    if (exento) dExento += descuentoBs(o.discountUSD, tasa, true, alicuota);
    else dGravado += descuentoBs(o.discountUSD, tasa, false, alicuota);
  }
  const totalUSD = r2(ordenes.reduce((s, o) => s + o.totalUSD, 0));
  return { renglones, totales: totales(renglones, alicuota, dGravado, dExento), totalUSD, cobradoBs: r2(totalUSD * tasa), sinIva };
}

// ── El comprador ─────────────────────────────────────────────────────────────────────────

/** RIF (J-40590333-3: 8 cifras y el verificador), cédula (V-12345678) o pasaporte (P-…). Se guarda en mayúsculas y con guion. */
export const DOCUMENTO = /^([VEJGPC])-?(\d{5,8})(?:-?(\d))?$/i;

export function normalizarDocumento(valor: string): string | null {
  const m = DOCUMENTO.exec(valor.replace(/[\s.]/g, ''));
  if (!m) return null;
  return `${m[1].toUpperCase()}-${m[2]}${m[3] ? `-${m[3]}` : ''}`;
}

/** J (jurídica), G (gobierno) y C (comuna) son empresas o entes; V, E y P, personas. */
export function tipoComprador(documento: string): 'PERSONA' | 'EMPRESA' {
  return /^[JGC]/i.test(documento.trim()) ? 'EMPRESA' : 'PERSONA';
}

import { CALENDARIO_POR_DEFECTO, esDiaHabil, siguienteDiaHabil } from '@/lib/horarios';

// ── Fechas y horas en hora de Venezuela (UTC−4 todo el año) ──────────────────────────────

const ZONA = 'America/Caracas';

/** "2026-11-14" de hoy en Venezuela */
export function hoyVe(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}

/** G-76: hora exacta actual en Venezuela ("HH:MM:SS", 24h) para SNAT/2026/00093 art. 8 num. 5 */
export function horaActualVe(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(ahora);
}

/** "14:38:05" → "02:38:05 p. m." (formato legible 00093 art. 8 num. 5) */
export function formatearHora12(hora24: string | null | undefined): string {
  if (!hora24 || !/^\d{2}:\d{2}(:\d{2})?$/.test(hora24)) return '';
  const [hRaw, m, s = '00'] = hora24.split(':');
  const h = Number(hRaw);
  const sufijo = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m}:${s} ${sufijo}`;
}

export const FECHA = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const HORA_24 = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

/** "2026-11-14" → el mediodía de ese día en Venezuela (así ningún cambio de zona lo pasa a otro día). null si no existe. */
export function fechaDesdeTexto(texto: string): Date | null {
  const m = FECHA.exec(texto);
  if (!m) return null;
  const fecha = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 16));
  return hoyVe(fecha) === texto ? fecha : null;
}

/** Si la fecha cae fin de semana o feriado nacional, la traslada al siguiente día hábil (COT art. 10). */
export function siguienteDiaHabilVe(fechaIso: string): string {
  if (!FECHA.test(fechaIso)) return fechaIso;
  return esDiaHabil(fechaIso, CALENDARIO_POR_DEFECTO) ? fechaIso : siguienteDiaHabil(fechaIso, CALENDARIO_POR_DEFECTO);
}

/** El mes del libro de ventas: "2026-11" */
export function periodoDe(fecha: Date): string {
  return hoyVe(fecha).slice(0, 7);
}

/** Lo que se escribe en las casillas DÍA, MES y AÑO */
export function partesFecha(fecha: Date): { dia: string; mes: string; anio: string } {
  const [anio, mes, dia] = hoyVe(fecha).split('-');
  return { dia, mes, anio };
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "noviembre de 2026" */
export function nombreMes(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  return `${MESES[(mes || 1) - 1]} de ${anio}`;
}

/** Los últimos 12 meses ("2026-11", "2026-10"…), del más nuevo al más viejo: los que se eligen en Facturas y en el libro */
export function ultimosMeses(actual: string): string[] {
  const [anio, mes] = actual.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const total = anio * 12 + (mes - 1) - i;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
  });
}

/**
 * Vencimiento de una obligación del `periodo` ("2026-11") en el día `diaLimite` del mes siguiente, ajustado a día hábil
 * según feriados nacionales de Venezuela (COT art. 10).
 */
export function venceDiaMesSiguiente(periodo: string, diaLimite: number): string {
  const [anio, mes] = periodo.split('-').map(Number);
  const sigMes = mes === 12 ? 1 : mes + 1;
  const sigAnio = mes === 12 ? anio + 1 : anio;
  const ultimoDia = new Date(Date.UTC(sigAnio, sigMes, 0)).getUTCDate();
  const dia = Math.min(Math.max(1, Math.trunc(diaLimite)), ultimoDia);
  const iso = `${sigAnio}-${String(sigMes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  return siguienteDiaHabilVe(iso);
}

/**
 * C-230 / G-76: hasta cuándo se declara el IVA de un mes: el día 15 del mes siguiente (contribuyente ordinario),
 * trasladado al siguiente día hábil si cae en fin de semana o feriado nacional (COT art. 10).
 */
export function venceIva(periodo: string, diaLimite = 15): string {
  return venceDiaMesSiguiente(periodo, diaLimite);
}
