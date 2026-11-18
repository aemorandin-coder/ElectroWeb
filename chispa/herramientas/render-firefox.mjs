// Graba una página animada cuadro a cuadro (30 fps) con Firefox y ffmpeg, para las PC sin Chrome (C-300). Hace lo mismo que
// render.mjs, con Firefox sin ventana manejado por WebDriver BiDi (sin Playwright). Necesita Node 22 o más (WebSocket).
// Uso (desde chispa/): PAGE=videos/ficha.html node herramientas/render-firefox.mjs video salida/mudo.mp4
//                     PAGE=videos/ficha.html node herramientas/render-firefox.mjs preview salida/cuadros "" "1.5,8,19"
// VIEWPORT=960x540 para videos horizontales. FIREFOX=/ruta/al/firefox si no está en el PATH.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const mode = process.argv[2] || 'preview';
const out = process.argv[3] || 'out';
const query = process.argv[4] || '';
if (!process.env.PAGE) { console.error('Falta PAGE. Ejemplo (desde chispa/): PAGE=videos/ficha.html node herramientas/render-firefox.mjs preview salida/cuadros "" "1,5,9"'); process.exit(1); }
const [VW, VH] = (process.env.VIEWPORT || '540x960').split('x').map(Number);
const puerto = 9400 + Math.floor(Math.random() * 500);
const perfil = mkdtempSync(path.join(tmpdir(), 'chispa-ff-'));
writeFileSync(path.join(perfil, 'user.js'), 'user_pref("gfx.font_rendering.cleartype_params.rendering_mode", 5);\n');
const ff = spawn(process.env.FIREFOX || 'firefox', ['--headless', '--no-remote', '--remote-debugging-port', String(puerto), '--profile', perfil], { stdio: 'ignore' });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

let ws;
for (let i = 0; i < 40 && !ws; i++) {
  await espera(250);
  try { ws = await new Promise((ok, ko) => { const s = new WebSocket(`ws://127.0.0.1:${puerto}/session`); s.onopen = () => ok(s); s.onerror = ko; }); } catch { ws = null; }
}
if (!ws) { ff.kill(); console.error('Firefox no abrió el puerto de control'); process.exit(1); }
let n = 0; const pend = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { const { ok, ko } = pend.get(d.id); pend.delete(d.id); d.type === 'error' ? ko(new Error(`${d.error}: ${d.message}`)) : ok(d.result); } };
const bidi = (method, params = {}) => new Promise((ok, ko) => { const id = ++n; pend.set(id, { ok, ko }); ws.send(JSON.stringify({ id, method, params })); });

try {
  await bidi('session.new', { capabilities: {} });
  const { context } = await bidi('browsingContext.create', { type: 'tab' });
  await bidi('browsingContext.navigate', { context, url: 'file://' + path.resolve(process.env.PAGE) + query, wait: 'complete' });
  await bidi('browsingContext.setViewport', { context, viewport: { width: VW, height: VH }, devicePixelRatio: 2 });
  const js = async (expr) => {
    const r = await bidi('script.evaluate', { expression: expr, target: { context }, awaitPromise: true });
    if (r.type === 'exception') throw new Error('PAGE ERROR ' + (r.exceptionDetails?.text || ''));
    return r.result;
  };
  await js('window.ready');
  const ir = (t) => js(`(async () => { window.seek(${t}); if (window.settle) await window.settle(); })()`);
  const foto = async (formato) => Buffer.from((await bidi('browsingContext.captureScreenshot', { context, origin: 'viewport', ...(formato ? { format: formato } : {}) })).data, 'base64');

  if (mode === 'preview') {
    mkdirSync(out, { recursive: true });
    const times = (process.argv[5] || '0.5,2,4,6,8,10,12,14,16,18,20').split(',').map(Number);
    for (const t of times) { await ir(t); writeFileSync(`${out}/t_${t.toFixed(2)}.png`, await foto()); }
  } else {
    const fps = 30, dur = (await js('window.DURATION')).value, total = Math.round(dur * fps);
    const ffm = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < total; i++) {
      await ir(i / fps);
      const buf = await foto({ type: 'image/jpeg', quality: 0.96 });
      if (!ffm.stdin.write(buf)) await new Promise((r) => ffm.stdin.once('drain', r));
      if (i % 90 === 0) console.log(`frame ${i}/${total} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ffm.stdin.end();
    await new Promise((r) => ffm.on('close', r));
  }
} finally {
  ws.close(); ff.kill(); rmSync(perfil, { recursive: true, force: true });
}
