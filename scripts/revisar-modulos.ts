// C-168: revisa que cada módulo que cambió en esta rama haya subido su versión en lib/modulos.ts.
//
//   npm run check:modulos              compara contra main
//   npm run check:modulos -- <rama>    compara contra otra rama o commit
//
// "Cambió" = algún archivo de los `archivos` del módulo es distinto del punto en que la rama se separó de la base (incluye lo que
// todavía no está en un commit). "Subió" = la versión del módulo es mayor que la que tiene la base. lib/modulos.ts no cuenta
// como cambio de ningún módulo. Sale con código 1 si algún módulo cambió y no subió.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compararVersiones, MODULOS, versionDe, type ModuloPanel } from '../lib/modulos';

const base = process.argv[2] || 'main';
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

async function modulosDeLaBase(puntoComun: string): Promise<ModuloPanel[] | null> {
  let texto: string;
  try {
    texto = git('show', `${puntoComun}:lib/modulos.ts`);
  } catch {
    return null; // la base todavía no tiene el registro (la tarea que lo creó)
  }
  const carpeta = mkdtempSync(join(tmpdir(), 'modulos-base-'));
  const archivo = join(carpeta, 'modulos-base.ts');
  writeFileSync(archivo, texto);
  const cargado = (await import(pathToFileURL(archivo).href)) as { MODULOS: ModuloPanel[] };
  return cargado.MODULOS;
}

async function main() {
  const puntoComun = git('merge-base', base, 'HEAD');
  const cambiados = new Set([
    ...git('diff', '--name-only', puntoComun).split('\n'),
    ...git('ls-files', '--others', '--exclude-standard').split('\n'),
  ].filter((f) => f && f !== 'lib/modulos.ts'));

  const anteriores = await modulosDeLaBase(puntoComun);
  if (!anteriores) {
    console.log(`La base (${base}) no tiene lib/modulos.ts: nada que comparar.`);
    return;
  }
  const versionAnterior = new Map(anteriores.map((m) => [m.id, versionDe(m)]));

  const fallos: string[] = [];
  const sinModulo: string[] = [];
  const tocados = new Map<string, string[]>();

  for (const archivo of cambiados) {
    const duenos = MODULOS.filter((m) => m.archivos.some((prefijo) => archivo.startsWith(prefijo)));
    if (duenos.length === 0) sinModulo.push(archivo);
    for (const m of duenos) tocados.set(m.id, [...(tocados.get(m.id) ?? []), archivo]);
  }

  for (const modulo of MODULOS) {
    const archivos = tocados.get(modulo.id);
    if (!archivos) continue;
    const antes = versionAnterior.get(modulo.id);
    const ahora = versionDe(modulo);
    if (antes && compararVersiones(ahora, antes) <= 0) {
      fallos.push(`${modulo.nombre} (${modulo.id}) sigue en ${ahora}: cambiaron ${archivos.length} archivo(s), p. ej. ${archivos[0]}`);
    } else {
      console.log(`ok  ${modulo.nombre}: ${antes ?? 'nuevo'} -> ${ahora}`);
    }
  }

  // Un módulo nuevo en el registro no tiene versión anterior: nada que exigir. Sí se avisa de archivos sin dueño.
  if (sinModulo.length > 0) {
    const interesantes = sinModulo.filter((f) => /^(app|components|lib|contexts|prisma|proxy\.ts|next\.config\.js)/.test(f));
    if (interesantes.length > 0) {
      console.log(`\nSin módulo (revisa si deben pertenecer a uno en lib/modulos.ts): ${interesantes.length}`);
      for (const f of interesantes.slice(0, 15)) console.log(`  ${f}`);
      if (interesantes.length > 15) console.log(`  ... y ${interesantes.length - 15} más`);
    }
  }

  if (fallos.length > 0) {
    console.error('\nFALTA SUBIR LA VERSION DE:');
    for (const f of fallos) console.error(`  ${f}`);
    console.error('\nAgrega una entrada al frente del `historial` de cada módulo en lib/modulos.ts.');
    process.exit(1);
  }
  console.log('\nTodos los módulos que cambiaron subieron su versión.');
}

void main();
