// Subida de fotos de producto desde el navegador: el formulario (ImagePanel) y la carga masiva (C-118).

/** El servidor acepta hasta 5 MB; se deja margen */
const MAX_UPLOAD = 4.5 * 1024 * 1024;

function canvasToBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => c.toBlob(resolve, type, quality));
}

/**
 * C-117: el PNG que sale de "copiar sujeto" en el teléfono suele pasar de 5 MB. Se achica a 2000 px
 * sin perder la transparencia (PNG o, si sigue pesado, WebP, que también la guarda).
 */
async function prepareProductPhoto(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bitmap.width * scale);
  c.height = Math.round(bitmap.height * scale);
  c.getContext('2d')?.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  for (const [type, q] of [['image/png', undefined], ['image/webp', 0.92], ['image/webp', 0.8]] as const) {
    const blob = await canvasToBlob(c, type, q);
    if (blob && blob.size <= MAX_UPLOAD) {
      return new File([blob], file.name.replace(/\.\w+$/, blob.type === 'image/webp' ? '.webp' : '.png'), { type: blob.type });
    }
  }
  throw new Error(`"${file.name}" pesa demasiado aun achicada`);
}

export interface UploadedPhoto {
  url: string;
  /** Lleva la cinta ES */
  badged: boolean;
  /** El servidor la armó con fondo blanco y aire alrededor (con cinta o sin ella) */
  framed: boolean;
}

/**
 * Sube una foto de producto. Con `badge`, una transparente vuelve con fondo blanco y la cinta "ES" (C-117);
 * un usado va sin ella (C-119) pero con el mismo marco (C-161). Si el servidor pide esperar (429, 20 fotos por minuto), espera y reintenta.
 */
export async function uploadProductPhoto(file: File, { badge, onWait }: { badge: boolean; onWait?: (seconds: number) => void }): Promise<UploadedPhoto> {
  const prepared = await prepareProductPhoto(file);
  for (let attempt = 0; attempt < 4; attempt++) {
    const fd = new FormData();
    fd.append('file', prepared);
    fd.append('purpose', badge ? 'product' : 'product-used');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (res.status === 429 && onWait) {
      const seconds = Math.min(70, Math.max(5, Number(res.headers.get('X-RateLimit-Reset')) || 30));
      onWait(seconds);
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      continue;
    }
    const data = (await res.json().catch(() => null)) as { url?: string; error?: string; badged?: boolean; framed?: boolean } | null;
    if (!res.ok || !data?.url) throw new Error(data?.error || `No se pudo subir "${file.name}"`);
    return { url: data.url, badged: data.badged === true, framed: data.framed === true };
  }
  throw new Error(`No se pudo subir "${file.name}": el servidor sigue ocupado`);
}
