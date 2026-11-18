// C-288 · Los modelos de Claude que ofrece el panel, lo que cuestan y los niveles de esfuerzo. Módulo puro: lo usan el
// servidor (para anotar cuánto costó cada pedido) y la pantalla de Configuración → IA · Claude.
//
// Los precios son de Anthropic, en dólares por millón de tokens (noviembre de 2026). Cuando Anthropic los cambie, se cambian
// aquí; cada pedido guarda el costo que tenía al hacerse, así que el historial no se mueve.

export type ModeloIa = 'claude-haiku-5-5' | 'claude-sonnet-5-5' | 'claude-opus-5-5';

export interface InfoModelo {
  id: ModeloIa;
  nombre: string;
  /** Sin "Claude": para una píldora */
  corto: string;
  /** Dólares por millón de tokens que entran */
  entrada: number;
  /** Dólares por millón de tokens que salen */
  salida: number;
  /** Para qué sirve, en una línea */
  para: string;
}

export const MODELOS_IA: readonly InfoModelo[] = [
  { id: 'claude-haiku-5-5', nombre: 'Claude Haiku 5.5', corto: 'Haiku 5.5', entrada: 0.1, salida: 0.5, para: 'Rápido y muy barato. Va bien para redactar, ordenar y resumir.' },
  { id: 'claude-sonnet-5-5', nombre: 'Claude Sonnet 5.5', corto: 'Sonnet 5.5', entrada: 2, salida: 10, para: 'Más criterio al investigar: el modelo exacto y las medidas de un producto.' },
  { id: 'claude-opus-5-5', nombre: 'Claude Opus 5.5', corto: 'Opus 5.5', entrada: 4, salida: 20, para: 'El más capaz, para lo difícil. Cuesta 40 veces Haiku.' },
];

export const MODELO_DE_FABRICA: ModeloIa = 'claude-haiku-5-5';

/** Cada búsqueda web de Anthropic cuesta $0,01, además de los tokens */
export const PRECIO_BUSQUEDA_WEB = 0.01;

export const esModeloIa = (valor: unknown): valor is ModeloIa => MODELOS_IA.some((m) => m.id === valor);

export const infoModelo = (id: string | null | undefined): InfoModelo | undefined => MODELOS_IA.find((m) => m.id === id);

/**
 * Lo que costó un pedido, en dólares. Con un modelo que no está en la lista (uno que se puso a mano en el .env) no hay
 * precio: cuenta solo las búsquedas.
 */
export function costoDe({ modelo, entrada, salida, busquedas }: { modelo: string; entrada: number; salida: number; busquedas: number }): number {
  const precio = infoModelo(modelo);
  const tokens = precio ? (entrada / 1_000_000) * precio.entrada + (salida / 1_000_000) * precio.salida : 0;
  return tokens + Math.max(0, busquedas) * PRECIO_BUSQUEDA_WEB;
}

/** Cuánto habría costado esto con otro modelo (para comparar en la pantalla) */
export const costoCon = (modelo: ModeloIa, uso: { entrada: number; salida: number; busquedas: number }) => costoDe({ modelo, ...uso });

export const ESFUERZOS = [
  { id: 'low', nombre: 'bajo' },
  { id: 'medium', nombre: 'medio' },
  { id: 'high', nombre: 'alto' },
  { id: 'xhigh', nombre: 'muy alto' },
  { id: 'max', nombre: 'máximo' },
] as const;

export type Esfuerzo = (typeof ESFUERZOS)[number]['id'];

export const ESFUERZO_DE_FABRICA: Esfuerzo = 'high';

export const esEsfuerzo = (valor: unknown): valor is Esfuerzo => ESFUERZOS.some((e) => e.id === valor);

export const nombreDeEsfuerzo = (esfuerzo: Esfuerzo): string => ESFUERZOS.find((e) => e.id === esfuerzo)?.nombre ?? esfuerzo;

/** "claude-haiku-5-5" → "Claude Haiku 5.5": el nombre de un modelo, esté o no en la lista */
export function nombreDeModelo(id: string): string {
  const conocido = infoModelo(id);
  if (conocido) return conocido.nombre;
  const [marca, familia, ...version] = id.split('-');
  const nombre = [marca, familia].map((p) => (p ? p[0].toUpperCase() + p.slice(1) : '')).join(' ');
  return `${nombre} ${version.join('.')}`.trim();
}
