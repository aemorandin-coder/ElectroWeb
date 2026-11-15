'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { IconoBuscar, IconoCarrito, IconoCheck, IconoCuadricula, IconoCuenta, IconoFlechaDerecha, IconoNovedad } from '@/components/iconos';
import type { IconType } from '@/components/iconos';
import ChispaGuia, { PROPORCION_CHISPA, type PoseGuia } from '@/components/onboarding/ChispaGuia';
import IconoDibujado, { type AccionIcono } from '@/components/onboarding/IconoDibujado';
import { CLAVE_RECORRIDO, atraparTab, hayOtroDialogoAbierto, marcarVista, objetivoVisible, yaVista } from '@/components/onboarding/compartido';
import { useSettings } from '@/contexts/SettingsContext';
import { adminPrimaryButton } from '@/lib/admin-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { lanzarConfeti } from '@/lib/motion/confeti';
import {
  RESORTES,
  avanzarResorte,
  crearResorte,
  fijarResorte,
  prefiereMenosMovimiento,
  useBucleAnimacion,
  type ConfigResorte,
} from '@/lib/motion/resorte';

/**
 * Recorrido de bienvenida (C-89, con física; C-257, el kit de onboarding).
 * El equipo eligió el 15/11 la A, "Chispa te guía": "muy minucioso con las animaciones, muy bien construido, amigable e
 * iconizado, que invite a aprender". Y sobre la maqueta: "anima el ícono de acción y coloca a Chispa sin que se tape".
 * - Todo se oscurece con el azul oscuro del logo menos lo que se explica. El foco viaja con un resorte firme y, cuando se
 *   posa, un anillo blanco se dibuja alrededor del elemento, una vez.
 * - La tarjeta lo sigue con un resorte suave (se inclina un poco mientras viaja). Dos palabras grandes, una frase corta,
 *   la placa azul con el ícono que se dibuja y hace su gesto, y la flecha de "Siguiente" que invita a seguir.
 * - Chispa se asoma por detrás de la tarjeta (la tarjeta le tapa la cintura: el corte nunca se ve), con una pose por paso.
 *   Se le ven las manos (86 % por encima del borde) y nunca tapa el elemento: si está arriba, la tarjeta baja y Chispa
 *   queda entre los dos; si está abajo, la tarjeta sube y Chispa se asoma por arriba. Si la pantalla no le da lugar, no sale.
 *   Entre un paso y otro se agacha detrás de la tarjeta, cambia de pose escondido y vuelve a asomarse con un rebote.
 * - Pasos según lo que se ve: en el teléfono "Explora" y "Tu carrito" apuntan a la barra de abajo y en la PC al header.
 * - Teclado: Esc cierra, ← y → cambian de paso, el Tab no sale del recorrido. Al terminar, confeti desde "¡Listo!".
 * - Con movimiento reducido todo llega quieto: sin viajes, sin trazos y sin confeti.
 */

type Paso = { id: string; objetivo: string | null; titulo: string; texto: string; Icono: IconType; accion: AccionIcono; pose: PoseGuia };

const PASOS: Paso[] = [
  { id: 'bienvenida', objetivo: null, titulo: '¡Hola!', texto: 'Te enseño la tienda en 4 toques.', Icono: IconoNovedad, accion: 'destello', pose: 'saluda' },
  { id: 'buscar', objetivo: '[data-tour="buscar"]', titulo: 'Busca', texto: 'Escribe y lo encuentras.', Icono: IconoBuscar, accion: 'buscar', pose: 'senala' },
  { id: 'catalogo', objetivo: '[data-tour="catalogo"]', titulo: 'Explora', texto: 'Todo, por categorías.', Icono: IconoCuadricula, accion: 'catalogo', pose: 'explica' },
  { id: 'carrito', objetivo: '[data-tour="carrito"]', titulo: 'Tu carrito', texto: 'Se guarda aunque cierres.', Icono: IconoCarrito, accion: 'carrito', pose: 'pulgar' },
  { id: 'cuenta', objetivo: '[data-tour="cuenta"]', titulo: 'Tu cuenta', texto: 'Tus pedidos y tus Puntos ES.', Icono: IconoCuenta, accion: 'cuenta', pose: 'celebra' },
];

