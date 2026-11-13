// Claude en el panel (C-211 y C-213; Andrés, 13/11: Haiku para productos, clientes y correo). Lo común a todas las
// herramientas: el cliente de la API, el modelo y el esfuerzo del .env, la firma ("Claude Haiku 5.5 (esfuerzo alto)") y un
// pedido que devuelve JSON con esquema. Solo servidor.
//
// - El modelo y el esfuerzo salen del .env (ANTHROPIC_MODEL, ANTHROPIC_EFFORT): por defecto Claude Haiku 5.5 en esfuerzo
//   alto. El máximo pasa de los 60 s que nginx espera (C-211); un trabajo de fondo puede pedirlo para él solo.
// - Lo que se le manda (compras, consultas, páginas) va como datos: cada instrucción dice que no son órdenes.

import Anthropic from '@anthropic-ai/sdk';

export const MODELO = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const ESFUERZOS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type Esfuerzo = (typeof ESFUERZOS)[number];
export const ESFUERZO: Esfuerzo = (ESFUERZOS as readonly string[]).includes(process.env.ANTHROPIC_EFFORT ?? '')
  ? (process.env.ANTHROPIC_EFFORT as Esfuerzo)
  : 'high';
const NOMBRE_ESFUERZO: Record<Esfuerzo, string> = { low: 'bajo', medium: 'medio', high: 'alto', xhigh: 'muy alto', max: 'máximo' };
/** Con más esfuerzo, el razonamiento ocupa buena parte de la respuesta: lugar de sobra y en flujo */
const MAX_TOKENS = 32_000;

export function claudeDisponible(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cliente: Anthropic | null = null;
export const api = () => (cliente ??= new Anthropic({ maxRetries: 1 }));

/** "claude-haiku-5-5" → "Claude Haiku 5.5 (esfuerzo alto)": el panel dice quién lo redactó */
export function firmaDe(modelo: string, esfuerzo: Esfuerzo = ESFUERZO): string {
  const [marca, familia, ...version] = modelo.split('-');
  const nombre = [marca, familia].map((p) => (p ? p[0].toUpperCase() + p.slice(1) : '')).join(' ');
  return `${nombre} ${version.join('.')} (esfuerzo ${NOMBRE_ESFUERZO[esfuerzo]})`.trim();
}

/** Para el registro del servidor: solo qué falló, sin la clave ni los datos que se mandaron */
export function avisarError(donde: string, error: unknown) {
  const estado = error instanceof Anthropic.APIError ? `${error.status ?? 'sin estado'} ${error.name}` : error instanceof Error ? error.name : 'desconocido';
  console.error(`[claude] ${donde}: ${estado}`);
}

/** Por qué no hubo respuesta, para decírselo al equipo */
export class FallaIA extends Error {
  constructor(public motivo: 'sin-clave' | 'no-termino' | 'servicio') {
    super(
      motivo === 'sin-clave' ? 'Falta la clave de Claude en el servidor (ANTHROPIC_API_KEY).'
        : motivo === 'no-termino' ? 'Claude no terminó la respuesta. Prueba otra vez.'
          : 'Claude no respondió. Prueba otra vez en un momento.',
    );
  }
}

/** El texto JSON de una respuesta que terminó bien; null si se cortó, la rechazó o no es un objeto */
function objetoDe(respuesta: Anthropic.Message): Record<string, unknown> | null {
  if (respuesta.stop_reason !== 'end_turn') return null;
  const texto = respuesta.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  try {
    const valor: unknown = JSON.parse(texto);
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Un pedido con respuesta en JSON con esquema (structured outputs). Lanza FallaIA: quien llama decide qué decir.
 * `donde` nombra la herramienta en el registro del servidor.
 */
export async function pedirJSON(opciones: {
  donde: string;
  sistema: string;
  pedido: string;
  esquema: Record<string, unknown>;
  esfuerzo?: Esfuerzo;
  tiempoMs?: number;
}): Promise<{ datos: Record<string, unknown>; firma: string; tokens: { entrada: number; salida: number } }> {
  if (!claudeDisponible()) throw new FallaIA('sin-clave');
  const esfuerzo = opciones.esfuerzo ?? ESFUERZO;
  let respuesta: Anthropic.Message;
  try {
    respuesta = await api().messages.stream({
      model: MODELO,
      max_tokens: MAX_TOKENS,
      system: opciones.sistema,
      messages: [{ role: 'user', content: opciones.pedido }],
      output_config: { effort: esfuerzo, format: { type: 'json_schema', schema: opciones.esquema } },
    }, { timeout: opciones.tiempoMs ?? 55_000 }).finalMessage();
  } catch (error) {
    avisarError(opciones.donde, error);
    throw new FallaIA('servicio');
  }
  const datos = objetoDe(respuesta);
  if (!datos) {
    console.error(`[claude] ${opciones.donde}: terminó con ${respuesta.stop_reason}`);
    throw new FallaIA('no-termino');
  }
  return {
    datos,
    firma: firmaDe(respuesta.model, esfuerzo),
    tokens: { entrada: respuesta.usage.input_tokens, salida: respuesta.usage.output_tokens },
  };
}
