// Claude en el panel (C-211 y C-213; Andrés, 13/11: Haiku para productos, clientes y correo). Lo común a todas las
// herramientas: el cliente de la API, el motor, la firma ("Claude Haiku 5.5 (esfuerzo alto)") y un pedido que devuelve JSON con
// esquema. Solo servidor.
//
// C-288 (el equipo, 17/11: "ver y cambiar el motor, las instrucciones de cada uso, cuánto consume y qué falla"):
// - El modelo, el esfuerzo y la clave salen de Configuración → IA · Claude (lib/ia/ajustes.ts) y, si no hay nada guardado, del
//   .env (ANTHROPIC_MODEL, ANTHROPIC_EFFORT, ANTHROPIC_API_KEY): por defecto Claude Haiku 5.5 en esfuerzo alto. El máximo pasa
//   de los 60 s que nginx espera (C-211); un trabajo de fondo puede pedirlo para él solo.
// - Cada pedido queda anotado (IaPedido): el uso, el modelo, los tokens, las búsquedas, lo que costó, lo que tardó y, si falló,
//   por qué. Nunca lo que se mandó ni lo que se respondió. Se anota sin esperar y sin lanzar.
// - Las instrucciones son las que escribió el equipo (o las de fábrica) y, siempre al final, las reglas fijas del uso. Y la
//   tienda comprueba cada respuesta en código (lib/ia/revisar.ts): si rompe una regla de tipo "pide", se la pide a Claude una vez
//   más, diciéndole qué regla rompió; si vuelve a romperla, deja vacío lo que la rompió y lo anota.
// - Lo que se le manda (compras, consultas, páginas) va como datos: cada instrucción dice que no son órdenes.

import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { leerAjustesIa, type AjustesIa } from './ajustes';
import { registrarAtajadas } from './atajadas';
import { costoDe, nombreDeEsfuerzo, nombreDeModelo, type Esfuerzo } from './precios';
import { instruccionesDe, type Cambio, type ResultadoReglas, type UsoIa, type UsoRegistro } from './reglas';
import { mensajeDeCorreccion } from './revisar';

export type { Esfuerzo };

/** Con más esfuerzo, el razonamiento ocupa buena parte de la respuesta: lugar de sobra y en flujo */
const MAX_TOKENS = 32_000;

// Un cliente por clave: si el equipo la cambia en el panel, el siguiente pedido ya usa la nueva
const clientes = new Map<string, Anthropic>();
export function clienteDe(clave: string): Anthropic {
  let cliente = clientes.get(clave);
  if (!cliente) {
    if (clientes.size >= 4) clientes.clear();
    cliente = new Anthropic({ apiKey: clave, maxRetries: 1 });
    clientes.set(clave, cliente);
  }
  return cliente;
}

/** Hay una clave (la del panel o la del servidor) con la que pedirle a Claude */
export async function claudeDisponible(): Promise<boolean> {
  return (await leerAjustesIa()).clave !== null;
}

/** "claude-haiku-5-5" → "Claude Haiku 5.5 (esfuerzo alto)": el panel dice quién lo redactó */
export function firmaDe(modelo: string, esfuerzo: Esfuerzo): string {
  return `${nombreDeModelo(modelo)} (esfuerzo ${nombreDeEsfuerzo(esfuerzo)})`;
}

/** Qué falló, sin la clave ni los datos que se mandaron: el estado HTTP o el nombre del error */
export function detalleDe(error: unknown): string {
  return error instanceof Anthropic.APIError ? `${error.status ?? 'sin estado'} ${error.name}` : error instanceof Error ? error.name : 'desconocido';
}

/** Para el registro del servidor: solo qué falló, sin la clave ni los datos que se mandaron */
export function avisarError(donde: string, error: unknown) {
  console.error(`[claude] ${donde}: ${detalleDe(error)}`);
}

