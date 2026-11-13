// Claude para "Buscar en la web" (C-211; Andrés, 13/11: "cambiar el API actual que tengo en la web por la tuya en Haiku").
// Hace lo mismo que Groq (groq.ts), con las mismas instrucciones y el mismo esquema, y lo que devuelve pasa por las mismas
// comprobaciones: la tienda no cree nada que no esté en los datos que le mandó. Si no hay clave, se acaba el crédito o
// algo falla, sigue Groq (index.ts). Solo servidor.
//
// - El modelo y el esfuerzo salen del .env (ANTHROPIC_MODEL, ANTHROPIC_EFFORT): por defecto Claude Haiku 5.5 en esfuerzo
//   alto. Andrés pidió el máximo, pero medido el 13/11 con productos reales tardó 98 s leyendo y 158 s buscando (alto:
//   17 y 13 s, con casi la misma ficha), y nginx corta a los 60 s. "max" en el .env lo vuelve a poner, sin deploy.
// - El texto de las páginas es ajeno: va como datos, la instrucción dice que no son órdenes y la lectura no tiene
//   herramientas. Solo la búsqueda por su cuenta (sin páginas leídas) usa la búsqueda web de Anthropic.

import Anthropic from '@anthropic-ai/sdk';
import {
  comprobarLectura, ESQUEMA, evidenciaDe, instrucciones, normalizarBusqueda, pedidoDeBusqueda,
  type BusquedaGroq, type LecturaGroq, type PaginaParaLeer,
} from './groq';

const MODELO = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const ESFUERZOS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Esfuerzo = (typeof ESFUERZOS)[number];
const ESFUERZO: Esfuerzo = (ESFUERZOS as readonly string[]).includes(process.env.ANTHROPIC_EFFORT ?? '')
  ? (process.env.ANTHROPIC_EFFORT as Esfuerzo)
  : 'high';
const NOMBRE_ESFUERZO: Record<Esfuerzo, string> = { low: 'bajo', medium: 'medio', high: 'alto', xhigh: 'muy alto', max: 'máximo' };
/** Con más esfuerzo, el razonamiento ocupa buena parte de la respuesta: lugar de sobra y en flujo (sin el tope de tiempo de una respuesta entera) */
const MAX_TOKENS = 32_000;

