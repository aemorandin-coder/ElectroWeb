// Piezas comunes de las pruebas de punta a punta (C-151). Las usan los guiones de cada tarea, que viven fuera del
// repositorio; esto queda aquí porque la carpeta temporal se vacía con cada desconexión.
//
// Requisitos: DATABASE_URL apuntando al esquema de prueba (rev10_demo), NEXTAUTH_SECRET y `next start -p 3100`.
// Nunca contra producción: crea y borra usuarios y órdenes.
//
// Uso: npx tsx scripts/e2e/<guion>.ts  (el guion importa de './lib')

import { PrismaClient } from '@prisma/client';
import { encode } from 'next-auth/jwt';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

export const BASE = process.env.E2E_BASE_URL || 'http://localhost:3100';
export const prisma = new PrismaClient();

if (!/schema=\w*(demo|test)/.test(process.env.DATABASE_URL ?? '')) {
  throw new Error('Las pruebas solo corren contra un esquema de prueba (DATABASE_URL con schema=…demo o …test).');
}

// ---------- resultados
let pasan = 0;
let fallan = 0;
export function t(nombre: string, condicion: unknown, detalle?: unknown): void {
  if (condicion) { pasan++; return; }
  fallan++;
  console.log('FALLA:', nombre, detalle === undefined ? '' : (typeof detalle === 'string' ? detalle : JSON.stringify(detalle))?.slice(0, 500));
}
export const espera = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Corre el guion, limpia al final aunque falle, y sale con el código que corresponde. */
export async function correr(guion: () => Promise<void>, alFinal: () => Promise<void> = async () => undefined): Promise<void> {
  try {
    await guion();
  } catch (error) {
    fallan++;
    console.error(error);
  } finally {
    await alFinal().catch((error) => console.error('Error limpiando:', error));
    await prisma.$disconnect();
    console.log(`\n${pasan} de ${pasan + fallan}`);
    process.exit(fallan > 0 ? 1 : 0);
  }
}

// ---------- usuarios y sesiones
export type RolPrueba = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export interface UsuarioPrueba { id: string; email: string; token: string; cookie: string }

/**
 * Crea un usuario de prueba con su sesión. Cliente: token sin `sid`. Admin: una fila en user_sessions y el token con
 * ese `sid` y `dosPasos` (no hace falta el código de la app).
 */
export async function crearUsuario(email: string, nombre: string, rol: RolPrueba, opciones: { perfil?: Record<string, unknown>; puntos?: number } = {}): Promise<UsuarioPrueba> {
  const usuario = await prisma.user.create({
    data: {
      email, name: nombre, role: rol, emailVerified: new Date(),
      profile: { create: { phone: '+58 4121234567', idNumber: 'V-12345678', ...opciones.perfil } },
      ...(opciones.puntos ? { balance: { create: { balance: opciones.puntos } } } : {}),
    },
    select: { id: true, sessionVersion: true },
  });
  const admin = rol !== 'USER';
  const sid = admin
    ? (await prisma.userSession.create({ data: { userId: usuario.id, dispositivo: 'Prueba E2E', esAdmin: true, version: usuario.sessionVersion, expiresAt: new Date(Date.now() + 3_600_000) } })).id
    : undefined;
  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET ?? '',
    token: { id: usuario.id, sub: usuario.id, name: nombre, email, role: rol, userType: admin ? 'admin' : 'customer', emailVerified: true, sessionVersion: usuario.sessionVersion, dosPasos: admin, ...(sid ? { sid } : {}) },
  });
  return { id: usuario.id, email, token, cookie: `next-auth.session-token=${token}` };
}

