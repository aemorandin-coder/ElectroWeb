'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { avanzarResorte, crearResorte, fijarResorte, type ConfigResorte } from '@/lib/motion/resorte';

export interface SignaturePadHandle {
  clear: () => void;
  /** PNG con fondo transparente, a la resolución real de la pantalla */
  toDataURL: () => string;
}

interface SignaturePadProps {
  /** Largo del trazo en px CSS: el formulario exige un mínimo para no aceptar un punto */
  onChange: (largo: number) => void;
  label: string;
}

// La punta sigue al dedo con un resorte (C-89): el trazo sale suave aunque el teléfono mande pocos puntos,
// sin el serrucho de unir puntos con rectas. Rígido y amortiguado para que no se atrase ni oscile.
const PLUMA: ConfigResorte = { rigidez: 900, amortiguacion: 60 };
const ALTO_CSS = 180;
const TINTA = '#1d3f8f';

/**
 * Lienzo de firma (C-103). Antes: el lienzo medía 500 px por dentro y se estiraba al ancho de la pantalla,
 * así que en el teléfono la línea salía corrida del dedo; y la página se desplazaba al firmar.
 * Ahora: resolución real (devicePixelRatio), eventos de puntero (dedo, lápiz o mouse) y `touch-action: none`.
 * El grosor cambia con la velocidad, como una pluma: lento = más grueso.
 */
const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad({ onChange, label }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const estado = useRef({
    dibujando: false,
    x: crearResorte(0),
    y: crearResorte(0),
    ultimo: { x: 0, y: 0 },
    medio: { x: 0, y: 0 },
    grosor: 2.4,
    largo: 0,
    frame: 0 as number,
    tiempo: 0,
  });

  const contexto = () => canvasRef.current?.getContext('2d') ?? null;

  // Tamaño real: al montar y cuando cambia el ancho (girar el teléfono). Redimensionar borra: se avisa como vacío.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const ancho = canvas.clientWidth;
      if (canvas.width === Math.round(ancho * dpr)) return;
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(ALTO_CSS * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = TINTA;
      }
      estado.current.largo = 0;
      onChange(0);
    };
    ajustar();
    const observer = new ResizeObserver(ajustar);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [onChange]);

  const paso = useCallback(() => {
    const s = estado.current;
    const ahora = performance.now();
    const dt = Math.min((ahora - s.tiempo) / 1000, 1 / 20);
    s.tiempo = ahora;
    avanzarResorte(s.x, dt, PLUMA, 0.05);
    avanzarResorte(s.y, dt, PLUMA, 0.05);
    const ctx = contexto();
    const dx = s.x.valor - s.ultimo.x;
    const dy = s.y.valor - s.ultimo.y;
    const tramo = Math.hypot(dx, dy);
    if (ctx && tramo > 0.3) {
      // Velocidad en px/s → grosor entre 1,3 y 3,4, suavizado para que no salte
      const velocidad = tramo / Math.max(dt, 1 / 240);
      const objetivo = Math.min(3.4, Math.max(1.3, 3.6 - velocidad / 450));
      s.grosor += (objetivo - s.grosor) * 0.25;
      const medio = { x: (s.ultimo.x + s.x.valor) / 2, y: (s.ultimo.y + s.y.valor) / 2 };
      ctx.lineWidth = s.grosor;
      ctx.beginPath();
      ctx.moveTo(s.medio.x, s.medio.y);
      ctx.quadraticCurveTo(s.ultimo.x, s.ultimo.y, medio.x, medio.y);
      ctx.stroke();
      s.medio = medio;
      s.ultimo = { x: s.x.valor, y: s.y.valor };
      s.largo += tramo;
    }
    const quieto = Math.abs(s.x.valor - s.x.destino) < 0.05 && Math.abs(s.y.valor - s.y.destino) < 0.05;
    if (s.dibujando || !quieto) s.frame = requestAnimationFrame(paso);
    else {
      s.frame = 0;
      onChange(s.largo);
    }
  }, [onChange]);

  useEffect(() => () => cancelAnimationFrame(estado.current.frame), []);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const s = estado.current;
    const p = punto(e);
    fijarResorte(s.x, p.x);
    fijarResorte(s.y, p.y);
    s.ultimo = p;
    s.medio = p;
    s.dibujando = true;
    s.grosor = 2.4;
    // Un toque deja un punto (la "i" y los acentos de la firma)
    const ctx = contexto();
    if (ctx) {
      ctx.fillStyle = TINTA;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!s.frame) {
      s.tiempo = performance.now();
      s.frame = requestAnimationFrame(paso);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = estado.current;
    if (!s.dibujando) return;
    // Puntos intermedios que el navegador agrupa (trazos rápidos con el dedo)
    const eventos = typeof e.nativeEvent.getCoalescedEvents === 'function' ? e.nativeEvent.getCoalescedEvents() : [];
    const ultimo = eventos.length > 0 ? eventos[eventos.length - 1] : e.nativeEvent;
    const rect = e.currentTarget.getBoundingClientRect();
    s.x.destino = ultimo.clientX - rect.left;
    s.y.destino = ultimo.clientY - rect.top;
  };

  const terminar = () => {
    estado.current.dibujando = false;
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = contexto();
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      estado.current.largo = 0;
      onChange(0);
    },
    toDataURL: () => canvasRef.current?.toDataURL('image/png') ?? '',
  }), [onChange]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className="block w-full cursor-crosshair touch-none select-none rounded-lg bg-surface"
      style={{ height: ALTO_CSS }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={terminar}
      onPointerCancel={terminar}
    />
  );
});

export default SignaturePad;