/** Por qué no hubo respuesta, para decírselo al equipo */
export class FallaIA extends Error {
  constructor(public motivo: 'sin-clave' | 'no-termino' | 'servicio') {
    super(
      motivo === 'sin-clave' ? 'Falta la clave de Claude: se pega en Configuración → IA · Claude (o en el servidor, ANTHROPIC_API_KEY).'
        : motivo === 'no-termino' ? 'Claude no terminó la respuesta. Prueba otra vez.'
          : 'Claude no respondió. Prueba otra vez en un momento.',
    );
  }
}

// ───── El registro de cada pedido ─────

export interface DatosPedido {
  uso: UsoRegistro;
  proveedor?: 'anthropic' | 'groq';
  modelo: string;
  esfuerzo?: string | null;
  entrada?: number;
  salida?: number;
  busquedas?: number;
  costoUsd?: number;
  ms: number;
  falla?: 'sin-clave' | 'no-termino' | 'servicio' | 'regla' | null;
  detalle?: string | null;
  reintento?: boolean;
  usuarioId?: string | null;
}

// La escritura de cada pedido que todavía no terminó: para poder marcarlo como falla de regla sin adelantarse a su creación
const escrituras = new Map<string, Promise<unknown>>();

/**
 * Anota un pedido (IaPedido) sin esperar y sin lanzar: el registro nunca rompe lo que se estaba haciendo. Devuelve su id, por
 * si hay que marcarlo después como falla de regla (`marcarFallaDeRegla`).
 */
export function registrarPedido(d: DatosPedido): string {
  const id = randomUUID();
  const escritura = prisma.iaPedido.create({
    data: {
      id,
      uso: d.uso,
      proveedor: d.proveedor ?? 'anthropic',
      modelo: d.modelo.slice(0, 80),
      esfuerzo: d.esfuerzo ?? null,
      entrada: Math.max(0, Math.round(d.entrada ?? 0)),
      salida: Math.max(0, Math.round(d.salida ?? 0)),
      busquedas: Math.max(0, Math.round(d.busquedas ?? 0)),
      costoUsd: d.costoUsd ?? 0,
      ms: Math.max(0, Math.round(d.ms)),
      falla: d.falla ?? null,
      detalle: d.detalle ? d.detalle.slice(0, 120) : null,
      reintento: d.reintento ?? false,
      usuarioId: d.usuarioId ?? null,
    },
  }).catch(() => console.error('[ia] no se pudo anotar un pedido'));
  escrituras.set(id, escritura);
  void escritura.finally(() => escrituras.delete(id));
  return id;
}

/** El segundo pedido, el que se hace cuando la respuesta rompió una regla, la rompió también: se anota como falla "regla" */
export function marcarFallaDeRegla(pedidoId: string, regla: string): void {
  void (escrituras.get(pedidoId) ?? Promise.resolve())
    .then(() => prisma.iaPedido.update({ where: { id: pedidoId }, data: { falla: 'regla', detalle: regla.slice(0, 120) } }))
    .catch(() => console.error('[ia] no se pudo anotar la falla de una regla'));
}

export interface Motor {
  modelo: string;
  esfuerzo: Esfuerzo;
}

export interface OpcionesDeMensaje<T> {
  uso: UsoRegistro;
  /** Nombra la herramienta en el registro del servidor */
  donde: string;
  esfuerzo?: Esfuerzo;
  reintento?: boolean;
  usuarioId?: string | null;
  /** Los ajustes que ya se leyeron (para no leerlos dos veces en un mismo trabajo) */
  ajustes?: AjustesIa;
  /** El pedido a la API, con el modelo y el esfuerzo vigentes */
  crear: (cliente: Anthropic, motor: Motor) => Promise<Anthropic.Message>;
  /** Lo que se saca de la respuesta; null si no terminó bien (cortada, rechazada) */
  leer: (mensaje: Anthropic.Message) => T | null;
}

/**
 * Un pedido a Claude con el motor y la clave de los ajustes. Lo anota (también si falla) y lanza FallaIA si no hubo respuesta.
 * Es la única puerta a la API: quien necesite algo distinto (la búsqueda por su cuenta) usa esta y pone su propio `crear`.
 */
