// Archivos que no deben quedar en public/ (C-72): Next sirve sin permiso todo lo que haya en public/ al compilar.
import path from 'path';

/** Documentos de verificación de empresa (acta constitutiva, RIF). */
export const PRIVATE_DOCUMENTS_DIR = path.join(process.cwd(), 'private-uploads', 'documents');

/** Nombre de un documento: acta-<userId>-<timestamp>-<aleatorio>.<ext>. Devuelve el userId dueño. */
export function documentOwner(name: string): string | null {
  return /^(?:acta|rif)-([a-z0-9]+)-\d+-[a-z0-9]+\.(?:pdf|png|jpg)$/i.exec(name)?.[1] ?? null;
}

/** Fotos de las solicitudes de garantía (C-122): de la falla o del daño, a veces con datos de la casa del cliente. */
export const WARRANTY_PHOTOS_DIR = path.join(process.cwd(), 'private-uploads', 'warranty');

/** G-76: documentos privados de Contabilidad (facturas de compra, PDFs fiscales SENIAT/imprenta, planillas y comprobantes). */
export const CONTABILIDAD_FILES_DIR = path.join(process.cwd(), 'private-uploads', 'contabilidad');

/** Valida nombre seguro de archivo privado contable (contab-<tipo>-<ts>-<hex>.<ext>). */
export function contabilidadFileName(name: string): boolean {
  return /^contab-[a-z0-9_-]+-\d+-[a-f0-9]+\.(?:pdf|png|jpg|jpeg|webp)$/i.test(name);
}

/** Nombre de una foto de garantía: garantia-<userId>-<timestamp>-<aleatorio>.jpg. Devuelve el userId dueño. */
export function warrantyPhotoOwner(name: string): string | null {
  return /^garantia-([a-z0-9]+)-\d+-[a-f0-9]+\.jpg$/.exec(name)?.[1] ?? null;
}

/** true si `target` queda dentro de `base` (sin salir con ".." ni rutas absolutas). */
export function isInside(base: string, target: string): boolean {
  const relative = path.relative(base, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}
