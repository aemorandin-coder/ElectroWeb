// Chrome sin ventana para las pruebas (C-268/C-270): una instancia aparte, con su propio perfil, manejada por CDP. No toca
// el Chrome del equipo. El de la máquina de Andrés es Flatpak (`flatpak run com.google.Chrome`): el perfil va en el home,
// porque Flatpak no ve /tmp. Con CHROME=/ruta/al/chrome se usa otro.
//
// Ojo: en una pestaña oculta requestAnimationFrame da 0 cuadros (OPERACION.md §3): una prueba de animación o de video
// usa una sola pestaña, la activa.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { BASE, espera } from './lib';

interface WsLike { on(e: string, fn: (d: Buffer) => void): void; send(s: string): void; close(): void }

export interface Chrome {
  js<T = unknown>(expr: string): Promise<T>;
  hasta(expr: string, intentos?: number): Promise<boolean>;
  ir(ruta: string): Promise<void>;
  recargar(): Promise<void>;
  tamano(ancho: number, alto: number, telefono?: boolean): Promise<void>;
  foto(ruta: string): Promise<void>;
  /** Arrastra con el ratón de (x0, y0) a (x1, y1), en px de la ventana, en `pasos` movimientos */
  arrastrar(x0: number, y0: number, x1: number, y1: number, pasos?: number): Promise<void>;
  clic(x: number, y: number, veces?: number): Promise<void>;
  tecla(key: string, opciones?: { shift?: boolean; ctrl?: boolean }): Promise<void>;
  escribir(texto: string): Promise<void>;
  /** Dos dedos que se separan (o se juntan) alrededor de (x, y): de `d0` a `d1` px entre ellos */
  pellizcar(x: number, y: number, d0: number, d1: number, pasos?: number): Promise<void>;
  /** El centro de un elemento en la ventana */
  centro(selector: string): Promise<{ x: number; y: number } | null>;
  antesDeCargar(fuente: string): Promise<void>;
  cookie(token: string): Promise<void>;
  errores: string[];
  cerrar(): Promise<void>;
}

const TECLAS: Record<string, { code: string; keyCode: number }> = {
  ArrowLeft: { code: 'ArrowLeft', keyCode: 37 }, ArrowRight: { code: 'ArrowRight', keyCode: 39 }, ArrowUp: { code: 'ArrowUp', keyCode: 38 },
  ArrowDown: { code: 'ArrowDown', keyCode: 40 }, Delete: { code: 'Delete', keyCode: 46 }, Escape: { code: 'Escape', keyCode: 27 },
  Enter: { code: 'Enter', keyCode: 13 }, d: { code: 'KeyD', keyCode: 68 }, z: { code: 'KeyZ', keyCode: 90 },
  Backspace: { code: 'Backspace', keyCode: 8 }, Tab: { code: 'Tab', keyCode: 9 },
};