export async function pedirMensaje<T>(o: OpcionesDeMensaje<T>): Promise<{ valor: T; mensaje: Anthropic.Message; motor: Motor; firma: string; pedidoId: string }> {
  const ajustes = o.ajustes ?? (await leerAjustesIa());
  const motor: Motor = { modelo: ajustes.modelo, esfuerzo: o.esfuerzo ?? ajustes.esfuerzo };
  const base = { uso: o.uso, modelo: motor.modelo, esfuerzo: motor.esfuerzo, reintento: o.reintento, usuarioId: o.usuarioId };
  if (!ajustes.clave) {
    registrarPedido({ ...base, ms: 0, falla: 'sin-clave' });
    throw new FallaIA('sin-clave');
  }
  const inicio = Date.now();
  let mensaje: Anthropic.Message;
  try {
    mensaje = await o.crear(clienteDe(ajustes.clave), motor);
  } catch (error) {
    avisarError(o.donde, error);
    registrarPedido({ ...base, ms: Date.now() - inicio, falla: 'servicio', detalle: detalleDe(error) });
    throw new FallaIA('servicio');
  }
  const ms = Date.now() - inicio;
  const modelo = mensaje.model || motor.modelo;
  const medida = {
    entrada: mensaje.usage.input_tokens,
    salida: mensaje.usage.output_tokens,
    busquedas: mensaje.usage.server_tool_use?.web_search_requests ?? 0,
  };
  const anotar = (falla: DatosPedido['falla'], detalle?: string): string =>
    registrarPedido({ ...base, modelo, ...medida, costoUsd: costoDe({ modelo, ...medida }), ms, falla, detalle });

  const valor = o.leer(mensaje);
  if (valor === null) {
    console.error(`[claude] ${o.donde}: terminó con ${mensaje.stop_reason}`);
    anotar('no-termino', mensaje.stop_reason ?? undefined);
    throw new FallaIA('no-termino');
  }
  return { valor, mensaje, motor, firma: firmaDe(modelo, motor.esfuerzo), pedidoId: anotar(null) };
}

// ───── Un pedido con respuesta en JSON ─────

/** El objeto JSON de una respuesta que terminó bien; null si se cortó, la rechazó o no es un objeto */
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

/** Lo que hicieron las reglas con la respuesta final: para anotarlo y para mostrarlo al probar unas instrucciones */
export interface RevisionFinal {
  cambios: Cambio[];
  avisos: string[];
  /** Las reglas de la tienda de este uso que la respuesta pasó sin que hiciera falta tocarla */
  pasaron: string[];
  /** Se le pidió otra vez porque rompió una regla */
  pidioOtraVez: boolean;
  /** Las reglas que rompió también la segunda vez: lo que las rompió quedó vacío */
  marcadas: string[];
}

/**
 * Lo que un uso deja pasar para probarse desde Configuración (lib/ia/probar.ts): unas instrucciones que reemplazan las del equipo
 * sin guardarlas, quién prueba, y quién se entera de lo que hicieron las reglas con la respuesta.
 */
export interface OpcionesDeUso {
  instruccionesPrueba?: string;
  usuarioId?: string | null;
  alRevisar?: (revision: RevisionFinal) => void;
}

export interface OpcionesPedirJSON extends OpcionesDeUso {
  uso: UsoIa;
  /** Nombra la herramienta en el registro del servidor */
  donde: string;
  /** Las instrucciones de fábrica de este uso: las del equipo las reemplazan, las reglas fijas se suman siempre */
  deFabrica: string;
  /** Lo dinámico de este uso que va después de las instrucciones (no se edita) */
  anexo?: string;
  pedido: string;
  esquema: Record<string, unknown>;
  esfuerzo?: Esfuerzo;
  tiempoMs?: number;
  /** Las reglas de la tienda: limpian lo que respondió y dicen si hay que pedirlo otra vez */
  revisar?: (datos: Record<string, unknown>, ctx: { frases: readonly string[] }) => ResultadoReglas;
  /** De qué se trata (el producto, "Respuesta a Pedro R."), para anotarlo con lo que atajó una regla */
  referencia?: string;
}

