// C-288 · Probar la conexión con Anthropic: un pedido mínimo (16 tokens, 20 s como mucho) con una clave y un modelo. Sirve para
// probar la clave nueva ANTES de guardarla y para el botón "Probar la conexión" de Configuración → IA · Claude. Solo servidor.
//
// Cuesta una fracción de centavo y queda anotado como una prueba (uso "prueba"). Nunca devuelve la clave ni lo que contestó
// Anthropic: solo si funcionó, cuánto tardó y, si no, por qué en palabras para el equipo.

import Anthropic from '@anthropic-ai/sdk';
import { detalleDe, registrarPedido } from './pedir';
import { costoDe, nombreDeModelo } from './precios';
import { infoProveedor, nombreDelMotor, type IdProveedor } from './proveedores/catalogo';
import { baseDe, ErrorCompatible, listarModelos, probarCompatible } from './proveedores/compatible';

export type MotivoDeFalla = 'clave' | 'credito' | 'permiso' | 'modelo' | 'limite' | 'tiempo' | 'red' | 'otro';

export type ResultadoConexion =
  | { ok: true; ms: number; modelo: string }
  | { ok: false; motivo: MotivoDeFalla; mensaje: string };

const TIEMPO_MS = 20_000;

/** Lo que se le dice al equipo según lo que respondió Anthropic */
function motivoDe(error: unknown): { motivo: MotivoDeFalla; mensaje: string } {
  if (error instanceof Anthropic.APIConnectionTimeoutError) return { motivo: 'tiempo', mensaje: 'Anthropic no respondió en 20 segundos. Prueba otra vez en un momento.' };
  if (error instanceof Anthropic.APIConnectionError) return { motivo: 'red', mensaje: 'No se pudo conectar con Anthropic: el servidor no tiene salida a internet o el servicio está caído.' };
  if (error instanceof Anthropic.APIError) {
    const texto = String(error.message ?? '');
    if (/credit balance|credit|billing|payment/i.test(texto)) return { motivo: 'credito', mensaje: 'La cuenta de Anthropic no tiene crédito: hay que recargarlo en console.anthropic.com.' };
    if (error.status === 401) return { motivo: 'clave', mensaje: 'Anthropic no aceptó la clave: no es válida o fue borrada.' };
    if (error.status === 403) return { motivo: 'permiso', mensaje: 'La clave no tiene permiso para usar este modelo.' };
    if (error.status === 404) return { motivo: 'modelo', mensaje: 'Anthropic no conoce ese modelo.' };
    if (error.status === 429) return { motivo: 'limite', mensaje: 'Anthropic está limitando los pedidos de esta clave. Espera un minuto.' };
    if ((error.status ?? 0) >= 500) return { motivo: 'otro', mensaje: 'Anthropic tuvo un problema de su lado. Prueba otra vez en un momento.' };
  }
  return { motivo: 'otro', mensaje: 'No se pudo probar la conexión con Anthropic.' };
}

/** Un pedido mínimo con esta clave y este modelo. Sin reintentos: si falla, se dice por qué enseguida */
export async function probarConexion(clave: string, modelo: string, usuarioId?: string | null): Promise<ResultadoConexion> {
  const cliente = new Anthropic({ apiKey: clave, maxRetries: 0 });
  const inicio = Date.now();
  try {
    const respuesta = await cliente.messages.create(
      { model: modelo, max_tokens: 16, messages: [{ role: 'user', content: 'Responde solo: ok' }] },
      { timeout: TIEMPO_MS },
    );
    const ms = Date.now() - inicio;
    const usado = { entrada: respuesta.usage.input_tokens, salida: respuesta.usage.output_tokens, busquedas: 0 };
    registrarPedido({ uso: 'prueba', modelo: respuesta.model || modelo, ...usado, costoUsd: costoDe({ modelo: respuesta.model || modelo, ...usado }), ms, usuarioId });
    return { ok: true, ms, modelo: nombreDeModelo(respuesta.model || modelo) };
  } catch (error) {
    const r = motivoDe(error);
    registrarPedido({ uso: 'prueba', modelo, ms: Date.now() - inicio, falla: 'servicio', detalle: detalleDe(error), usuarioId });
    return { ok: false, ...r };
  }
}

/** C-292: lo que se le dice al equipo según lo que respondió un proveedor que habla el formato de OpenAI */
function motivoDeOtro(error: unknown, empresa: string): { motivo: MotivoDeFalla; mensaje: string } {
  if (!(error instanceof ErrorCompatible)) return { motivo: 'otro', mensaje: `No se pudo probar la conexión con ${empresa}.` };
  const texto = error.texto;
  if (error.nombre === 'Tiempo') return { motivo: 'tiempo', mensaje: `${empresa} no respondió en 20 segundos. Prueba otra vez en un momento.` };
  if (error.nombre === 'Conexion') return { motivo: 'red', mensaje: `No se pudo conectar con ${empresa}: el servidor no tiene salida a internet o el servicio está caído.` };
  if (error.estado === 402 || /credit|billing|payment|quota|insufficient/i.test(texto)) return { motivo: 'credito', mensaje: `La cuenta de ${empresa} no tiene crédito o llegó a su cupo: revísalo en su consola.` };
  if (error.estado === 401 || error.estado === 403) return { motivo: 'clave', mensaje: `${empresa} no aceptó la clave: no es válida o fue borrada.` };
  if (error.estado === 404 || error.nombre === 'Modelo') return { motivo: 'modelo', mensaje: `${empresa} no conoce ese modelo. Elige otro de la lista.` };
  if (error.estado === 429) return { motivo: 'limite', mensaje: `${empresa} está limitando los pedidos de esta clave. Espera un minuto.` };
  return { motivo: 'otro', mensaje: `${empresa} tuvo un problema de su lado. Prueba otra vez en un momento.` };
}

/**
 * C-292: "Probar la conexión" con cualquier proveedor. Anthropic: un pedido mínimo. Los demás: la lista de modelos (no gasta
 * tokens) y, si ya hay un modelo elegido, un pedido mínimo con él. Devuelve también la lista de modelos de los demás.
 */
export async function probarProveedor(proveedor: IdProveedor, clave: string, modelo: string | null, usuarioId?: string | null): Promise<ResultadoConexion & { modelos?: string[] }> {
  if (proveedor === 'anthropic') return probarConexion(clave, modelo || 'claude-haiku-5-5', usuarioId);
  const info = infoProveedor(proveedor);
  const base = baseDe(info);
  if (!base) return { ok: false, motivo: 'otro', mensaje: 'Proveedor desconocido.' };
  const inicio = Date.now();
  try {
    const modelos = await listarModelos(base, clave);
    if (!modelo) return { ok: true, ms: Date.now() - inicio, modelo: 'sin elegir', modelos };
    const r = await probarCompatible(base, clave, modelo);
    registrarPedido({ uso: 'prueba', proveedor, modelo: r.modelo, entrada: r.entrada, salida: r.salida, ms: r.ms, usuarioId });
    return { ok: true, ms: Date.now() - inicio, modelo: nombreDelMotor(proveedor, r.modelo), modelos };
  } catch (error) {
    registrarPedido({ uso: 'prueba', proveedor, modelo: modelo || 'sin modelo', ms: Date.now() - inicio, falla: 'servicio', detalle: detalleDe(error), usuarioId });
    return { ok: false, ...motivoDeOtro(error, info.empresa) };
  }
}
