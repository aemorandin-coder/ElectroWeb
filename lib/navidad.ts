// Tema navideño de la tienda (C-186). Módulo puro, sin Prisma ni navegador: lo usan el servidor (los settings públicos y
// el popup del inicio), la validación de la API y el panel (Marketing → Navidad).

/** Las columnas de `company_settings` que deciden el tema. Las fechas llegan como Date (Prisma, columna DATE) o 'AAAA-MM-DD' (panel). */
export interface ConfigNavidad {
  christmasTheme: boolean;
  christmasThemeFrom: Date | string | null;
  christmasThemeUntil: Date | string | null;
}

/** apagado: el interruptor está apagado. programado: todavía no llega el primer día. terminado: ya pasó el último. */
export type EstadoNavidad = 'apagado' | 'programado' | 'activo' | 'terminado';

/** Hoy en Venezuela ('2026-12-01'): el tema cambia a la medianoche de la tienda, no a la del servidor. */
export function diaEnCaracas(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}

/** Una fecha de la base (las 00:00 UTC de ese día) o del panel ('AAAA-MM-DD') como 'AAAA-MM-DD'. Lo que no se entiende, null. */
export function comoDia(valor: Date | string | null | undefined): string | null {
  if (!valor) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}/.test(valor) ? valor.slice(0, 10) : null;
}

/** Los dos días son incluidos: del 1/12 al 6/1 se ve el 1 de diciembre completo y el 6 de enero completo. */
export function estadoNavidad(config: ConfigNavidad, ahora: Date = new Date()): EstadoNavidad {
  if (!config.christmasTheme) return 'apagado';
  const hoy = diaEnCaracas(ahora);
  const desde = comoDia(config.christmasThemeFrom);
  const hasta = comoDia(config.christmasThemeUntil);
  if (desde && hoy < desde) return 'programado';
  if (hasta && hoy > hasta) return 'terminado';
  return 'activo';
}

/** ¿Se ve hoy el tema en la tienda? */
export function navidadActiva(config: ConfigNavidad, ahora: Date = new Date()): boolean {
  return estadoNavidad(config, ahora) === 'activo';
}

/** La temporada que propone el panel: del 1 de diciembre al 6 de enero (Día de Reyes). Hasta el 6 de enero es la que está en curso. */
export function temporadaSugerida(ahora: Date = new Date()): { desde: string; hasta: string } {
  const [ano, mes, dia] = diaEnCaracas(ahora).split('-').map(Number);
  const inicio = mes === 1 && dia <= 6 ? ano - 1 : ano;
  return { desde: `${inicio}-12-01`, hasta: `${inicio + 1}-01-06` };
}

/**
 * Los dos gorros (components/navidad/GorroSanta.tsx), los dos con el trazo del pack de íconos:
 * - ajustado: se calza en el sello; el aro blanco del logo se vuelve la piel del gorro y la punta cae hacia atrás.
 * - clasico: un gorro de Santa puesto encima del sello, inclinado.
 */
export const GORROS = ['ajustado', 'clasico'] as const;
export type VarianteGorro = (typeof GORROS)[number];

/** El que sale si el valor guardado no es uno de los dos (y el de la columna por defecto) */
export const GORRO_RECOMENDADO: VarianteGorro = 'ajustado';

export function varianteGorro(valor: unknown): VarianteGorro {
  return GORROS.includes(valor as VarianteGorro) ? (valor as VarianteGorro) : GORRO_RECOMENDADO;
}

/** Lo que dice la tarjeta navideña del popup. */
export interface TarjetaNavidadDatos {
  titulo: string;
  mensaje: string;
  boton: string;
  /** Ruta de la tienda o https (se vuelve a revisar con safeHotAdLink al mostrarla) */
  enlace: string;
}

/** Textos de la tarjeta cuando el panel los deja vacíos. Sin promesas de precio, de descuento ni de plazos de entrega. */
export const TARJETA_NAVIDAD: TarjetaNavidadDatos = {
  titulo: 'Feliz Navidad',
  mensaje: 'Gracias por confiar en Electro Shop este año. Te deseamos unas fiestas felices junto a los tuyos.',
  boton: 'Ver ideas para regalar',
  enlace: '/productos',
};
