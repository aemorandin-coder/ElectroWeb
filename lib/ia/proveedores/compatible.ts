// C-292 · El conector de los proveedores que hablan el formato de OpenAI: Google (Gemini), xAI (Grok) y Groq. Solo servidor.
// Sin librerías: fetch a `${base}/chat/completions` y `${base}/models`, con la clave en la cabecera. Nunca se anota ni se
// devuelve la clave ni lo que se mandó.
//
// - La respuesta en JSON se pide con su esquema (`response_format: json_schema`). Si el proveedor o el modelo no lo acepta
//   (400 que nombra el formato), se pide otra vez como `json_object`, con el esquema escrito en las instrucciones.
// - Los modelos los trae el proveedor (`/models`): así la lista está al día sin tocar la tienda. Sirve también para probar la
//   clave sin gastar tokens.

export interface PedidoCompatible {
  base: string;
  clave: string;
  modelo: string;
  sistema: string;
  pedido: string;
  esquema: Record<string, unknown>;
  tiempoMs: number;
}

export interface RespuestaCompatible {
  /** El objeto JSON, si terminó bien; null si se cortó o no es un objeto */
  objeto: Record<string, unknown> | null;
  modelo: string;
  entrada: number;
  salida: number;
  motivoFin: string | null;
}

/** Qué falló, sin la clave: el estado HTTP (null si no hubo respuesta) y un nombre corto */
export class ErrorCompatible extends Error {
  constructor(public estado: number | null, public nombre: string, public texto = '') {
    super(`${estado ?? 'sin estado'} ${nombre}`);
  }
}

function cabeceras(clave: string) {
  return { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' };
}

async function pedirConTiempo(url: string, init: RequestInit, tiempoMs: number): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(tiempoMs) });
  } catch (error) {
    const nombre = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'Tiempo' : 'Conexion';
    throw new ErrorCompatible(null, nombre);
  }
}

/** El texto de la respuesta como objeto: sin las comillas de bloque que algunos modelos le ponen alrededor */
export function objetoDeTexto(texto: string | null | undefined): Record<string, unknown> | null {
  if (!texto) return null;
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const valor: unknown = JSON.parse(limpio);
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function pedirJSONCompatible(o: PedidoCompatible): Promise<RespuestaCompatible> {
  const cuerpo = (formato: 'json_schema' | 'json_object') => JSON.stringify({
    model: o.modelo,
    messages: [
      { role: 'system', content: formato === 'json_object' ? `${o.sistema}\n\nResponde solo con un objeto JSON que siga este esquema:\n${JSON.stringify(o.esquema)}` : o.sistema },
      { role: 'user', content: o.pedido },
    ],
    response_format: formato === 'json_schema'
      ? { type: 'json_schema', json_schema: { name: 'respuesta', schema: o.esquema } }
      : { type: 'json_object' },
  });
  const url = `${o.base}/chat/completions`;
  const inicio = Date.now();
  let r = await pedirConTiempo(url, { method: 'POST', headers: cabeceras(o.clave), body: cuerpo('json_schema') }, o.tiempoMs);
  if (r.status === 400) {
    const texto = await r.text().catch(() => '');
    if (!/response_format|json_schema|schema/i.test(texto)) throw new ErrorCompatible(400, 'Pedido', texto.slice(0, 200));
    r = await pedirConTiempo(url, { method: 'POST', headers: cabeceras(o.clave), body: cuerpo('json_object') }, Math.max(5_000, o.tiempoMs - (Date.now() - inicio)));
  }
  if (!r.ok) {
    const texto = await r.text().catch(() => '');
    throw new ErrorCompatible(r.status, r.status === 401 ? 'Clave' : r.status === 429 ? 'Limite' : 'Servicio', texto.slice(0, 200));
  }
  const datos = (await r.json().catch(() => null)) as {
    model?: string;
    choices?: { finish_reason?: string; message?: { content?: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  } | null;
  const eleccion = datos?.choices?.[0];
  const motivoFin = eleccion?.finish_reason ?? null;
  return {
    objeto: motivoFin === 'stop' || motivoFin === null ? objetoDeTexto(eleccion?.message?.content) : null,
    modelo: datos?.model || o.modelo,
    entrada: datos?.usage?.prompt_tokens ?? 0,
    salida: datos?.usage?.completion_tokens ?? 0,
    motivoFin,
  };
}

/** Lo que no sirve para redactar (audio, imágenes, embeddings, moderación): no va en la lista de modelos */
const NO_REDACTA = /whisper|tts|audio|embed|imagen|image|veo|aqa|guard|moderation|vision-only|transcri/i;

/** Los modelos que ofrece el proveedor con esta clave. Lanza ErrorCompatible si la clave no sirve */
export async function listarModelos(base: string, clave: string, tiempoMs = 15_000): Promise<string[]> {
  const r = await pedirConTiempo(`${base}/models`, { headers: cabeceras(clave) }, tiempoMs);
  if (!r.ok) {
    const texto = await r.text().catch(() => '');
    throw new ErrorCompatible(r.status, r.status === 401 || r.status === 403 ? 'Clave' : 'Servicio', texto.slice(0, 200));
  }
  const datos = (await r.json().catch(() => null)) as { data?: { id?: string }[] } | null;
  const ids = (datos?.data ?? [])
    .map((m) => String(m.id ?? '').replace(/^models\//, ''))
    .filter((id) => id && !NO_REDACTA.test(id));
  return [...new Set(ids)].sort();
}

/** Un pedido mínimo (sin JSON) para "Probar la conexión": confirma la clave y el modelo. Lanza ErrorCompatible */
export async function probarCompatible(base: string, clave: string, modelo: string, tiempoMs = 20_000): Promise<{ ms: number; modelo: string; entrada: number; salida: number }> {
  const inicio = Date.now();
  const r = await pedirConTiempo(`${base}/chat/completions`, {
    method: 'POST',
    headers: cabeceras(clave),
    body: JSON.stringify({ model: modelo, max_tokens: 32, messages: [{ role: 'user', content: 'Responde solo: ok' }] }),
  }, tiempoMs);
  if (!r.ok) {
    const texto = await r.text().catch(() => '');
    throw new ErrorCompatible(r.status, r.status === 401 || r.status === 403 ? 'Clave' : r.status === 404 ? 'Modelo' : r.status === 429 ? 'Limite' : 'Servicio', texto.slice(0, 200));
  }
  const d = (await r.json().catch(() => null)) as { model?: string; usage?: { prompt_tokens?: number; completion_tokens?: number } } | null;
  return { ms: Date.now() - inicio, modelo: d?.model || modelo, entrada: d?.usage?.prompt_tokens ?? 0, salida: d?.usage?.completion_tokens ?? 0 };
}

/**
 * La dirección de la API de un proveedor. Para las pruebas se puede apuntar a un servidor simulado con IA_BASE_GOOGLE,
 * IA_BASE_XAI o IA_BASE_GROQ (como ANTHROPIC_BASE_URL para Anthropic); en producción no se ponen.
 */
export function baseDe(info: { id: string; base: string | null }): string | null {
  return process.env[`IA_BASE_${info.id.toUpperCase()}`]?.trim() || info.base;
}
