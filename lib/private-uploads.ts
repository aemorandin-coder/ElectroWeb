// Archivos que no deben quedar en public/ (C-72): Next sirve sin permiso todo lo que haya en public/ al compilar.
import path from 'path';

/** Documentos de verificación de empresa (acta constitutiva, RIF). */
export const PRIVATE_DOCUMENTS_DIR = path.join(process.cwd(), 'private-uploads', 'documents');

/** Nombre de un documento: acta-<userId>-<timestamp>-<aleatorio>.<ext>. Devuelve el userId dueño. */
export function documentOwner(name: string): string | null {
  return /^(?:acta|rif)-([a-z0-9]+)-\d+-[a-z0-9]+\.(?:pdf|png|jpg)$/i.exec(name)?.[1] ?? null;
}

/** true si `target` queda dentro de `base` (sin salir con ".." ni rutas absolutas). */
export function isInside(base: string, target: string): boolean {
  const relative = path.relative(base, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}
