// Descargas de ElectroStudio (C-112): imagen, video y archivos juntos.
import { DURATION } from '@/lib/studio/engine';
import { FORMATS, slugify, type StudioFlyerData } from '@/lib/studio/schema';

/** Nombre del archivo descargado, sin la extensión: "audifonos-electroshop-historia" */
export const fileBase = (f: StudioFlyerData) =>
  `${slugify(f.name || f.products[0]?.title || 'historia')}-electroshop-${f.format === 'story' ? 'historia' : `post-${FORMATS[f.format].short.replace(':', 'x')}`}`;

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function canvasBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(resolve, type);
    } catch {
      resolve(null);
    }
  });
}

/** Comparte el archivo con las apps del teléfono (Instagram incluido). false si el navegador no puede. */
export async function shareFile(blob: Blob, filename: string, text: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type });
  if (!navigator.canShare?.({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], text: text || undefined });
  } catch {
    // Cancelado por la persona: no es un error
  }
  return true;
}

export function pickVideoType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const opts = ['video/mp4;codecs=avc1.42E01F', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  return (
    opts.find((t) => {
      try {
        return MediaRecorder.isTypeSupported(t);
      } catch {
        return false;
      }
    }) ?? null
  );
}

/** Graba el canvas mientras `drawAt(t)` pinta cada instante de la animación (7 s, 30 cuadros por segundo). */
export async function recordCanvas(canvas: HTMLCanvasElement, type: string, drawAt: (t: number) => void): Promise<Blob> {
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 10_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const done = new Promise<void>((resolve) => (rec.onstop = () => resolve()));
  drawAt(0);
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const t = Math.min(DURATION, (now - t0) / 1000);
      drawAt(t);
      if (t < DURATION) requestAnimationFrame(step);
      else setTimeout(resolve, 200);
    };
    requestAnimationFrame(step);
  });
  rec.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());
  return new Blob(chunks, { type: type.split(';')[0] });
}

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
