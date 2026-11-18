'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  IconoAdvertencia, IconoAgrandar, IconoCheck, IconoChevronDerecha, IconoChevronIzquierda, IconoClaqueta, IconoCompartir, IconoCopiar,
  IconoDescargar, IconoDeshacer, IconoEditar, IconoEliminar, IconoEstrella, IconoFlechaIzquierda, IconoImagen, IconoMas, IconoNube,
  IconoPausa, IconoPintura, IconoPlay, IconoRehacer, IconoTexto, type IconType,
} from '@/components/iconos';
import AsiFunciona from '@/components/onboarding/AsiFunciona';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import { adminEmpty, adminHint, adminIconButton, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { PASO_PUBLICAR, firstOpenStep, flyerChecks, stepDone, type TextIssues } from '@/lib/studio/checks';
import { cambiarCapa, duplicarCapa, moverCapa, nuevaCapa, nuevoIdCapa, nuevoSticker, puedeAgregarCapa, type CambioCapa } from '@/lib/studio/capas';
import { STICKERS } from '@/lib/studio/stickers';
import { duracionDe } from '@/lib/studio/animaciones';
import { cargarFuentes } from '@/lib/studio/fuentes';
import {
  H,
  StudioImages,
  formatHeight,
  W,
  bgFor,
  createRenderer,
  flyerImageSources,
  loadStudioFonts,
  missingImages,
  qrUrlFor,
  type CajaCapa,
  type ProductSrc,
  type StudioRenderer,
} from '@/lib/studio/engine';
import { canvasBlob, GrabacionInterrumpida, grabarVideo, type VideoGrabado } from '@/lib/studio/exportar';
import {
  ANIMATIONS, BACKGROUNDS, FORMATS, TEMPLATES, requiredPhotos, type BackgroundId, type EstiloCapa, type FormatId, type StudioFlyerData,
} from '@/lib/studio/schema';
import { esErrorDeVersion } from '@/lib/version-build';
import { fileBase, uploadStudioImage } from './exporters';
import Lienzo from './Lienzo';
import StepAnimacion from './StepAnimacion';
import StepCapas, { type AccionesCapas } from './StepCapas';
import StepContent from './StepContent';
import StepDesign from './StepDesign';
import StepPhoto from './StepPhoto';
import StepPublish from './StepPublish';
import { useStudioContext } from './StudioContext';
import Terminada, { type ArchivoListo, type Final } from './Terminada';
import PresenciaEnEditor from '@/components/admin/edicion/PresenciaEnEditor';
import { toggleButton } from './ui';
import { useDownloadGate } from './useDownloadGate';
import type { SaveStatus } from './useStudio';

/** C-270: los seis pasos, con la ruta de pasos del panel (components/admin/Pasos, PLAN.md §1.6) */
const STEPS: [number, string, IconType][] = [
  [1, 'Contenido', IconoEditar],
  [2, 'Fotos', IconoImagen],
  [3, 'Diseño', IconoPintura],
  [4, 'Textos y stickers', IconoTexto],
  [5, 'Animación', IconoClaqueta],
  [6, 'Publicar', IconoCompartir],
];
const SAFE_KEY = 'studio-safe';

/** Qué se hace en cada paso (C-116, fase 2): una línea arriba del paso */
const STEP_HELP: Record<number, string> = {
  1: 'Qué publicar y el producto. Con un producto de la tienda, el precio y la oferta se ponen solos.',
  2: 'La foto de cada producto: pégala (Ctrl+V), arrástrala o elígela. Mejor con fondo blanco o transparente.',
  3: 'Opcional: formato, fondo, efectos y colores. Si no cambias nada, queda con el diseño de la plantilla.',
  4: 'Opcional: títulos, subtítulos y textos sueltos. Se mueven, se agrandan y se giran sobre la vista previa.',
  5: 'Opcional: cómo entra la historia en el video. Las piezas sueltas entran después de la plantilla.',
  6: 'Revisa la lista, descarga la imagen o el video y copia el texto para Instagram.',
};

/** Vista previa chica del teléfono, para que el editor quede a la vista (se agranda con un botón) */
const PREVIEW_SMALL: Record<FormatId, string> = {
  story: 'max-lg:max-w-[9rem]',
  post45: 'max-lg:max-w-[11rem]',
  post11: 'max-lg:max-w-[12rem]',
};

/**
 * C-295: en pantalla completa, la vista previa ocupa todo lo que deja libre la hoja de abajo, con su proporción: el
 * contenedor mide su ancho y su alto (container-type: size) y la vista toma el menor de los dos.
 */
const PREVIEW_GRANDE: Record<FormatId, string> = {
  story: 'aspect-[9/16] w-[min(100cqw,calc(100cqh*9/16))]',
  post45: 'aspect-[4/5] w-[min(100cqw,calc(100cqh*4/5))]',
  post11: 'aspect-square w-[min(100cqw,100cqh)]',
};

/** C-295: el mejor tiempo para sacar una historia en este navegador (para "Tu mejor tiempo" del final) */
const MEJOR_KEY = 'studio-mejor-tiempo';

/** C-295: lo visible de la pantalla (sin el teclado del teléfono), para que la pantalla completa no quede debajo de él */
function suscribirVista(cb: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener('resize', cb);
  vv?.addEventListener('scroll', cb);
  return () => {
    vv?.removeEventListener('resize', cb);
    vv?.removeEventListener('scroll', cb);
  };
}
const altoVisible = () => Math.round(window.visualViewport?.height ?? window.innerHeight);
const arribaVisible = () => Math.round(window.visualViewport?.offsetTop ?? 0);

/** Proporción de la vista previa y su ancho en escritorio (alto disponible × proporción) */
const PREVIEW_CLASS: Record<FormatId, string> = {
  story: 'aspect-[9/16] max-w-[15rem] sm:max-w-xs lg:w-[min(100%,calc((100dvh_-_17rem)*9/16))]',
  post45: 'aspect-[4/5] max-w-xs sm:max-w-sm lg:w-[min(100%,calc((100dvh_-_17rem)*4/5))]',
  post11: 'aspect-square max-w-xs sm:max-w-sm lg:w-[min(100%,calc(100dvh_-_17rem))]',
};

/**
 * C-268: la pestaña juntó código de dos versiones (quedó abierta durante un deploy) y una descarga falló. En vez del error
 * crudo ("(0 , p.recordCanvas) is not a function"), qué hacer y el botón: guarda lo pendiente y recarga.
 */
function avisarRecargar(guardar: () => Promise<unknown>) {
  toast.error(
    (t) => (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        El panel se actualizó mientras lo tenías abierto. Recarga la página y vuelve a descargar.
        <button
          type="button"
          onClick={async () => {
            toast.dismiss(t.id);
            await guardar().catch(() => undefined);
            window.location.reload();
          }}
          className="font-semibold text-brand-600 underline"
        >
          Guardar y recargar
        </button>
      </span>
    ),
    { id: 'studio-version', duration: 20000 },
  );
}

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: '',
  dirty: 'Cambios sin guardar…',
  saving: 'Guardando…',
  saved: 'Guardado',
  error: 'No se pudo guardar',
};


