// Abre una página de video en Firefox y evalúa una expresión (para revisar la línea de tiempo: claves de la cámara, momentos).
// Uso (desde chispa/): node herramientas/evaluar.mjs videos/mi-video.html "JSON.stringify(T)"
import { spawn } from 'node:child_process'; import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import path from 'node:path';
const [pagina, expr] = process.argv.slice(2); const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const perfil = mkdtempSync(path.join(tmpdir(), 'ev-')); const puerto = 9600 + Math.floor(Math.random() * 200);
const ff = spawn('firefox', ['--headless', '--no-remote', '--remote-debugging-port', String(puerto), '--profile', perfil], { stdio: 'ignore' });
let ws; for (let i = 0; i < 40 && !ws; i++) { await espera(250); try { ws = await new Promise((ok, ko) => { const s = new WebSocket(`ws://127.0.0.1:${puerto}/session`); s.onopen = () => ok(s); s.onerror = ko; }); } catch { ws = null; } }
let n = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const bidi = (method, params = {}) => new Promise((ok) => { const id = ++n; pend.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
await bidi('session.new', { capabilities: {} }); const { result: { context } } = await bidi('browsingContext.create', { type: 'tab' });
await bidi('browsingContext.navigate', { context, url: 'file://' + path.resolve(pagina), wait: 'complete' });
await bidi('script.evaluate', { expression: 'window.ready', target: { context }, awaitPromise: true });
const r = await bidi('script.evaluate', { expression: expr, target: { context }, awaitPromise: true });
console.log(JSON.stringify(r.result?.result ?? r, null, 0).slice(0, 4000)); ws.close(); ff.kill();
