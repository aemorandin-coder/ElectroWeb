'use client';

// C-255 (el equipo, 15/11: "no uses tanto texto, iconiza de forma animada, a la gente le gusta eso"): un bloque de /sorteo
// cuyos íconos entran una sola vez, en cascada, al llegar a la vista. Esta pieza solo marca el momento (data-aparece);
// las animaciones son de CSS (`.sorteo-*` en app/globals.css), dentro de "prefers-reduced-motion: no-preference".
// - Sin JavaScript, o con "reducir movimiento", el bloque se ve quieto y completo: nada se esconde antes de saber que se va
//   a animar.
// - Lo que todavía no se ve espera escondido ("espera") y entra al aparecer ("si"); lo que ya está a la vista al cargar,
//   entra enseguida.
import { useEffect, useRef, type ReactNode } from 'react';

export default function Aparece({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      el.dataset.aparece = 'si';
      return;
    }
    el.dataset.aparece = 'espera';
    const observador = new IntersectionObserver(([entrada]) => {
      if (!entrada?.isIntersecting) return;
      el.dataset.aparece = 'si';
      observador.disconnect();
    }, { threshold: 0.2 });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
