'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  IconoBolsa, IconoCalendario, IconoCandado, IconoCarrito, IconoCelular, IconoCerrar, IconoCheck, IconoClientes, IconoCupon, IconoEnvio,
  IconoFlechaDerecha, IconoPagoMovil, IconoRecargarPuntos, IconoVer, IconoVerificado,
} from '@/components/iconos';
import ChispaGuia, { PROPORCION_CHISPA, type PoseGuia } from '@/components/onboarding/ChispaGuia';
import IconoDibujado, { type AccionIcono } from '@/components/onboarding/IconoDibujado';
import { atraparTab, claveAsiFunciona, hayOtroDialogoAbierto, marcarVista, yaVista } from '@/components/onboarding/compartido';
import { adminPrimaryButton } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { prefiereMenosMovimiento } from '@/lib/motion/resorte';

/**
 * "Así funciona" (C-257, el kit de onboarding): la primera vez que alguien entra a una página con un camino nuevo (el
 * sorteo, el checkout, Puntos ES) sube una hoja con el camino en tres íconos que se dibujan uno tras otro, unidos por una
 * línea, y un solo botón. Chispa se asoma por detrás del borde de arriba (la hoja le tapa la cintura); en el panel, sin ella.
 * - Sale una sola vez por página en este navegador (se marca al abrirse) y espera a que no haya otro diálogo abierto.
 * - En el teléfono sube desde abajo; en la PC es una tarjeta en el centro.
 * - Se cierra con el botón, la ×, Esc o tocando afuera. El botón puede llevar a una parte de la página (`destino`) o
 *   hacer algo (`alAceptar`, por ejemplo abrir la recarga).
 * - Con "reducir movimiento" aparece y se va sin animarse.
 */

/** Por nombre: las páginas del servidor no le pueden pasar un componente a uno del cliente */
const ICONOS = {
  bolsa: IconoBolsa,
  calendario: IconoCalendario,
  // C-290: los dos pasos del panel (la contraseña y el número del teléfono)
  candado: IconoCandado,
  carrito: IconoCarrito,
  celular: IconoCelular,
  clientes: IconoClientes,
  cupon: IconoCupon,
  envio: IconoEnvio,
  pagoMovil: IconoPagoMovil,
  recargar: IconoRecargarPuntos,
  ver: IconoVer,
  verificado: IconoVerificado,
};

export type PasoCamino = {
  icono: keyof typeof ICONOS;
  texto: string;
  accion?: AccionIcono;
  /** Ya lo hizo: el número pasa a ser un visto */
  hecho?: boolean;
};

const ANCHO_CHISPA = 112;
const ASOMA = 0.86;
const CABECERA = 24;

