// C-282 (A-12): el lote de tarjetas impresas recién generado espera en esta pestaña hasta que se cierra. Sus PIN se ven una
// sola vez: antes, salir por el menú del panel sin imprimir la hoja los perdía (el aviso del navegador solo frena recargar o
// cerrar la pestaña). En sessionStorage: muere con la pestaña y no viaja a otra.

import type { PrintedCard } from './hoja';

const CLAVE = 'gift-cards:lote-sin-cerrar';

export interface LotePendiente { cards: PrintedCard[]; impreso: boolean }

export function leerLotePendiente(): LotePendiente | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    if (!crudo) return null;
    const lote = JSON.parse(crudo) as Partial<LotePendiente>;
    if (!Array.isArray(lote.cards) || lote.cards.length === 0) return null;
    const cards = lote.cards.filter((c): c is PrintedCard => Boolean(c && typeof c.code === 'string' && typeof c.pin === 'string' && typeof c.amountUSD === 'number'));
    return cards.length > 0 ? { cards, impreso: lote.impreso === true } : null;
  } catch {
    return null;
  }
}

export function guardarLotePendiente(lote: LotePendiente | null) {
  try {
    if (lote) sessionStorage.setItem(CLAVE, JSON.stringify(lote));
    else sessionStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento: queda el aviso del navegador al recargar o cerrar
  }
}
