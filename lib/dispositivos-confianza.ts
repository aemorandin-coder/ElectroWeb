// C-291 · El dispositivo de confianza del panel (decisión del equipo del 18/11, AJUSTES.md §6.1): en un navegador marcado,
// 30 días sin pedir el código de los dos pasos. La contraseña se sigue pidiendo y la sesión del panel sigue igual (una sola,
// 12 horas, se cierra tras 1 hora sin uso). Vale para todo el panel: la contadora, los administradores y el dueño.
//
// - La galleta lleva 32 bytes al azar; en la base solo queda su huella (lib/token-huella). Es httpOnly, Secure y SameSite
//   Strict, y en producción `__Host-`, así que no la lee el JavaScript de la página ni sale hacia otro sitio.
// - Vale mientras no venza (30 días desde que se marca: usarla no la alarga), no se quite y la versión de sesión del usuario
//   sea la de cuando se marcó. Cambiar la contraseña, "No fui yo" y cerrar sus sesiones suben esa versión: los anulan todos.
// - Hasta 5 por persona: el sexto quita el más viejo.
// - Lo delicado pide el código otra vez si la sesión entró por confianza (`exigirCodigoReciente`): la clave de la IA y la del
//   servidor de correo, Equipo, Métodos de pago y Respaldos. La confirmación vale 15 minutos.
// Solo servidor.

import { randomBytes } from 'crypto';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { describirDispositivo } from '@/lib/dispositivo';
import { ipParaRegistro } from '@/lib/ip';
import { huellaDeToken } from '@/lib/token-huella';

export const DIAS_CONFIANZA = 30;
const VIGENCIA_MS = DIAS_CONFIANZA * 24 * 60 * 60 * 1000;
export const MAX_DISPOSITIVOS = 5;
/** Cuánto vale la confirmación con el código para lo delicado */
export const CONFIRMACION_MS = 15 * 60 * 1000;
/** Se marca justo después de entrar con el código: después ya no */
const MARCAR_DENTRO_DE_MS = 5 * 60 * 1000;

export type SegundoPaso = 'codigo' | 'respaldo' | 'confianza';

const segura = () => (process.env.NEXTAUTH_URL ?? '').startsWith('https://');
/** En producción (https) con el prefijo `__Host-`: solo este dominio, en la raíz y con Secure. En local (http) no se puede */
export const nombreGalleta = () => (segura() ? '__Host-es-confianza' : 'es-confianza');

async function valorDeLaGalleta(): Promise<string | null> {
  try {
    const valor = (await cookies()).get(nombreGalleta())?.value;
    return valor && /^[A-Za-z0-9_-]{40,60}$/.test(valor) ? valor : null;
  } catch {
    return null; // Fuera de una petición (pruebas)
  }
}

/**
 * Al entrar (authorize): ¿este navegador es un dispositivo de confianza vigente de esta cuenta? Si lo es, anota el uso.
 * Una galleta de otra cuenta, vencida, quitada o de una versión vieja no sirve: se pide el código como siempre.
 */
export async function esDispositivoDeConfianza(userId: string): Promise<boolean> {
  const valor = await valorDeLaGalleta();
  if (!valor) return false;
  const fila = await prisma.dispositivoConfianza.findFirst({
    where: { huella: huellaDeToken(valor) },
    select: { id: true, userId: true, venceAt: true, quitadoAt: true, version: true, user: { select: { sessionVersion: true } } },
  });
  if (!fila || fila.userId !== userId || fila.quitadoAt || fila.venceAt.getTime() <= Date.now() || fila.version !== fila.user.sessionVersion) return false;
  await prisma.dispositivoConfianza.update({ where: { id: fila.id }, data: { ultimoUsoAt: new Date() } }).catch(() => undefined);
  return true;
}

/**
 * Marca este navegador como de confianza, justo después de entrar con el código (o una llave de repuesto). Devuelve el
 * valor de la galleta y su descripción, o el motivo por el que no se puede.
 */
