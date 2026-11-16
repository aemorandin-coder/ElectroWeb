// C-272: los stickers de ElectroStudio (docs/plan/ELECTROSTUDIO.md, Fase 4; el equipo eligió los 6 grupos, D4).
// Dibujados con las reglas del pack de íconos (trazo redondo, rellenos planos, un solo acento), no sacados de una
// librería. Cada uno es una lista de formas de SVG (`d`) sobre su caja: el motor las pinta con Path2D y la galería con
// <svg>, así se ven igual. Módulo puro.
import type { FuenteId } from './fuentes';

export const GRUPOS_STICKER = {
  ofertas: 'Ofertas',
  trazos: 'Flechas y trazos',
  llamados: 'Llamados',
  iconos: 'Íconos',
  chispa: 'Chispa',
  navidad: 'Navidad',
} as const;
export type GrupoSticker = keyof typeof GRUPOS_STICKER;

/** Los colores de un sticker: `p` y `s` los cambia la persona (color y color 2); los demás son fijos */
export type ColorSticker = 'p' | 's' | 'blanco' | 'tinta' | 'marino' | 'oferta' | 'amarillo' | 'dorado' | 'sombra';
/** De dónde sale cada color base: los de la historia (acento y acento2) o uno fijo */
export type ColorBase = 'acento' | 'acento2' | Exclude<ColorSticker, 'p' | 's'>;
export const COLORES_FIJOS: Record<Exclude<ColorBase, 'acento' | 'acento2'>, string> = {
  blanco: '#FFFFFF',
  tinta: '#0A1B3D',
  marino: '#0E1F44',
  oferta: '#E0263A',
  amarillo: '#FFD447',
  dorado: '#FFB400',
  sombra: '#05102A',
};

export interface FormaSticker {
  d: string;
  relleno?: ColorSticker;
  trazo?: ColorSticker;
  /** Grosor del trazo, en unidades de la caja */
  ancho?: number;
  /** Trazo punteado: [raya, espacio] */
  punteado?: [number, number];
  opacidad?: number;
}

export interface TextoSticker {
  /** El texto con que arranca; con Enter, varias líneas */
  def: string;
  x: number;
  y: number;
  tam: number;
  color: ColorSticker;
  /** Hasta dónde puede ocupar: si no entra, la letra se achica */
  maxAncho: number;
  ancla?: 'centro' | 'izquierda';
  fuente?: FuenteId;
  peso?: number;
  cursiva?: boolean;
  max?: number;
}

export interface Sticker {
  id: string;
  nombre: string;
  grupo: GrupoSticker;
  /** Ancho y alto de la caja del dibujo */
  vb: [number, number];
  formas: FormaSticker[];
  texto?: TextoSticker;
  /** Un ícono del pack adentro (la placa de los íconos y las píldoras de los llamados) */
  icono?: { x: number; y: number; s: number; color: ColorSticker; nombre?: string };
  /** Giro propio del dibujo (el sello va torcido) */
  giro?: number;
  /** Con qué colores arranca `p` y `s` */
  base: { p: ColorBase; s: ColorBase };
  /** Ancho al agregarlo, en px de la imagen */
  tamInicial: number;
}

