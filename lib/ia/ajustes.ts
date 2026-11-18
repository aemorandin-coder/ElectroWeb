// C-288 · Los ajustes de Claude que se cambian desde Configuración → IA · Claude: el motor (modelo y esfuerzo), la clave de la
// API, las frases que nunca van en lo que se publica y las instrucciones de cada uso. Una sola fila ("default", modelo
// IaAjustes). Solo servidor.
//
// Lo que no está en el panel sigue como antes: el modelo y el esfuerzo salen de ANTHROPIC_MODEL y ANTHROPIC_EFFORT, la clave
// de ANTHROPIC_API_KEY y las instrucciones y las frases son las de fábrica. Sin la fila (o sin la tabla, antes del deploy), todo
// funciona igual que antes de C-288.
//
// Se leen con caché de 15 s (cada pedido a Claude los necesita) y quien guarda la invalida: el cambio rige desde el próximo
// pedido. El caché va en globalThis, como el cliente de Prisma, para que lo compartan todas las rutas del proceso.

import { Prisma, type IaAjustes } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { descifrarClave } from './clave';
import { ESFUERZO_DE_FABRICA, esEsfuerzo, MODELO_DE_FABRICA, type Esfuerzo } from './precios';
import {
  esUsoIa, FRASE_MAX_LARGO, FRASE_MIN_LARGO, FRASES_DE_FABRICA, FRASES_MAX, INSTRUCCIONES_MAX, INSTRUCCIONES_MIN, type UsoIa,
} from './reglas';

export interface InstruccionGuardada {
  texto: string;
  porId: string | null;
  porNombre: string | null;
  at: string;
}

export interface AjustesIa {
  /** El del panel, o ANTHROPIC_MODEL, o Claude Haiku 5.5 */
  modelo: string;
  /** El del panel, o ANTHROPIC_EFFORT, o alto */
  esfuerzo: Esfuerzo;
  /** De dónde salen el modelo y el esfuerzo: el panel, o el servidor (.env o de fábrica) */
  fuente: 'panel' | 'env';
  /** La clave de Anthropic en claro: nunca sale del servidor */
  clave: string | null;
  fuenteClave: 'panel' | 'env' | null;
  /** Hay una clave guardada en el panel pero no se puede descifrar (cambió NEXTAUTH_SECRET): sigue la del .env */
  claveRota: boolean;
  claveCambiadaAt: Date | null;
  frases: string[];
  /** Las frases son las que guardó el equipo (si no, las de fábrica) */
  frasesDelPanel: boolean;
  instrucciones: Partial<Record<UsoIa, InstruccionGuardada>>;
  /** Para guardar con versión: null si todavía no hay fila */
  updatedAt: Date | null;
}

const VIGENCIA_MS = 15_000;
const globalParaAjustes = globalThis as unknown as { iaAjustes?: { hasta: number; valor: AjustesIa } };

/** Las frases guardadas: de 3 a 80 caracteres, sin repetidas, hasta 60. Si no queda ninguna, las de fábrica */
export function frasesValidas(valor: unknown): string[] | null {
  if (!Array.isArray(valor)) return null;
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const f of valor) {
    if (typeof f !== 'string') continue;
    const frase = f.trim().replace(/\s+/g, ' ');
    const llave = frase.toLowerCase();
    if (frase.length < FRASE_MIN_LARGO || frase.length > FRASE_MAX_LARGO || vistas.has(llave)) continue;
    vistas.add(llave);
    salida.push(frase);
    if (salida.length >= FRASES_MAX) break;
  }
  return salida.length > 0 ? salida : null;
}

export function instruccionesValidas(valor: unknown): Partial<Record<UsoIa, InstruccionGuardada>> {
  const salida: Partial<Record<UsoIa, InstruccionGuardada>> = {};
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return salida;
  for (const [uso, dato] of Object.entries(valor)) {
    if (!esUsoIa(uso) || !dato || typeof dato !== 'object') continue;
    const d = dato as Record<string, unknown>;
    const texto = typeof d.texto === 'string' ? d.texto.trim() : '';
    // Un texto que no llega al mínimo no se usa: Claude se queda sin instrucciones. Vale más la de fábrica
    if (texto.length < INSTRUCCIONES_MIN) continue;
    salida[uso] = {
      texto: texto.slice(0, INSTRUCCIONES_MAX),
      porId: typeof d.porId === 'string' ? d.porId : null,
      porNombre: typeof d.porNombre === 'string' ? d.porNombre : null,
      at: typeof d.at === 'string' ? d.at : '',
    };
  }
  return salida;
}