export function claudeDisponible(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cliente: Anthropic | null = null;
const api = () => (cliente ??= new Anthropic({ maxRetries: 1 }));

/** "claude-haiku-5-5" → "Claude Haiku 5.5 (esfuerzo máximo)": el panel dice quién redactó la ficha */
export function firmaDe(modelo: string): string {
  const [marca, familia, ...version] = modelo.split('-');
  const nombre = [marca, familia].map((p) => (p ? p[0].toUpperCase() + p.slice(1) : '')).join(' ');
  return `${nombre} ${version.join('.')} (esfuerzo ${NOMBRE_ESFUERZO[ESFUERZO]})`.trim();
}

// El esquema de groq.ts con "objeto o null" escrito como lo pide Anthropic (anyOf)
const citaONula = (cita: unknown) => ({ anyOf: [{ ...(cita as Record<string, unknown>), type: 'object' }, { type: 'null' }] });
const ESQUEMA_LECTURA = {
  ...ESQUEMA,
  properties: { ...ESQUEMA.properties, peso: citaONula(ESQUEMA.properties.peso), medidas: citaONula(ESQUEMA.properties.medidas) },
};
const numeroONulo = { anyOf: [{ type: 'number' }, { type: 'null' }] };
const ESQUEMA_BUSQUEDA = {
  type: 'object',
  properties: {
    marca: { type: 'string' },
    codigo_barras: { type: 'string' },
    peso_paquete_g: numeroONulo,
    largo_cm: numeroONulo,
    ancho_cm: numeroONulo,
    alto_cm: numeroONulo,
    especificaciones: {
      type: 'array',
      items: { type: 'object', properties: { nombre: { type: 'string' }, valor: { type: 'string' } }, required: ['nombre', 'valor'], additionalProperties: false },
    },
    descripcion: { type: 'string' },
    fuentes: { type: 'array', items: { type: 'string' } },
  },
  required: ['marca', 'codigo_barras', 'peso_paquete_g', 'largo_cm', 'ancho_cm', 'alto_cm', 'especificaciones', 'descripcion', 'fuentes'],
  additionalProperties: false,
};

/** El JSON de la respuesta: el texto que viene después de la última búsqueda. null si no terminó bien (rechazo, tope) */
function jsonDe(respuesta: Anthropic.Message): Record<string, unknown> | null {
  if (respuesta.stop_reason !== 'end_turn') return null;
  const ultimaHerramienta = respuesta.content.findLastIndex((b) => b.type !== 'text' && b.type !== 'thinking');
  const texto = respuesta.content
    .slice(ultimaHerramienta + 1)
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('');
  try {
    const valor: unknown = JSON.parse(texto);
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function avisarError(donde: string, error: unknown) {
  // Sin la clave ni el texto del producto: solo qué falló, para el registro del servidor
  const estado = error instanceof Anthropic.APIError ? `${error.status ?? 'sin estado'} ${error.name}` : error instanceof Error ? error.name : 'desconocido';
  console.error(`[claude] ${donde}: ${estado}`);
}

/** La ficha ordenada por Claude, ya comprobada contra los datos, con quién la redactó. null: sigue Groq */
export async function leerConClaude(
  producto: { nombre: string; categoria: string },
  paginas: PaginaParaLeer[],
  nombresSugeridos: string[],
): Promise<{ lectura: LecturaGroq; firma: string } | null> {
  if (!claudeDisponible()) return null;
  const evidencia = evidenciaDe(paginas);
  if (!evidencia) return null;
  try {
    const respuesta = await api().messages.stream({
      model: MODELO,
      max_tokens: MAX_TOKENS,
      system: instrucciones(nombresSugeridos),
      messages: [{ role: 'user', content: `Producto: ${producto.nombre}\nCategoría en la tienda: ${producto.categoria || 'sin categoría'}\n\nDatos de las páginas:\n\n${evidencia}` }],
      output_config: { effort: ESFUERZO, format: { type: 'json_schema', schema: ESQUEMA_LECTURA } },
    }, { timeout: 120_000 }).finalMessage();
    const crudo = jsonDe(respuesta);
    return crudo ? { lectura: comprobarLectura(crudo, producto, paginas, evidencia), firma: firmaDe(respuesta.model) } : null;
  } catch (error) {
    avisarError('lectura', error);
    return null;
  }
}

/** Sin páginas leídas: Claude busca por su cuenta con la búsqueda web de Anthropic (hasta 3 búsquedas, $0,01 cada una) */
export async function buscarConClaude(
  producto: { nombre: string; categoria: string },
  nombresSugeridos: string[],
): Promise<{ busqueda: BusquedaGroq; firma: string } | null> {
  if (!claudeDisponible()) return null;
  const mensajes: Anthropic.MessageParam[] = [{ role: 'user', content: pedidoDeBusqueda(producto, nombresSugeridos) }];
  try {
    // La búsqueda puede pausar el turno (pause_turn): se le devuelve lo que lleva para que siga, hasta dos veces
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      const respuesta = await api().messages.stream({
        model: MODELO,
        max_tokens: MAX_TOKENS,
        tools: [{ type: 'web_search_20260318', name: 'web_search', max_uses: 3 }],
        messages: mensajes,
        output_config: { effort: ESFUERZO, format: { type: 'json_schema', schema: ESQUEMA_BUSQUEDA } },
      }, { timeout: 150_000 }).finalMessage();
      if (respuesta.stop_reason === 'pause_turn') {
        mensajes.push({ role: 'assistant', content: respuesta.content });
        continue;
      }
      const crudo = jsonDe(respuesta);
      return crudo ? { busqueda: normalizarBusqueda(crudo), firma: firmaDe(respuesta.model) } : null;
    }
    return null;
  } catch (error) {
    avisarError('búsqueda', error);
    return null;
  }
}
