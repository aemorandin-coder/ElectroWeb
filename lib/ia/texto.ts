// C-213: lo que redacta la IA pasa por aquí antes de llegar al panel o a un cliente. Las reglas del proyecto valen
// aunque el modelo se equivoque: sin emojis y "Puntos ES", nunca saldo, billetera, monedero ni wallet (ley venezolana).

const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u{FE0F}\u{200D}\u{20E3}]/gu;
/** "en su billetera" sobra: lo que queda ("tiene $12,50 de saldo") pasa a "tiene $12,50 de Puntos ES" */
const LUGAR_DEL_SALDO = /\s+(en|de) (su|tu|la|el) (billetera|monedero|wallet)\b/gi;
const PALABRAS_DEL_SALDO = /\b(saldo a favor|saldo disponible|saldo|billetera|monedero|wallet)\b/gi;

/** Texto de la IA, recortado y con las reglas aplicadas. Lo que no es texto queda vacío */
export function limpiarTextoIA(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  const limpio = valor
    .replace(EMOJI, '')
    .replace(LUGAR_DEL_SALDO, '')
    .replace(PALABRAS_DEL_SALDO, 'Puntos ES')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ([.,;:])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return limpio.length > maximo ? `${limpio.slice(0, maximo - 1).trimEnd()}…` : limpio;
}
