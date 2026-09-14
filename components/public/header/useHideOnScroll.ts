'use client';

import { useEffect, useState, type RefObject } from 'react';

const ALWAYS_VISIBLE_UNTIL = 120; // px desde arriba
const DELTA = 8; // px de desplazamiento para cambiar de estado

/**
 * true mientras el usuario baja (para esconder el buscador móvil) y false al subir.
 * No se esconde si el foco está dentro de `keepVisibleRef` (el usuario está escribiendo).
 */
export function useHideOnScroll(keepVisibleRef?: RefObject<HTMLElement | null>): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      const typing = keepVisibleRef?.current?.contains(document.activeElement) ?? false;

      if (y < ALWAYS_VISIBLE_UNTIL || typing) {
        setHidden(false);
        lastY = y;
      } else if (delta > DELTA) {
        setHidden(true);
        lastY = y;
      } else if (delta < -DELTA) {
        setHidden(false);
        lastY = y;
      }
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [keepVisibleRef]);

  return hidden;
}
