// Graba una capa transparente (PNG con alfa por cuadro) para poner textos encima de un video real (por ejemplo, los clips de Google Flow).
// Uso (desde chispa/): node herramientas/capa.mjs videos/andres-chispa-capa.html salida/capa 24
// Después: ffmpeg -i clip.mp4 -framerate 24 -i salida/capa/%04d.png -filter_complex "[0:v][1:v]overlay" ... (ver conocimiento/05).
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
const [,, pagina, dir, fps = '24'] = process.argv;
fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
await p.goto('file://' + path.resolve(pagina)); await p.evaluate(() => window.ready);
const n = Math.round(await p.evaluate(() => window.DURATION) * +fps);
for (let i = 0; i < n; i++) { await p.evaluate(t => window.seek(t), i / +fps); await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.png`, omitBackground: true }); }
await b.close(); console.log(n, 'cuadros en', dir);
