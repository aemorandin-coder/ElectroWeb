'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import type { IconType } from 'react-icons';
import { FiArrowLeft, FiArrowRight, FiCheck, FiGrid, FiSearch, FiShoppingCart, FiUser, FiX, FiZap } from 'react-icons/fi';
import { adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { lanzarConfeti } from '@/lib/motion/confeti';
import {
  RESORTES,
  avanzarResorte,
  crearResorte,
  fijarResorte,
  prefiereMenosMovimiento,
  useBucleAnimacion,
} from '@/lib/motion/resorte';

/**
 * Recorrido de bienvenida con física (C-89, pedido de Andrés del 16/09: "animaciones épicas sin perder el estilo").
 * - El foco viaja de un elemento a otro con un resorte y la tarjeta lo sigue con otro más blando: se inclina
 *   mientras se mueve y rebota un poco al llegar. Al posarse, un anillo marca el elemento una sola vez.
 * - Al terminar, confeti con gravedad desde el botón "Listo".
 * - Pasos según lo que se ve: en el teléfono "Catálogo" apunta a la barra inferior y en la PC al menú.
 * - Con movimiento reducido todo llega sin animar y sin confeti.
 * Antes: un paso apuntaba a #balance-widget (no existe), en el teléfono el foco quedaba en la esquina (0,0),
 * capas con z-index 9998-10000 y hex sueltos, sin teclado y sin bloquear el scroll.
 */

type Paso = { id: string; objetivo: string | null; titulo: string; texto: string; Icono: IconType };

const PASOS: Paso[] = [
  { id: 'bienvenida', objetivo: null, titulo: 'Hola', texto: 'Te mostramos la tienda en 4 pasos. Toma menos de un minuto.', Icono: FiZap },
  {
    id: 'buscar',
    objetivo: '[data-tour="buscar"]',
    titulo: 'Busca lo que necesitas',
    texto: 'Escribe una marca, un juego o un producto y te mostramos el precio en dólares y en bolívares.',
    Icono: FiSearch,
  },
  { id: 'catalogo', objetivo: '[data-tour="catalogo"]', titulo: 'Explora el catálogo', texto: 'Laptops, consolas, gift cards y más, ordenados por categoría.', Icono: FiGrid },
  { id: 'carrito', objetivo: '[data-tour="carrito"]', titulo: 'Tu carrito', texto: 'Lo que agregues queda aquí hasta que pagues, también si cierras la página.', Icono: FiShoppingCart },
  {
    id: 'cuenta',
    objetivo: '[data-tour="cuenta"]',
    titulo: 'Tu cuenta',
    texto: 'Tus pedidos, tu saldo y tus datos. Recarga saldo con Pago Móvil y paga al instante.',
    Icono: FiUser,
  },
];

const LS_KEY = 'electroweb_onboarding_done';
const MARGEN = 16;
const HOLGURA = 8; // espacio del foco alrededor del elemento
const SEPARACION = 14; // entre el foco y la tarjeta

/** Primer elemento visible del selector (el mismo data-tour existe en la PC y en el teléfono). */
function objetivoVisible(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && getComputedStyle(el).visibility !== 'hidden') return el;
  }
  return null;
}

/** Otro diálogo visible (por ejemplo el popup del home). Los cajones cerrados del header siguen en el DOM fuera de la pantalla: no cuentan. */
function hayOtroDialogoAbierto() {
  return [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]:not([data-tour-dialogo])')].some((d) => {
    if (d.closest('[inert], [aria-hidden="true"]')) return false;
    const r = d.getBoundingClientRect();
    const estilo = getComputedStyle(d);
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight && estilo.visibility !== 'hidden' && estilo.opacity !== '0';
  });
}

