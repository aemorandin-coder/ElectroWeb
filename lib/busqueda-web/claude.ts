// Claude para "Buscar en la web" (C-211; Andrés, 13/11: "cambiar el API actual que tengo en la web por la tuya en Haiku").
// Hace lo mismo que Groq (groq.ts), con las mismas instrucciones y el mismo esquema, y lo que devuelve pasa por las mismas
// comprobaciones: la tienda no cree nada que no esté en los datos que le mandó. Si no hay clave, se acaba el crédito o
// algo falla, sigue Groq (index.ts). Solo servidor.
//
// - El modelo y el esfuerzo son los de Configuración → IA · Claude (C-288) o, si no hay nada guardado, los del .env
//   (ANTHROPIC_MODEL, ANTHROPIC_EFFORT): por defecto Claude Haiku 5.5 en esfuerzo alto. Andrés pidió el máximo, pero medido el
//   13/11 con productos reales tardó 98 s leyendo y 158 s buscando (alto: 17 y 13 s, con casi la misma ficha), y nginx corta a
//   los 60 s.
// - C-288: cada pedido queda anotado (modelo, tokens, búsquedas, costo, tiempo y fallas) y, si la ficha rompe una regla de tipo
//   "pide" (más de un modelo posible, un peso imposible, una descripción en inglés), index.ts se lo pide otra vez, una sola vez,
//   con la corrección en el mensaje (`correccion`).
// - El texto de las páginas es ajeno: va como datos, la instrucción dice que no son órdenes y la lectura no tiene
//   herramientas. Solo la búsqueda por su cuenta (sin páginas leídas) usa la búsqueda web de Anthropic.

import type Anthropic from '@anthropic-ai/sdk';
import { leerAjustesIa } from '@/lib/ia/ajustes';
import { claudeDisponible, FallaIA, firmaDe, pedirMensaje } from '@/lib/ia/claude';
import { instruccionesDe, type UsoRegistro } from '@/lib/ia/reglas';
import {
  anexoDeNombres, comprobarLectura, ESQUEMA, evidenciaDe, INSTRUCCIONES_BUSQUEDA, normalizarBusqueda, pedidoDeBusqueda,
  type BusquedaGroq, type LecturaGroq, type PaginaParaLeer,
} from './groq';

/** Con más esfuerzo, el razonamiento ocupa buena parte de la respuesta: lugar de sobra y en flujo (sin el tope de tiempo de una respuesta entera) */
const MAX_TOKENS = 32_000;

// El cliente, el motor y la firma son los de todo el panel (lib/ia/claude.ts, C-213)
export { claudeDisponible, firmaDe };

/** Lo que cambia en un pedido que no es el de siempre: la corrección de una regla rota, o una prueba de las instrucciones */
export interface OpcionesDeBusqueda {
  /** "Tu respuesta anterior no cumplió esta regla de la tienda…": se suma al pedido (lib/ia/revisar.ts → mensajeDeCorreccion) */
  correccion?: string;
  /** Es el segundo pedido: se anota como reintento */
  reintento?: boolean;
  /** Para "Probar" en Configuración: reemplaza las instrucciones del equipo sin guardarlas, y el pedido se anota como "prueba" */
  instruccionesPrueba?: string;
  usuarioId?: string | null;
}

const conCorreccion = (pedido: string, correccion?: string) => (correccion ? `${pedido}\n\n${correccion}` : pedido);
const usoDe = (o: OpcionesDeBusqueda): UsoRegistro => (o.instruccionesPrueba !== undefined ? 'prueba' : 'busqueda');

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

