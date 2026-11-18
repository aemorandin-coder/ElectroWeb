// Capturas de la tienda para los reels, como las hacen los videos de producto profesionales (técnicas de video-shotcraft
// y autozoom-demo-skill, ver la skill videos-con-capturas): Firefox sin ventana por WebDriver BiDi, a 390 px de ancho.
// - la página entera a 3x, sin lo fijo (encabezado, barra de abajo, botón de WhatsApp), que se captura aparte para ir encima;
// - cada tarjeta importante, recortada a 4x, para levantarla nítida del teléfono con el spotlight;
// - layout.json: el alto de cada página, sus capas fijas y la caja de cada tarjeta y de cada punto, en px de la página.
// Uso (con la tienda de prueba en el puerto 3300, ver sembrar-sorteo.mjs):
//   node chispa/herramientas/tienda/capturar-tienda.mjs <salida> <id de Chispa Prueba> [paginas]
//   CORREO=<html del correo de activación> para la página "correo".
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const RAIZ = path.resolve(new URL('.', import.meta.url).pathname, '../../..');
const require = createRequire(path.join(RAIZ, 'package.json'));
const { encode } = require('next-auth/jwt');
const BASE = process.env.TIENDA || 'http://localhost:3300';
const [salida, userId, cuales] = process.argv.slice(2);
if (!salida || !userId) { console.error('Uso: node capturar-tienda.mjs <salida> <id de Chispa Prueba> [paginas]'); process.exit(1); }
mkdirSync(salida, { recursive: true });
const secreto = readFileSync(path.join(RAIZ, '.env'), 'utf8').match(/^NEXTAUTH_SECRET=["']?([^"'\n]+)/m)[1];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const LAYOUT = existsSync(salida + '/layout.json') ? JSON.parse(readFileSync(salida + '/layout.json', 'utf8')) : {};

const perfil = path.join(salida, '.perfil');
rmSync(perfil, { recursive: true, force: true }); mkdirSync(perfil, { recursive: true });
writeFileSync(perfil + '/user.js', 'user_pref("ui.prefersReducedMotion", 1);\nuser_pref("intl.accept_languages", "es-VE, es");\n');
const puerto = 9500 + Math.floor(Math.random() * 300);
const ff = spawn(process.env.FIREFOX || 'firefox', ['--headless', '--no-remote', '--remote-debugging-port', String(puerto), '--profile', perfil], { stdio: 'ignore' });
let ws;
for (let i = 0; i < 40 && !ws; i++) { await espera(250); try { ws = await new Promise((ok, ko) => { const s = new WebSocket(`ws://127.0.0.1:${puerto}/session`); s.onopen = () => ok(s); s.onerror = ko; }); } catch { ws = null; } }
let n = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { const { ok, ko } = pend.get(d.id); pend.delete(d.id); d.type === 'error' ? ko(new Error(d.error + ': ' + d.message)) : ok(d.result); } };
const bidi = (method, params = {}) => new Promise((ok, ko) => { const id = ++n; pend.set(id, { ok, ko }); ws.send(JSON.stringify({ id, method, params })); });
await bidi('session.new', { capabilities: {} });
const { context } = await bidi('browsingContext.create', { type: 'tab' });
const js = async (expr, owner = 'none') => {
  const r = await bidi('script.evaluate', { expression: expr, target: { context }, awaitPromise: true, resultOwnership: owner });
  if (r.type === 'exception') throw new Error(r.exceptionDetails?.text || 'exception');
  return r.result;
};
const dpr = (d) => bidi('browsingContext.setViewport', { context, viewport: { width: 390, height: 844 }, devicePixelRatio: d });
// sin barra de desplazamiento: la página a sus 390 px, como en un teléfono
const ir = async (url) => { await bidi('browsingContext.navigate', { context, url, wait: 'complete' }); await js(`document.documentElement.style.scrollbarWidth = 'none'`); await espera(1800); };
await ir(BASE + '/'); await dpr(3);
await js(`localStorage.setItem('electroweb_guias','todo')`);

async function sesion(on) {
  if (!on) { await bidi('storage.deleteCookies', { filter: { name: 'next-auth.session-token' } }); return; }
  const token = await encode({ token: { id: userId, name: 'Chispa Prueba', email: 'chispa.prueba@example.com', role: 'USER', userType: 'customer', emailVerified: true, sessionVersion: 0 }, secret: secreto, maxAge: 3600 });
  await bidi('storage.setCookie', { cookie: { name: 'next-auth.session-token', value: { type: 'string', value: token }, domain: new URL(BASE).hostname, path: '/', httpOnly: true, secure: false, sameSite: 'lax' } });
}
const guardar = (nombre, data) => writeFileSync(`${salida}/${nombre}.png`, Buffer.from(data, 'base64'));

// Lo fijo de la página que se ve (no un contenedor vacío y transparente): lo marca y devuelve su caja
const FIJOS = `(() => {
  const out = [];
  document.querySelectorAll('body *').forEach((e) => {
    const cs = getComputedStyle(e);
    if ((cs.position === 'fixed' || cs.position === 'sticky') && cs.visibility !== 'hidden' && cs.display !== 'none') {
      const b = e.getBoundingClientRect(); if (b.width < 20 || b.height < 20) return;
      if (out.some((o) => o.el.contains(e))) return;
      if (!e.textContent.trim() && !e.querySelector('img,svg')) return;
      if (b.height > innerHeight * .8 && cs.backgroundColor === 'rgba(0, 0, 0, 0)') return;
      out.push({ el: e, caja: [b.left, b.top, b.width, b.height].map(Math.round), pos: cs.position });
    }
  });
  window.__fijos = out.map((o) => o.el);
  return JSON.stringify(out.map((o) => ({ caja: o.caja, pos: o.pos })));
})()`;
// La tarjeta que contiene un texto: sube hasta el primer contenedor pintado (fondo, borde o sombra), redondeado o a lo
// ancho, más angosto que la página y no más alto que la pantalla
const TARJETA = (texto) => `(() => {
  const t = ${JSON.stringify(texto)};
  const el = [...document.querySelectorAll('body *')].filter((e) => e.childElementCount < 6 && e.textContent.replace(/\\s+/g, ' ').trim().startsWith(t)).sort((a, b) => a.textContent.length - b.textContent.length)[0];
  if (!el) return null;
  let c = el;
  while (c && c !== document.body) {
    const cs = getComputedStyle(c), b = c.getBoundingClientRect();
    const pinta = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderTopWidth !== '0px' || cs.boxShadow !== 'none' || cs.backgroundImage !== 'none';
    if (b.width >= 220 && b.height >= 60 && b.height <= 900 && b.width <= innerWidth - 4 && pinta && (parseFloat(cs.borderTopLeftRadius) >= 8 || b.width >= innerWidth - 40)) break;
    c = c.parentElement;
  }
  return c === document.body ? null : c;
})()`;
const PUNTO = (texto) => `(() => { const t = ${JSON.stringify(texto)}; return [...document.querySelectorAll('body *')].filter((e) => e.textContent.replace(/\\s+/g, ' ').includes(t)).sort((a, b) => a.textContent.length - b.textContent.length)[0] || null; })()`;
const cajaDoc = (selExpr) => `(() => { const e = ${selExpr}; if (!e) return null; const b = e.getBoundingClientRect(); return JSON.stringify([b.left + scrollX, b.top + scrollY, b.width, b.height].map(Math.round)); })()`;

/** Una página: lo fijo aparte, la página entera sin lo fijo, sus tarjetas a 4x y los puntos */
async function pagina(nombre, url, { conSesion = false, tarjetas = {}, puntos = {} } = {}) {
  await sesion(conSesion); await dpr(3); await ir(url);
  await js(`window.scrollTo({ top: 0, behavior: 'instant' })`); await espera(400);
  const fijos = JSON.parse((await js(FIJOS)).value);
  for (let i = 0; i < fijos.length; i++) {
    const nodo = await js(`window.__fijos[${i}]`, 'root');
    const { data } = await bidi('browsingContext.captureScreenshot', { context, origin: 'viewport', clip: { type: 'element', element: { sharedId: nodo.sharedId } } });
    guardar(`${nombre}-fijo${i}`, data);
  }
  await js(`window.__fijos.forEach((e) => { e.style.visibility = 'hidden'; })`);
  const pageH = (await js('document.documentElement.scrollHeight')).value;
  const { data } = await bidi('browsingContext.captureScreenshot', { context, origin: 'document' });
  guardar(`${nombre}-pagina`, data);
  const lay = { url: url.startsWith('file:') ? 'correo' : url.replace(BASE, ''), pageH, fijos, tarjetas: {}, puntos: {} };
  for (const [k, texto] of Object.entries(puntos)) { const v = (await js(cajaDoc(PUNTO(texto)))).value; lay.puntos[k] = v ? JSON.parse(v) : null; }
  for (const [k, texto] of Object.entries(tarjetas)) {
    const caja = (await js(cajaDoc(TARJETA(texto)))).value;
    if (!caja) { console.log('no encontré la tarjeta', nombre, k); continue; }
    lay.tarjetas[k] = JSON.parse(caja);
    await dpr(4);
    await js(`(() => { const e = ${TARJETA(texto)}; e.scrollIntoView({ block: 'center', behavior: 'instant' }); })()`); await espera(500);
    const nodo = await js(TARJETA(texto), 'root');
    const r = await bidi('browsingContext.captureScreenshot', { context, origin: 'viewport', clip: { type: 'element', element: { sharedId: nodo.sharedId } } });
    guardar(`${nombre}-${k}`, r.data);
    await dpr(3);
  }
  await js(`window.__fijos.forEach((e) => { e.style.visibility = ''; })`);
  LAYOUT[nombre] = lay;
  writeFileSync(salida + '/layout.json', JSON.stringify(LAYOUT, null, 1));
  console.log('listo', nombre, 'alto', pageH, 'fijos', fijos.length, 'tarjetas', Object.keys(lay.tarjetas).join(','));
}

// Las páginas del reel "Más boletos para la PS4" (guiones/sorteo-amigos-y-compras.md)
const PAGINAS = {
  sorteo: () => pagina('sorteo', BASE + '/sorteo', {
    tarjetas: { estrella: 'Producto estrella de la semana', camino1: 'Camino 1', camino2: 'Camino 2', camino3: 'Camino 3' },
    puntos: { remanufacturada: 'Remanufacturada', b2: '$5', b5: '$50', b10: '$100', mas10: 'boletos por cada uno', resena: '1 boleto por cada reseña' },
  }),
  conCuenta: () => pagina('conCuenta', BASE + '/sorteo', { conSesion: true, tarjetas: { amigos: 'Invitando amigos' }, puntos: { faltaActivar: 'Falta activar', recordar: 'Recordarles por WhatsApp', carlos: 'Carlos M.' } }),
  activado: () => pagina('activado', BASE + '/sorteo', { conSesion: true, tarjetas: { amigos: 'Invitando amigos' }, puntos: { carlos: 'Carlos M.', boletos: '1 de 3 boletos' } }),
  correo: () => pagina('correo', 'file://' + path.resolve(process.env.CORREO || ''), { tarjetas: { boton: 'Activar mi cuenta' }, puntos: { activar: 'Activar mi cuenta', invito: 'Te invitó un amigo al sorteo' } }),
  ficha: () => pagina('ficha', BASE + '/productos/mini-dc-ups-de-20000-mah', { tarjetas: { estrellaFicha: 'Producto estrella del sorteo' }, puntos: { quince: '15 boletos' } }),
  carrito: async () => {
    await sesion(false);
    for (const slug of ['audifonos-inalambricos-galaxy-buds4-pro-clase-b', 'bombillo-led-recargable-de-emergencia-30-w-run']) {
      await ir(BASE + '/productos/' + slug);
      await js(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /agregar al carrito/i.test(x.textContent)); if (b) b.click(); })()`);
      await espera(1200);
    }
    await pagina('carrito', BASE + '/carrito', { tarjetas: { boletos: 'Esta compra te da' }, puntos: { faltan: 'Te faltan' } });
  },
};

try {
  for (const c of (cuales || Object.keys(PAGINAS).join(',')).split(',')) {
    try { await PAGINAS[c](); } catch (e) { console.log('falló', c, e.message); }
  }
} finally { ws.close(); ff.kill(); rmSync(perfil, { recursive: true, force: true }); }