function estrellaD(n: number, R: number, r: number, cx = 100, cy = 100): string {
  const p: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / n;
    const rad = i % 2 ? r : R;
    p.push(`${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `M${p.join(' L')} Z`;
}
const circuloD = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
/** La píldora de 600 × 120 de los llamados y del envío */
const PILDORA = 'M60 6 H540 a54 54 0 0 1 0 108 H60 a54 54 0 0 1 0 -108 Z';
function llamado(id: string, nombre: string, icono: string, texto: string, p: ColorBase, s: ColorBase, grupo: GrupoSticker = 'llamados'): Sticker {
  return {
    id,
    nombre,
    grupo,
    vb: [600, 120],
    formas: [{ d: PILDORA, relleno: 'p', trazo: 'marino', ancho: 5 }],
    icono: { x: 34, y: 24, s: 72, color: 's', nombre: icono },
    texto: { def: texto, x: 124, y: 62, tam: 46, color: 's', maxAncho: 432, ancla: 'izquierda', max: 30 },
    base: { p, s },
    tamInicial: 520,
  };
}

const LISTA: Sticker[] = [
  // Ofertas: el texto se cambia
  {
    id: 'estrella', nombre: 'Estrella', grupo: 'ofertas', vb: [200, 200],
    formas: [{ d: estrellaD(16, 92, 76), relleno: 'p', trazo: 'marino', ancho: 5 }],
    texto: { def: '-30 %', x: 100, y: 102, tam: 46, color: 's', maxAncho: 132, max: 10 },
    base: { p: 'oferta', s: 'blanco' }, tamInicial: 300,
  },
  {
    id: 'sello', nombre: 'Sello', grupo: 'ofertas', vb: [200, 200], giro: -12,
    formas: [
      { d: circuloD(100, 100, 86), relleno: 'p', trazo: 'marino', ancho: 5 },
      { d: circuloD(100, 100, 70), trazo: 's', ancho: 3, punteado: [7, 9] },
    ],
    texto: { def: 'NUEVO', x: 100, y: 102, tam: 40, color: 's', maxAncho: 124, max: 12 },
    base: { p: 'acento2', s: 'blanco' }, tamInicial: 300,
  },
  {
    id: 'cinta', nombre: 'Cinta', grupo: 'ofertas', vb: [360, 110],
    formas: [
      { d: 'M8 34 L44 34 L44 92 L8 92 L24 63 Z', relleno: 'marino' },
      { d: 'M352 34 L316 34 L316 92 L352 92 L336 63 Z', relleno: 'marino' },
      { d: 'M30 20 H330 V78 H30 Z', relleno: 'p', trazo: 'marino', ancho: 4 },
      { d: 'M30 78 L44 92 L44 78 Z M330 78 L316 92 L316 78 Z', relleno: 'sombra' },
    ],
    texto: { def: 'ÚLTIMAS UNIDADES', x: 180, y: 50, tam: 30, color: 's', maxAncho: 280, max: 24 },
    base: { p: 'tinta', s: 'blanco' }, tamInicial: 560,
  },
  {
    id: 'etiqueta', nombre: 'Etiqueta de precio', grupo: 'ofertas', vb: [220, 140],
    formas: [
      { d: 'M60 10 H200 a12 12 0 0 1 12 12 V118 a12 12 0 0 1 -12 12 H60 L10 70 Z', relleno: 'p', trazo: 'marino', ancho: 5 },
      { d: circuloD(52, 70, 9), trazo: 'marino', ancho: 5 },
    ],
    texto: { def: '2x1', x: 135, y: 72, tam: 54, color: 's', maxAncho: 120, max: 10 },
    base: { p: 'blanco', s: 'oferta' }, tamInicial: 360,
  },
  {
    id: 'globo', nombre: 'Globo', grupo: 'ofertas', vb: [220, 170],
    formas: [{ d: 'M30 14 H190 a22 22 0 0 1 22 22 V104 a22 22 0 0 1 -22 22 H96 L56 158 L62 126 H30 a22 22 0 0 1 -22 -22 V36 a22 22 0 0 1 22 -22 Z', relleno: 'p', trazo: 'marino', ancho: 5 }],
    texto: { def: '¡HOY!', x: 110, y: 70, tam: 50, color: 's', maxAncho: 168, max: 14 },
    base: { p: 'blanco', s: 'tinta' }, tamInicial: 340,
  },
  llamado('envio', 'Envío', 'Envio', 'ENVÍO A TODA VENEZUELA', 'blanco', 'acento2', 'ofertas'),
  // Flechas y trazos a mano
  {
    id: 'flecha', nombre: 'Flecha curva', grupo: 'trazos', vb: [200, 200],
    formas: [{ d: 'M28 160 C 40 90, 100 50, 168 52', trazo: 'p', ancho: 10 }, { d: 'M140 30 L170 52 L142 78', trazo: 'p', ancho: 10 }],
    base: { p: 'blanco', s: 'blanco' }, tamInicial: 260,
  },
  {
    id: 'lazo', nombre: 'Flecha en lazo', grupo: 'trazos', vb: [220, 200],
    formas: [{ d: 'M20 150 C 70 150, 110 120, 100 90 C 92 66, 60 70, 66 96 C 74 132, 140 140, 190 70', trazo: 'p', ancho: 10 }, { d: 'M168 66 L192 66 L190 92', trazo: 'p', ancho: 10 }],
    base: { p: 'blanco', s: 'blanco' }, tamInicial: 300,
  },
  {
    id: 'encerrar', nombre: 'Encerrar', grupo: 'trazos', vb: [240, 160],
    formas: [{ d: 'M200 34 C 160 8, 40 14, 22 66 C 6 114, 90 150, 160 138 C 220 128, 236 84, 206 50 C 190 32, 150 22, 112 24', trazo: 'p', ancho: 9 }],
    base: { p: 'amarillo', s: 'amarillo' }, tamInicial: 420,
  },
  {
    id: 'subrayar', nombre: 'Subrayar', grupo: 'trazos', vb: [260, 80],
    formas: [{ d: 'M14 44 C 70 30, 150 26, 246 30', trazo: 'p', ancho: 10 }, { d: 'M40 62 C 100 52, 170 50, 220 54', trazo: 'p', ancho: 10 }],
    base: { p: 'amarillo', s: 'amarillo' }, tamInicial: 420,
  },
  {
    id: 'destello', nombre: 'Destello', grupo: 'trazos', vb: [200, 200],
    formas: [
      { d: 'M100 18 C 108 72, 128 92, 182 100 C 128 108, 108 128, 100 182 C 92 128, 72 108, 18 100 C 72 92, 92 72, 100 18 Z', relleno: 'p' },
      { d: 'M160 26 C 162 40, 168 46, 182 48 C 168 50, 162 56, 160 70 C 158 56, 152 50, 138 48 C 152 46, 158 40, 160 26 Z', relleno: 's' },
    ],
    base: { p: 'blanco', s: 'amarillo' }, tamInicial: 200,
  },
  {
    id: 'mira', nombre: '¡Mira!', grupo: 'trazos', vb: [200, 200],
    formas: [{ d: 'M100 30 V70', trazo: 'p', ancho: 10 }, { d: 'M42 54 L70 84', trazo: 'p', ancho: 10 }, { d: 'M158 54 L130 84', trazo: 'p', ancho: 10 }],
    base: { p: 'blanco', s: 'blanco' }, tamInicial: 200,
  },
  // Llamados: lo que tiene que hacer quien la ve
  llamado('desliza', 'Desliza', 'FlechaArriba', 'DESLIZA', 'blanco', 'tinta'),
  llamado('enlace', 'Toca el enlace', 'Enlace', 'TOCA EL ENLACE', 'acento2', 'blanco'),
  llamado('escribenos', 'Escríbenos', 'Chat', 'ESCRÍBENOS', 'blanco', 'tinta'),
  llamado('comenta', 'Comenta', 'Chat', 'COMENTA «QUIERO»', 'tinta', 'blanco'),
  llamado('comparte', 'Compártela', 'Compartir', 'COMPÁRTELA', 'blanco', 'tinta'),
  // Un ícono del pack en su placa (el ícono se elige en la galería)
  {
    id: 'icono', nombre: 'Ícono', grupo: 'iconos', vb: [120, 120],
    formas: [{ d: 'M34 6 H86 a28 28 0 0 1 28 28 V86 a28 28 0 0 1 -28 28 H34 a28 28 0 0 1 -28 -28 V34 a28 28 0 0 1 28 -28 Z', relleno: 'p', trazo: 'marino', ancho: 4 }],
    icono: { x: 27, y: 27, s: 66, color: 's' },
    base: { p: 'blanco', s: 'acento2' }, tamInicial: 200,
  },
  // Chispa: la pose se elige en la galería (la imagen de lib/studio/chispa.ts, con su borde blanco)
  { id: 'chispa', nombre: 'Chispa', grupo: 'chispa', vb: [600, 735], formas: [], base: { p: 'blanco', s: 'blanco' }, tamInicial: 320 },
  // Navidad, con el gorro de la tienda
  {
    id: 'gorro', nombre: 'Gorro', grupo: 'navidad', vb: [200, 200],
    formas: [
      { d: 'M44 140 C 50 80, 90 40, 140 44 C 168 46, 178 70, 170 96 L150 92 C 150 78, 140 70, 128 74 C 112 80, 108 110, 112 140 Z', relleno: 'p', trazo: 'marino', ancho: 6 },
      { d: 'M49 132 H115 a15 15 0 0 1 0 30 H49 a15 15 0 0 1 0 -30 Z', relleno: 's', trazo: 'marino', ancho: 6 },
      { d: circuloD(168, 104, 16), relleno: 's', trazo: 'marino', ancho: 6 },
    ],
    base: { p: 'oferta', s: 'blanco' }, tamInicial: 240,
  },
  {
    id: 'esfera', nombre: 'Esfera', grupo: 'navidad', vb: [200, 200],
    formas: [
      { d: 'M90 34 H110 a4 4 0 0 1 4 4 V52 a4 4 0 0 1 -4 4 H90 a4 4 0 0 1 -4 -4 V38 a4 4 0 0 1 4 -4 Z', relleno: 'dorado', trazo: 'marino', ancho: 6 },
      { d: 'M100 34 C 100 18, 116 16, 118 26', trazo: 'marino', ancho: 6 },
      { d: circuloD(100, 116, 62), relleno: 'p', trazo: 'marino', ancho: 6 },
      { d: 'M50 100 C 80 116, 120 116, 150 100', trazo: 's', ancho: 7 },
      { d: circuloD(76, 92, 10), relleno: 's', opacidad: 0.75 },
    ],
    base: { p: 'oferta', s: 'blanco' }, tamInicial: 220,
  },
  {
    id: 'copo', nombre: 'Copo', grupo: 'navidad', vb: [200, 200],
    formas: [{ d: 'M100 22 V178 M32 61 L168 139 M32 139 L168 61', trazo: 'p', ancho: 9 }, { d: 'M86 34 L100 48 L114 34 M86 166 L100 152 L114 166', trazo: 'p', ancho: 9 }],
    base: { p: 'blanco', s: 'blanco' }, tamInicial: 180,
  },
  {
    id: 'navidad', nombre: 'Sello navideño', grupo: 'navidad', vb: [200, 200], giro: -8,
    formas: [
      { d: circuloD(100, 100, 88), relleno: 'p', trazo: 'marino', ancho: 5 },
      { d: circuloD(100, 100, 72), trazo: 's', ancho: 3, punteado: [2, 10] },
    ],
    texto: { def: 'Feliz\nNavidad', x: 100, y: 100, tam: 34, color: 's', maxAncho: 130, fuente: 'playfair', peso: 800, cursiva: true, max: 24 },
    base: { p: 'oferta', s: 'blanco' }, tamInicial: 300,
  },
];

export const STICKERS: Record<string, Sticker> = Object.fromEntries(LISTA.map((s) => [s.id, s]));
export const STICKER_IDS = LISTA.map((s) => s.id) as [string, ...string[]];
export const stickersDe = (g: GrupoSticker) => LISTA.filter((s) => s.grupo === g);

/** Los íconos que la galería de Navidad sugiere (además de sus stickers) */
export const ICONOS_NAVIDAD = ['Regalo', 'Estrella'];

/** El alto que ocupa un sticker de `ancho` px */
export const altoSticker = (s: Sticker, ancho: number) => (ancho * s.vb[1]) / s.vb[0];
