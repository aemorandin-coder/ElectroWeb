// C-243 · `npm run check:marca`: ningún color fuera del kit de marca (lib/marca.ts, PLAN.md §1.0).
// Busca en app/, components/ y lib/ (y los estilos) lo que salió del kit: el azul noche, el cian, los fondos más oscuros
// que el azul del logo y los contenedores ámbar. Dice el archivo y la línea, y termina con error si encuentra algo.
// Quedan fuera el arte de redes (ElectroStudio y Chispa), que tiene su propia paleta, y la barra de las estrellas.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = process.cwd();
const CARPETAS = ['app', 'components', 'lib'];
const EXTENSIONES = /\.(tsx?|css)$/;

/** Arte de redes con su propia paleta, el kit mismo (que nombra lo que salió) y la excepción con nombre de PLAN.md §1.1 */
const PERMITIDOS: Array<{ archivo: RegExp; regla?: string }> = [
  { archivo: /^lib\/studio\// },
  { archivo: /^lib\/marca\.ts$/ },
  { archivo: /^app\/globals\.css$/, regla: 'hex' }, // el comentario que dice qué salió
  { archivo: /^components\/reviews\/ReviewStats\.tsx$/, regla: 'ambar' }, // la barra de las estrellas
];

const REGLAS: Array<{ id: string; rx: RegExp; por: string }> = [
  { id: 'noche', rx: /\b[a-z-]*-brand-950\b|--color-brand-950/, por: 'el azul noche salió del kit: usa brand-700 (el azul oscuro del logo)' },
  { id: 'cian', rx: /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|shadow|decoration|divide|placeholder|caret)-accent\b|--color-accent\b/, por: 'el cian salió del kit: blanco sobre el azul, o brand-300 en un rótulo' },
  { id: 'hex', rx: /#0a1530\b|#22d3ee\b/i, por: 'el azul noche (#0a1530) y el cian (#22d3ee) salieron del kit' },
  { id: 'oscuro', rx: /\b(?:bg|from|to|via|border)-brand-(?:800|900)\b/, por: 'ningún fondo más oscuro que brand-700, el azul oscuro del logo' },
  { id: 'ambar', rx: /\b(?:bg|border|from|to|via)-(?:warning|amber|yellow|orange)(?:-[a-z0-9]+)?(?:\/\d+)?\b/, por: 'ningún contenedor ámbar (PLAN.md §1.1): lo que hay que hacer va en el azul claro con la placa azul' },
  { id: 'otros', rx: /\b(?:bg|text|border|from|to|via)-(?:indigo|violet|purple|pink|fuchsia|cyan|sky|teal)-\d{2,3}\b/, por: 'colores que no son de la marca' },
  {
    id: 'verde-claro-texto',
    rx: /(?:\bbg-success(?![-\/])[^"'`]*\btext-white\b|\btext-white\b[^"'`]*\bbg-success(?![-\/])|\bhover:bg-success(?![-\/])[^"'`]*\btext-white\b|\btext-white\b[^"'`]*\bhover:bg-success(?![-\/])|\bbg-success\s+bg-success\b)/,
    por: 'nunca texto blanco sobre verde claro bg-success: usa bg-success-strong (contraste >= 4.5:1)',
  },
  {
    id: 'ui-obsoleto',
    rx: /@\/components\/ui\/(?:Button|Modal|Badge|StatusBadge|ErrorState|LoadingSpinner)\b/,
    por: 'componente legacy eliminado en Kit 2.0: usa lib/admin-ui.ts o ModalDialog',
  },
  {
    id: 'micro-texto',
    rx: /\btext-\[(?:[7-9]|10)px\]/,
    por: 'tipografía menor a 11 px prohibida (PLAN.md §1.2): mínimo text-xs (12 px) o 11 px en casos puntuales',
  },
  {
    id: 'peso-excesivo',
    rx: /\bfont-(?:black|extrabold)\b/,
    por: 'font-black y font-extrabold prohibidos (PLAN.md §1.2): usa font-bold como máximo',
  },
];

function archivos(dir: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    if (nombre === 'node_modules' || nombre.startsWith('.next')) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (EXTENSIONES.test(nombre)) salida.push(ruta);
  }
  return salida;
}

const hallazgos: string[] = [];
for (const carpeta of CARPETAS) {
  for (const ruta of archivos(join(RAIZ, carpeta))) {
    const rel = relative(RAIZ, ruta).split('\\').join('/');
    const lineas = readFileSync(ruta, 'utf8').split('\n');
    lineas.forEach((linea, i) => {
      for (const regla of REGLAS) {
        if (!regla.rx.test(linea)) continue;
        if (PERMITIDOS.some((p) => p.archivo.test(rel) && (!p.regla || p.regla === regla.id))) continue;
        hallazgos.push(`${rel}:${i + 1}  ${regla.por}\n    ${linea.trim().slice(0, 160)}`);
      }
    });
  }
}

if (hallazgos.length) {
  console.error(`Fuera del kit de marca (lib/marca.ts, /admin/marca): ${hallazgos.length}\n`);
  console.error(hallazgos.join('\n'));
  process.exit(1);
}
console.log('Todo dentro del kit de marca.');
