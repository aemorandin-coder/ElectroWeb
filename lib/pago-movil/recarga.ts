// Recarga de Puntos ES pagada por Pago Móvil (S-06): con qué tasa se compara el pago y cuánto se acredita.
// Módulo puro: lo usa la verificación (app/api/pago-movil/verificar) y se prueba sin base de datos.

import { VIGENCIA_COTIZACION_MS, aCentimos, conciliar, type Conciliacion } from './monto';

/** El JSON de la metadata de una transacción. Si está roto o no es un objeto, {}: nunca revienta. */
export function leerMetadata(texto: string | null | undefined): Record<string, unknown> {
  if (!texto) return {};
  try {
    const valor: unknown = JSON.parse(texto);
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * La tasa con la que se compara el pago de una recarga: la que se le mostró al cliente al pedirla (`tasaSolicitud`),
 * mientras la solicitud tenga menos de `VIGENCIA_COTIZACION_MS`; después, o si la recarga no la guardó, la del momento.
 */
export function tasaDeLaRecarga(metadata: Record<string, unknown>, tasaDelMomento: number, ahora: number = Date.now()): number {
  const tasa = Number(metadata.tasaSolicitud);
  const pedida = typeof metadata.requestedAt === 'string' ? Date.parse(metadata.requestedAt) : NaN;
  const edad = ahora - pedida;
  // Una fecha de más de un minuto en el futuro no sirve (igual que la cotización firmada de las compras)
  if (tasa > 0 && Number.isFinite(tasa) && Number.isFinite(edad) && edad < VIGENCIA_COTIZACION_MS && edad > -60_000) return tasa;
  return tasaDelMomento;
}

export type DecisionRecarga =
  | { aprobar: false; conciliacion: Conciliacion | null }
  | {
    aprobar: true;
    conciliacion: Conciliacion;
    /** Lo que se acredita en Puntos ES: lo pedido y, si pagó de más, la diferencia */
    acreditarUSD: number;
    /** Lo pagado de más en USD a esa tasa (0 si no hubo) */
    sobrepagoUSD: number;
  };

/**
 * Qué se hace con lo que confirmó el banco. Exacto o con la diferencia del redondeo (`TOLERANCIA_BS`): se aprueba y se
 * acredita lo pedido. De más: se aprueba y se acredita también lo de más. Faltando más que el redondeo, o sin tasa: no se
 * aprueba sola y la revisa el equipo.
 */
export function decidirRecarga(pagadoBs: number, pedidoUSD: number, tasa: number): DecisionRecarga {
  // Sin tasa `conciliar` esperaría Bs. 0 y daría cualquier pago por "de más"
  if (!(tasa > 0)) return { aprobar: false, conciliacion: null };
  const conciliacion = conciliar(pagadoBs, pedidoUSD, tasa);
  if (conciliacion.estado === 'FALTA') return { aprobar: false, conciliacion };
  const sobrepagoUSD = conciliacion.estado === 'SOBREPAGO' ? conciliacion.diferenciaUSD : 0;
  return { aprobar: true, conciliacion, acreditarUSD: (aCentimos(pedidoUSD) + aCentimos(sobrepagoUSD)) / 100, sobrepagoUSD };
}
