// Reglas del pago en el checkout (C-132). Módulo puro: lo usan el checkout, la cotización y POST /api/orders.
//
// - Puntos ES (WALLET): pago al instante con lo que el cliente tiene en la tienda.
// - Pago Móvil: verificado con el BDV. Si el cliente tiene algo de Puntos ES pero no le alcanza, paga el resto por
//   Pago Móvil ("pago mixto"): los puntos se descuentan cuando el banco confirma lo que falta, en la misma transacción.
// - Manuales (Binance Pay, PayPal, Zelle, Zinli, transferencia…): el cliente paga, escribe la referencia y la orden
//   queda "Por validar"; el stock se aparta RESERVA_PAGO_MANUAL_HORAS mientras el equipo confirma. Decisión de Andrés
//   del 29/09 (D-P2 y D-P3 de AUDITORIA_PAGOS.md): Binance es una cuenta personal, sin API para verificar.
// Sin recargos por método de pago: la comisión la paga la tienda (Ley de Tarjetas art. 25 y Precios Justos, C-129).

import { aCentimos } from '@/lib/pago-movil/monto';

/** Horas que un pago manual aparta el stock mientras el equipo lo verifica. */
export const RESERVA_PAGO_MANUAL_HORAS = 2;

/**
 * Tipos de CompanyPaymentMethod que se pagan directo en el checkout con verificación del equipo.
 * Fuera: MOBILE_PAYMENT (va por el BDV) y CASH (se paga al retirar; no tiene referencia que verificar).
 */
export const TIPOS_PAGO_MANUAL = ['BINANCE_PAY', 'PAYPAL', 'ZELLE', 'ZINLI', 'BANK_TRANSFER', 'CRYPTO', 'MERCANTIL_PANAMA', 'OTHER'] as const;
export type TipoPagoManual = (typeof TIPOS_PAGO_MANUAL)[number];

export function esPagoManual(tipo: string | null | undefined): tipo is TipoPagoManual {
  return (TIPOS_PAGO_MANUAL as readonly string[]).includes(tipo ?? '');
}

/** Métodos que cobran en dólares o en USDT (1:1): el monto que se muestra y se copia es el total en USD. */
export function monedaPagoManual(tipo: TipoPagoManual): 'USD' | 'USDT' | 'BS' {
  if (tipo === 'BINANCE_PAY' || tipo === 'CRYPTO') return 'USDT';
  if (tipo === 'BANK_TRANSFER') return 'BS';
  return 'USD';
}

/** Qué pedirle al cliente como comprobante, según el método. */
export function ayudaReferencia(tipo: TipoPagoManual): { etiqueta: string; ejemplo: string } {
  switch (tipo) {
    case 'BINANCE_PAY': return { etiqueta: 'ID de la orden de Binance Pay', ejemplo: 'Ej: 285731946120945664' };
    case 'PAYPAL': return { etiqueta: 'ID de la transacción de PayPal', ejemplo: 'Ej: 8MC585209K746392H' };
    case 'CRYPTO': return { etiqueta: 'Hash (TxID) de la transferencia', ejemplo: 'Ej: 0x9f2c…' };
    case 'ZELLE': return { etiqueta: 'Número de confirmación de Zelle', ejemplo: 'Ej: 7R2K9M4Q' };
    default: return { etiqueta: 'Número de referencia del pago', ejemplo: 'Ej: 00123456' };
  }
}

/**
 * Referencia de un pago manual: 4 a 100 letras, números y separadores comunes. Null si no sirve.
 * Se compara sin espacios y en mayúsculas para detectar la misma referencia escrita de dos formas.
 */
export function leerReferenciaManual(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpia = valor.trim().replace(/\s+/g, ' ');
  if (limpia.length < 4 || limpia.length > 100) return null;
  return /^[A-Za-z0-9#._:\- ]+$/.test(limpia) ? limpia : null;
}

export function claveReferencia(referencia: string): string {
  return referencia.replace(/\s+/g, '').toUpperCase();
}

/**
 * Pago mixto: cuánto se paga con Puntos ES y cuánto falta por Pago Móvil, en céntimos exactos.
 * `mixto` es false si los puntos no alcanzan para nada (0) o alcanzan para todo (se paga solo con Puntos ES).
 */
export function repartirPuntos(disponibleUSD: number, totalUSD: number): { puntosUSD: number; restanteUSD: number; mixto: boolean } {
  const disponible = Math.max(0, aCentimos(disponibleUSD));
  const total = Math.max(0, aCentimos(totalUSD));
  const puntos = Math.min(disponible, total);
  return { puntosUSD: puntos / 100, restanteUSD: (total - puntos) / 100, mixto: puntos > 0 && puntos < total };
}