/** La ficha ordenada por Claude, ya comprobada contra los datos, con quién la redactó. null: sigue Groq */
export async function leerConClaude(
  producto: { nombre: string; categoria: string },
  paginas: PaginaParaLeer[],
  nombresSugeridos: string[],
  opciones: OpcionesDeBusqueda = {},
): Promise<{ lectura: LecturaGroq; firma: string; pedidoId: string } | null> {
  const ajustes = await leerAjustesIa();
  if (!ajustes.clave) return null;
  const evidencia = evidenciaDe(paginas);
  if (!evidencia) return null;
  const sistema = instruccionesDe('busqueda', INSTRUCCIONES_BUSQUEDA, {
    delEquipo: opciones.instruccionesPrueba ?? ajustes.instrucciones.busqueda?.texto,
    anexo: anexoDeNombres(nombresSugeridos),
  });
  const pedido = conCorreccion(`Producto: ${producto.nombre}\nCategoría en la tienda: ${producto.categoria || 'sin categoría'}\n\nDatos de las páginas:\n\n${evidencia}`, opciones.correccion);
  try {
    const { valor: crudo, firma, pedidoId } = await pedirMensaje({
      uso: usoDe(opciones), donde: 'lectura', reintento: opciones.reintento, usuarioId: opciones.usuarioId, ajustes,
      crear: (cliente, motor) => cliente.messages.stream({
        model: motor.modelo,
        max_tokens: MAX_TOKENS,
        system: sistema,
        messages: [{ role: 'user', content: pedido }],
        output_config: { effort: motor.esfuerzo, format: { type: 'json_schema', schema: ESQUEMA_LECTURA } },
      }, { timeout: 120_000 }).finalMessage(),
      leer: jsonDe,
    });
    return { lectura: comprobarLectura(crudo, producto, paginas, evidencia), firma, pedidoId };
  } catch (error) {
    // pedirMensaje ya lo anotó y lo dejó en el registro del servidor: sigue Groq
    if (error instanceof FallaIA) return null;
    throw error;
  }
}

/** Sin páginas leídas: Claude busca por su cuenta con la búsqueda web de Anthropic (hasta 3 búsquedas, $0,01 cada una) */
export async function buscarConClaude(
  producto: { nombre: string; categoria: string },
  nombresSugeridos: string[],
  opciones: OpcionesDeBusqueda = {},
): Promise<{ busqueda: BusquedaGroq; firma: string; pedidoId: string } | null> {
  const ajustes = await leerAjustesIa();
  if (!ajustes.clave) return null;
  // Aquí no hay páginas ni lectura con "cita": las instrucciones de fábrica de la lectura no valen. Solo lo que escribió el equipo
  // (si lo hay) y las reglas fijas; el pedido trae todo lo demás
  const sistema = instruccionesDe('busqueda', '', { delEquipo: opciones.instruccionesPrueba ?? ajustes.instrucciones.busqueda?.texto });
  const mensajes: Anthropic.MessageParam[] = [{ role: 'user', content: conCorreccion(pedidoDeBusqueda(producto, nombresSugeridos), opciones.correccion) }];
  type Vuelta = { pausa: Anthropic.Message } | { json: Record<string, unknown> };
  try {
    // La búsqueda puede pausar el turno (pause_turn): se le devuelve lo que lleva para que siga, hasta dos veces. Cada vuelta es
    // un pedido a la API y queda anotada como tal
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      const { valor, firma, pedidoId } = await pedirMensaje<Vuelta>({
        uso: usoDe(opciones), donde: 'búsqueda', reintento: opciones.reintento, usuarioId: opciones.usuarioId, ajustes,
        crear: (cliente, motor) => cliente.messages.stream({
          model: motor.modelo,
          max_tokens: MAX_TOKENS,
          system: sistema,
          tools: [{ type: 'web_search_20260318', name: 'web_search', max_uses: 3 }],
          messages: mensajes,
          output_config: { effort: motor.esfuerzo, format: { type: 'json_schema', schema: ESQUEMA_BUSQUEDA } },
        }, { timeout: 150_000 }).finalMessage(),
        leer: (m) => {
          if (m.stop_reason === 'pause_turn') return { pausa: m };
          const json = jsonDe(m);
          return json ? { json } : null;
        },
      });
      if ('pausa' in valor) {
        mensajes.push({ role: 'assistant', content: valor.pausa.content });
        continue;
      }
      return { busqueda: normalizarBusqueda(valor.json), firma, pedidoId };
    }
    return null;
  } catch (error) {
    if (error instanceof FallaIA) return null;
    throw error;
  }
}