export default function Studio({ id }: { id: string }) {
  const studio = useStudioContext();
  const { loading, flyers, current: openFlyer, currentId: openId, currentCode, brand, status, update, select, saveNow } = studio;
  // C-193: el gorro y la franja salen del tema navideño de la tienda (Marketing → Navidad)
  const navidad = studio.store?.navidad ?? null;
  // Solo cuenta la historia de esta dirección: mientras se abre otra, el editor no muestra la anterior
  const current = openId === id ? openFlyer : null;
  const currentId = openId === id ? openId : null;
  const router = useRouter();
  const params = useSearchParams();
  const { confirm } = useConfirm();
  const gate = useDownloadGate();

  // Abre la historia de la dirección; si ya no existe, se dice
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (loading || openId === id) return;
    let alive = true;
    void select(id).then((ok) => {
      if (alive && !ok) setMissing(true);
    });
    return () => {
      alive = false;
    };
  }, [loading, openId, id, select]);
  // Al volver al inicio se guarda lo pendiente (el estado sigue vivo en el layout)
  useEffect(() => () => void saveNow(), [saveNow]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const images = useRef<StudioImages | null>(null);
  const renderer = useRef<StudioRenderer | null>(null);
  // Fotos pegadas que aún se están subiendo: se ven al instante, antes de tener su ruta en la tienda
  const [tempImages, setTempImages] = useState<Record<string, string>>({});
  const srcRef = useRef<ProductSrc>((p) => p.imageUrl);
  const productSrc: ProductSrc = useCallback((p, i) => tempImages[`${currentId}:${i}`] || p.imageUrl, [tempImages, currentId]);

  // C-270: `vistos` son los pasos opcionales ya recorridos (Diseño, Textos y Animación): la ruta los marca hechos
  const [stepFor, setStepFor] = useState<{ id: string | null; step: number; vistos: number[] }>({ id: null, step: 1, vistos: [] });
  // Al abrir otra historia se va al paso pedido (?paso=, desde el inicio) o al primero pendiente;
  // después el paso solo cambia cuando la persona lo elige
  const askedStep = Number(params.get('paso'));
  if (current && currentId && stepFor.id !== currentId) {
    setStepFor({ id: currentId, step: askedStep >= 1 && askedStep <= STEPS.length ? askedStep : firstOpenStep(current, productSrc), vistos: [] });
  }
  const step = stepFor.id === currentId ? stepFor.step : 1;
  const vistos = stepFor.id === currentId ? stepFor.vistos : [];
  const editorRef = useRef<HTMLElement | null>(null);
  const goStep = (k: number) => {
    setTiempo(null);
    setStepFor((s) => ({ id: currentId, step: k, vistos: s.id === currentId && !s.vistos.includes(s.step) ? [...s.vistos, s.step] : s.id === currentId ? s.vistos : [] }));
    // Si el comienzo del editor quedó arriba de la pantalla (teléfono, después de un paso largo), se vuelve a él. En
    // pantalla completa (C-295) la página de atrás no se mueve: el paso está en la hoja
    const top = editorRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 && !grandeRef.current) editorRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  const [slotFor, setSlotFor] = useState<{ id: string | null; slot: number }>({ id: null, slot: 0 });
  const activeSlot = slotFor.id === currentId ? slotFor.slot : 0;
  const setActiveSlot = useCallback((i: number) => setSlotFor({ id: currentId, slot: i }), [currentId]);

  const [playing, setPlaying] = useState(false);
  // C-273: desde qué segundo arranca la reproducción, y el segundo que va (para la aguja de la línea de tiempo)
  const desdeRef = useRef(0);
  const tiempoVivo = useRef(0);
  // Teléfono: vista previa chica por defecto
  const [bigPreview, setBigPreview] = useState(false);
  const playStart = useRef(0);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [safe, setSafe] = useState(() => {
    try {
      return localStorage.getItem(SAFE_KEY) === '1';
    } catch {
      return false;
    }
  });
  // C-295: el editor en pantalla completa (teléfono): la vista previa del alto de la pantalla y el paso en una hoja abajo
  const [grande, setGrande] = useState(false);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const grandeRef = useRef(grande);
  useEffect(() => {
    grandeRef.current = grande;
  });
  const [pedirGaleria, setPedirGaleria] = useState(false);
  useBodyScrollLock(grande);
  const vistaAlto = useSyncExternalStore(suscribirVista, altoVisible, () => 0);
  const vistaArriba = useSyncExternalStore(suscribirVista, arribaVisible, () => 0);
  // C-295: la vista previa se dibuja del tamaño en que se ve (su ancho en pantalla por la densidad, hasta 2×), no a 1080:
  // en el teléfono son de 3 a 14 veces menos puntos por cuadro. La descarga y el video siguen a 1080 (escala 1)
  const escalaVista = useRef(1);

  // Lo último que hay que dibujar, para el bucle de animación y las cargas de imágenes
  // C-273: un segundo fijo de la animación para mirarlo en la vista previa (desde la línea de tiempo); null = la imagen
  const [tiempo, setTiempo] = useState<number | null>(null);
  const scene = useRef({ current, brand, safe, code: currentCode, navidad, tiempo });
  useEffect(() => {
    scene.current = { current, brand, safe, code: currentCode, navidad, tiempo };
    srcRef.current = productSrc;
  });
  // Sube cada vez que llega una imagen: las miniaturas de los fondos con foto se vuelven a dibujar
  const [imgTick, setImgTick] = useState(0);

  // Textos que no caben ni con la letra más chica (C-116): se avisan en Publicar y al descargar
  const [textIssues, setTextIssues] = useState<TextIssues>({ cut: [], tiny: [] });
  // C-270: dónde quedó cada capa en el último dibujo, para tocarla en la vista previa
  const [cajas, setCajas] = useState<CajaCapa[]>([]);
  // C-287: los títulos de la plantilla que se arrastran
  const [cajasPiezas, setCajasPiezas] = useState<CajaCapa[]>([]);
  const drawStatic = useCallback(() => {
    if (!renderer.current || busyRef.current) return;
    const s = scene.current;
    renderer.current.draw(s.current, s.brand, { preview: true, safeZones: s.safe, code: s.code, navidad: s.navidad, t: s.tiempo, escala: escalaVista.current });
    // Las cajas y los avisos son los de la imagen (sin animación): con un segundo fijo no se tocan
    if (s.tiempo !== null) return;
    const now = renderer.current.textIssues();
    setTextIssues((prev) => (JSON.stringify(prev) === JSON.stringify(now) ? prev : now));
    const ahora = renderer.current.capasCajas();
    setCajas((prev) => (JSON.stringify(prev) === JSON.stringify(ahora) ? prev : ahora));
    const piezasAhora = renderer.current.piezasCajas();
    setCajasPiezas((prev) => (JSON.stringify(prev) === JSON.stringify(piezasAhora) ? prev : piezasAhora));
  }, []);

  // C-270: la capa elegida (de esta historia) y lo que se hace con las capas
  const [selFor, setSelFor] = useState<{ id: string | null; capa: string | null }>({ id: null, capa: null });
  const capaSel = selFor.id === currentId && current?.capas.some((c) => c.id === selFor.capa) ? selFor.capa : null;
  const setCapaSel = useCallback((capa: string | null) => setSelFor({ id: currentId, capa }), [currentId]);
  const capaSelRef = useRef(capaSel);
  useEffect(() => {
    capaSelRef.current = capaSel;
  });
  const textoCapaRef = useRef<HTMLTextAreaElement | null>(null);
  const [enfocar, setEnfocar] = useState(0);
  useEffect(() => {
    if (!enfocar) return;
    const frame = requestAnimationFrame(() => {
      textoCapaRef.current?.focus();
      textoCapaRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [enfocar]);
  // Un gesto en la vista previa (arrastrar, agrandar, girar) es un solo paso de deshacer: entra al historial con el primer cambio
  const gestoNuevo = useRef(false);
  // C-270: el alto de la ruta de pasos (en el teléfono queda fija arriba, y la vista previa, fija debajo)
  const pasosRef = useRef<HTMLDivElement | null>(null);
  const [altoPasos, setAltoPasos] = useState(0);
  useEffect(() => {
    const el = pasosRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAltoPasos(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentId]);

  const drawThumb = useCallback((target: HTMLCanvasElement, style: BackgroundId) => {
    const s = scene.current;
    if (renderer.current && s.current) renderer.current.drawBackgroundThumb(target, style, s.current, s.brand);
  }, []);

  // Canvas y motor: una vez
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || renderer.current) return;
    images.current = new StudioImages();
    renderer.current = createRenderer(canvas, images.current, (p, i) => srcRef.current(p, i));
    let frame = 0;
    images.current.onLoad = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        drawStatic();
        setImgTick((n) => n + 1);
      });
    };
    void loadStudioFonts().then(drawStatic);
    return () => cancelAnimationFrame(frame);
  }, [drawStatic, loading]);

  // C-295: la escala de la vista previa sigue a su tamaño (la chica, la grande, la pantalla completa, la PC). Cambiarla
  // borra el lienzo: se vuelve a dibujar enseguida (si se está reproduciendo, el próximo cuadro ya sale con ella)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const medir = () => {
      if (!c.clientWidth) return;
      const e = Math.min(1, Math.max(0.1, (c.clientWidth * Math.min(2, window.devicePixelRatio || 1)) / W));
      if (Math.abs(e - escalaVista.current) < 0.02) return;
      escalaVista.current = e;
      drawStatic();
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(c);
    return () => ro.disconnect();
  }, [drawStatic]);

  // C-295: Escape sale de la pantalla completa (si hay una pieza elegida, primero la suelta; si hay una ventana, es suyo)
  useEffect(() => {
    if (!grande) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || capaSelRef.current || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      setGrande(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [grande]);

  // C-271: las fuentes que usan las capas se cargan al elegirlas; cuando llegan, se vuelve a dibujar
  const fuentesUsadas = current ? [...new Set(current.capas.map((c) => (c.tipo === 'texto' ? c.fuente : STICKERS[c.sticker]?.texto?.fuente ?? 'montserrat')))].sort().join(',') : '';
  useEffect(() => {
    if (!fuentesUsadas) return;
    let vivo = true;
    void cargarFuentes(fuentesUsadas.split(',')).then(() => {
      if (vivo) drawStatic();
    });
    return () => {
      vivo = false;
    };
  }, [fuentesUsadas, drawStatic]);

  // Imagen fija cada vez que cambia algo (si no se está reproduciendo la animación)
  useEffect(() => {
    if (playing) return;
    const frame = requestAnimationFrame(drawStatic);
    return () => cancelAnimationFrame(frame);
  }, [current, brand, safe, tempImages, playing, drawStatic, currentCode, tiempo]);

  // Animación en la vista previa, en bucle
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    playStart.current = performance.now() - desdeRef.current * 1000;
    desdeRef.current = 0;
    const epoch = Date.now();
    const loop = (now: number) => {
      if (!busyRef.current && renderer.current) {
        const s = scene.current;
        const dur = duracionDe(s.current);
        const t = Math.min(dur, ((now - playStart.current) / 1000) % (dur + 0.8));
        tiempoVivo.current = t;
        renderer.current.draw(s.current, s.brand, { preview: true, safeZones: s.safe, t, epoch, code: s.code, navidad: s.navidad, escala: escalaVista.current });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const replay = () => reproducirDesde(0);
  /** C-273: reproduce desde ese segundo (null = detener). Mientras se reproduce no hay segundo fijo */
  const reproducirDesde = (desde: number | null) => {
    if (desde === null) {
      setPlaying(false);
      return;
    }
    setTiempo(null);
    if (playing) playStart.current = performance.now() - desde * 1000;
    else {
      desdeRef.current = desde;
      setPlaying(true);
    }
  };

  const currentIdRef = useRef(currentId);
  useEffect(() => {
    currentIdRef.current = currentId;
  });

  /** Foto pegada, arrastrada o elegida: se ve al instante y se sube a la tienda */
  const onFile = useCallback(
    async (index: number, file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Eso no es una imagen');
        return;
      }
      const id = currentId;
      if (!id) return;
      const key = `${id}:${index}`;
      const url = URL.createObjectURL(file);
      setTempImages((t) => ({ ...t, [key]: url }));
      try {
        const path = await uploadStudioImage(file);
        if (id === currentIdRef.current) {
          update((f) => ({ ...f, products: f.products.map((p, i) => (i === index ? { ...p, imageUrl: path } : p)) }));
        } else toast('La foto se subió, pero cambiaste de historia antes de terminar');
      } catch (e) {
        setTempImages((t) => {
          const next = { ...t };
          delete next[key];
          return next;
        });
        toast.error(e instanceof Error ? e.message : 'No se pudo subir la foto');
      }
    },
    [currentId, update],
  );

  // Ctrl+V en cualquier parte del estudio pega la foto en el producto marcado
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = scene.current.current;
      if (!f) return;
      const item = [...(e.clipboardData?.items ?? [])].find((it) => it.type.startsWith('image/'));
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      const n = TEMPLATES[f.template].n;
      if (n === 0) {
        toast('Esta plantilla no lleva foto de producto. Para una foto de fondo, usa "Tu foto" en Diseño.');
        return;
      }
      const slot = Math.min(activeSlot, n - 1);
      void onFile(slot, file);
      toast.success(n > 1 ? `Foto pegada en el producto ${slot + 1}` : 'Foto pegada');
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [activeSlot, onFile]);

  // Ctrl+Z deshace y Ctrl+Mayús+Z (o Ctrl+Y) rehace, en todo el estudio
  const { undo, redo } = studio;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // C-270: las capas. Lo que se calcula al azar (el id) se elige antes de `update`, para que el cambio sea el mismo
  // aunque React lo corra dos veces
  const capas: AccionesCapas = {
    agregar: (estilo: EstiloCapa) => {
      if (!current || !puedeAgregarCapa(current.capas)) return;
      const nueva = nuevaCapa(estilo, current.capas);
      update((f) => (f.capas.some((c) => c.id === nueva.id) ? f : { ...f, capas: [...f.capas, nueva] }));
      setCapaSel(nueva.id);
      if (step !== 4) goStep(4);
      setEnfocar((n) => n + 1);
    },
    agregarSticker: (st, extra) => {
      if (!current || !puedeAgregarCapa(current.capas)) return;
      const nuevo = nuevoSticker(st, current.capas, extra);
      update((f) => (f.capas.some((c) => c.id === nuevo.id) ? f : { ...f, capas: [...f.capas, nuevo] }));
      setCapaSel(nuevo.id);
      if (step !== 4) goStep(4);
    },
    cambiar: (cid: string, cambio: CambioCapa) => update((f) => ({ ...f, capas: cambiarCapa(f.capas, cid, cambio) })),
    borrar: (cid: string) => {
      update((f) => ({ ...f, capas: f.capas.filter((c) => c.id !== cid) }));
      if (capaSel === cid) setCapaSel(null);
    },
    duplicar: (cid: string) => {
      if (!current || !puedeAgregarCapa(current.capas)) return;
      const nid = nuevoIdCapa(current.capas.map((c) => c.id));
      update((f) => ({ ...f, capas: duplicarCapa(f.capas, cid, nid) }));
      setCapaSel(nid);
    },
    orden: (cid: string, paso: 1 | -1) => update((f) => ({ ...f, capas: moverCapa(f.capas, cid, paso) })),
  };
  /** Elegir una capa tocándola en la vista previa lleva a su paso, con lo suyo a la vista */
  const elegirCapa = (cid: string | null) => {
    setCapaSel(cid);
    if (cid && step !== 4 && step !== 5) goStep(4);
  };

  /** Bloquea la vista previa mientras se exporta y la devuelve al terminar */
  const exclusive = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      if (esErrorDeVersion(e)) avisarRecargar(saveNow);
      else if (e instanceof GrabacionInterrumpida) toast.error(e.message, { duration: 8000 });
      else toast.error(e instanceof Error ? e.message : 'No se pudo exportar');
    } finally {
      busyRef.current = false;
      setBusy(false);
      drawStatic();
    }
  };

  const renderStill = async (f: StudioFlyerData, src: ProductSrc, code: string | null): Promise<Blob | null> => {
    const r = renderer.current;
    const canvas = canvasRef.current;
    if (!r || !canvas || !images.current) return null;
    await loadStudioFonts(f);
    await images.current.whenReady(flyerImageSources(f, brand, src));
    const prev = srcRef.current;
    srcRef.current = src;
    r.draw(f, brand, { preview: false, code, navidad });
    const blob = await canvasBlob(canvas);
    srcRef.current = prev;
    return blob;
  };

  /** Anota los precios de esta descarga: si cambian en la tienda después, la lista avisa */
  const markCurrentExported = async () => {
    const f = flyers.find((x) => x.id === currentId);
    if (f) await studio.markExported([f]);
  };

  // C-116: una sola revisión para el paso Publicar, la lista del inicio y cada descarga
  const checks = current ? flyerChecks(current, { src: productSrc, live: studio.live, coupons: studio.coupons, store: studio.store, text: textIssues }) : [];
  /** Revisa antes de descargar: lo incompleto lleva a su paso, los avisos se confirman */
  const ready = async () => !!current && (await gate(checks, goStep));

  // C-295: el final (Terminada.tsx). Al sacar la imagen o el video se ve la pantalla de "lista", con lo que se hace con
  // ella: compartir, descargar, Telegram, copiar el texto y el enlace, u otra historia. Antes (C-287) una ventana
  // preguntaba a dónde iba antes de armarla, y después solo quedaba un aviso
  const [fin, setFin] = useState<Final | null>(null);
  // Desde cuándo está abierta esta historia en el editor, para "Lista en 2:14"
  const abiertaDesde = useRef<{ id: string | null; desde: number }>({ id: null, desde: 0 });
  useEffect(() => {
    if (currentId && abiertaDesde.current.id !== currentId) abiertaDesde.current = { id: currentId, desde: Date.now() };
  }, [currentId]);

  const cerrarFin = () => {
    if (fin?.archivo) URL.revokeObjectURL(fin.archivo.url);
    setFin(null);
  };

  /** Cuánto tardó (solo la primera vez que se saca, y si fue en menos de una hora) y si es el mejor tiempo */
  const medirTiempo = (primera: boolean, id: string | null): { tiempo: number | null; record: boolean } => {
    if (!primera || !id || abiertaDesde.current.id !== id) return { tiempo: null, record: false };
    const tiempo = (Date.now() - abiertaDesde.current.desde) / 1000;
    if (tiempo > 3600) return { tiempo: null, record: false };
    let record = false;
    try {
      const antes = Number(localStorage.getItem(MEJOR_KEY)) || 0;
      if (!antes || tiempo < antes) {
        record = antes > 0;
        localStorage.setItem(MEJOR_KEY, String(Math.round(tiempo)));
      }
    } catch {
      // Sin almacenamiento: no se recuerda el mejor tiempo
    }
    return { tiempo, record };
  };

  /** Cuántas historias se sacaron esta semana (desde el lunes), contando la que se acaba de sacar */
  const deLaSemana = (id: string | null) => {
    const lunes = new Date();
    lunes.setHours(0, 0, 0, 0);
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
    return flyers.filter((f) => f.id === id || (f.exported.at && new Date(f.exported.at) >= lunes)).length;
  };

  const sacarImagen = async (): Promise<ArchivoListo> => {
    if (!current) throw new Error('No hay una historia abierta');
    await studio.saveNow();
    const blob = await renderStill(current, productSrc, currentCode);
    if (!blob) throw new Error('No se pudo generar la imagen');
    await markCurrentExported();
    return { blob, nombre: `${fileBase(current)}.png`, url: URL.createObjectURL(blob), ancho: W, alto: formatHeight(current.format) };
  };

  const sacarVideo = async (alAvanzar: (fraccion: number) => void): Promise<ArchivoListo> => {
    if (!current || !canvasRef.current || !renderer.current || !images.current) throw new Error('No se pudo armar el video');
    await loadStudioFonts(current);
    await images.current.whenReady(flyerImageSources(current, brand, productSrc));
    const dur = duracionDe(current);
    const epoch = Date.now();
    const r = renderer.current;
    let avance = 0;
    const dibujar = (t: number) => {
      r.draw(current, brand, { preview: false, t, epoch, code: currentCode, navidad });
      // C-295: lo que va del video, cada 2 % (también cuando el navegador lo graba en tiempo real, que no avisaba nada)
      const f = Math.min(1, t / dur);
      if (f - avance >= 0.02) {
        avance = f;
        alAvanzar(f);
      }
    };
    // C-295: la vista previa está dibujada del tamaño en que se ve; el primer cuadro deja el lienzo en Full HD antes de que
    // el grabador lea su tamaño
    dibujar(0);
    // C-295: la pantalla encendida mientras se arma (si se apaga, el navegador frena el dibujo y el video se corta)
    const llave = await navigator.wakeLock?.request('screen').catch(() => null);
    let video: VideoGrabado;
    try {
      // C-286: cuadro por cuadro, en Full HD a 60 cuadros (antes, en tiempo real: el MP4 salía en trozos y el teléfono
      // lo cortaba en 3 s). Tarda unos segundos más, y el final muestra cuánto falta
      video = await grabarVideo(canvasRef.current, dibujar, dur, { fps: 60 });
    } finally {
      void llave?.release().catch(() => undefined);
    }
    await markCurrentExported();
    const nota = video.extension === 'webm' ? 'Tu navegador lo grabó en WEBM; Instagram prefiere MP4. Usa Chrome actualizado.'
      : !video.cuadroPorCuadro ? 'Este navegador lo grabó en tiempo real: si en el teléfono se ve cortado, sácalo desde Chrome actualizado.'
        : undefined;
    return { blob: video.blob, nombre: `${fileBase(current)}.${video.extension}`, url: URL.createObjectURL(video.blob), segundos: video.segundos, ancho: video.ancho, alto: video.alto, nota };
  };

  /** Revisa, arma la imagen o el video y muestra el final. Si falla, el final se cierra y el aviso dice qué pasó */
  const terminar = async (tipo: 'imagen' | 'video') => {
    if (!current || busyRef.current || !(await ready())) return;
    const primera = !current.exported.at;
    const id = currentId;
    let poster: string | null = null;
    try {
      poster = canvasRef.current?.toDataURL('image/jpeg', 0.85) ?? null;
    } catch {
      // Sin la vista del momento: el anillo va sobre el fondo
    }
    setFin({ tipo, fase: 'armando', progreso: 0, poster, archivo: null, tiempo: null, record: false, semana: 0 });
    const salida: { archivo: ArchivoListo | null } = { archivo: null };
    await exclusive(async () => {
      salida.archivo = tipo === 'video'
        ? await sacarVideo((p) => setFin((f) => (f && f.fase === 'armando' ? { ...f, progreso: p } : f)))
        : await sacarImagen();
    });
    const archivo = salida.archivo;
    if (!archivo) {
      setFin(null);
      return;
    }
    const marca = medirTiempo(primera, id);
    setFin((f) => (f ? { ...f, fase: 'lista', progreso: 1, archivo, ...marca, semana: deLaSemana(id) } : f));
  };

  /** "Otra igual": una copia de esta historia, en el primer paso, para cambiarle el producto */
  const otraIgual = async () => {
    cerrarFin();
    setGrande(false);
    const copy = await studio.duplicate();
    if (copy) router.push(`/admin/studio/${copy.id}?paso=1`);
  };

  const onDuplicate = async () => {
    const copy = await studio.duplicate();
    if (copy) router.push(`/admin/studio/${copy.id}`);
  };

  const onRemove = async () => {
    if (!current) return;
    const ok = await confirm({ title: 'Eliminar historia', message: `¿Eliminar "${current.name || 'Sin nombre'}"? No se puede deshacer.`, confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (ok && (await studio.remove())) router.push('/admin/studio');
  };

  const back = (
    <Link href="/admin/studio" className="mb-3 inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
      <IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" />
      Historias
    </Link>
  );

  if (missing) {
    return (
      <div>
        {back}
        <div className={adminEmpty}>
          <p className="font-semibold text-ink">Esta historia ya no existe</p>
          <p className="mt-1 text-sm text-muted">Se eliminó o el enlace está incompleto.</p>
        </div>
      </div>
    );
  }

  const miss = current ? missingImages(current, productSrc) : [];
  const format = current?.format ?? 'story';
  const alto = formatHeight(format);
  const enlace = current && currentCode ? qrUrlFor(current, brand, currentCode) : '';
  const abrirGrande = () => {
    setPlaying(false);
    setGrande(true);
  };
  /** En pantalla completa, agregar algo abre la hoja: el texto se escribe ahí */
  const agregarEnGrande = (estilo: EstiloCapa) => {
    setHojaAbierta(true);
    capas.agregar(estilo);
  };

  // C-270: la ruta de pasos (components/admin/Pasos): hecho, lo elegido en una línea, y todos se pueden tocar
  const pasos: Paso[] = current
    ? STEPS.map(([k, titulo, icono]) => {
        const n = current.capas.length;
        const hecho = k === 1 || k === 2 ? stepDone(k, current, productSrc) : k === PASO_PUBLICAR ? !!current.exported.at : vistos.includes(k) || (k === 4 && n > 0);
        const resumen =
          k === 1 ? (current.products[0]?.title && TEMPLATES[current.template].n ? current.products[0].title : TEMPLATES[current.template].label)
          : k === 2 ? (miss.length ? `Falta${miss.length > 1 ? 'n' : ''} ${miss.length} foto${miss.length > 1 ? 's' : ''}` : requiredPhotos(current.template) ? 'Fotos listas' : 'Sin fotos de producto')
          : k === 3 ? `${BACKGROUNDS[bgFor(current)]} · ${FORMATS[current.format].short}`
          : k === 4 ? (n ? `${n} pieza${n > 1 ? 's' : ''}` : 'Opcional')
          : k === 5 ? ANIMATIONS[current.anim]
          : current.exported.at ? 'Descargada' : 'Revisar y descargar';
        return { titulo, icono, hecho, resumen, disponible: true };
      })
    : [];

  // C-295: la misma vista previa (el mismo canvas: no se vuelve a crear) va en su lugar o, en pantalla completa, en el
  // espacio libre entre la barra de arriba y la hoja de abajo. Sobre el lienzo no hay menú del navegador ni selección
  const preview = (
    <div
      className={
        grande
          ? 'flex min-h-0 flex-1 items-center justify-center px-3 py-2 [container-type:size]'
          : 'flex flex-col items-center gap-2 bg-white pb-2 max-lg:-mx-3 max-lg:border-b max-lg:border-line max-lg:px-3 max-sm:pt-1 sm:max-lg:-mx-4 sm:max-lg:px-4 lg:gap-3 lg:pb-0'
      }
    >
      <div className={`relative select-none [-webkit-touch-callout:none] ${grande ? PREVIEW_GRANDE[format] : `w-full ${PREVIEW_CLASS[format]} ${bigPreview ? '' : PREVIEW_SMALL[format]} lg:max-w-none`}`}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          role="img"
          aria-label={current ? `Vista previa de ${current.name}` : 'Vista previa'}
          className={`block h-auto w-full bg-white ${grande ? 'rounded-lg' : 'rounded-md shadow-lg'}`}
        />
        {current && (
          <Lienzo
            canvasRef={canvasRef}
            alto={alto}
            capas={current.capas}
            cajas={cajas}
            sel={capaSel}
            activo={!playing && !busy && tiempo === null}
            historia={format === 'story'}
            onSel={elegirCapa}
            onEmpezar={() => {
              gestoNuevo.current = true;
            }}
            onCambiar={(cid, cambio) => {
              update((f) => ({ ...f, capas: cambiarCapa(f.capas, cid, cambio) }), { history: gestoNuevo.current });
              gestoNuevo.current = false;
            }}
            onBorrar={capas.borrar}
            onDuplicar={capas.duplicar}
            onOrden={capas.orden}
            onEditar={(cid) => {
              elegirCapa(cid);
              setEnfocar((n) => n + 1);
            }}
            piezas={cajasPiezas}
            corrimientos={current.piezas ?? {}}
            onMoverPieza={(pid, dx, dy) => {
              update((f) => ({ ...f, piezas: { ...(f.piezas ?? {}), [pid]: { dx, dy } } }), { history: gestoNuevo.current });
              gestoNuevo.current = false;
            }}
            onVolverPieza={(pid) => {
              update((f) => {
                const resto = { ...(f.piezas ?? {}) };
                delete resto[pid];
                return { ...f, piezas: resto };
              });
            }}
          />
        )}
        {current && !grande && (
          <button
            type="button"
            onClick={abrirGrande}
            aria-label="Editar en pantalla completa"
            title="Pantalla completa"
            className="absolute bottom-1.5 right-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink/65 text-white shadow-md before:absolute before:-inset-1.5 before:content-[''] hover:bg-ink/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 lg:hidden"
          >
            <IconoAgrandar className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {current && !grande && (
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" aria-pressed={playing} onClick={() => setPlaying((p) => !p)} className={toggleButton(playing)} aria-label={playing ? 'Detener la animación' : 'Ver la animación'}>
            {playing ? <IconoPausa className="h-4 w-4 sm:mr-1.5" aria-hidden="true" /> : <IconoPlay className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />}
            <span className="max-sm:sr-only">{playing ? 'Detener' : 'Ver animación'}</span>
          </button>
          <button type="button" onClick={() => capas.agregar('titulo')} disabled={!puedeAgregarCapa(current.capas)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
            <IconoMas className="h-4 w-4" aria-hidden="true" />
            Título
          </button>
          <button type="button" onClick={() => capas.agregar('subtitulo')} disabled={!puedeAgregarCapa(current.capas)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
            <IconoMas className="h-4 w-4" aria-hidden="true" />
            Subtítulo
          </button>
        </div>
      )}
    </div>
  );

  /** Lo de la vista previa que no queda fijo en el teléfono */
  const previewExtras = current && (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={abrirGrande} className={`${adminPrimaryButton} h-9 px-3 lg:hidden`}>
          <IconoAgrandar className="h-4 w-4" aria-hidden="true" />
          Editar en grande
        </button>
        <button type="button" aria-pressed={bigPreview} onClick={() => setBigPreview((b) => !b)} className={`${toggleButton(bigPreview)} lg:hidden`}>
          {bigPreview ? 'Achicar la vista previa' : 'Agrandar la vista previa'}
        </button>
        <button type="button" onClick={() => void terminar('imagen')} disabled={busy} className={`${adminSecondaryButton} h-9 px-3`}>
          <IconoDescargar className="h-4 w-4" aria-hidden="true" />
          Imagen
        </button>
      </div>
      {format === 'story' && (
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={safe}
            onChange={(e) => {
              setSafe(e.target.checked);
              try {
                localStorage.setItem(SAFE_KEY, e.target.checked ? '1' : '0');
              } catch {
                // Sin almacenamiento: no se recuerda
              }
            }}
            className="h-4 w-4 accent-brand-500"
          />
          Ver lo que tapa Instagram
        </label>
      )}
      <p className={`${adminHint} text-center`}>
        {miss.length ? `Falta la foto de: ${miss.join(', ')}` : `${FORMATS[format].label}: 1080 × ${formatHeight(format)}.`}
      </p>
    </div>
  );

  // C-295: lo del paso elegido, en su columna o (en pantalla completa) en la hoja de abajo: nunca en los dos a la vez
  const panelPaso = current && (
    <>
      {step === 1 && <StepContent studio={studio} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />}
      {step === 2 && <StepPhoto studio={studio} productSrc={productSrc} onFile={(i, f) => void onFile(i, f)} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />}
      {step === 3 && <StepDesign studio={studio} onAnim={replay} drawThumb={drawThumb} imgTick={imgTick} />}
      {step === 4 && (
        <StepCapas studio={studio} sel={capaSel} onSel={setCapaSel} acciones={capas} textoRef={textoCapaRef} pedirGaleria={pedirGaleria} onGaleriaVista={() => setPedirGaleria(false)} />
      )}
      {step === 5 && (
        <StepAnimacion
          studio={studio}
          sel={capaSel}
          onSel={setCapaSel}
          onCambiar={capas.cambiar}
          onEmpezarGesto={() => {
            gestoNuevo.current = true;
          }}
          onCambiarGesto={(cid, cambio) => {
            update((f) => ({ ...f, capas: cambiarCapa(f.capas, cid, cambio) }), { history: gestoNuevo.current });
            gestoNuevo.current = false;
          }}
          tiempo={tiempo}
          onTiempo={(t) => {
            if (t !== null) setPlaying(false);
            setTiempo(t);
          }}
          playing={playing}
          onReproducir={reproducirDesde}
          tiempoVivo={tiempoVivo}
          onAnim={replay}
        />
      )}
      {step === PASO_PUBLICAR && (
        <StepPublish studio={studio} checks={checks} busy={busy} onPng={() => void terminar('imagen')} onVideo={() => void terminar('video')} goStep={goStep} />
      )}
    </>
  );

  // C-295: la pantalla completa del teléfono. Arriba: Listo, deshacer, rehacer y ver la animación. Abajo, una hoja con el
  // paso (Paso N de 6, con sus flechas), lo que se agrega más seguido y, al subirla, todo lo del paso
  const barraGrande = current && (
    <div className="flex min-h-14 shrink-0 items-center gap-1 px-2 pt-[env(safe-area-inset-top)] text-white">
      <button
        type="button"
        onClick={() => setGrande(false)}
        className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <IconoCheck className="h-4 w-4" aria-hidden="true" />
        Listo
      </button>
      <span className="min-w-0 flex-1 truncate px-2 text-center text-sm font-semibold text-white/85">{current.name || 'Sin nombre'}</span>
      {[
        { onClick: studio.undo, disabled: !studio.canUndo, etiqueta: 'Deshacer', Icono: IconoDeshacer },
        { onClick: studio.redo, disabled: !studio.canRedo, etiqueta: 'Rehacer', Icono: IconoRehacer },
      ].map(({ onClick, disabled, etiqueta, Icono }) => (
        <button key={etiqueta} type="button" onClick={onClick} disabled={disabled} aria-label={etiqueta} title={etiqueta} className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-white">
          <Icono className="h-5 w-5" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        aria-pressed={playing}
        onClick={() => setPlaying((v) => !v)}
        aria-label={playing ? 'Detener la animación' : 'Ver la animación'}
        title={playing ? 'Detener' : 'Ver la animación'}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white ${playing ? 'bg-white text-ink' : 'hover:bg-white/10'}`}
      >
        {playing ? <IconoPausa className="h-5 w-5" aria-hidden="true" /> : <IconoPlay className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
  const herramienta = 'flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-brand-200 bg-brand-50 px-1 text-xs font-semibold text-brand-700 transition-transform active:scale-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
  const hojaGrande = current && (
    <div className="shrink-0 rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] text-ink shadow-[0_-10px_30px_rgb(0_0_0/0.3)]">
      <button type="button" onClick={() => setHojaAbierta((v) => !v)} aria-expanded={hojaAbierta} aria-controls="studio-hoja" className="flex w-full justify-center pb-1 pt-2">
        <span className="h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
        <span className="sr-only">{hojaAbierta ? 'Bajar el panel del paso' : 'Subir el panel del paso'}</span>
      </button>
      <div className="flex items-center gap-1 px-2">
        <button type="button" onClick={() => goStep(step - 1)} disabled={step === 1} aria-label={step > 1 ? `Paso anterior: ${STEPS[step - 2][1]}` : 'Es el primer paso'} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand-500">
          <IconoChevronIzquierda className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setHojaAbierta((v) => !v)} aria-expanded={hojaAbierta} aria-controls="studio-hoja" className="min-w-0 flex-1 rounded-lg py-1 text-center focus-visible:outline-2 focus-visible:outline-brand-500">
          <span className="block text-xs text-muted">Paso {step} de {STEPS.length}</span>
          <span className="block truncate text-sm font-bold text-ink">{STEPS[step - 1][1]}</span>
        </button>
        <button type="button" onClick={() => goStep(step + 1)} disabled={step === STEPS.length} aria-label={step < STEPS.length ? `Siguiente paso: ${STEPS[step][1]}` : 'Es el último paso'} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand-500">
          <IconoChevronDerecha className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 px-3 py-2">
        <button type="button" onClick={() => agregarEnGrande('titulo')} disabled={!puedeAgregarCapa(current.capas)} className={herramienta}>
          <IconoTexto className="h-5 w-5" aria-hidden="true" />
          + Título
        </button>
        <button type="button" onClick={() => agregarEnGrande('subtitulo')} disabled={!puedeAgregarCapa(current.capas)} className={herramienta}>
          <IconoMas className="h-5 w-5" aria-hidden="true" />
          + Subtítulo
        </button>
        <button
          type="button"
          onClick={() => {
            if (step !== 4) goStep(4);
            setHojaAbierta(true);
            setPedirGaleria(true);
          }}
          disabled={!puedeAgregarCapa(current.capas)}
          className={herramienta}
        >
          <IconoEstrella className="h-5 w-5" aria-hidden="true" />
          + Sticker
        </button>
        <button
          type="button"
          onClick={() => {
            goStep(PASO_PUBLICAR);
            setHojaAbierta(true);
          }}
          className={`${herramienta} border-brand-500 bg-brand-500 text-white`}
        >
          <IconoCompartir className="h-5 w-5" aria-hidden="true" />
          Terminar
        </button>
      </div>
      {hojaAbierta && (
        <div id="studio-hoja" className="max-h-[44dvh] overflow-y-auto overscroll-contain border-t border-line px-3 pb-4 pt-3">
          <p className="mb-3 text-sm text-ink-soft">{STEP_HELP[step]}</p>
          {panelPaso}
        </div>
      )}
    </div>
  );

  // C-270, el editor A que eligió el equipo: la ruta de pasos a lo ancho; el paso a la izquierda y la vista previa grande
  // a la derecha. En el teléfono, la ruta y la vista previa (chica) quedan fijas arriba y el paso se recorre debajo.
  return (
    <div>
      {back}
      <section ref={editorRef} className="scroll-mt-20 rounded-2xl border border-line bg-white p-3 sm:p-4" aria-label="Editor">
        <div className="flex flex-col gap-3">
          {current && (
            <>
              {/* C-170: quién más tiene abierta esta historia y si la cambiaron mientras tanto */}
              {currentId && <PresenciaEnEditor recurso={`studio:${currentId}`} nombreRecurso="historia" femenino />}
              <div className="flex items-center justify-between gap-2">
                <h1 className="min-w-0 truncate text-base font-bold text-ink">{current.name || 'Sin nombre'}</h1>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="mr-1 hidden items-center gap-1 text-xs text-muted sm:flex" aria-live="polite">
                    {status === 'saved' && <IconoCheck className="h-3.5 w-3.5 text-success-strong" aria-hidden="true" />}
                    {status === 'saving' && <IconoNube className="h-3.5 w-3.5" aria-hidden="true" />}
                    {status === 'error' && <IconoAdvertencia className="h-3.5 w-3.5 text-deal" aria-hidden="true" />}
                    {STATUS_TEXT[status]}
                  </span>
                  <button type="button" onClick={studio.undo} disabled={!studio.canUndo} className={adminIconButton} aria-label="Deshacer (Ctrl+Z)" title="Deshacer (Ctrl+Z)">
                    <IconoDeshacer className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={studio.redo} disabled={!studio.canRedo} className={adminIconButton} aria-label="Rehacer (Ctrl+Mayús+Z)" title="Rehacer (Ctrl+Mayús+Z)">
                    <IconoRehacer className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
                  <button type="button" onClick={() => void onDuplicate()} className={adminIconButton} aria-label="Duplicar esta historia" title="Duplicar">
                    <IconoCopiar className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => void onRemove()} className={`${adminIconButton} text-deal hover:bg-deal-bg`} aria-label="Eliminar esta historia" title="Eliminar">
                    <IconoEliminar className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </div>
              <span className="-mt-2 flex items-center gap-1 text-xs text-muted sm:hidden" aria-live="polite">
                {status === 'saved' && <IconoCheck className="h-3.5 w-3.5 text-success-strong" aria-hidden="true" />}
                {STATUS_TEXT[status]}
              </span>
              <div ref={pasosRef} className="sticky top-16 z-[var(--z-sticky)]">
                <Pasos pasos={pasos} actual={step - 1} onIr={(i) => goStep(i + 1)} etiqueta="Pasos de la historia" />
              </div>
            </>
          )}

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
              {current ? (
                <>
                  <div className="lg:hidden">{previewExtras}</div>
                  {!grande && (
                    <>
                  <p className="text-sm text-ink-soft">
                    <strong className="text-ink">Paso {step} de {STEPS.length}.</strong> {STEP_HELP[step]}
                  </p>
                  {panelPaso}
                  <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                    {step > 1 ? (
                      <button type="button" onClick={() => goStep(step - 1)} className={adminSecondaryButton}>
                        Atrás
                      </button>
                    ) : (
                      <span />
                    )}
                    {step < STEPS.length && (
                      <button type="button" onClick={() => goStep(step + 1)} className={adminPrimaryButton}>
                        Siguiente: {STEPS[step][1]}
                      </button>
                    )}
                  </div>
                    </>
                  )}
                </>
              ) : (
                <p className="py-12 text-center text-sm text-muted" aria-busy="true">
                  {loading ? 'Cargando ElectroStudio…' : 'Abriendo la historia…'}
                </p>
              )}
            </div>

            {/* La vista previa queda fija debajo de la ruta de pasos mientras se recorre el paso: es la celda de la rejilla la
                que es sticky (así su recorrido es toda la rejilla). En el teléfono, lo que no es la vista previa va en el panel */}
            <div
              role={grande ? 'region' : undefined}
              aria-label={grande ? 'Editor en pantalla completa' : undefined}
              className={
                grande
                  ? 'fixed inset-x-0 top-0 z-[var(--z-drawer)] flex h-dvh flex-col overscroll-none bg-ink'
                  : 'order-1 flex flex-col gap-2 max-lg:sticky max-lg:top-[var(--tope-vista)] max-lg:z-[var(--z-sticky)] lg:sticky lg:top-[calc(var(--tope-vista)+0.75rem)] lg:order-2'
              }
              style={
                grande
                  ? // Lo visible de la pantalla: con el teclado abierto, la hoja queda encima de él y no debajo
                    { height: vistaAlto ? `${vistaAlto}px` : undefined, top: vistaArriba }
                  : ({ '--tope-vista': `calc(4rem + ${altoPasos}px)` } as CSSProperties)
              }
            >
              {grande && barraGrande}
              {preview}
              {grande ? hojaGrande : <div className="hidden lg:block">{previewExtras}</div>}
            </div>
          </div>
        </div>
      </section>
      {grande && (
        <AsiFunciona
          clave="studio-grande"
          titulo="Edita con los dedos"
          nota="La historia del alto del teléfono. Listo te devuelve a los pasos."
          pasos={[
            { icono: 'mover', texto: 'Un dedo mueve la pieza', accion: 'salta' },
            { icono: 'agrandar', texto: 'Dos dedos la agrandan y la giran', accion: 'gira' },
            { icono: 'tocar', texto: 'Toca afuera para soltarla' },
          ]}
          boton="Entendido: a editar"
          sinChispa
        />
      )}
      {fin && current && (
        <Terminada
          final={fin}
          formato={format}
          texto={current.caption}
          enlace={enlace}
          onCerrar={() => {
            if (fin.fase === 'lista') cerrarFin();
          }}
          onOtraIgual={() => void otraIgual()}
          onNueva={() => {
            cerrarFin();
            router.push('/admin/studio/nueva');
          }}
          onOtroTipo={() => {
            const otro = fin.tipo === 'video' ? 'imagen' : 'video';
            cerrarFin();
            void terminar(otro);
          }}
          onEscribirTexto={() => {
            cerrarFin();
            setGrande(false);
            goStep(PASO_PUBLICAR);
          }}
        />
      )}
    </div>
  );
}