export default function AsiFunciona({
  clave,
  titulo,
  nota,
  pasos,
  boton,
  destino,
  alAceptar,
  pose = 'explica',
  activa = true,
  aMano,
  sinChispa = false,
}: {
  /** Una por página: 'sorteo', 'checkout', 'puntos' */
  clave: string;
  titulo: string;
  /** Una línea debajo del título, como mucho */
  nota?: string;
  pasos: PasoCamino[];
  boton: string;
  /** id de la parte de la página adonde lleva el botón */
  destino?: string;
  alAceptar?: () => void;
  pose?: PoseGuia;
  /** false: esta vez no sale (por ejemplo, el sorteo ya cerró) */
  activa?: boolean;
  /**
   * C-260: abierta a mano (un botón "¿Cómo funciona…?"). Sale al montarse, no se marca como vista, y al cerrarse avisa
   * para que quien la abrió la desmonte.
   */
  aMano?: { alCerrar: () => void };
  /** C-279: en el panel no va Chispa (decisión del equipo del 17/11): la hoja sale sola, sin el hueco de arriba */
  sinChispa?: boolean;
}) {
  const manual = Boolean(aMano);
  const [abierta, setAbierta] = useState(manual);
  const [saliendo, setSaliendo] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const focoPrevio = useRef<Element | null>(manual && typeof document !== 'undefined' ? document.activeElement : null);
  const aceptada = useRef(false);
  const tituloId = useId();
  const notaId = useId();
  useBodyScrollLock(abierta);

  // La primera vez: espera un momento (que la página se vea) y que no haya otro diálogo abierto
  useEffect(() => {
    if (!activa || manual) return;
    const k = claveAsiFunciona(clave);
    if (yaVista(k)) return;
    let intentos = 0;
    let timer: ReturnType<typeof setTimeout>;
    const probar = () => {
      intentos++;
      if (document.hidden || hayOtroDialogoAbierto()) {
        if (intentos < 12) timer = setTimeout(probar, 1500);
        return;
      }
      marcarVista(k);
      focoPrevio.current = document.activeElement;
      aceptada.current = false;
      setSaliendo(false);
      setAbierta(true);
    };
    timer = setTimeout(probar, 1200);
    return () => clearTimeout(timer);
  }, [activa, clave, manual]);

  useEffect(() => {
    // Se abrió sola: el botón toma el foco sin el contorno (sale al usar el teclado). Abierta a mano, como venga
    if (abierta) botonRef.current?.focus(manual ? { preventScroll: true } : ({ preventScroll: true, focusVisible: false } as FocusOptions));
  }, [abierta, manual]);

  // Ya cerrada (y con el scroll de la página liberado): el teclado vuelve a donde estaba y el botón hace lo suyo
  const yaAbrio = useRef(false);
  useEffect(() => {
    if (abierta) {
      yaAbrio.current = true;
      return;
    }
    if (!yaAbrio.current) return;
    yaAbrio.current = false;
    if (focoPrevio.current instanceof HTMLElement) focoPrevio.current.focus({ preventScroll: true });
    aMano?.alCerrar();
    if (!aceptada.current) return;
    alAceptar?.();
    if (destino) document.getElementById(destino)?.scrollIntoView({ behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth', block: 'start' });
  }, [abierta, alAceptar, destino, aMano]);

  const cerrar = useCallback((aceptar: boolean) => {
    aceptada.current = aceptar;
    if (prefiereMenosMovimiento()) {
      setAbierta(false);
      return;
    }
    setSaliendo(true);
    setTimeout(() => setAbierta(false), 280);
  }, []);

  useEffect(() => {
    if (!abierta || saliendo) return;
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar(false);
      else atraparTab(e, raizRef.current);
    };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [abierta, saliendo, cerrar]);

  if (!abierta) return null;

  const altoChispa = Math.round(ANCHO_CHISPA * PROPORCION_CHISPA);
  const asoma = Math.round(altoChispa * ASOMA);

  return createPortal(
    <div
      ref={raizRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      aria-describedby={nota ? notaId : undefined}
      data-onboarding=""
      data-saliendo={saliendo ? '' : undefined}
      className="fixed inset-0 z-[var(--z-popup)] flex items-end justify-center lg:items-center lg:p-6"
    >
      {/* El velo: el azul oscuro del logo. Tocarlo cierra */}
      <div className="onb-velo absolute inset-0 bg-brand-700/60" aria-hidden="true" onClick={() => cerrar(false)} />

      {/* En la tablet, del ancho de un teléfono grande y centrada abajo: a lo ancho, los tres pasos quedaban muy separados */}
      <div className="onb-lamina relative w-full sm:w-[32rem]" style={{ marginTop: sinChispa ? 0 : asoma + CABECERA }}>
        {/* Chispa, detrás del borde de arriba de la hoja: la ventana termina 2 px por debajo del borde (la hoja lo tapa) */}
        {!sinChispa && <div
          aria-hidden="true"
          className="pointer-events-none absolute right-7 overflow-hidden"
          style={{ bottom: 'calc(100% - 2px)', width: ANCHO_CHISPA, height: asoma + 2 + CABECERA }}
        >
          <div className="onb-asoma absolute left-0" style={{ top: CABECERA }}>
            <ChispaGuia pose={pose} ancho={ANCHO_CHISPA} />
          </div>
        </div>}

        <div className="onb-tarjeta relative rounded-t-[1.75rem] bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 lg:rounded-[1.75rem] lg:px-7 lg:pb-7 lg:pt-6">
          <button
            type="button"
            onClick={() => cerrar(false)}
            aria-label="Cerrar"
            className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            <IconoCerrar className="h-5 w-5" aria-hidden="true" />
          </button>

          <h2 id={tituloId} className="onb-sube px-12 text-center text-2xl font-bold leading-tight text-brand-700" style={{ '--onb-retraso': '0.2s' } as CSSProperties}>
            {titulo}
          </h2>
          {nota && (
            <p id={notaId} className="onb-sube mt-1 text-center text-[15px] text-ink-soft" style={{ '--onb-retraso': '0.28s' } as CSSProperties}>
              {nota}
            </p>
          )}

          <ol className="relative mt-5 grid" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
            {/* La línea que une los pasos, de centro a centro: se dibuja mientras aparecen */}
            <span
              aria-hidden="true"
              className="onb-conector absolute top-8 h-1 -translate-y-1/2 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-brand-300)_0_10px,transparent_10px_18px)]"
              style={{ left: `${50 / pasos.length}%`, right: `${50 / pasos.length}%` }}
            />
            {pasos.map((p, i) => (
              <li key={p.texto} className="onb-item relative flex flex-col items-center px-1 text-center" style={{ '--i': i } as CSSProperties}>
                <span className="relative">
                  <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.25rem] bg-brand-500 text-white ring-4 ring-white">
                    <IconoDibujado Icono={ICONOS[p.icono]} accion={p.accion ?? 'salta'} className="h-8 w-8" retraso={0.6 + i * 0.4} />
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white ring-2 ring-white"
                  >
                    {p.hecho ? <IconoCheck className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                </span>
                <span className="mt-2 text-sm font-semibold leading-snug text-ink">
                  {p.texto}
                  {p.hecho && <span className="sr-only"> (ya lo hiciste)</span>}
                </span>
              </li>
            ))}
          </ol>

          <button ref={botonRef} type="button" onClick={() => cerrar(true)} disabled={saliendo} className={`${adminPrimaryButton} mt-6 h-12! w-full text-base!`}>
            {boton}
            <span className="onb-empuja inline-flex">
              <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
