// C-213: lo que redacta la IA pasa por aquí antes de llegar al panel o a un cliente. Las reglas del proyecto valen
// aunque el modelo se equivoque: sin emojis y "Puntos ES", nunca saldo, billetera, monedero ni wallet (ley venezolana).
// C-288: las reglas viven en lib/ia/limpieza.ts (las mismas que comprueba lib/ia/revisar.ts y que se anotan en Configuración →
// IA · Claude). Esto queda como la última red de cada uso: lo que ya limpió la revisión pasa sin cambios.

import { puntosEsEn, quitarEmojisEn, sinGritos } from './limpieza';

/** Texto de la IA, recortado y con las reglas aplicadas. Lo que no es texto queda vacío */
export function limpiarTextoIA(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  const limpio = sinGritos(puntosEsEn(quitarEmojisEn(valor))).texto
    .replace(/[ \t]+/g, ' ')
    .replace(/ ([.,;:])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return limpio.length > maximo ? `${limpio.slice(0, maximo - 1).trimEnd()}…` : limpio;
}