export async function abrirChrome(perfil: string, puerto = 9460): Promise<Chrome> {
  rmSync(perfil, { recursive: true, force: true });
  mkdirSync(perfil, { recursive: true });
  const bin = process.env.CHROME;
  const args = ['--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', 'about:blank'];
  const proc = bin ? spawn(bin, args, { stdio: 'ignore' }) : spawn('flatpak', ['run', 'com.google.Chrome', ...args], { stdio: 'ignore' });
  let url = '';
  for (let i = 0; i < 40 && !url; i++) {
    try {
      url = ((await (await fetch(`http://127.0.0.1:${puerto}/json/version`)).json()) as { webSocketDebuggerUrl: string }).webSocketDebuggerUrl;
    } catch {
      await espera(500);
    }
  }
  if (!url) throw new Error('Chrome no abrió');
  const WebSocket = createRequire(import.meta.url)('next/dist/compiled/ws') as new (u: string) => WsLike;
  const ws = await new Promise<WsLike>((ok, err) => { const s = new WebSocket(url); s.on('open', () => ok(s)); s.on('error', () => err(new Error('ws'))); });
  let n = 1;
  const pend = new Map<number, (v: Record<string, unknown>) => void>();
  let cargas = 0;
  const errores: string[] = [];
  ws.on('message', (d) => {
    const m = JSON.parse(d.toString()) as { id?: number; result?: Record<string, unknown>; error?: { message: string }; method?: string; params?: Record<string, unknown> };
    if (m.id && pend.has(m.id)) { pend.get(m.id)?.(m.error ? { __error: m.error.message } : m.result ?? {}); pend.delete(m.id); return; }
    if (m.method === 'Page.loadEventFired') cargas++;
    // Un aviso del navegador ("¿Salir del sitio?" con cambios sin guardar) traba la recarga: se acepta solo
    if (m.method === 'Page.javascriptDialogOpening') void cmd('Page.handleJavaScriptDialog', { accept: true }, (m as { sessionId?: string }).sessionId);
    if (m.method === 'Runtime.exceptionThrown') {
      const det = (m.params as { exceptionDetails?: { exception?: { description?: string }; text?: string } }).exceptionDetails;
      errores.push(det?.exception?.description ?? det?.text ?? 'error');
    }
  });
  const cmd = (method: string, params: Record<string, unknown> = {}, sessionId?: string) => new Promise<Record<string, unknown>>((ok) => {
    const id = n++;
    pend.set(id, ok);
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const { targetId } = (await cmd('Target.createTarget', { url: 'about:blank' })) as { targetId: string };
  const { sessionId } = (await cmd('Target.attachToTarget', { targetId, flatten: true })) as { sessionId: string };
  const s = (method: string, params: Record<string, unknown> = {}) => cmd(method, params, sessionId);
  await s('Page.enable');
  await s('Runtime.enable');
  await cmd('Target.activateTarget', { targetId });
  const raton = (type: string, x: number, y: number, buttons: number, clickCount = 1) => s('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount, pointerType: 'mouse' });
  const c: Chrome = {
    errores,
    async js<T = unknown>(expr: string) {
      const r = (await s('Runtime.evaluate', { expression: `(${expr})()`, awaitPromise: true, returnByValue: true })) as { result?: { value?: T }; exceptionDetails?: { text: string; exception?: { description?: string } } };
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result?.value as T;
    },
    async hasta(expr, intentos = 80) {
      for (let i = 0; i < intentos; i++) {
        if (await c.js<boolean>(expr).catch(() => false)) return true;
        await espera(250);
      }
      return false;
    },
    async ir(ruta) {
      const antes = cargas;
      await s('Page.navigate', { url: BASE + ruta });
      for (let i = 0; i < 80 && cargas === antes; i++) await espera(250);
    },
    async recargar() {
      const antes = cargas;
      await s('Page.reload', {});
      for (let i = 0; i < 80 && cargas === antes; i++) await espera(250);
    },
    async tamano(ancho, alto, telefono = false) {
      await s('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: telefono ? 2 : 1, mobile: telefono });
      await s('Emulation.setTouchEmulationEnabled', { enabled: telefono, maxTouchPoints: telefono ? 5 : 0 });
    },
    async foto(ruta) {
      const r = (await s('Page.captureScreenshot', { format: 'png' })) as { data: string };
      writeFileSync(ruta, Buffer.from(r.data, 'base64'));
    },
    async arrastrar(x0, y0, x1, y1, pasos = 10) {
      await raton('mouseMoved', x0, y0, 0);
      await raton('mousePressed', x0, y0, 1);
      for (let i = 1; i <= pasos; i++) await raton('mouseMoved', x0 + ((x1 - x0) * i) / pasos, y0 + ((y1 - y0) * i) / pasos, 1);
      await raton('mouseReleased', x1, y1, 0);
      await espera(150);
    },
    async clic(x, y, veces = 1) {
      for (let i = 1; i <= veces; i++) {
        await raton('mousePressed', x, y, 1, i);
        await raton('mouseReleased', x, y, 0, i);
      }
      await espera(120);
    },
    async tecla(key, o = {}) {
      const t = TECLAS[key] ?? { code: key, keyCode: key.toUpperCase().charCodeAt(0) };
      const modifiers = (o.shift ? 8 : 0) | (o.ctrl ? 2 : 0);
      await s('Input.dispatchKeyEvent', { type: 'keyDown', key, code: t.code, windowsVirtualKeyCode: t.keyCode, modifiers });
      await s('Input.dispatchKeyEvent', { type: 'keyUp', key, code: t.code, windowsVirtualKeyCode: t.keyCode, modifiers });
      await espera(80);
    },
    async pellizcar(x, y, d0, d1, pasos = 8) {
      const puntos = (d: number) => [{ x: x - d / 2, y, id: 1 }, { x: x + d / 2, y, id: 2 }];
      await s('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: puntos(d0) });
      for (let i = 1; i <= pasos; i++) await s('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: puntos(d0 + ((d1 - d0) * i) / pasos) });
      await s('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await espera(150);
    },
    async escribir(texto) {
      await s('Input.insertText', { text: texto });
      await espera(80);
    },
    async centro(selector) {
      return c.js<{ x: number; y: number } | null>(`() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }`);
    },
    async antesDeCargar(fuente) {
      await s('Page.addScriptToEvaluateOnNewDocument', { source: `(${fuente})()` });
    },
    async cookie(token) {
      await cmd('Storage.setCookies', { cookies: [{ name: 'next-auth.session-token', value: token, domain: new URL(BASE).hostname, path: '/', httpOnly: true }] });
    },
    async cerrar() {
      ws.close();
      proc.kill('SIGKILL');
      await espera(300);
      rmSync(perfil, { recursive: true, force: true });
    },
  };
  return c;
}