function armar(fila: IaAjustes | null): AjustesIa {
  const modeloEnv = process.env.ANTHROPIC_MODEL?.trim() || null;
  const esfuerzoDelEnv = process.env.ANTHROPIC_EFFORT;
  const esfuerzoEnv = esEsfuerzo(esfuerzoDelEnv) ? esfuerzoDelEnv : null;
  const modeloPanel = fila?.modelo?.trim() || null;
  const esfuerzoGuardado = fila?.esfuerzo;
  const esfuerzoPanel = esEsfuerzo(esfuerzoGuardado) ? esfuerzoGuardado : null;

  const delPanel = fila?.claveCifrada ? descifrarClave(fila.claveCifrada) : null;
  const delEnv = process.env.ANTHROPIC_API_KEY?.trim() || null;
  const frases = frasesValidas(fila?.frases);

  return {
    modelo: modeloPanel ?? modeloEnv ?? MODELO_DE_FABRICA,
    esfuerzo: esfuerzoPanel ?? esfuerzoEnv ?? ESFUERZO_DE_FABRICA,
    fuente: modeloPanel || esfuerzoPanel ? 'panel' : 'env',
    clave: delPanel ?? delEnv,
    fuenteClave: delPanel ? 'panel' : delEnv ? 'env' : null,
    claveRota: Boolean(fila?.claveCifrada) && !delPanel,
    claveCambiadaAt: fila?.claveCambiadaAt ?? null,
    frases: frases ?? [...FRASES_DE_FABRICA],
    frasesDelPanel: frases !== null,
    instrucciones: instruccionesValidas(fila?.instrucciones),
    updatedAt: fila?.updatedAt ?? null,
  };
}

/** Los ajustes vigentes (con caché de 15 s). Si la tabla no está o la base no responde, los de siempre (.env y fábrica) */
export async function leerAjustesIa(): Promise<AjustesIa> {
  const guardado = globalParaAjustes.iaAjustes;
  if (guardado && guardado.hasta > Date.now()) return guardado.valor;
  let fila: IaAjustes | null = null;
  try {
    fila = await prisma.iaAjustes.findUnique({ where: { id: 'default' } });
  } catch {
    // Sin la tabla (antes del deploy) o sin base: Claude sigue con el .env, como antes
    console.error('[ia] no se pudieron leer los ajustes de Claude: se usan los del servidor');
  }
  const valor = armar(fila);
  globalParaAjustes.iaAjustes = { hasta: Date.now() + VIGENCIA_MS, valor };
  return valor;
}

export function invalidarAjustesIa(): void {
  globalParaAjustes.iaAjustes = undefined;
}

/** La fila tal cual está en la base, sin caché: para guardar con versión y para saber quién cambió qué */
export async function filaDeAjustes(): Promise<IaAjustes | null> {
  return prisma.iaAjustes.findUnique({ where: { id: 'default' } });
}

export type Guardado = { ok: true; updatedAt: Date } | { ok: false; conflicto: true };

/**
 * Guarda un cambio en la fila de ajustes. Con `desde` (la fecha de la versión que se estaba mirando), si otra persona guardó
 * después no se pisa: devuelve conflicto y la pantalla recarga. Sin `desde` (la clave), no se compara.
 * `cambiar` recibe la fila de ahora y devuelve solo lo que cambia (las instrucciones de un uso se mezclan con las demás).
 */
export async function guardarAjustes(
  desde: string | null | undefined,
  usuarioId: string | null,
  cambiar: (actual: IaAjustes | null) => Prisma.IaAjustesUncheckedUpdateManyInput,
): Promise<Guardado> {
  const actual = await filaDeAjustes();
  if (desde !== undefined) {
    const mismaVersion = actual ? desde !== null && new Date(desde).getTime() === actual.updatedAt.getTime() : desde === null;
    if (!mismaVersion) return { ok: false, conflicto: true };
  }
  const datos = { ...cambiar(actual), actualizadoPorId: usuarioId };
  try {
    if (actual) {
      // Optimista: si alguien guardó entre la lectura y la escritura, no se actualiza nada
      const r = await prisma.iaAjustes.updateMany({ where: { id: 'default', updatedAt: actual.updatedAt }, data: datos });
      if (r.count === 0) return { ok: false, conflicto: true };
    } else {
      await prisma.iaAjustes.create({ data: { id: 'default', ...datos } as Prisma.IaAjustesUncheckedCreateInput });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { ok: false, conflicto: true };
    throw error;
  }
  invalidarAjustesIa();
  const nueva = await filaDeAjustes();
  return { ok: true, updatedAt: nueva?.updatedAt ?? new Date() };
}
