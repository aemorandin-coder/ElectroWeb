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

/**
 * C-268: la grabación se cortó. Con la pestaña oculta el navegador deja de pintar cuadros (requestAnimationFrame se
 * detiene), y antes el video quedaba "grabando" para siempre, con los botones de descarga apagados hasta recargar.
 */
export class GrabacionInterrumpida extends Error {
  constructor(public motivo: 'pestana' | 'grabador' | 'tiempo') {
    super(
      motivo === 'pestana'
        ? 'Se detuvo el video porque saliste de la pestaña. Vuelve a descargarlo y quédate aquí hasta que termine.'
        : motivo === 'tiempo'
          ? 'El video tardó demasiado en grabarse. Vuelve a intentarlo.'
          : 'El navegador no pudo grabar el video. Prueba otra vez, o descarga la imagen.',
    );
    this.name = 'GrabacionInterrumpida';
  }
}

/**
 * Graba el canvas mientras `drawAt(t)` pinta cada instante de la animación (`duracion` segundos, 30 cuadros por segundo).
 * Lanza GrabacionInterrumpida si la pestaña se oculta, si el grabador falla o si los cuadros dejan de llegar.
 */
export async function recordCanvas(canvas: HTMLCanvasElement, type: string, drawAt: (t: number) => void, duracion: number): Promise<Blob> {
  if (document.visibilityState === 'hidden') throw new GrabacionInterrumpida('pestana');
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 10_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const done = new Promise<void>((resolve) => (rec.onstop = () => resolve()));
  let terminar: () => void = () => {};
  const fin = new Promise<void>((resolve) => (terminar = resolve));
  let corte: unknown = null;
  const cortar = (motivo: unknown) => {
    corte ??= motivo;
    terminar();
  };
  rec.onerror = () => cortar(new GrabacionInterrumpida('grabador'));
  const alOcultar = () => {
    if (document.visibilityState === 'hidden') cortar(new GrabacionInterrumpida('pestana'));
  };
  document.addEventListener('visibilitychange', alOcultar);
  // Vigía: si los cuadros dejan de llegar (equipo trabado), se corta en vez de quedar grabando para siempre
  const vigia = setTimeout(() => cortar(new GrabacionInterrumpida('tiempo')), (duracion + 8) * 1000);
  try {
    drawAt(0);
    rec.start(250);
    const t0 = performance.now();
    const step = (now: number) => {
      if (corte) return;
      const t = Math.min(duracion, (now - t0) / 1000);
      try {
        drawAt(t);
      } catch (error) {
        cortar(error);
        return;
      }
      if (t < duracion) requestAnimationFrame(step);
      else setTimeout(terminar, 200);
    };
    requestAnimationFrame(step);
    await fin;
  } finally {
    clearTimeout(vigia);
    document.removeEventListener('visibilitychange', alOcultar);
    if (rec.state !== 'inactive') {
      rec.stop();
      await done;
    }
    stream.getTracks().forEach((t) => t.stop());
  }
  if (corte) throw corte;
  return new Blob(chunks, { type: type.split(';')[0] });
}
