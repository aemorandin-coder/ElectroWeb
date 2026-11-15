// C-254: la foto de la entrega, lista para publicarse. Solo en el servidor (usa sharp y el disco).
// Una foto de teléfono trae dentro dónde y cuándo se tomó (EXIF, a veces con el GPS de la casa de la persona): antes de
// publicarla se vuelve a guardar sin nada de eso, derecha (la rotación del EXIF se aplica) y de hasta 1600 px.
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { leerSubida } from '@/lib/subidas';

/** Las que ya pasaron por aquí empiezan así: no se vuelven a procesar */
const PREFIJO = 'sorteo-entrega-';
const LADO = 1600;

/** La foto sin datos de dónde se tomó, como una subida nueva. null si no existe o no es una imagen */
export async function prepararFotoEntrega(url: string): Promise<string | null> {
  if (url.startsWith(`/api/uploads/${PREFIJO}`)) return (await leerSubida(url)) ? url : null;
  const original = await leerSubida(url);
  if (!original) return null;
  let limpia: Buffer;
  try {
    // sharp no copia los metadatos salvo que se le pida: el EXIF (y el GPS) se queda afuera
    limpia = await sharp(original, { failOn: 'error' }).rotate().resize({ width: LADO, height: LADO, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  } catch {
    return null;
  }
  const carpeta = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(carpeta, { recursive: true });
  const nombre = `${PREFIJO}${Date.now()}-${randomBytes(3).toString('hex')}.jpg`;
  await writeFile(path.join(carpeta, nombre), limpia);
  return `/api/uploads/${nombre}`;
}

/**
 * Borra del disco una foto de entrega ya publicada (al quitarla de la tienda o al cambiarla por otra): si la persona cambió
 * de idea, su foto no queda a la vista de quien guardó la dirección. Solo las de este archivo (`sorteo-entrega-…`).
 */
export async function borrarFotoEntrega(url: string | null | undefined): Promise<void> {
  const nombre = /^\/api\/uploads\/(sorteo-entrega-\d+-[a-f0-9]{6}\.jpg)$/.exec(url ?? '')?.[1];
  if (!nombre) return;
  await unlink(path.join(process.cwd(), 'public', 'uploads', nombre)).catch(() => undefined);
}
