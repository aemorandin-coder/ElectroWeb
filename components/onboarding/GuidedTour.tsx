'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Tour guiado post-registro — Issue #26 (Bloque 3)
 *
 * Técnica "Spotlight": backdrop oscuro con clip-path recortado alrededor
 * del elemento objetivo, dando sensación premium de foco (estilo Notion/Figma).
 *
 * Estado persistido en localStorage + endpoint /api/user/onboarding (BD).
 */

interface TourStep {
  /** Selector CSS del elemento a destacar */
  target: string;
  title: string;
  desc: string;
  /** Posición del tooltip relativa al elemento */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '#nav-productos',
    title: 'Explora el Catálogo',
    desc: 'Navega juegos, software, gift cards y más. Todo con precio en USD y Bs.',
    placement: 'bottom',
  },
  {
    target: '#balance-widget',
    title: 'Tu Saldo Disponible',
    desc: 'Recarga con Pago Móvil BDV y usa tu saldo para comprar al instante.',
    placement: 'bottom',
  },
  {
    target: '#cart-icon',
    title: 'Tu Carrito',
    desc: 'Agrega productos y procede al checkout con un solo click.',
    placement: 'bottom',
  },
  {
    target: '#user-menu',
    title: 'Tu Cuenta',
    desc: 'Gestiona tus pedidos, historial de recargas y datos personales.',
    placement: 'bottom',
  },
];

const LS_KEY = 'electroweb_onboarding_done';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function useElementRect(selector: string, active: boolean): SpotlightRect | null {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!active) return;
    const el = document.querySelector(selector);
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [selector, active]);

  return rect;
}

export function GuidedTour() {
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(LS_KEY);
    // Mostrar solo si el usuario está logueado y no ha hecho el tour
    if (!done && session?.user) {
      // Pequeño delay para que el header se monte completamente
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [session]);

  const finish = useCallback(async () => {
    localStorage.setItem(LS_KEY, '1');
    setVisible(false);
    // Persistir en BD (fire-and-forget, no bloquea)
    try {
      await fetch('/api/user/onboarding', { method: 'POST' });
    } catch {
      // No crítico si falla
    }
  }, []);

  const current = TOUR_STEPS[step];
  const rect = useElementRect(current?.target ?? '', visible);

  if (!visible) return null;

  const PAD = 8; // padding del spotlight alrededor del elemento
  const spotTop = rect ? rect.top - PAD : 0;
  const spotLeft = rect ? rect.left - PAD : 0;
  const spotW = rect ? rect.width + PAD * 2 : 0;
  const spotH = rect ? rect.height + PAD * 2 : 0;

  // Posición del tooltip
  const tooltipStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: spotTop + spotH + 12,
        left: Math.max(16, Math.min(spotLeft, window.innerWidth - 340)),
      }
    : {
        position: 'fixed',
        bottom: '6rem',
        left: '50%',
        transform: 'translateX(-50%)',
      };

  return (
    <div className="fixed inset-0 z-[9998]" aria-modal="true" role="dialog">
      {/* Backdrop con Spotlight usando SVG clipPath */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 9998 }}
      >
        <defs>
          <mask id="spotlight-mask">
            {/* Fondo oscuro total */}
            <rect width="100%" height="100%" fill="white" />
            {/* Recorte (agujero) — el elemento queda iluminado */}
            {rect && (
              <rect
                x={spotLeft}
                y={spotTop}
                width={spotW}
                height={spotH}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.72)"
          mask="url(#spotlight-mask)"
          className="pointer-events-auto"
          onClick={finish}
          style={{ cursor: 'default' }}
        />
      </svg>

      {/* Anillo de foco alrededor del elemento */}
      {rect && (
        <div
          className="absolute pointer-events-none rounded-xl"
          style={{
            zIndex: 9999,
            top: spotTop,
            left: spotLeft,
            width: spotW,
            height: spotH,
            boxShadow: '0 0 0 3px #2a63cd, 0 0 0 6px rgba(42,99,205,0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      )}

      {/* Tooltip premium */}
      <div
        className="pointer-events-auto"
        style={{ ...tooltipStyle, zIndex: 10000, width: 320 }}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] px-5 py-3 flex items-center justify-between">
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest">
              Paso {step + 1} de {TOUR_STEPS.length}
            </span>
            <button
              onClick={finish}
              className="text-white/60 hover:text-white text-xs transition-colors"
            >
              Saltar tour
            </button>
          </div>

          <div className="px-5 py-4">
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              {current.title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              {current.desc}
            </p>

            <div className="flex items-center justify-between">
              {/* Dots de progreso */}
              <div className="flex gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step
                        ? 'bg-[#2a63cd] w-5'
                        : 'bg-slate-200 hover:bg-slate-300 w-1.5'
                    }`}
                    aria-label={`Ir al paso ${i + 1}`}
                  />
                ))}
              </div>

              {/* Botones de navegación */}
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    ← Atrás
                  </button>
                )}
                <button
                  onClick={() =>
                    step < TOUR_STEPS.length - 1 ? setStep((s) => s + 1) : finish()
                  }
                  className="px-4 py-2 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white text-sm font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  {step < TOUR_STEPS.length - 1 ? 'Siguiente →' : '¡Listo!'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
