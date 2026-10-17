// Leer del disco una imagen subida a la tienda (C-178, C-182). Solo en el servidor.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { siteUrl } from '@/lib/seo';

const SUBIDAS = path.join(process.cwd(), 'public', 'uploads');

/** Una imagen de la tienda desde el disco. Solo de public/uploads: nunca se pide nada a otro sitio */
export async function leerSubida(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  let ruta = url;
  if (/^https?:\/\//i.test(ruta)) {
    const propia = siteUrl();
    if (!ruta.startsWith(`${propia}/`)) return null;
    ruta = ruta.slice(propia.length);
  }
  const relativa = ruta.split('?')[0].replace(/^\/(api\/)?uploads\//, '');
  if (relativa === ruta.split('?')[0]) return null;
  const archivo = path.resolve(SUBIDAS, decodeURIComponent(relativa));
  if (!archivo.startsWith(SUBIDAS + path.sep)) return null;
  return readFile(archivo).catch(() => null);
}
