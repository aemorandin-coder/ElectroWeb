// Las imágenes de Chispa de la web (C-296): las 5 poses de ElectroStudio, del popup navideño y de los correos, con y sin
// el gorro de Santa. Antes (C-193, C-195) salían con Chrome desde un guion que no quedó guardado; este las rearma igual,
// con sharp (el de la web), y se comprobó contra las de chispa-3: con el chispa.js de entonces solo cambian los bordes
// suavizados y la «ES» de la placa (la fuente).
//
//   node chispa/herramientas/poses-web.mjs <carpeta de ElectroStudio> [carpeta de los correos]
//   node chispa/herramientas/poses-web.mjs public/images/studio/chispa-31 public/images/correo
//
// ElectroStudio: 600 × 735 (arriba queda lugar para el gorro). Correos: la mitad, 300 × 367, con el nombre chispa-<pose>.
// Un dibujo nuevo va en otra carpeta de ElectroStudio (lib/studio/chispa.ts explica por qué: la caché de 30 días).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const aqui = dirname(fileURLToPath(import.meta.url));
const sharp = createRequire(join(aqui, '..', '..', 'package.json'))('sharp');
const [destino, correos] = process.argv.slice(2);
if (!destino) {
  console.error('Uso: node chispa/herramientas/poses-web.mjs <carpeta de ElectroStudio> [carpeta de los correos]');
  process.exit(1);
}

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(aqui, '..', 'mascota', 'chispa.js'), 'utf8'), ctx);
const chispa = ctx.window.chispa;

// La cara de cada pose: la misma de las imágenes de C-193 y C-195 (se midió contra ellas)
const POSES = {
  saluda: { pose: 'saluda', ojos: 'feliz', boca: 'feliz', cejas: 'arriba' },
  senala: { pose: 'señala', ojos: 'abiertos', boca: 'e', cejas: 'arriba' },
  pulgar: { pose: 'pulgar', ojos: 'guino', boca: 'feliz', cejas: 'normal' },
  celebra: { pose: 'celebra', ojos: 'feliz', boca: 'feliz', cejas: 'arriba' },
  explica: { pose: 'explica', ojos: 'abiertos', boca: 'sonrisa', cejas: 'normal' },
};

// El gorro «clásico» de C-186 (components/navidad/GorroSanta.tsx, cuadrícula de 24) con el trazo de Chispa (6) y el rojo
// navideño (--color-navidad). Va fijo en el lienzo, sobre la cabeza, igual en todas las poses.
const GORRO = `<g transform="translate(191.67 79.67) rotate(-14) scale(6.79) translate(-10.5 -18.25)" stroke="#111317" stroke-width="${(6 / 6.79).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round">
  <path fill="#e0263a" d="M4.2 16.5C4.6 10.3 7.7 5.6 12.4 4.7c4.2-.8 7.6 1.5 8.3 5.8l-3.5.5c-.5 1.7-.7 3.6-.7 5.5z"/>
  <rect fill="#fff" x="2" y="16" width="17" height="4.5" rx="2.25"/>
  <circle fill="#fff" cx="20.2" cy="11.1" r="2.4"/>
</g>`;

// Chispa en el lienzo: 70 unidades más arriba para el gorro, 400 × 490 → 600 × 735
const lienzo = (cara, gorro) => {
  const svg = chispa(cara).replace('viewBox="0 0 400 420"', 'viewBox="0 -70 400 490" width="600" height="735"');
  return gorro ? svg.replace(/<\/svg>\s*$/, `${GORRO}</svg>`) : svg;
};

mkdirSync(destino, { recursive: true });
if (correos) mkdirSync(correos, { recursive: true });
for (const [nombre, cara] of Object.entries(POSES)) {
  for (const gorro of [false, true]) {
    const archivo = `${nombre}${gorro ? '-gorro' : ''}.png`;
    // PNG con paleta (calidad 80: lo que pesaban las de C-195, unos 16 KB cada una; Chispa es de colores planos)
    const PNG = { palette: true, quality: 80, compressionLevel: 9, effort: 10 };
    const grande = await sharp(Buffer.from(lienzo(cara, gorro))).png().toBuffer();
    writeFileSync(join(destino, archivo), await sharp(grande).png(PNG).toBuffer());
    if (correos) writeFileSync(join(correos, `chispa-${archivo}`), await sharp(grande).resize(300, 367).png(PNG).toBuffer());
    console.log(archivo);
  }
}