const MARGEN = 16; // de los bordes de la pantalla
const HOLGURA = 8; // del foco alrededor del elemento
const SEPARACION = 8; // entre el anillo y la cabeza de Chispa
const SOBRE_EL_FOCO = 32; // entre la tarjeta y el elemento, cuando la tarjeta va encima
/** El anillo va 4 px afuera del hueco, sobre el oscurecido: blanco sobre azul se ve siempre (adentro se perdía en un header blanco) */
const AFUERA_ANILLO = 4;
const RADIO_ANILLO = 16 + AFUERA_ANILLO; // el hueco es rounded-2xl (16 px)
/** Lo que se ve de Chispa por encima de la tarjeta: con 86 % se le ven las manos en las cinco poses */
const ASOMA = 0.86;
/** Arriba de la imagen queda aire transparente (lugar para el gorro): no cuenta para separarlo del elemento */
const VACIO_CON_GORRO = 73 / 735;
const VACIO_SIN_GORRO = 161 / 735;
/** Lugar arriba del recorte para que el rebote no le corte el gorro */
const CABECERA = 24;
/** Agacharse: rápido y sin rebote. Asomarse: con un rebote chico (≈8 %) */
const CHISPA_BAJA: ConfigResorte = { rigidez: 420, amortiguacion: 41 };
const CHISPA_SUBE: ConfigResorte = { rigidez: 260, amortiguacion: 20 };

