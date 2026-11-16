// Descargas de ElectroStudio (C-112): el nombre del archivo y las fotos que se suben.
// C-263: bajar, compartir y grabar están en lib/studio/exportar.ts (los usa también el flyer del sorteo de la tienda).
// C-268: el editor los importa de ahí directamente. Antes pasaban por aquí (re-exportados y con un envoltorio de la
// grabación), y una pestaña con código de dos versiones dio "(0 , p.recordCanvas) is not a function".
import { canvasBlob } from '@/lib/studio/exportar';
import { FORMATS, slugify, type StudioFlyerData } from '@/lib/studio/schema';

/** Nombre del archivo descargado, sin la extensión: "audifonos-electroshop-historia" */
export const fileBase = (f: StudioFlyerData) =>
  `${slugify(f.name || f.products[0]?.title || 'historia')}-electroshop-${f.format === 'story' ? 'historia' : `post-${FORMATS[f.format].short.replace(':', 'x')}`}`;

/** Foto lista para subir: las muy grandes se achican a 1600 px (el servidor acepta hasta 5 MB) */
export async function prepareUpload(file: File): Promise<Blob> {
  if (file.size <= 4.5 * 1024 * 1024 && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bitmap.width * scale);
  c.height = Math.round(bitmap.height * scale);
  c.getContext('2d')?.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  const png = await canvasBlob(c, 'image/png');
  if (png && png.size <= 4.5 * 1024 * 1024) return png;
  return (await canvasBlob(c, 'image/jpeg')) ?? file;
}

/** Sube una foto o logo del estudio a la tienda y devuelve su ruta ("/api/uploads/studio-…") */
export async function uploadStudioImage(file: File): Promise<string> {
  const blob = await prepareUpload(file);
  const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
  const fd = new FormData();
  fd.append('file', new File([blob], `studio.${ext}`, { type: blob.type || 'image/png' }));
  fd.append('type', 'studio');
  const res = await fetch('/api/upload/settings', { method: 'POST', body: fd });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) throw new Error(data?.error || 'No se pudo subir la imagen');
  return data.url;
}
