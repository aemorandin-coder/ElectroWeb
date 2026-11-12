// C-204: "Sugeridos" en la lista del proveedor. De una lista de 2.000, primero lo que conviene subir. Es la regla que
// eligió Andrés el 12/11:
// - afín a la tienda: electricidad, iluminación, protectores de voltaje, herramientas eléctricas, bombas y cerrajería;
// - con existencia;
// - que aguante el envío: de unos $25 o más se vende solo. Lo más barato va como complemento: el flete desde La Victoria
//   cuesta lo mismo y se comería la compra.
// Módulo puro: solo ordena la vista previa, no decide nada en el servidor.

import { palabrasDe } from './no-se-envia';

/** Desde este precio de venta (con el margen y el IVA) un producto aguanta solo su envío */
export const PRECIO_SE_VENDE_SOLO = 25;

/** Las familias afines y cómo las escribe un sistema de ferretería ("TALADRO IMPACT", "PROTECT PAR-110", "BOMB LED") */
const FAMILIAS: ReadonlyArray<{ familia: string; palabras: readonly string[] }> = [
  {
    familia: 'Herramientas eléctricas',
    palabras: [
      'taladro', 'esmeril', 'pulidora', 'sierra', 'caladora', 'calad', 'lijadora', 'rotomartillo', 'atornillador',
      'pistola de calor', 'pistola calor', 'hidrolavadora', 'aspiradora', 'soldadora', 'maquina de soldar', 'maq soldar',
      'maq p soldar', 'compresor', 'bateria litio', 'bateria de litio', 'cargador bateria', 'cargador de bateria',
      'inalambrico', 'inalambrica', 'inalamb', 'ingleteadora', 'rebajadora',
    ],
  },
  {
    familia: 'Bombas y agua',
    palabras: ['bomba', 'motobomba', 'press control', 'presostato', 'hidroneumatico', 'hidrocompacto', 'flotante', 'ducha', 'calentador'],
  },
  {
    familia: 'Electricidad y protección',
    palabras: [
      'protector', 'protect', 'breaker', 'break', 'tablero', 'cable', 'thw', 'thhn', 'spt', 'toma', 'tomacorriente', 'enchufe',
      'interruptor', 'regleta', 'extension', 'extens', 'multimetro', 'amperimetrica', 'fotocelda', 'voltaje',
    ],
  },
  {
    familia: 'Iluminación',
    palabras: ['led', 'bombillo', 'bomb', 'reflector', 'lampara', 'lamp', 'panel', 'linterna', 'foco', 'dicroic', 'plafon'],
  },
  {
    familia: 'Cerrajería',
    palabras: ['cerradura', 'cerr', 'candado', 'cerrojo', 'manilla', 'pasador'],
  },
];

export interface Sugerencia {
  /** La familia afín a la tienda, o null si no es de las que se buscan */
  familia: string | null;
  /** Aguanta solo su envío (precio de venta de $25 o más); si no, va como complemento */
  seVendeSolo: boolean;
}

/** La familia afín del producto, por su nombre en la lista o en la tienda */
export function familiaAfin(textos: ReadonlyArray<string | null | undefined>): string | null {
  const frases = textos.filter((t): t is string => Boolean(t && t.trim())).map((t) => ` ${palabrasDe(t)} `);
  for (const { familia, palabras } of FAMILIAS) {
    if (palabras.some((p) => frases.some((f) => f.includes(` ${p} `)))) return familia;
  }
  return null;
}

export function sugerencia(textos: ReadonlyArray<string | null | undefined>, precioVenta: number | null): Sugerencia {
  return { familia: familiaAfin(textos), seVendeSolo: precioVenta !== null && precioVenta >= PRECIO_SE_VENDE_SOLO };
}

/** El orden de "Sugeridos": primero lo que se vende solo; después, más existencia y más precio */
export function compararSugeridos(
  a: { sugerencia: Sugerencia; existencia: number | null; precio: number | null },
  b: { sugerencia: Sugerencia; existencia: number | null; precio: number | null },
): number {
  if (a.sugerencia.seVendeSolo !== b.sugerencia.seVendeSolo) return a.sugerencia.seVendeSolo ? -1 : 1;
  const existencia = (b.existencia ?? 0) - (a.existencia ?? 0);
  if (existencia !== 0) return existencia;
  return (b.precio ?? 0) - (a.precio ?? 0);
}
