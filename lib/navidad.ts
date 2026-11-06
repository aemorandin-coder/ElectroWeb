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

/** La página de regalos por presupuesto (C-190, app/ideas-para-regalar) */
export const RUTA_REGALOS = '/ideas-para-regalar';

/** Textos de la tarjeta cuando el panel los deja vacíos. Sin promesas de precio, de descuento ni de plazos de entrega. */
export const TARJETA_NAVIDAD: TarjetaNavidadDatos = {
  titulo: 'Feliz Navidad',
  mensaje: 'Gracias por confiar en Electro Shop este año. Te deseamos unas fiestas felices junto a los tuyos.',
  boton: 'Ver ideas para regalar',
  // C-190: la página de regalos por presupuesto (antes, todo el catálogo). Un enlace guardado en el panel manda
  enlace: RUTA_REGALOS,
};

// ---------- C-190: la fecha límite para que llegue antes del 24

/** Las fechas de corte de `company_settings`: el último día para pedir, incluido */
export interface CortesNavidad {
  /** Por ZOOM o MRW (envío nacional) */
  christmasCutoffShipping: Date | string | null;
  /** Con delivery o retiro en Guanare */
  christmasCutoffLocal: Date | string | null;
}

/** Lo que la tienda recibe: las fechas que siguen en pie ('AAAA-MM-DD'), solo con el tema activo */
export interface EntregaNavidad {
  envio: string | null;
  local: string | null;
}

/**
 * Un día de corte sirve si es de noviembre o de diciembre hasta el 24: la franja promete que llega "antes del 24".
 * Otro día (el 26, o uno de enero) no se guarda.
 */
export function corteValido(dia: string): boolean {
  const [, mes, numero] = dia.split('-').map(Number);
  return mes === 11 || (mes === 12 && numero <= 24);
}

/**
 * Las fechas de corte de hoy: null si el tema no se ve o si no queda ninguna en pie. Una fecha vale hasta el final de
 * ese día en Venezuela; al día siguiente se va sola. Sin fecha no se promete nada.
 */
export function entregaNavidad(config: ConfigNavidad & CortesNavidad, ahora: Date = new Date()): EntregaNavidad | null {
  if (!navidadActiva(config, ahora)) return null;
  const hoy = diaEnCaracas(ahora);
  const vigente = (valor: Date | string | null) => {
    const dia = comoDia(valor);
    return dia && dia >= hoy && corteValido(dia) ? dia : null;
  };
  const envio = vigente(config.christmasCutoffShipping);
  const local = vigente(config.christmasCutoffLocal);
  return envio || local ? { envio, local } : null;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** '2026-12-18' → { semana: 'viernes', numero: 18, mes: 'diciembre' }. Sin Intl: el servidor y el navegador dan lo mismo */
export function partesDelDia(dia: string): { semana: string; numero: number; mes: string } {
  const [ano, mes, numero] = dia.split('-').map(Number);
  return { semana: DIAS[new Date(Date.UTC(ano, mes - 1, numero)).getUTCDay()], numero, mes: MESES[mes - 1] };
}

/** '2026-12-18' → 'viernes 18 de diciembre' */
export function diaConNombre(dia: string): string {
  const { semana, numero, mes } = partesDelDia(dia);
  return `${semana} ${numero} de ${mes}`;
}

/** Las formas de entrega que la tienda tiene encendidas (Configuración → Envíos) */
export interface FormasDeEntrega {
  envio: boolean;
  delivery: boolean;
  retiro: boolean;
}

export interface FranjaNavidad {
  /** El primer día que vence: va grande, en el calendario */
  dia: string;
  titulo: string;
  /** Por qué medio, y el otro corte si hay dos */
  detalle: string;
}

/**
 * La franja "Para que llegue antes del 24, pide hasta el …" con las formas de entrega encendidas. `hoy` es el día del
 * navegador (null en el servidor y al hidratar: el servidor ya dejó fuera las vencidas). Sin nada que decir, null.
 */
export function franjaNavidad(entrega: EntregaNavidad | null, formas: FormasDeEntrega, hoy: string | null): FranjaNavidad | null {
  if (!entrega) return null;
  const sigue = (dia: string | null) => (dia && (!hoy || dia >= hoy) ? dia : null);
  const envio = formas.envio ? sigue(entrega.envio) : null;
  const local = formas.delivery || formas.retiro ? sigue(entrega.local) : null;
  if (!envio && !local) return null;

  const enGuanare = formas.delivery && formas.retiro ? 'con delivery o retiro en Guanare' : formas.delivery ? 'con delivery en Guanare' : 'con retiro en la tienda';
  const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
  // El que vence primero va arriba, con su medio; el otro, en el detalle con su fecha
  const primero = envio && (!local || envio <= local) ? 'envio' : 'local';
  const dia = (primero === 'envio' ? envio : local) as string;
  let detalle: string;
  if (envio && local && envio === local) detalle = `Por ZOOM o MRW, y también ${enGuanare}.`;
  else if (primero === 'envio') detalle = `Por ZOOM o MRW.${local ? ` ${conMayuscula(enGuanare)}, hasta el ${diaConNombre(local)}.` : ''}`;
  else detalle = `${conMayuscula(enGuanare)}.${envio ? ` Por ZOOM o MRW, hasta el ${diaConNombre(envio)}.` : ''}`;
  // Solo con retiro, el que vence primero no "llega": se retira
  const verbo = primero === 'local' && !formas.delivery ? 'Para retirarlo' : 'Para que llegue';
  return { dia, titulo: `${verbo} antes del 24, pide hasta el ${diaConNombre(dia)}`, detalle };
}
