'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { FiChevronLeft, FiChevronRight, FiPause, FiPlay } from 'react-icons/fi';
import ProductShelf from '@/components/ui/ProductShelf';
import { trackEvent } from '@/components/AnalyticsTracker';

interface DestacadosRotativosProps {
  /** La tarjeta grande de cada destacado, ya armada en el servidor, en el orden del día. */
  estrellas: ReactNode[];
  /** La tarjeta chica de cada destacado, en el mismo orden. */
  tarjetas: ReactNode[];
  /** Nombre de cada producto, para decir cuál se muestra. */
  nombres: string[];
}

const INTERVALO_MS = 7000;

/**
 * Vitrina de computadora (desde xl) que rota (C-172): cada 7 s el primero de la columna pasa a ser la estrella y la
 * estrella anterior se va al final. Da **una sola vuelta** y se queda en la primera: la tienda no tiene animaciones
 * sin fin. Se detiene con el ratón encima, con el foco dentro, con la pestaña oculta y al tocar cualquier control.
 * Con "reducir movimiento" no gira sola: quedan las flechas. En teléfono no existe (ahí manda la fila deslizable).
 */
export default function DestacadosRotativos({ estrellas, tarjetas, nombres }: DestacadosRotativosProps) {
  const total = estrellas.length;
  const [actual, setActual] = useState(0);
  // 'girando' → sola; 'pausa' → la detuvo la persona; 'fin' → ya dio su vuelta
  const [estado, setEstado] = useState<'girando' | 'pausa' | 'fin'>('girando');
  const [encima, setEncima] = useState(false);
  // Solo gira donde se ve (xl) y si la persona no pidió menos movimiento. Es comportamiento, no diseño: el diseño lo decide el CSS
  const [permitido, setPermitido] = useState(false);
  const [roto, setRoto] = useState(false);

  useEffect(() => {
    const ancho = window.matchMedia('(min-width: 1280px)');
    const calma = window.matchMedia('(prefers-reduced-motion: reduce)');
    const revisar = () => setPermitido(ancho.matches && !calma.matches);
    revisar();
    ancho.addEventListener('change', revisar);
    calma.addEventListener('change', revisar);
    return () => {
      ancho.removeEventListener('change', revisar);
      calma.removeEventListener('change', revisar);
    };
  }, []);

  const gira = permitido && estado === 'girando' && !encima && total > 1;

  useEffect(() => {
    if (!gira) return;
    const reloj = window.setInterval(() => {
      // Con la pestaña oculta no avanza: nadie lo ve y gastaría la vuelta
      if (document.hidden) return;
      setRoto(true);
      setActual((i) => {
        const siguiente = (i + 1) % total;
        if (siguiente === 0) setEstado('fin');
        return siguiente;
      });
    }, INTERVALO_MS);
    return () => window.clearInterval(reloj);
  }, [gira, total]);

  const ir = useCallback((indice: number) => {
    setRoto(true);
    setEstado((e) => (e === 'girando' ? 'pausa' : e));
    setActual(((indice % total) + total) % total);
  }, [total]);

  // Medir antes de opinar: qué se toca (la estrella o la columna) y si ya había rotado
  const medir = (posicion: 'estrella' | 'lateral') => (evento: React.MouseEvent) => {
    if (!(evento.target as HTMLElement).closest('a[href^="/productos/"]')) return;
    void trackEvent({ eventType: 'home_destacado_click', eventCategory: 'interaction', eventAction: posicion, eventLabel: roto ? 'rotado' : 'inicial', eventValue: actual + 1 });
  };

  const siguiente = (actual + 1) % total;
  const orden = Array.from({ length: total - 1 }, (_, k) => (actual + 1 + k) % total);
  const boton = 'flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500';

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados de la semana"
      className="hidden gap-4 xl:grid xl:grid-cols-12"
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      onFocus={() => setEncima(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEncima(false); }}
    >
      {/* pb-2: iguala el espacio inferior que deja la fila deslizable */}
      <div className={`relative pb-2 ${total > 1 ? 'col-span-8' : 'col-span-12'}`} onClickCapture={medir('estrella')}>
        {/* Todas en la misma celda: la que se muestra, opaca; la que sigue, montada y transparente para que su foto ya esté
            cargada al llegar. Las demás no se montan: sus fotos grandes no se piden hasta que les toca */}
        <div className="grid h-full">
          {estrellas.map((estrella, i) => {
            const visible = i === actual;
            if (!visible && !(i === siguiente && (gira || roto))) return null;
            return (
              <div
                key={i}
                aria-hidden={!visible}
                inert={!visible}
                className={`[grid-area:1/1] transition-opacity duration-300 motion-reduce:transition-none ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
              >
                {estrella}
              </div>
            );
          })}
        </div>
        {total > 1 && (
          <div data-controles className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-full border border-line bg-white/95 p-0.5 shadow-sm">
            <button type="button" className={boton} onClick={() => ir(actual - 1)} aria-label="Destacado anterior">
              <FiChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="min-w-12 text-center text-xs font-medium text-muted" aria-hidden="true">{actual + 1} de {total}</span>
            <button type="button" className={boton} onClick={() => ir(actual + 1)} aria-label="Destacado siguiente">
              <FiChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            {permitido && (
              <button
                type="button"
                className={boton}
                onClick={() => setEstado((e) => (e === 'girando' ? 'pausa' : 'girando'))}
                aria-label={estado === 'girando' ? 'Pausar la rotación de destacados' : 'Rotar los destacados'}
              >
                {estado === 'girando' ? <FiPause className="h-4 w-4" aria-hidden="true" /> : <FiPlay className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        )}
        {/* Solo habla cuando cambia por un control: si gira sola, un lector de pantalla no debe interrumpir */}
        <p className="sr-only" aria-live={estado === 'girando' ? 'off' : 'polite'}>
          Destacado {actual + 1} de {total}: {nombres[actual]}
        </p>
      </div>
      {total > 1 && (
        <div className="col-span-4 min-w-0" onClickCapture={medir('lateral')}>
          <ProductShelf label="Más destacados" variant="featuredSide">
            {orden.map((i) => (
              <div key={i} className="h-full">{tarjetas[i]}</div>
            ))}
          </ProductShelf>
        </div>
      )}
    </section>
  );
}
