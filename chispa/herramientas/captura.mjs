// Foto de una página a un tamaño fijo: portadas, miniaturas, banner, destacadas, hojas de poses.
// Uso (desde chispa/): node herramientas/captura.mjs piezas/banner-youtube.html salida/banner.png 2560 1440 [escala] [transparente]
//   escala: 1 (por defecto) o 2.  transparente: "t" para fondo transparente (PNG con alfa, para referencias de Flow).
//   Se pueden pasar parámetros: "piezas/destacada.html?pose=saluda&icono=camion"
import { chromium } from 'playwright-core';
import path from 'node:path';
const [,, pagina, salida, w, h, escala = '1', transp = ''] = process.argv;
const [archivo, qs = ''] = pagina.split('?');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +escala });
p.on('pageerror', e => console.error('Error en la página:', e.message));
await p.goto('file://' + path.resolve(archivo) + (qs ? '?' + qs : '')); await p.waitForTimeout(500);
await p.screenshot({ path: salida, omitBackground: transp === 't' }); await b.close();
console.log(salida);
