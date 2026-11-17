'use client';

import { useEffect, useRef, useState } from 'react';
import { formatUSD, formatVES } from '@/lib/currency';

// C-171: un número que cuenta hasta su valor al aparecer y, cuando cambia en vivo, desde el anterior. Una sola vez (no es un bucle).
// Con "reducir movimiento" se pinta el valor final sin contar.
// C-279: también en bolívares (la tasa), desde un valor (`desde`, la primera vez) y con un retraso, para ir con la llegada.

const DURACION_MS = 1100;

export default function CifraAnimada({ valor, formato = 'entero', className, desde = 0, retraso = 0 }: {
  valor: number;
  formato?: 'entero' | 'usd' | 'ves';
  className?: string;
  /** De dónde empieza a contar la primera vez */
  desde?: number;
  /** Milisegundos antes de empezar la primera vez */
  retraso?: number;
}) {
  const [mostrado, setMostrado] = useState(valor);
  const anterior = useRef(desde);
  const primera = useRef(true);

  useEffect(() => {
    const quieto = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inicio = anterior.current;
    const espera = primera.current ? retraso : 0;
    primera.current = false;
    if (quieto || inicio === valor) {
      anterior.current = valor;
      const cuadro = requestAnimationFrame(() => setMostrado(valor));
      return () => cancelAnimationFrame(cuadro);
    }
    let cuadro = 0;
    const t0 = performance.now() + espera;
    const paso = (ahora: number) => {
      const avance = Math.min(1, Math.max(0, (ahora - t0) / DURACION_MS));
      // Sale rápido y frena al llegar
      const suave = 1 - (1 - avance) ** 3;
      setMostrado(inicio + (valor - inicio) * suave);
      if (avance < 1) cuadro = requestAnimationFrame(paso);
      else anterior.current = valor;
    };
    cuadro = requestAnimationFrame(paso);
    return () => { cancelAnimationFrame(cuadro); anterior.current = valor; };
  }, [valor, retraso]);

  const texto = formato === 'usd' ? formatUSD(Math.round(mostrado * 100) / 100)
    : formato === 'ves' ? formatVES(Math.round(mostrado * 100) / 100)
      : String(Math.round(mostrado));
  const final = formato === 'usd' ? formatUSD(valor) : formato === 'ves' ? formatVES(valor) : String(valor);
  // Para lectores de pantalla, siempre el valor final
  return (
    <span className={className}>
      <span aria-hidden="true">{texto}</span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
