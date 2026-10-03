'use client';

import { useEffect, useRef, useState } from 'react';
import { formatUSD } from '@/lib/currency';

// C-171: un número que cuenta hasta su valor al aparecer y, cuando cambia en vivo, desde el anterior. Una sola vez (no es un bucle).
// Con "reducir movimiento" se pinta el valor final sin contar.

const DURACION_MS = 600;

export default function CifraAnimada({ valor, formato = 'entero', className }: { valor: number; formato?: 'entero' | 'usd'; className?: string }) {
  const [mostrado, setMostrado] = useState(valor);
  const desde = useRef(0);
  const primera = useRef(true);

  useEffect(() => {
    const quieto = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inicio = primera.current ? 0 : desde.current;
    primera.current = false;
    if (quieto || inicio === valor) {
      desde.current = valor;
      const cuadro = requestAnimationFrame(() => setMostrado(valor));
      return () => cancelAnimationFrame(cuadro);
    }
    let cuadro = 0;
    const t0 = performance.now();
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - t0) / DURACION_MS);
      // Sale rápido y frena al llegar
      const suave = 1 - (1 - avance) ** 3;
      setMostrado(inicio + (valor - inicio) * suave);
      if (avance < 1) cuadro = requestAnimationFrame(paso);
      else desde.current = valor;
    };
    cuadro = requestAnimationFrame(paso);
    return () => { cancelAnimationFrame(cuadro); desde.current = valor; };
  }, [valor]);

  const texto = formato === 'usd' ? formatUSD(Math.round(mostrado * 100) / 100) : String(Math.round(mostrado));
  // Para lectores de pantalla, siempre el valor final
  return (
    <span className={className}>
      <span aria-hidden="true">{texto}</span>
      <span className="sr-only">{formato === 'usd' ? formatUSD(valor) : valor}</span>
    </span>
  );
}
