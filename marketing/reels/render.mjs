import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const mode = process.argv[2] || 'preview';           // preview | video
const out = process.argv[3] || 'out';
const query = process.argv[4] || '';
const exe = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
const browser = await chromium.launch({ executablePath: exe, args: ['--font-render-hinting=none', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
page.on('pageerror', e => console.error('PAGE ERROR', e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console', m.text()); });
await page.goto('file://' + path.resolve(process.env.PAGE || 'sin-miedo.html') + query);
await page.evaluate(() => window.ready);

if (mode === 'preview') {
  fs.mkdirSync(out, { recursive: true });
  const times = (process.argv[5] || '0.5,1.6,2.4,3.1,4.2,5.6,6.2,7.9,9.6,10.2,11.4,12.8,15.6,16.4,17.4,18.6,19.5,20.5,22.0,24.0').split(',').map(Number);
  for (const t of times) {
    await page.evaluate(async t => { window.seek(t); if (window.settle) await window.settle(); }, t);
    await page.screenshot({ path: `${out}/t_${t.toFixed(2)}.png` });
  }
} else {
  const fps = 30, dur = await page.evaluate(() => window.DURATION);
  const n = Math.round(dur * fps);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate(async t => { window.seek(t); if (window.settle) await window.settle(); }, i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 90 === 0) console.log(`frame ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await browser.close();