/** Borra los usuarios de prueba con todo lo suyo, y devuelve al inventario lo que descontaron sus órdenes pagadas. */
export async function borrarUsuarios(correos: string[]): Promise<void> {
  const ids = (await prisma.user.findMany({ where: { email: { in: correos } }, select: { id: true } })).map((u) => u.id);
  if (ids.length === 0) return;
  const ordenes = await prisma.order.findMany({
    where: { userId: { in: ids } },
    select: { id: true, paymentStatus: true, status: true, items: { select: { productId: true, quantity: true, product: { select: { productType: true } } } } },
  });
  for (const orden of ordenes) {
    if (orden.paymentStatus !== 'PAID' || orden.status === 'CANCELLED') continue;
    for (const item of orden.items) {
      if (item.product?.productType === 'PHYSICAL') await prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
  }
  const oids = ordenes.map((o) => o.id);
  await prisma.shipmentEvent.deleteMany({ where: { orderId: { in: oids } } });
  await prisma.stockReservation.deleteMany({ where: { userId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: oids } } });
  await prisma.order.deleteMany({ where: { id: { in: oids } } });
  const cuentas = await prisma.userBalance.findMany({ where: { userId: { in: ids } }, select: { id: true } });
  await prisma.transaction.deleteMany({ where: { balanceId: { in: cuentas.map((c) => c.id) } } });
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ userId: { in: ids } }, { targetId: { in: [...ids, ...oids] } }] } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

// ---------- HTTP
export interface Respuesta { status: number; json: Record<string, unknown> | null; text: string; headers: Headers }
export async function api(ruta: string, cookie: string | null, init: { method?: string; body?: unknown } = {}): Promise<Respuesta> {
  const res = await fetch(BASE + ruta, {
    method: init.method ?? 'GET',
    redirect: 'manual',
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text); } catch { /* no es JSON */ }
  return { status: res.status, json, text, headers: res.headers };
}

// ---------- navegador (Firefox headless + WebDriver BiDi)
interface WsLike { on(evento: string, fn: (dato: Buffer) => void): void; send(texto: string): void; close(): void }
type Resultado = Record<string, unknown> & { context?: string; data?: string; type?: string; result?: { value?: unknown }; exceptionDetails?: { text?: string } };

export interface Navegador {
  /** Evalúa una función escrita como texto ("() => document.title") en la página */
  js<T = unknown>(fn: string): Promise<T>;
  /** Repite hasta que devuelva algo verdadero (o se acaben los intentos, cada 250 ms) */
  hasta<T = unknown>(fn: string, intentos?: number): Promise<T | null>;
  ir(ruta: string): Promise<void>;
  cookie(token: string): Promise<void>;
  tamano(ancho: number, alto: number): Promise<void>;
  foto(nombre: string): Promise<void>;
  tecla(codigo: string): Promise<void>;
  /** Escribe en un input o textarea controlado por React */
  escribir(id: string, valor: string): Promise<void>;
  sinScrollHorizontal(): Promise<boolean>;
  cerrar(): Promise<void>;
}

const QUIETO = `() => { const s = document.createElement('style'); s.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'; document.head.appendChild(s); }`;

