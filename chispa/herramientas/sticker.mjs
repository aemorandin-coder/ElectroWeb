// Graba un sticker animado de WhatsApp: WebP de 512 x 512 en bucle, con fondo transparente. Ver conocimiento/06-piezas-y-medidas.md.
// Uso (desde chispa/): node herramientas/sticker.mjs "piezas/sticker.html?s=gracias" salida/stickers/gracias.webp [fps]
// Saca también el .gif (para las apps de stickers del teléfono).
// La página expone window.ready, window.DURATION (un ciclo: el último cuadro empalma con el primero) y window.seek(t).
// WhatsApp pide menos de 500 KB y 10 s como máximo: si se pasa del peso, baja la calidad y vuelve a comprimir.
import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const [,, pagina, salida = 'salida/sticker.webp', fps = '15'] = process.argv;
if (!pagina) { console.error('Falta la página. Ejemplo (desde chispa/): node herramientas/sticker.mjs piezas/sticker.html salida/chispa-hola.webp'); process.exit(1); }
const [archivo, qs = ''] = pagina.split('?');
const dir = salida.replace(/\.webp$/, '') + '-cuadros';
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });

const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--font-render-hinting=none', '--disable-gpu'] });
const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.error('Error en la página:', e.message));
await p.goto('file://' + path.resolve(archivo) + (qs ? '?' + qs : ''));
await p.evaluate(() => window.ready);
const dur = await p.evaluate(() => window.DURATION), n = Math.round(dur * fps);
if (dur > 10) { console.error(`El ciclo dura ${dur} s y WhatsApp acepta 10 s como máximo.`); process.exit(1); }
for (let i = 0; i < n; i++) {
  await p.evaluate(t => window.seek(t), i / fps);
  await p.screenshot({ path: `${dir}/${String(i).padStart(3, '0')}.png`, omitBackground: true });
}
await b.close();

for (const calidad of [80, 70, 60, 50, 40]) {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-framerate', fps, '-i', `${dir}/%03d.png`, '-c:v', 'libwebp_anim', '-lossless', '0',
    '-quality', String(calidad), '-compression_level', '4', '-pix_fmt', 'yuva420p', '-loop', '0', salida], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  const kb = fs.statSync(salida).size / 1024;
  console.log(`${salida}: ${n} cuadros a ${fps} fps (${dur} s), calidad ${calidad}, ${kb.toFixed(0)} KB`);
  if (kb < 490) break;
  if (calidad === 40) console.error('Sigue pesando más de 500 KB: acorta el ciclo o baja los fps.');
}
// el mismo sticker en GIF con fondo transparente: es lo que reciben las apps de stickers del teléfono (Sticker.ly, Sticker Maker)
const gif = salida.replace(/\.webp$/, '.gif');
spawnSync('ffmpeg', ['-y', '-v', 'error', '-framerate', fps, '-i', `${dir}/%03d.png`, '-filter_complex',
  '[0:v]split[a][b];[a]palettegen=reserve_transparent=1[p];[b][p]paletteuse=alpha_threshold=128', '-loop', '0', gif], { stdio: 'inherit' });
console.log(gif);
