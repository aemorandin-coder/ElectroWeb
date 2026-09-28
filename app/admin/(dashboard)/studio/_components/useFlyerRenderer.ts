'use client';

import { useCallback, useEffect, useRef } from 'react';
import { H, StudioImages, W, createRenderer, flyerImageSources, loadStudioFonts, type ProductSrc, type StudioRenderer } from '@/lib/studio/engine';
import type { StudioBrand, StudioFlyerData } from '@/lib/studio/schema';
import { canvasBlob } from './exporters';

const storeSrc: ProductSrc = (p) => p.imageUrl;
/** Ancho de las miniaturas de la lista (el alto sale del formato) */
const THUMB_W = 240;

/**
 * Dibujante aparte de la vista previa (C-116): miniaturas de la lista y descargas desde ella.
 * Un solo lienzo fuera de pantalla y una cola, para que dos dibujos no se pisen.
 */
export function useFlyerRenderer(brand: StudioBrand) {
  const engine = useRef<{ canvas: HTMLCanvasElement; images: StudioImages; renderer: StudioRenderer } | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const brandRef = useRef(brand);
  useEffect(() => {
    brandRef.current = brand;
  });

  const run = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(fn, fn);
    queue.current = next.catch(() => undefined);
    return next;
  }, []);

  /** Dibuja la historia completa, como sale al descargar. Devuelve el lienzo y lo que no cupo. */
  const drawFull = useCallback(async (f: StudioFlyerData, code: string | null, preview = false) => {
    if (!engine.current) {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const images = new StudioImages();
      engine.current = { canvas, images, renderer: createRenderer(canvas, images, storeSrc) };
    }
    const { canvas, images, renderer } = engine.current;
    await loadStudioFonts();
    await images.whenReady(flyerImageSources(f, brandRef.current, storeSrc));
    renderer.draw(f, brandRef.current, { preview, code });
    return { canvas, text: renderer.textIssues() };
  }, []);

  /** PNG de la historia para descargar */
  const still = useCallback(
    (f: StudioFlyerData, code: string | null) =>
      run(async () => {
        const { canvas, text } = await drawFull(f, code);
        return { blob: await canvasBlob(canvas), text };
      }),
    [drawFull, run],
  );

  /**
   * Miniatura (URL de objeto: quien la pide la libera) y los textos que no cupieron o quedaron chicos.
   * `preview`: con los recuadros "Pega aquí la foto" (los ejemplos de plantilla del asistente)
   */
  const thumbnail = useCallback(
    (f: StudioFlyerData, code: string | null, opts: { preview?: boolean } = {}) =>
      run(async () => {
        const { canvas, text } = await drawFull(f, code, opts.preview);
        const small = document.createElement('canvas');
        small.width = THUMB_W;
        small.height = Math.round((THUMB_W * canvas.height) / W);
        small.getContext('2d')?.drawImage(canvas, 0, 0, small.width, small.height);
        const blob = await canvasBlob(small, 'image/webp');
        return { url: blob ? URL.createObjectURL(blob) : '', text };
      }),
    [drawFull, run],
  );

  return { still, thumbnail };
}