const limitar = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export function GuidedTour() {
  const { data: session, status } = useSession();
  const { settings } = useSettings();
  const gorro = Boolean(settings?.gorroNavidad);
  const [pasos, setPasos] = useState<Paso[]>([]);
  const [indice, setIndice] = useState(0);
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [poseVisible, setPoseVisible] = useState<PoseGuia>('saluda');
  // Medida de Chispa (más chico en el teléfono) y cuánto se asoma por encima de la tarjeta
  const [guia, setGuia] = useState({ ancho: 150, asoma: 158 });
  useBodyScrollLock(visible);

  const raizRef = useRef<HTMLDivElement>(null);
  const focoRef = useRef<HTMLDivElement>(null);
  const anilloRef = useRef<SVGRectElement>(null);
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const chispaRef = useRef<HTMLDivElement>(null);
  const principalRef = useRef<HTMLButtonElement>(null);
  const focoPrevio = useRef<Element | null>(null);
  /** La última vez se usó el teclado (no el dedo ni el ratón) */
  const conTeclado = useRef(false);

  // Estado físico: vive fuera de React y se escribe directo en el DOM en cada cuadro
  const fisica = useRef({
    foco: { x: crearResorte(0), y: crearResorte(0), w: crearResorte(0), h: crearResorte(0) },
    tarjeta: { x: crearResorte(0), y: crearResorte(0), escala: crearResorte(0.9), opacidad: crearResorte(0) },
    /** 0: Chispa asomado; 1: escondido detrás de la tarjeta */
    chispa: crearResorte(1),
    /** Píxeles que baja Chispa para esconderse del todo */
    recorridoChispa: 170,
    /** Primera vez: se asoma cuando la tarjeta ya se ve */
    chispaEspera: false,
    /** Cambio de paso: cuando termine de agacharse, cambia de pose y vuelve a subir */
    chispaVuelve: false,
    poseSiguiente: 'saluda' as PoseGuia,
    dibujoPendiente: false,
    colocado: false,
  });

  // Arranque: con sesión, sin haberlo visto, con los elementos en pantalla y sin otro diálogo (por ejemplo el popup del home)
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    if (yaVista(CLAVE_RECORRIDO)) return;

    let intentos = 0;
    let timer: ReturnType<typeof setTimeout>;
    const probar = () => {
      intentos++;
      if (hayOtroDialogoAbierto()) {
        if (intentos < 15) timer = setTimeout(probar, 1500);
        return;
      }
      const disponibles = PASOS.filter((p) => !p.objetivo || objetivoVisible(p.objetivo));
      const guiados = disponibles.filter((p) => p.objetivo).length;
      // Sin el header de la tienda (menos de 3 elementos) no tiene sentido: se intenta en otra página
      if (guiados < 3) return;
      const nombre = session.user?.name?.trim().split(/\s+/)[0];
      focoPrevio.current = document.activeElement;
      setSaliendo(false);
      setPasos(
        disponibles.map((p) =>
          p.id === 'bienvenida' ? { ...p, titulo: nombre ? `¡Hola, ${nombre}!` : p.titulo, texto: `Te enseño la tienda en ${guiados} toques.` } : p
        )
      );
      setPoseVisible(disponibles[0].pose);
      fisica.current.poseSiguiente = disponibles[0].pose;
      setIndice(0);
      setVisible(true);
    };
    timer = setTimeout(probar, 900);
    return () => clearTimeout(timer);
  }, [status, session]);

  /** El anillo se dibuja alrededor del elemento, una vez, cuando el foco se posa */
  const dibujarAnillo = useCallback(() => {
    const anillo = anilloRef.current;
    if (!anillo) return;
    const f = fisica.current;
    anillo.getAnimations().forEach((a) => a.cancel());
    anillo.style.opacity = '1';
    if (prefiereMenosMovimiento()) {
      anillo.style.strokeDasharray = 'none';
      return;
    }
    // El largo del rectángulo redondeado, para que el trazo empiece escondido y termine cerrado
    const w = Math.max(0, f.foco.w.destino + AFUERA_ANILLO * 2);
    const h = Math.max(0, f.foco.h.destino + AFUERA_ANILLO * 2);
    const radio = Math.min(RADIO_ANILLO, w / 2, h / 2);
    const largo = 2 * (w + h) - (8 - 2 * Math.PI) * radio;
    anillo.style.strokeDasharray = `${largo}`;
    const animacion = anillo.animate([{ strokeDashoffset: largo }, { strokeDashoffset: 0 }], {
      duration: 650,
      easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)',
      fill: 'forwards',
    });
    // Ya cerrado, sin el guion: si la pantalla cambia de tamaño, el anillo sigue entero
    animacion.onfinish = () => {
      anillo.style.strokeDasharray = 'none';
      animacion.cancel();
    };
  }, []);

  const pasoFisico = useCallback(
    (dt: number) => {
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
      quieto = avanzarResorte(f.chispa, dt, f.chispa.destino >= 1 ? CHISPA_BAJA : CHISPA_SUBE, 0.002) && quieto;

      if (f.chispaEspera && f.tarjeta.opacidad.valor > 0.6) {
        f.chispaEspera = false;
        f.chispa.destino = 0;
        quieto = false;
      }
      if (f.chispaVuelve && f.chispa.valor > 0.9) {
        // Escondido detrás de la tarjeta: cambia de pose sin que se vea y vuelve a asomarse
        f.chispaVuelve = false;
        setPoseVisible(f.poseSiguiente);
        f.chispa.destino = 0;
        quieto = false;
      }

      foco.style.transform = `translate3d(${f.foco.x.valor}px, ${f.foco.y.valor}px, 0)`;
      foco.style.width = `${Math.max(0, f.foco.w.valor)}px`;
      foco.style.height = `${Math.max(0, f.foco.h.valor)}px`;

      // La tarjeta se inclina según su velocidad horizontal, como si tuviera peso
      const inclinacion = limitar(f.tarjeta.x.velocidad * 0.01, -5, 5);
      tarjeta.style.transform = `translate3d(${f.tarjeta.x.valor}px, ${f.tarjeta.y.valor}px, 0) rotate(${inclinacion}deg) scale(${f.tarjeta.escala.valor})`;
      tarjeta.style.opacity = String(limitar(f.tarjeta.opacidad.valor, 0, 1));
      if (chispaRef.current) chispaRef.current.style.transform = `translate3d(0, ${(f.chispa.valor * f.recorridoChispa).toFixed(2)}px, 0)`;

      if (focoQuieto && f.dibujoPendiente) {
        f.dibujoPendiente = false;
        dibujarAnillo();
      }
      return quieto;
    },
    [dibujarAnillo]
  );

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

      const anchoGuia = vw < 640 ? 116 : 150;
      const altoGuia = Math.round(anchoGuia * PROPORCION_CHISPA);
      const asoma = Math.round(altoGuia * ASOMA);
      // La cabeza (o el gorro) empieza más abajo que el borde de la imagen
      const asomaVisible = Math.round(altoGuia * (ASOMA - (gorro ? VACIO_CON_GORRO : VACIO_SIN_GORRO)));

      let foco = { x: vw / 2, y: vh / 2, w: 0, h: 0 };
      let tx = (vw - ancho) / 2;
      let ty: number;
      let cabe = true;

      if (!el) {
        // Bienvenida: Chispa y la tarjeta juntos, un poco por encima del centro
        const libre = vh - asoma - alto;
        if (libre >= MARGEN * 2) ty = asoma + libre * 0.45;
        else {
          cabe = false;
          ty = Math.max(MARGEN, (vh - alto) / 2);
        }
      } else {
        const r = el.getBoundingClientRect();
        foco = { x: r.left - HOLGURA, y: r.top - HOLGURA, w: r.width + HOLGURA * 2, h: r.height + HOLGURA * 2 };
        tx = limitar(r.left + r.width / 2 - ancho / 2, MARGEN, vw - ancho - MARGEN);
        if (r.top + r.height / 2 < vh / 2) {
          // Elemento arriba: la tarjeta baja y Chispa queda entre los dos, sin taparlo
          ty = foco.y + foco.h + SEPARACION + asomaVisible;
          if (ty + alto > vh - MARGEN) {
            cabe = false;
            ty = Math.min(foco.y + foco.h + SEPARACION + 6, vh - alto - MARGEN);
          }
        } else {
          // Elemento abajo (la barra del teléfono): la tarjeta sube y Chispa se asoma por arriba, lejos del elemento
          ty = foco.y - SOBRE_EL_FOCO - alto;
          if (ty - asoma < MARGEN) {
            cabe = false;
            ty = Math.max(MARGEN, ty);
          }
        }
      }
      f.recorridoChispa = asoma + 6;
      setGuia((antes) => (antes.ancho === anchoGuia && antes.asoma === asoma ? antes : { ancho: anchoGuia, asoma }));

      const reducido = prefiereMenosMovimiento();
      const destinos: Array<[typeof f.foco.x, number]> = [
        [f.foco.x, foco.x],
        [f.foco.y, foco.y],
        [f.foco.w, foco.w],
        [f.foco.h, foco.h],
        [f.tarjeta.x, tx],
        [f.tarjeta.y, ty],
        [f.tarjeta.opacidad, 1],
        [f.tarjeta.escala, 1],
      ];
      if (instantaneo || reducido || !f.colocado) {
        for (const [r, v] of destinos) fijarResorte(r, v);
        fijarResorte(f.chispa, cabe ? 0 : 1);
        f.chispaVuelve = false;
        f.chispaEspera = false;
        setPoseVisible(paso.pose);
        if (!reducido && !f.colocado) {
          // Primera aparición: la tarjeta crece desde un poco más chica, el foco se abre desde un punto y Chispa espera
          // a que la tarjeta se vea para asomarse
          f.tarjeta.escala.valor = 0.86;
          f.tarjeta.opacidad.valor = 0;
          f.tarjeta.y.valor = ty + 18;
          f.chispa.valor = 1;
          f.chispa.destino = 1;
          f.chispaEspera = cabe;
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
        // Cambio de paso: la tarjeta se encoge y rebota, y Chispa se agacha; vuelve con la pose nueva si hay lugar
        f.tarjeta.escala.valor = 0.95;
        f.chispa.destino = 1;
        f.chispaEspera = false;
        f.chispaVuelve = cabe;
        f.poseSiguiente = paso.pose;
      }
      // El anillo se apaga mientras el foco viaja y se vuelve a dibujar cuando llega
      if (anilloRef.current) {
        anilloRef.current.getAnimations().forEach((a) => a.cancel());
        anilloRef.current.style.opacity = '0';
      }
      f.dibujoPendiente = Boolean(el);
      iniciar();
    },
    [pasos, indice, iniciar, gorro]
  );

  // Cada paso: medir, mover y dar el foco del teclado al botón principal
  useLayoutEffect(() => {
    if (!visible) return;
    colocar(false);
    // El contorno del foco solo para quien usa el teclado: con el dedo o el ratón no hace falta
    principalRef.current?.focus({ preventScroll: true, focusVisible: conTeclado.current } as FocusOptions);
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
      marcarVista(CLAVE_RECORRIDO);
      fetch('/api/user/onboarding', { method: 'POST' }).catch(() => {});

      if (celebrar && principalRef.current) {
        const r = principalRef.current.getBoundingClientRect();
        lanzarConfeti({ x: r.left + r.width / 2, y: r.top });
      }
      if (prefiereMenosMovimiento()) {
        setVisible(false);
        return;
      }
      // Salida: Chispa se agacha, la tarjeta se encoge y se desvanece, y el foco se abre a toda la pantalla
      const f = fisica.current;
      f.chispa.destino = 1;
      f.chispaVuelve = false;
      f.chispaEspera = false;
      f.tarjeta.escala.destino = 0.9;
      f.tarjeta.opacidad.destino = 0;
      f.foco.x.destino = -window.innerWidth;
      f.foco.y.destino = -window.innerHeight;
      f.foco.w.destino = window.innerWidth * 3;
      f.foco.h.destino = window.innerHeight * 3;
      f.dibujoPendiente = false;
      if (anilloRef.current) anilloRef.current.style.opacity = '0';
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
      conTeclado.current = true;
      if (e.key === 'Escape') cerrar(false);
      else if (e.key === 'ArrowRight') siguiente();
      else if (e.key === 'ArrowLeft') anterior();
      else atraparTab(e, raizRef.current);
    };
    const alTocar = () => {
      conTeclado.current = false;
    };
    window.addEventListener('keydown', alTeclado);
    window.addEventListener('pointerdown', alTocar);
    return () => {
      window.removeEventListener('keydown', alTeclado);
      window.removeEventListener('pointerdown', alTocar);
    };
  }, [visible, saliendo, cerrar, siguiente, anterior]);

  if (!visible || !pasos.length) return null;

  const paso = pasos[indice];
  const esBienvenida = paso.objetivo === null;

  return createPortal(
    <div
      ref={raizRef}
      className="fixed inset-0 z-[var(--z-popup)] motion-safe:animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-titulo"
      aria-describedby="tour-texto"
      data-tour-dialogo=""
      data-onboarding=""
    >
      {/* Capa que bloquea los clics a la página mientras dura el recorrido */}
      <div className="absolute inset-0" aria-hidden="true" />

      {/* Foco: el oscurecido es su sombra (el azul oscuro del logo), así el hueco tiene esquinas redondeadas y se anima con un solo elemento */}
      <div
        ref={focoRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 rounded-2xl"
        style={{ boxShadow: '0 0 0 200vmax color-mix(in srgb, var(--color-brand-700) 72%, transparent)' }}
      >
        {!esBienvenida && (
          // El anillo, 4 px afuera del hueco: entre los dos queda una línea del oscurecido y el anillo se lee como un halo
          <svg className="absolute -left-1 -top-1 h-[calc(100%+8px)] w-[calc(100%+8px)] overflow-visible" aria-hidden="true">
            <rect
              ref={anilloRef}
              width="100%"
              height="100%"
              rx={RADIO_ANILLO}
              fill="none"
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
              style={{ opacity: 0 }}
            />
          </svg>
        )}
      </div>

      <div ref={tarjetaRef} className="absolute left-0 top-0 w-[min(26.25rem,calc(100vw-2.5rem))] origin-center will-change-transform" style={{ opacity: 0 }}>
        {/* Chispa, detrás de la tarjeta: la ventana termina 2 px por debajo de su borde de arriba (la tarjeta lo tapa), así
            no queda una línea entre los dos; arriba sobra lugar para el rebote. A 20 px de la esquina, donde el borde es recto. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-5 overflow-hidden"
          style={{ bottom: 'calc(100% - 2px)', width: guia.ancho, height: guia.asoma + 2 + CABECERA }}
        >
          {/* Su posición la escribe la física en cada cuadro (React no la toca) */}
          <div ref={chispaRef} className="absolute left-0 will-change-transform" style={{ top: CABECERA }}>
            <ChispaGuia pose={poseVisible} ancho={guia.ancho} />
          </div>
        </div>

        <div className="onb-tarjeta relative rounded-[1.375rem] bg-white px-4 pb-3.5 pt-4 sm:rounded-[1.625rem] sm:px-[1.375rem] sm:pb-[1.125rem] sm:pt-5">
          <div className="flex items-center gap-3.5">
            {/* overflow-hidden: el carrito entra rodando desde el borde de la placa */}
            <span key={`placa-${paso.id}`} className="onb-placa flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-500 text-white sm:h-14 sm:w-14">
              <IconoDibujado Icono={paso.Icono} accion={paso.accion} className="h-7 w-7 sm:h-8 sm:w-8" retraso={0.2} />
            </span>
            <div key={`texto-${paso.id}`} className="min-w-0">
              <h2
                id="tour-titulo"
                className="onb-sube text-xl font-bold leading-tight text-brand-700 sm:text-2xl"
                style={{ '--onb-retraso': '0.08s' } as CSSProperties}
              >
                {paso.titulo}
              </h2>
              <p id="tour-texto" className="onb-sube mt-0.5 text-[15px] leading-snug text-ink-soft" style={{ '--onb-retraso': '0.16s' } as CSSProperties}>
                {paso.texto}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {pasos.map((p, i) => (
                <span
                  key={p.id}
                  className={`h-2 rounded-full transition-[width,background-color] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    i === indice ? 'w-[22px] bg-brand-500' : i < indice ? 'w-2 bg-brand-300' : 'w-2 bg-brand-200'
                  }`}
                />
              ))}
            </div>
            <span className="sr-only" aria-live="polite">
              Paso {indice + 1} de {pasos.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => cerrar(false)}
                className="h-11 rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Saltar
              </button>
              <button ref={principalRef} type="button" onClick={siguiente} disabled={saliendo} className={`${adminPrimaryButton} px-4!`}>
                {esBienvenida ? 'Empezar' : ultimo ? '¡Listo!' : 'Siguiente'}
                {ultimo ? (
                  <IconoCheck className="h-4 w-4" aria-hidden="true" />
                ) : (
                  // La flecha empuja dos veces hacia adelante, una sola vez por paso: invita a seguir
                  <span key={`flecha-${paso.id}`} className="onb-empuja inline-flex">
                    <IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
