// Montos del Pago Móvil (C-125). Módulo puro: lo usan el servidor (cotización, verificación, orden) y el checkout.
//
// El BDV busca el movimiento por monto EXACTO. Antes el checkout mostraba `total × tasa` redondeado con Intl
// ("Bs. 37,60") y mandaba al banco el mismo número con `toFixed(2)` ("37.59"): en 3,5 % de los totales diferían
// en un céntimo, el cliente pagaba lo que veía y el banco respondía 1010. Aquí todo sale de los céntimos enteros.

/**
 * Comisión mínima de un Pago Móvil de persona a comercio (P2C). La paga la tienda, que recibe: hasta 1,5 % del monto
 * (entre bancos distintos), nunca menos de Bs. 14. BCV, Gaceta Oficial 46.427 del 31/07/2026. Actualizar si cambia.
 */
export const COMISION_MINIMA_P2C_BS = 14;

/**
 * Diferencia que se absorbe sola al conciliar, en cualquier sentido (C-129; en C-125 era Bs. 1,00).
 * Pedir un segundo Pago Móvil por menos de la comisión mínima le cuesta a la tienda más de lo que cobra, y
 * acreditar al saldo menos que eso no le sirve al cliente.
 */
export const TOLERANCIA_BS = COMISION_MINIMA_P2C_BS;

/** Una cotización firmada del monto en Bs. vale este tiempo; después se usa la tasa del momento. */
export const VIGENCIA_COTIZACION_MS = 3 * 60 * 60 * 1000;

/**
 * Céntimos enteros de `valor` redondeando el decimal que se ve, no el binario: 37.595 → 3760.
 * `toPrecision(12)` quita el error de coma flotante (37.595 × 100 = 3759.4999999999995) antes de redondear.
 */
export function aCentimos(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.round(Number((valor * 100).toPrecision(12)));
}

/** Monto en Bs. (con 2 decimales exactos) de un total en USD a una tasa. */
export function montoBs(totalUSD: number, tasa: number): number {
  if (!(totalUSD > 0) || !(tasa > 0)) return 0;
  return aCentimos(totalUSD * tasa) / 100;
}

/** Formato de la API del BDV: "1115.25". */
export function montoParaAPI(bs: number): string {
  const c = aCentimos(bs);
  return `${Math.trunc(c / 100)}.${String(Math.abs(c) % 100).padStart(2, '0')}`;
}

/** Para pegar en la app del banco: "1115,25" (sin puntos de miles, coma decimal). */
export function montoParaCopiar(bs: number): string {
  return montoParaAPI(bs).replace('.', ',');
}

/** "1.115,25", "1115,25", "1115.25" o "1,115.25" → 1115.25. Null si no es un monto. */
export function leerMontoBs(texto: string): number | null {
  const limpio = texto.trim().replace(/^bs\.?\s*/i, '').replace(/\s/g, '');
  if (!/^\d[\d.,]*$/.test(limpio)) return null;
  const ultimo = Math.max(limpio.lastIndexOf(','), limpio.lastIndexOf('.'));
  // Separador decimal: el último, si le siguen 1 o 2 dígitos. Si no, todo son miles
  const decimales = ultimo >= 0 && limpio.length - ultimo - 1 <= 2 ? limpio.slice(ultimo + 1) : '';
  const entero = (decimales ? limpio.slice(0, ultimo) : limpio).replace(/[.,]/g, '');
  const valor = Number(`${entero}.${decimales || '0'}`);
  return Number.isFinite(valor) && valor > 0 ? aCentimos(valor) / 100 : null;
}

/** Fecha de hoy en Venezuela ("2026-09-29"). Antes se usaba la de UTC: después de las 8 p. m. ya era "mañana". */
export function hoyCaracas(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}

export type EstadoConciliacion = 'EXACTO' | 'REDONDEO' | 'SOBREPAGO' | 'FALTA';

export interface Conciliacion {
  estado: EstadoConciliacion;
  /** Lo que se esperaba y lo pagado, en Bs. a la tasa congelada del pago */
  esperadoBs: number;
  pagadoBs: number;
  /** pagado − esperado. Positivo: de más; negativo: falta */
  diferenciaBs: number;
  /** La diferencia en USD a esa tasa (lo que va al saldo o lo que falta) */
  diferenciaUSD: number;
}

/**
 * Compara lo pagado con lo esperado. Hasta `TOLERANCIA_BS` de diferencia, en cualquier sentido, se da por pagado
 * (REDONDEO): ni se frena la venta por céntimos ni se acreditan céntimos al saldo.
 */
export function conciliar(pagadoBs: number, totalUSD: number, tasa: number): Conciliacion {
  const esperadoBs = montoBs(totalUSD, tasa);
  const diferenciaBs = (aCentimos(pagadoBs) - aCentimos(esperadoBs)) / 100;
  const diferenciaUSD = tasa > 0 ? Math.round((diferenciaBs / tasa) * 100) / 100 : 0;
  const estado: EstadoConciliacion = diferenciaBs === 0
    ? 'EXACTO'
    : Math.abs(diferenciaBs) <= TOLERANCIA_BS ? 'REDONDEO'
      : diferenciaBs > 0 ? 'SOBREPAGO' : 'FALTA';
  return { estado, esperadoBs, pagadoBs: aCentimos(pagadoBs) / 100, diferenciaBs, diferenciaUSD };
}