/** Abre Firefox sin ventana. `carpeta` recibe las capturas (y un perfil temporal que se borra al cerrar). */
export async function abrirNavegador(carpeta: string, puerto = 9333): Promise<Navegador> {
  const perfil = `${carpeta}/ffprofile-bidi`;
  mkdirSync(perfil, { recursive: true });
  // Poca memoria: un solo proceso de contenido, sin caché en memoria ni restauración de sesión (la prueba corre junto al servidor)
  writeFileSync(`${perfil}/user.js`, [
    'user_pref("dom.ipc.processCount", 1);',
    'user_pref("fission.autostart", false);',
    'user_pref("browser.cache.memory.enable", false);',
    'user_pref("browser.sessionstore.max_tabs_undo", 0);',
    'user_pref("browser.tabs.unloadOnLowMemory", true);',
    'user_pref("media.memory_cache_max_size", 8192);',
  ].join('\n'));
  const firefox: ChildProcess = spawn('firefox', ['--headless', '--no-remote', '-profile', perfil, '--remote-debugging-port', String(puerto)], { stdio: 'ignore' });
  // Node 20 no trae WebSocket: se usa el que empaqueta Next
  const WebSocket = createRequire(import.meta.url)('next/dist/compiled/ws') as new (url: string) => WsLike;

  let ws: WsLike | null = null;
  for (let i = 0; i < 40 && !ws; i++) {
    ws = await new Promise<WsLike | null>((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${puerto}/session`);
      socket.on('open', () => resolve(socket));
      socket.on('error', () => resolve(null));
    });
    if (!ws) await espera(500);
  }
  if (!ws) { firefox.kill('SIGKILL'); throw new Error('Firefox no abrió el puerto de BiDi'); }
  const conexion = ws;

  let siguiente = 1;
  const pendientes = new Map<number, { ok: (v: Resultado) => void; err: (e: Error) => void }>();
  conexion.on('message', (crudo) => {
    const mensaje = JSON.parse(crudo.toString()) as { id?: number; type?: string; error?: string; message?: string; result?: Resultado };
    const pendiente = mensaje.id !== undefined ? pendientes.get(mensaje.id) : undefined;
    if (!pendiente || mensaje.id === undefined) return;
    pendientes.delete(mensaje.id);
    if (mensaje.type === 'error') pendiente.err(new Error(`${mensaje.error}: ${mensaje.message}`));
    else pendiente.ok(mensaje.result ?? {});
  });
  const cmd = (method: string, params: Record<string, unknown> = {}) => new Promise<Resultado>((ok, err) => {
    const id = siguiente++;
    pendientes.set(id, { ok, err });
    conexion.send(JSON.stringify({ id, method, params }));
  });

  await cmd('session.new', { capabilities: {} });
  const context = (await cmd('browsingContext.create', { type: 'tab' })).context as string;
  await cmd('browsingContext.activate', { context });

  const js = async <T = unknown>(fn: string): Promise<T> => {
    const r = await cmd('script.evaluate', { expression: `(${fn})()`, target: { context }, awaitPromise: true, resultOwnership: 'none' });
    if (r.type === 'exception') throw new Error(r.exceptionDetails?.text ?? 'Error en la página');
    return r.result?.value as T;
  };
  const navegador: Navegador = {
    js,
    async hasta<T = unknown>(fn: string, intentos = 60) {
      for (let i = 0; i < intentos; i++) {
        const valor = await js<T>(fn);
        if (valor) return valor;
        await espera(250);
      }
      return null;
    },
    async ir(ruta) {
      await cmd('browsingContext.navigate', { context, url: BASE + ruta, wait: 'complete' });
      await js(QUIETO);
    },
    async cookie(token) {
      await cmd('storage.setCookie', { cookie: { name: 'next-auth.session-token', value: { type: 'string', value: token }, domain: new URL(BASE).hostname, path: '/', httpOnly: true } });
    },
    async tamano(ancho, alto) {
      await cmd('browsingContext.setViewport', { context, viewport: { width: ancho, height: alto } });
    },
    async foto(nombre) {
      const r = await cmd('browsingContext.captureScreenshot', { context });
      writeFileSync(`${carpeta}/${nombre}.png`, Buffer.from(r.data ?? '', 'base64'));
    },
    async tecla(codigo) {
      await cmd('input.performActions', { context, actions: [{ type: 'key', id: 'teclado', actions: [{ type: 'keyDown', value: codigo }, { type: 'keyUp', value: codigo }] }] });
    },
    async escribir(id, valor) {
      await js(`() => { const el = document.getElementById(${JSON.stringify(id)}); const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(valor)}); el.dispatchEvent(new Event('input', { bubbles: true })); }`);
    },
    sinScrollHorizontal: () => js<boolean>(`() => document.documentElement.scrollWidth <= window.innerWidth + 1`),
    async cerrar() {
      await cmd('browsingContext.close', { context }).catch(() => undefined);
      conexion.close();
      firefox.kill('SIGKILL');
      rmSync(perfil, { recursive: true, force: true });
    },
  };

  // El recorrido guiado del panel tapa la pantalla: se marca como visto antes de entrar
  await navegador.ir('/robots.txt');
  await js(`() => { localStorage.setItem('electroweb_onboarding_done', '1'); }`);
  return navegador;
}

export const TECLA = { ENTER: '\uE007', ESCAPE: '\uE00C', TAB: '\uE004' } as const;