export function GuidedTour() {
  const { data: session, status } = useSession();
  const [pasos, setPasos] = useState<Paso[]>([]);
  const [indice, setIndice] = useState(0);
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  useBodyScrollLock(visible);

  const focoRef = useRef<HTMLDivElement>(null);
  const anilloRef = useRef<HTMLDivElement>(null);
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const flechaRef = useRef<HTMLSpanElement>(null);
  const principalRef = useRef<HTMLButtonElement>(null);
  const focoPrevio = useRef<Element | null>(null);

  // Estado físico: vive fuera de React y se escribe directo en el DOM en cada cuadro
  const fisica = useRef({
    foco: { x: crearResorte(0), y: crearResorte(0), w: crearResorte(0), h: crearResorte(0) },
    tarjeta: { x: crearResorte(0), y: crearResorte(0), escala: crearResorte(0.9), opacidad: crearResorte(0) },
    flecha: crearResorte(0),
    lado: 'arriba' as 'arriba' | 'abajo' | 'ninguno',
    pulsoPendiente: false,
    colocado: false,
  });

  // Arranque: con sesión, sin haberlo visto, con los elementos en pantalla y sin otro diálogo (por ejemplo el popup del home)
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    let hecho: string | null = null;
    try {
      hecho = localStorage.getItem(LS_KEY);
    } catch {
      return;
    }
    if (hecho) return;

    let intentos = 0;
    let timer: ReturnType<typeof setTimeout>;
    const probar = () => {
      intentos++;
      if (hayOtroDialogoAbierto()) {
        if (intentos < 15) timer = setTimeout(probar, 1500);
        return;
      }
      const disponibles = PASOS.filter((p) => !p.objetivo || objetivoVisible(p.objetivo));
      // Sin el header de la tienda (menos de 3 elementos) no tiene sentido: se intenta en otra página
      if (disponibles.filter((p) => p.objetivo).length < 3) return;
      const nombre = session.user?.name?.split(' ')[0];
      focoPrevio.current = document.activeElement;
      setSaliendo(false);
      setPasos(disponibles.map((p) => (p.id === 'bienvenida' && nombre ? { ...p, titulo: `Hola, ${nombre}` } : p)));
      setIndice(0);
      setVisible(true);
    };
    timer = setTimeout(probar, 900);
    return () => clearTimeout(timer);
  }, [status, session]);

  const pasoFisico = useCallback((dt: number) => {
    const f = fisica.current;
    const foco = focoRef.current;
    const tarjeta = tarjetaRef.current;
    if (!foco || !tarjeta) return true;

    let quieto = true;
    for (const r of [f.foco.x, f.foco.y, f.foco.w, f.foco.h]) quieto = avanzarResorte(r, dt, RESORTES.firme, 0.05) && quieto;
    const focoQuieto = quieto;
    for (const r of [f.tarjeta.x, f.tarjeta.y]) quieto = avanzarResorte(r, dt, RESORTES.suave, 0.05) && quieto;
    quieto = avanzarResorte(f.tarjeta.escala, dt, RESORTES.rebote, 0.0005) && quieto;
    quieto = avanzarResorte(f.tarjeta.opacidad, dt, RESORTES.firme, 0.002) && quieto;
    quieto = avanzarResorte(f.flecha, dt, RESORTES.suave, 0.05) && quieto;

    foco.style.transform = `translate3d(${f.foco.x.valor}px, ${f.foco.y.valor}px, 0)`;
    foco.style.width = `${Math.max(0, f.foco.w.valor)}px`;
    foco.style.height = `${Math.max(0, f.foco.h.valor)}px`;

    // La tarjeta se inclina según su velocidad horizontal, como si tuviera peso
    const inclinacion = Math.max(-7, Math.min(7, f.tarjeta.x.velocidad * 0.012));
    tarjeta.style.transform = `translate3d(${f.tarjeta.x.valor}px, ${f.tarjeta.y.valor}px, 0) rotate(${inclinacion}deg) scale(${f.tarjeta.escala.valor})`;
    tarjeta.style.opacity = String(Math.max(0, Math.min(1, f.tarjeta.opacidad.valor)));
    if (flechaRef.current) flechaRef.current.style.left = `${f.flecha.valor}px`;

    if (focoQuieto && f.pulsoPendiente && anilloRef.current && f.lado !== 'ninguno') {
      f.pulsoPendiente = false;
      anilloRef.current.animate(
        [
          { transform: 'scale(1)', opacity: 0.9 },
          { transform: 'scale(1.18)', opacity: 0 },
        ],
        { duration: 650, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }
      );
    }
    return quieto;
  }, []);

  const iniciar = useBucleAnimacion(pasoFisico);

  const colocar = useCallback(
    (instantaneo: boolean) => {
      const paso = pasos[indice];
      const tarjeta = tarjetaRef.current;
      if (!paso || !tarjeta) return;
      const f = fisica.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const ancho = tarjeta.offsetWidth;
      const alto = tarjeta.offsetHeight;
      const el = paso.objetivo ? objetivoVisible(paso.objetivo) : null;

      let foco = { x: vw / 2, y: vh / 2, w: 0, h: 0 };
      let tx = (vw - ancho) / 2;
      let ty = (vh - alto) / 2;
      let flecha = ancho / 2;
      f.lado = 'ninguno';

      if (el) {
        const r = el.getBoundingClientRect();
        foco = { x: r.left - HOLGURA, y: r.top - HOLGURA, w: r.width + HOLGURA * 2, h: r.height + HOLGURA * 2 };
        const centro = r.left + r.width / 2;
        tx = Math.min(Math.max(centro - ancho / 2, MARGEN), vw - ancho - MARGEN);
        const abajo = foco.y + foco.h + SEPARACION;
        if (abajo + alto <= vh - MARGEN) {
          ty = abajo;
          f.lado = 'arriba'; // la flecha va en el borde de arriba de la tarjeta
        } else {
          ty = Math.max(MARGEN, foco.y - SEPARACION - alto);
          f.lado = 'abajo';
        }
        flecha = Math.min(Math.max(centro - tx, 22), ancho - 22);
      }

      const reducido = prefiereMenosMovimiento();
      const destinos: Array<[typeof f.foco.x, number]> = [
        [f.foco.x, foco.x],
        [f.foco.y, foco.y],
        [f.foco.w, foco.w],
        [f.foco.h, foco.h],
        [f.tarjeta.x, tx],
        [f.tarjeta.y, ty],
        [f.flecha, flecha],
        [f.tarjeta.opacidad, 1],
        [f.tarjeta.escala, 1],
      ];
      if (instantaneo || reducido || !f.colocado) {
        for (const [r, v] of destinos) fijarResorte(r, v);
        if (!reducido && !f.colocado) {
          // Primera aparición: la tarjeta crece desde un poco más chica y el foco se abre desde un punto
          f.tarjeta.escala.valor = 0.86;
          f.tarjeta.opacidad.valor = 0;
          f.tarjeta.y.valor = ty + 18;
          if (el) {
            f.foco.x.valor = foco.x + foco.w / 2;
            f.foco.y.valor = foco.y + foco.h / 2;
            f.foco.w.valor = 0;
            f.foco.h.valor = 0;
          }
        }
        f.colocado = true;
      } else {
        for (const [r, v] of destinos) r.destino = v;
        // Un pequeño golpe al cambiar de paso: se encoge y rebota
        f.tarjeta.escala.valor = 0.95;
      }
      if (flechaRef.current) {
        flechaRef.current.dataset.lado = f.lado;
      }
      f.pulsoPendiente = Boolean(el);
      iniciar();
    },
    [pasos, indice, iniciar]
  );

  // Cada paso: medir, mover y dar el foco del teclado al botón principal
  useLayoutEffect(() => {
    if (!visible) return;
    colocar(false);
    principalRef.current?.focus({ preventScroll: true });
  }, [visible, indice, colocar]);

  useEffect(() => {
    if (!visible) return;
    const alCambiarTamano = () => colocar(true);
    window.addEventListener('resize', alCambiarTamano);
    return () => window.removeEventListener('resize', alCambiarTamano);
  }, [visible, colocar]);

  // Al cerrar, el teclado vuelve a donde estaba (solo depende de `visible`: no se dispara al cambiar de paso)
  useEffect(() => {
    if (!visible) return;
    return () => {
      if (focoPrevio.current instanceof HTMLElement) focoPrevio.current.focus({ preventScroll: true });
    };
  }, [visible]);

  const cerrar = useCallback(
    (celebrar: boolean) => {
      try {
        localStorage.setItem(LS_KEY, '1');
      } catch {
        // Sin almacenamiento: el tour puede volver a salir, no es grave
      }
      fetch('/api/user/onboarding', { method: 'POST' }).catch(() => {});

      if (celebrar && principalRef.current) {
        const r = principalRef.current.getBoundingClientRect();
        lanzarConfeti({ x: r.left + r.width / 2, y: r.top });
      }
      if (prefiereMenosMovimiento()) {
        setVisible(false);
        return;
      }
      // Salida: la tarjeta se encoge y se desvanece, el foco se abre a toda la pantalla
      const f = fisica.current;
      f.tarjeta.escala.destino = 0.9;
      f.tarjeta.opacidad.destino = 0;
      f.foco.x.destino = -window.innerWidth;
      f.foco.y.destino = -window.innerHeight;
      f.foco.w.destino = window.innerWidth * 3;
      f.foco.h.destino = window.innerHeight * 3;
      f.pulsoPendiente = false;
      setSaliendo(true);
      iniciar();
      setTimeout(() => setVisible(false), 420);
    },
    [iniciar]
  );

  const ultimo = indice === pasos.length - 1;
  const siguiente = useCallback(() => (ultimo ? cerrar(true) : setIndice((i) => i + 1)), [ultimo, cerrar]);
  const anterior = useCallback(() => setIndice((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!visible || saliendo) return;
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar(false);
      else if (e.key === 'ArrowRight') siguiente();
      else if (e.key === 'ArrowLeft') anterior();
    };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [visible, saliendo, cerrar, siguiente, anterior]);

  if (!visible || !pasos.length) return null;

  const paso = pasos[indice];
  const esBienvenida = paso.objetivo === null;
  const totalGuiados = pasos.filter((p) => p.objetivo).length;
  const numeroGuiado = pasos.slice(0, indice + 1).filter((p) => p.objetivo).length;
  const Icono = paso.Icono;

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-popup)] motion-safe:animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-titulo"
      aria-describedby="tour-texto"
      data-tour-dialogo=""
    >
      {/* Capa que bloquea los clics a la página mientras dura el recorrido */}
      <div className="absolute inset-0" aria-hidden="true" />

      {/* Foco: el oscurecido es su sombra, así el hueco tiene esquinas redondeadas y se anima con un solo elemento */}
      <div
        ref={focoRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 rounded-2xl"
        style={{ boxShadow: '0 0 0 200vmax color-mix(in srgb, var(--color-ink) 72%, transparent)' }}
      >
        {!esBienvenida && <div className="absolute inset-0 rounded-2xl ring-[3px] ring-brand-400" />}
        <div ref={anilloRef} className="absolute inset-0 rounded-2xl ring-4 ring-brand-300 opacity-0" />
      </div>

      <div ref={tarjetaRef} className="absolute left-0 top-0 w-[min(22rem,calc(100vw-2rem))] origin-center will-change-transform" style={{ opacity: 0 }}>
        {/* Flecha hacia el elemento (borde de arriba o de abajo según dónde quedó la tarjeta) */}
        <span
          ref={flechaRef}
          aria-hidden="true"
          className="absolute h-4 w-4 -translate-x-1/2 rotate-45 border-line bg-white data-[lado=abajo]:-bottom-2 data-[lado=abajo]:border-b data-[lado=abajo]:border-r data-[lado=arriba]:-top-2 data-[lado=arriba]:border-l data-[lado=arriba]:border-t data-[lado=ninguno]:hidden"
        />
        <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
          <div className="p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <span
                className={`flex shrink-0 items-center justify-center rounded-xl ${
                  esBienvenida ? 'h-12 w-12 bg-brand-500 text-white' : 'h-10 w-10 bg-brand-50 text-brand-600'
                }`}
              >
                <Icono className={esBienvenida ? 'h-6 w-6' : 'h-5 w-5'} aria-hidden="true" />
              </span>
              <div className="flex items-center gap-2">
                {!esBienvenida && (
                  <span className="text-xs font-semibold text-muted" aria-live="polite">
                    Paso {numeroGuiado} de {totalGuiados}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => cerrar(false)}
                  aria-label="Cerrar el recorrido"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
                >
                  <FiX className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <h2 id="tour-titulo" className={`font-bold text-ink ${esBienvenida ? 'text-xl' : 'text-lg'}`}>
              {paso.titulo}
            </h2>
            <p id="tour-texto" className="mt-1 text-sm text-ink-soft">
              {paso.texto}
            </p>

            <div className="mt-5 flex items-center justify-between gap-3">
              {esBienvenida ? (
                <span />
              ) : (
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {pasos
                    .filter((p) => p.objetivo)
                    .map((p, i) => (
                      <span
                        key={p.id}
                        className={`h-1.5 rounded-full transition-[width,background-color] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                          i + 1 === numeroGuiado ? 'w-6 bg-brand-500' : i + 1 < numeroGuiado ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-line'
                        }`}
                      />
                    ))}
                </div>
              )}
              <div className="flex gap-2">
                {esBienvenida ? (
                  <button type="button" onClick={() => cerrar(false)} className={`${adminSecondaryButton} h-11`}>
                    Ahora no
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={anterior}
                    aria-label="Paso anterior"
                    // Sin la receta: su px-5 le dejaba 4 px al ícono dentro de un botón de 44 px
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white text-ink transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                  >
                    <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <button ref={principalRef} type="button" onClick={siguiente} disabled={saliendo} className={`${adminPrimaryButton} h-11`}>
                  {esBienvenida ? 'Empezar' : ultimo ? 'Listo' : 'Siguiente'}
                  {ultimo ? <FiCheck className="h-4 w-4" aria-hidden="true" /> : <FiArrowRight className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
