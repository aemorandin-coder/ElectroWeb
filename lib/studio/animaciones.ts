// C-273: las animaciones de las piezas sueltas y de toda la historia (docs/plan/ELECTROSTUDIO.md, Fase 5): cómo entra
// cada pieza, qué hace mientras está, cómo sale, la salida de la historia, el cierre con el logo y la duración del video.
// Módulo puro: lo usan el motor (engine.ts), el panel y la revisión.

/** "auto": como la historia (el estilo de animación de la plantilla, después de ella y una tras otra) */
export const ENTRADAS = {
  auto: 'Como la historia',
  aparecer: 'Aparecer',
  subir: 'Subir',
  bajar: 'Bajar',
  izquierda: 'Desde la izquierda',
  derecha: 'Desde la derecha',
  zoom: 'Zoom',
  rebote: 'Rebote',
  sello: 'Sello',
  girar: 'Girar',
  escribir: 'Máquina de escribir',
  borroso: 'De borroso a nítido',
  barrido: 'Barrido',
} as const;
export type EntradaId = keyof typeof ENTRADAS;

export const ENFASIS = {
  ninguno: 'Ninguno',
  latido: 'Latido',
  flotar: 'Flotar',
  brillo: 'Brillo',
  temblor: 'Temblor corto',
} as const;
export type EnfasisId = keyof typeof ENFASIS;

export const SALIDAS = {
  ninguna: 'Se queda hasta el final',
  desvanecer: 'Desvanecer',
  subir: 'Subir',
  bajar: 'Bajar',
  izquierda: 'Hacia la izquierda',
  derecha: 'Hacia la derecha',
  encoger: 'Encoger',
  zoomfuera: 'Zoom hacia afuera',
  barrido: 'Barrido',
  caer: 'Caer',
} as const;
export type SalidaId = keyof typeof SALIDAS;

/** Cómo termina toda la historia, en su último segundo */
export const FINALES = {
  ninguno: 'Se queda quieta',
  fundido: 'Fundido al azul',
  barrido: 'Barrido',
  cortina: 'Cortina',
} as const;
export type FinalId = keyof typeof FINALES;

export const DURACIONES = [5, 7, 10, 15] as const;
export type DuracionVideo = (typeof DURACIONES)[number];
export const DURACION_DEF: DuracionVideo = 7;
export const duracionDe = (f: { duracion?: number } | null | undefined): number =>
  (DURACIONES as readonly number[]).includes(Number(f?.duracion)) ? Number(f?.duracion) : DURACION_DEF;

/** Lo que tarda el cierre con el logo, al final del video */
export const CIERRE_LOGO = 1.4;
/** Lo que tarda la salida de toda la historia */
export const FINAL_DURA = 0.7;

/** El segundo en que entra la pieza `i`: el elegido, o después de la plantilla y una tras otra */
export const inicioEntrada = (inicio: number | null, i: number) => (inicio ?? 0.95 + i * 0.16);

/** El segundo en que sale: el elegido, o "al final" (antes del cierre con el logo, si lo hay) */
export function inicioSalida(inicio: number | null, duracion: number, cierre: boolean): number {
  const fin = duracion - (cierre ? CIERRE_LOGO : 0) - 0.75;
  return inicio ?? Math.max(0.5, fin);
}
