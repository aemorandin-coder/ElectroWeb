/**
 * C-72: mueve los documentos de verificación de empresa (acta, RIF) de public/uploads/documents a
 * private-uploads/documents. Las URLs guardadas (/api/uploads/documents/...) no cambian: la ruta los busca
 * primero en la carpeta privada y solo los muestra a administradores y al dueño.
 *
 * Mientras estén en public/, Next los sirve sin permiso en /uploads/documents/... después de cada build.
 *
 * Uso:  npx tsx scripts/move-business-documents.ts          (solo muestra qué movería)
 *       npx tsx scripts/move-business-documents.ts --apply  (los mueve)
 */
import { existsSync } from 'fs';
import { mkdir, readdir, rename } from 'fs/promises';
import path from 'path';

const from = path.join(process.cwd(), 'public', 'uploads', 'documents');
const to = path.join(process.cwd(), 'private-uploads', 'documents');
const apply = process.argv.includes('--apply');

(async () => {
  if (!existsSync(from)) {
    console.log('No hay public/uploads/documents: nada que mover.');
    return;
  }
  const files = (await readdir(from, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name);
  console.log(`${files.length} documento(s) en public/uploads/documents${apply ? '' : ' (modo prueba: agrega --apply para moverlos)'}`);
  if (!apply || files.length === 0) return;
  await mkdir(to, { recursive: true });
  let moved = 0;
  for (const name of files) {
    const target = path.join(to, name);
    if (existsSync(target)) {
      console.log(`  ya existe en privado, se deja: ${name}`);
      continue;
    }
    await rename(path.join(from, name), target);
    moved++;
  }
  console.log(`Movidos: ${moved}. Recuerda recompilar (npm run build) para que dejen de servirse desde public/.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