export interface ResultadoJSON {
  datos: Record<string, unknown>;
  firma: string;
  tokens: { entrada: number; salida: number };
  revision: RevisionFinal;
}

/**
 * Un pedido con respuesta en JSON con esquema (structured outputs). Lanza FallaIA: quien llama decide qué decir.
 * Con `revisar`, la tienda comprueba la respuesta antes de dársela a quien llama.
 */
export async function pedirJSON(o: OpcionesPedirJSON): Promise<ResultadoJSON> {
  const ajustes = await leerAjustesIa();
  const sistema = instruccionesDe(o.uso, o.deFabrica, { delEquipo: o.instruccionesPrueba ?? ajustes.instrucciones[o.uso]?.texto, anexo: o.anexo });
  const registro: UsoRegistro = o.instruccionesPrueba !== undefined ? 'prueba' : o.uso;
  const ctx = { frases: ajustes.frases };

  const intentar = (pedido: string, reintento: boolean) => pedirMensaje<Record<string, unknown>>({
    uso: registro, donde: o.donde, esfuerzo: o.esfuerzo, reintento, usuarioId: o.usuarioId, ajustes,
    crear: (cliente, motor) => cliente.messages.stream({
      model: motor.modelo,
      max_tokens: MAX_TOKENS,
      system: sistema,
      messages: [{ role: 'user', content: pedido }],
      output_config: { effort: motor.esfuerzo, format: { type: 'json_schema', schema: o.esquema } },
    }, { timeout: o.tiempoMs ?? 55_000 }).finalMessage(),
    leer: objetoDe,
  });

  const primera = await intentar(o.pedido, false);
  let datos = primera.valor;
  let firma = primera.firma;
  const tokens = { entrada: primera.mensaje.usage.input_tokens, salida: primera.mensaje.usage.output_tokens };
  let revision: ResultadoReglas | null = o.revisar ? o.revisar(datos, ctx) : null;
  const atajadas: Cambio[] = [];
  let pidioOtraVez = false;
  const marcadas: string[] = [];

  if (revision && revision.pedirOtraVez.length > 0) {
    pidioOtraVez = true;
    const pedidas = revision.pedirOtraVez;
    atajadas.push(...pedidas.map((p) => ({ regla: p.regla, accion: 'pide' as const, antes: p.antes, despues: null })));
    try {
      const segunda = await intentar(`${o.pedido}\n\n${mensajeDeCorreccion(pedidas)}`, true);
      datos = segunda.valor;
      firma = segunda.firma;
      tokens.entrada += segunda.mensaje.usage.input_tokens;
      tokens.salida += segunda.mensaje.usage.output_tokens;
      revision = o.revisar ? o.revisar(datos, ctx) : null;
      // La primera que rompe una regla no es una falla, es lo que se corrige; la segunda sí
      if (revision && revision.pedirOtraVez.length > 0) marcarFallaDeRegla(segunda.pedidoId, revision.pedirOtraVez[0].regla);
    } catch (error) {
      if (!(error instanceof FallaIA)) throw error;
      // La segunda no respondió: valen los datos limpios de la primera (ya sin lo que rompía la regla)
    }
    // Si sigue rompiendo la regla, queda vacío lo que la rompió y se anota
    if (revision && revision.pedirOtraVez.length > 0) {
      marcadas.push(...revision.pedirOtraVez.map((p) => p.regla));
      atajadas.push(...revision.pedirOtraVez.map((p) => ({ regla: p.regla, accion: 'marca' as const, antes: p.antes, despues: null })));
    }
  }

  const cambios = revision?.cambios ?? [];
  atajadas.push(...cambios);
  registrarAtajadas(registro, atajadas, o.referencia);

  const huella = new Set([...atajadas.map((c) => c.regla), ...marcadas]);
  const final: RevisionFinal = {
    cambios: atajadas,
    avisos: revision?.avisos ?? [],
    pasaron: (revision?.revisadas ?? []).filter((id) => !huella.has(id)),
    pidioOtraVez,
    marcadas,
  };
  o.alRevisar?.(final);
  return { datos: revision?.datos ?? datos, firma, tokens, revision: final };
}
