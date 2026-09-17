'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Física de resortes para las animaciones de la tienda (C-89). Sin dependencias.
 * Un resorte no tiene duración: tira del valor hacia su destino con rigidez y lo frena con amortiguación,
 * así que se puede cambiar el destino a mitad de camino y el movimiento sigue siendo continuo.
 * Se escribe directo en el DOM desde requestAnimationFrame: React no se vuelve a pintar en cada cuadro.
 */

export type ConfigResorte = { rigidez: number; amortiguacion: number; masa?: number };

export const RESORTES = {
  /** Seguir a otro elemento con un poco de retraso (tarjetas, flechas) */
  suave: { rigidez: 140, amortiguacion: 19 },
  /** Llegar rápido y casi sin pasarse (foco, barras de progreso) */
  firme: { rigidez: 230, amortiguacion: 26 },
  /** Pasarse un poco y volver (aparecer, marcar como hecho) */
  rebote: { rigidez: 340, amortiguacion: 15 },
} satisfies Record<string, ConfigResorte>;

export type Resorte = { valor: number; velocidad: number; destino: number };

export function crearResorte(valor: number): Resorte {
  return { valor, velocidad: 0, destino: valor };
}

/**
 * Avanza el resorte `dt` segundos. Usa subpasos de 1/240 s (estable con rigidez alta) y no avanza más de 1/20 s
 * de golpe: si la pestaña estuvo en segundo plano no da un salto. Devuelve true cuando ya llegó.
 */
export function avanzarResorte(r: Resorte, dt: number, config: ConfigResorte, precision = 0.01): boolean {
  const masa = config.masa ?? 1;
  let restante = Math.min(Math.max(dt, 0), 1 / 20);
  while (restante > 0) {
    const h = Math.min(1 / 240, restante);
    const fuerza = -config.rigidez * (r.valor - r.destino) - config.amortiguacion * r.velocidad;
    r.velocidad += (fuerza / masa) * h;
    r.valor += r.velocidad * h;
    restante -= h;
  }
  if (Math.abs(r.velocidad) < precision && Math.abs(r.valor - r.destino) < precision) {
    r.valor = r.destino;
    r.velocidad = 0;
    return true;
  }
  return false;
}

/** Lleva el resorte a su destino sin animar (movimiento reducido o primera colocación). */
export function fijarResorte(r: Resorte, valor: number) {
  r.valor = valor;
  r.destino = valor;
  r.velocidad = 0;
}

export function prefiereMenosMovimiento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Bucle de animación: llama a `paso(dt)` en cada cuadro hasta que devuelva true (todo quieto).
 * `iniciar()` lo arranca si estaba detenido; se detiene solo y se cancela al desmontar.
 */
export function useBucleAnimacion(paso: (dt: number) => boolean) {
  const pasoRef = useRef(paso);
  const frame = useRef<number | null>(null);
  const ultimo = useRef(0);

  useEffect(() => {
    pasoRef.current = paso;
  });

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    []
  );

  return useCallback(() => {
    if (frame.current !== null) return;
    ultimo.current = performance.now();
    const tick = (ahora: number) => {
      const dt = (ahora - ultimo.current) / 1000;
      ultimo.current = ahora;
      frame.current = pasoRef.current(dt) ? null : requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);
}
