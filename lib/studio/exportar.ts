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

/* ── C-286: el video cuadro por cuadro ────────────────────────────────────────────────────────────────────────── */
// El equipo, 17/11: "los videos, así sean de 15 s, siempre quedan cortados en 3 s en el teléfono, y en algunos casos en la
// PC". MediaRecorder (`recordCanvas`) graba en tiempo real y Chrome entrega un MP4 fragmentado: la cabecera dice 0 s y el
// video va en trozos de ~3,3 s (de cuadro clave a cuadro clave). La galería del teléfono, y algunos reproductores de la PC,
// se quedan con el primer trozo. Ahora el video se arma cuadro por cuadro con WebCodecs y sale un MP4 normal (la cabecera
// adelante, con su duración completa), en Full HD y a 60 cuadros, sin saltarse cuadros aunque el equipo sea lento.
// Donde el navegador no puede (sin WebCodecs o sin H.264), se graba como antes.

export interface VideoGrabado {
  blob: Blob;
  extension: 'mp4' | 'webm';
  fps: number;
  ancho: number;
  alto: number;
  segundos: number;
  /** false: lo grabó MediaRecorder en tiempo real (el navegador no tiene WebCodecs) */
  cuadroPorCuadro: boolean;
}

/** Cede el turno sin el freno de setTimeout en una pestaña oculta (allí espera 1 s como mínimo) */
function ceder(): Promise<void> {
  return new Promise((resolve) => {
    const canal = new MessageChannel();
    canal.port1.onmessage = () => resolve();
    canal.port2.postMessage(null);
  });
}

/** El H.264 que este navegador codifica para ese tamaño: High, Main o Baseline, nivel 4.2 (Full HD a 60) o 5.2 */
async function configuracionH264(ancho: number, alto: number, fps: number): Promise<VideoEncoderConfig | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined' || !window.isSecureContext) return null;
  if (ancho % 2 !== 0 || alto % 2 !== 0) return null;
  const bitrate = fps >= 50 ? 12_000_000 : 8_000_000;
  for (const codec of ['avc1.64002A', 'avc1.4D002A', 'avc1.42002A', 'avc1.640034']) {
    const config: VideoEncoderConfig = { codec, width: ancho, height: alto, bitrate, framerate: fps, avc: { format: 'avc' }, latencyMode: 'quality' };
    try {
      if ((await VideoEncoder.isConfigSupported(config)).supported) return config;
    } catch {
      // Ese perfil no: se prueba el siguiente
    }
  }
  return null;
}

/**
 * Arma el video de `duracion` segundos: `drawAt(t)` pinta el instante `t` en el canvas. Cuadro por cuadro (WebCodecs y un
 * MP4 normal) si el navegador puede; si no, lo graba MediaRecorder en tiempo real como antes. `onProgreso` recibe de 0 a 1.
 */
export async function grabarVideo(
  canvas: HTMLCanvasElement,
  drawAt: (t: number) => void,
  duracion: number,
  opciones: { fps?: number; onProgreso?: (fraccion: number) => void } = {},
): Promise<VideoGrabado> {
  const fps = opciones.fps ?? 60;
  const ancho = canvas.width;
  const alto = canvas.height;
  const config = await configuracionH264(ancho, alto, fps);
  if (!config) {
    const tipo = pickVideoType();
    if (!tipo || typeof canvas.captureStream !== 'function') throw new Error('Este navegador no puede grabar video. Prueba con Chrome.');
    const blob = await recordCanvas(canvas, tipo, drawAt, duracion);
    return { blob, extension: tipo.startsWith('video/mp4') ? 'mp4' : 'webm', fps: 30, ancho, alto, segundos: duracion, cuadroPorCuadro: false };
  }

  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
  const destino = new ArrayBufferTarget();
  // fastStart: la cabecera (con la duración) va adelante, como la quieren los teléfonos, Instagram y WhatsApp
  const muxer = new Muxer({ target: destino, video: { codec: 'avc', width: ancho, height: alto, frameRate: fps }, fastStart: 'in-memory' });
  let falla: unknown = null;
  const codificador = new VideoEncoder({
    output: (trozo, meta) => muxer.addVideoChunk(trozo, meta),
    error: (e) => { falla = e; },
  });
  codificador.configure(config);
  const cuadros = Math.max(1, Math.round(duracion * fps));
  const unCuadro = 1_000_000 / fps;
  try {
    for (let i = 0; i < cuadros; i++) {
      if (falla) throw falla;
      drawAt(Math.min(duracion, i / fps));
      const cuadro = new VideoFrame(canvas, { timestamp: Math.round(i * unCuadro), duration: Math.round(unCuadro) });
      // Un cuadro clave por segundo: se puede adelantar el video y ningún reproductor se queda en un trozo
      codificador.encode(cuadro, { keyFrame: i % fps === 0 });
      cuadro.close();
      while (codificador.encodeQueueSize > 4) await ceder();
      if (i % 15 === 0) {
        opciones.onProgreso?.(i / cuadros);
        await ceder();
      }
    }
    await codificador.flush();
    if (falla) throw falla;
    muxer.finalize();
  } catch (error) {
    if (codificador.state !== 'closed') codificador.close();
    throw error instanceof Error && error.name === 'SecurityError'
      ? new Error('Una imagen de la historia no deja grabar el video. Cámbiala o descarga la imagen.')
      : new GrabacionInterrumpida('grabador');
  }
  codificador.close();
  opciones.onProgreso?.(1);
  return { blob: new Blob([destino.buffer], { type: 'video/mp4' }), extension: 'mp4', fps, ancho, alto, segundos: cuadros / fps, cuadroPorCuadro: true };
}
