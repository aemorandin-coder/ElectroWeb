// Las descargas de ElectroStudio (C-112) que también usa la tienda: la imagen y el video de un canvas, compartirlos con
// las apps del teléfono y bajarlos. C-263: salieron de app/admin/(dashboard)/studio/_components/exporters.ts para que el
// flyer del sorteo de cada cliente use lo mismo sin traer el editor ni el motor. Solo navegador.

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

/** Si el navegador puede compartir este archivo con las apps del teléfono (Instagram, WhatsApp, TikTok…) */
export function puedeCompartirArchivo(file: File): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function' && Boolean(navigator.canShare?.({ files: [file] }));
}

/** Comparte el archivo con las apps del teléfono (Instagram incluido). false si el navegador no puede. */
export async function shareFile(blob: Blob, filename: string, text: string): Promise<boolean> {
  const file = new File([blob], filename, { type: blob.type });
  if (!puedeCompartirArchivo(file)) return false;
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

/** Graba el canvas mientras `drawAt(t)` pinta cada instante de la animación (`duracion` segundos, 30 cuadros por segundo). */
export async function recordCanvas(canvas: HTMLCanvasElement, type: string, drawAt: (t: number) => void, duracion: number): Promise<Blob> {
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
      const t = Math.min(duracion, (now - t0) / 1000);
      drawAt(t);
      if (t < duracion) requestAnimationFrame(step);
      else setTimeout(resolve, 200);
    };
    requestAnimationFrame(step);
  });
  rec.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());
  return new Blob(chunks, { type: type.split(';')[0] });
}