export async function marcarDispositivo(userId: string, sid: string | undefined): Promise<{ valor: string; dispositivo: string } | { error: string }> {
  if (!sid) return { error: 'Vuelve a entrar para marcar este dispositivo.' };
  const [sesion, usuario] = await Promise.all([
    prisma.userSession.findUnique({ where: { id: sid }, select: { userId: true, segundoPaso: true, createdAt: true, revokedAt: true, esAdmin: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } }),
  ]);
  if (!sesion || !usuario || sesion.userId !== userId || sesion.revokedAt || !sesion.esAdmin) return { error: 'Vuelve a entrar para marcar este dispositivo.' };
  if (sesion.segundoPaso !== 'codigo' && sesion.segundoPaso !== 'respaldo') return { error: 'Solo se marca al entrar con el número de tu app.' };
  if (Date.now() - sesion.createdAt.getTime() > MARCAR_DENTRO_DE_MS) return { error: 'Se marca al entrar. La próxima vez que entres, marca la casilla.' };

  let userAgent: string | null = null;
  let ip: string | null = null;
  try {
    const h = await headers();
    userAgent = h.get('user-agent');
    ip = ipParaRegistro(h);
  } catch {
    // Fuera de una petición (pruebas)
  }
  const dispositivo = describirDispositivo(userAgent);
  const valor = randomBytes(32).toString('base64url');
  const ahora = new Date();
  // Este navegador ya era de confianza: el nuevo lo reemplaza (no quedan dos filas para el mismo navegador)
  const anterior = await valorDeLaGalleta();
  await prisma.$transaction(async (tx) => {
    if (anterior) {
      await tx.dispositivoConfianza.updateMany({ where: { userId, huella: huellaDeToken(anterior), quitadoAt: null }, data: { quitadoAt: ahora, motivoQuitado: 'REEMPLAZADO' } });
    }
    await tx.dispositivoConfianza.create({
      data: { userId, huella: huellaDeToken(valor), dispositivo, ip, version: usuario.sessionVersion, venceAt: new Date(ahora.getTime() + VIGENCIA_MS) },
    });
    // Hasta 5: el sexto quita el más viejo
    const vivos = await tx.dispositivoConfianza.findMany({
      where: { userId, quitadoAt: null, venceAt: { gt: ahora }, version: usuario.sessionVersion },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const sobran = vivos.slice(MAX_DISPOSITIVOS).map((d) => d.id);
    if (sobran.length > 0) await tx.dispositivoConfianza.updateMany({ where: { id: { in: sobran } }, data: { quitadoAt: ahora, motivoQuitado: 'REEMPLAZADO' } });
  });
  return { valor, dispositivo };
}

/** Pone la galleta en la respuesta (30 días). */
export function ponerGalleta(respuesta: NextResponse, valor: string): NextResponse {
  respuesta.cookies.set(nombreGalleta(), valor, { httpOnly: true, secure: segura(), sameSite: 'strict', path: '/', maxAge: VIGENCIA_MS / 1000 });
  return respuesta;
}

/** Los dispositivos vigentes de alguien, el más nuevo primero. `actual`: es este navegador. */
export async function listarDispositivos(userId: string) {
  const [usuario, valor] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } }),
    valorDeLaGalleta(),
  ]);
  if (!usuario) return [];
  const huellaActual = valor ? huellaDeToken(valor) : null;
  const filas = await prisma.dispositivoConfianza.findMany({
    where: { userId, quitadoAt: null, venceAt: { gt: new Date() }, version: usuario.sessionVersion },
    orderBy: { createdAt: 'desc' },
    select: { id: true, dispositivo: true, createdAt: true, ultimoUsoAt: true, venceAt: true, huella: true },
  });
  return filas.map(({ huella, ...d }) => ({ ...d, actual: huella === huellaActual }));
}

export async function contarDispositivos(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const usuarios = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, sessionVersion: true } });
  const filas = await prisma.dispositivoConfianza.findMany({
    where: { userId: { in: userIds }, quitadoAt: null, venceAt: { gt: new Date() } },
    select: { userId: true, version: true },
  });
  const version = new Map(usuarios.map((u) => [u.id, u.sessionVersion]));
  const cuenta = new Map<string, number>();
  for (const f of filas) if (version.get(f.userId) === f.version) cuenta.set(f.userId, (cuenta.get(f.userId) ?? 0) + 1);
  return cuenta;
}

/** Quita uno de los suyos. Devuelve false si no es suyo o ya estaba quitado. */
export async function quitarDispositivo(userId: string, id: string): Promise<boolean> {
  const r = await prisma.dispositivoConfianza.updateMany({ where: { id, userId, quitadoAt: null }, data: { quitadoAt: new Date(), motivoQuitado: 'QUITADO' } });
  return r.count === 1;
}

/** Quita todos los de alguien (él mismo, el dueño desde Equipo o el reinicio de los dos pasos). Devuelve cuántos. */
export async function quitarTodos(userId: string, motivo: 'QUITADOS_TODOS' | 'DUENO' | 'REINICIO'): Promise<number> {
  const r = await prisma.dispositivoConfianza.updateMany({ where: { userId, quitadoAt: null }, data: { quitadoAt: new Date(), motivoQuitado: motivo } });
  return r.count;
}

/* ── Lo delicado: el código otra vez si la sesión entró por confianza ── */

async function tokenDeLaPeticion() {
  try {
    const almacen = await cookies();
    const galletas = Object.fromEntries(almacen.getAll().map((c) => [c.name, c.value]));
    return await getToken({ req: { cookies: galletas, headers: Object.fromEntries((await headers()).entries()) } as never });
  } catch {
    return null;
  }
}

/**
 * En las rutas de lo delicado, después de comprobar el permiso: si la sesión entró sin código (por un dispositivo de
 * confianza) y no lo confirmó en los últimos 15 minutos, responde 403 con `codigo: 'CODIGO_RECIENTE'`. El panel abre
 * la ventana del código (components/admin/dos-pasos/ConfirmarConCodigo) y repite el pedido. Si no, null.
 */
export async function exigirCodigoReciente(): Promise<NextResponse | null> {
  const token = await tokenDeLaPeticion();
  if (!token || token.segundoPaso !== 'confianza') return null;
  const sesion = token.sid ? await prisma.userSession.findUnique({ where: { id: token.sid }, select: { confirmadoAt: true, userId: true } }) : null;
  if (sesion && sesion.userId === token.id && sesion.confirmadoAt && Date.now() - sesion.confirmadoAt.getTime() < CONFIRMACION_MS) return null;
  return NextResponse.json(
    { error: 'Para esto, confirma con el número de tu app.', codigo: 'CODIGO_RECIENTE' },
    { status: 403, headers: { 'Cache-Control': 'no-store' } },
  );
}

/** Anota la confirmación con el código en la sesión actual (vale 15 minutos para lo delicado). */
export async function anotarConfirmacion(userId: string, sid: string | undefined): Promise<void> {
  if (!sid) return;
  await prisma.userSession.updateMany({ where: { id: sid, userId, revokedAt: null }, data: { confirmadoAt: new Date() } });
}
