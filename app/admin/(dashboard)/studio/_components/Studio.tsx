'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  IconoAbrirCandado, IconoAdvertencia, IconoCandado, IconoCheck, IconoChevronDerecha, IconoChevronIzquierda, IconoClaqueta,
  IconoCompartir, IconoCopiar, IconoDescargar, IconoDeshacer, IconoEditar, IconoEliminar, IconoFlechaAbajo,
  IconoFlechaArriba, IconoFlechaDerecha, IconoFlechaIzquierda, IconoImagen, IconoMas, IconoMover, IconoNube, IconoPausa,
  IconoPintura, IconoPlay, IconoRehacer, IconoTexto, type IconType,
} from '@/components/iconos';
import AsiFunciona from '@/components/onboarding/AsiFunciona';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import { adminEmpty, adminHint, adminIconButton, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  PASO_PUBLICAR, activeStepsFor, contentProblems, firstOpenStep, flyerChecks, stepDone, type TextIssues,
} from '@/lib/studio/checks';
import {
  cambiarCapa, capaDesdePieza, duplicarCapa, moverCapa, nuevaCapa, nuevoIdCapa, nuevoSticker, puedeAgregarCapa, type CambioCapa,
} from '@/lib/studio/capas';
import { STICKERS } from '@/lib/studio/stickers';
import { duracionDe } from '@/lib/studio/animaciones';
import { cargarFuentes } from '@/lib/studio/fuentes';
import { hasChangesSinceExport } from '@/lib/studio/live';
import {
  H, StudioImages, formatHeight, W, bgFor, createRenderer, flyerImageSources, loadStudioFonts, missingImages, qrUrlFor,
  type CajaCapa, type ProductSrc, type StudioRenderer,
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

const STEPS: [number, string, IconType][] = [
  [1, 'Contenido', IconoEditar],
  [2, 'Fotos', IconoImagen],
  [3, 'Diseño', IconoPintura],
  [4, 'Textos y stickers', IconoTexto],
  [5, 'Animación', IconoClaqueta],
  [6, 'Publicar', IconoCompartir],
];
const SAFE_KEY = 'studio-safe';
const MEJOR_KEY = 'studio-mejor-tiempo';

const STEP_HELP: Record<number, string> = {
  1: 'Qué publicar y el producto. Con un producto de la tienda, el precio y la oferta se ponen solos.',
  2: 'La foto de cada producto: pégala (Ctrl+V), arrástrala o elígela. Mejor con fondo blanco o transparente.',
  3: 'Opcional: formato, fondo, efectos y colores. Si no cambias nada, queda con el diseño de la plantilla.',
  4: 'Opcional: títulos, subtítulos y textos sueltos, o suelta un título fijo para moverlo a tu gusto.',
  5: 'Opcional: cómo entra la historia en el video. Las piezas sueltas entran después de la plantilla.',
  6: 'Revisa la lista, descarga la imagen o el video y copia el texto para Instagram.',
};

const PREVIEW_GRANDE: Record<FormatId, string> = {
  story: 'aspect-[9/16] w-[min(100cqw,calc(100cqh*9/16))]',
  post45: 'aspect-[4/5] w-[min(100cqw,calc(100cqh*4/5))]',
  post11: 'aspect-square w-[min(100cqw,100cqh)]',
};

const PREVIEW_CLASS: Record<FormatId, string> = {
  story: 'aspect-[9/16] max-w-[16rem] sm:max-w-xs lg:w-[min(100%,calc((100dvh_-_17rem)*9/16))]',
  post45: 'aspect-[4/5] max-w-xs sm:max-w-sm lg:w-[min(100%,calc((100dvh_-_17rem)*4/5))]',
  post11: 'aspect-square max-w-xs sm:max-w-sm lg:w-[min(100%,calc(100dvh_-_17rem))]',
};

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

function readVistos(id: string | null): number[] {
  if (!id) return [];
  try {
    const raw = localStorage.getItem(`studio-vistos:${id}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function saveVistos(id: string | null, list: number[]) {
  if (!id) return;
  try {
    localStorage.setItem(`studio-vistos:${id}`, JSON.stringify(list));
  } catch {
    // Sin almacenamiento
  }
}

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

function cajasSolapan(a: CajaCapa, b: CajaCapa): boolean {
  return Math.abs(a.cx - b.cx) * 2 < a.w + b.w && Math.abs(a.cy - b.cy) * 2 < a.h + b.h;
}

function medirTiempoFinal(primera: boolean, id: string | null, abierta: { id: string | null; desde: number }): { tiempo: number | null; record: boolean } {
  if (!primera || !id || abierta.id !== id) return { tiempo: null, record: false };
  const t = (Date.now() - abierta.desde) / 1000;
  if (t > 3600) return { tiempo: null, record: false };
  let record = false;
  try {
    const antes = Number(localStorage.getItem(MEJOR_KEY)) || 0;
    if (!antes || t < antes) {
      record = antes > 0;
      localStorage.setItem(MEJOR_KEY, String(Math.round(t)));
    }
  } catch {
    // Sin almacenamiento
  }
  return { tiempo: t, record };
}

function ahoraEpoch(): number {
  return Date.now();
}

export default function Studio({ id }: { id: string }) {
  const studio = useStudioContext();
  const { loading, flyers, current: openFlyer, currentId: openId, currentCode, brand, status, update, select, saveNow } = studio;
  const navidad = studio.store?.navidad ?? null;
  const current = openId === id ? openFlyer : null;
  const currentId = openId === id ? openId : null;
  const router = useRouter();
  const params = useSearchParams();
  const { confirm } = useConfirm();
  const gate = useDownloadGate();

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
  useEffect(() => () => void saveNow(), [saveNow]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const images = useRef<StudioImages | null>(null);
  const renderer = useRef<StudioRenderer | null>(null);
  const [tempImages, setTempImages] = useState<Record<string, string>>({});
  const srcRef = useRef<ProductSrc>((p) => p.imageUrl);
  const productSrc: ProductSrc = useCallback((p, i) => tempImages[`${currentId}:${i}`] || p.imageUrl, [tempImages, currentId]);

  const activeStepNums = current ? activeStepsFor(current.template) : [1, 2, 3, 4, 5, 6];
  const [stepFor, setStepFor] = useState<{ id: string | null; step: number; vistos: number[] }>({ id: null, step: 1, vistos: [] });
  const askedStep = Number(params.get('paso'));
  if (current && currentId && stepFor.id !== currentId) {
    const allowed = activeStepsFor(current.template);
    const initialStep = allowed.includes(askedStep) ? askedStep : firstOpenStep(current, productSrc);
    const initialVistos = readVistos(currentId);
    setStepFor({ id: currentId, step: initialStep, vistos: initialVistos });
  }
  const rawStep = stepFor.id === currentId ? stepFor.step : 1;
  const step = activeStepNums.includes(rawStep) ? rawStep : 1;
  const vistos = stepFor.id === currentId ? stepFor.vistos : [];
  const activeIdx = Math.max(0, activeStepNums.indexOf(step));

  const editorRef = useRef<HTMLElement | null>(null);
  const [tiempo, setTiempo] = useState<number | null>(null);
  const goStep = (k: number) => {
    const target = activeStepNums.includes(k) ? k : 1;
    setTiempo(null);
    setStepFor((s) => {
      const nextVistos = s.id === currentId && !s.vistos.includes(s.step) ? [...s.vistos, s.step] : s.id === currentId ? s.vistos : [];
      saveVistos(currentId, nextVistos);
      return { id: currentId, step: target, vistos: nextVistos };
    });
    const top = editorRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 && !grandeRef.current) editorRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  const [slotFor, setSlotFor] = useState<{ id: string | null; slot: number }>({ id: null, slot: 0 });
  const activeSlot = slotFor.id === currentId ? slotFor.slot : 0;
  const setActiveSlot = useCallback((i: number) => setSlotFor({ id: currentId, slot: i }), [currentId]);

  const [playing, setPlaying] = useState(false);
  const desdeRef = useRef(0);
  const tiempoVivo = useRef(0);
  const [mobileTab, setMobileTab] = useState<'editar' | 'preview'>('editar');
  const [nudgeOpen, setNudgeOpen] = useState(false);
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

  // G-71: pantalla completa móvil + soporte de botón Atrás del teléfono
  const [grande, setGrande] = useState(false);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const grandeRef = useRef(grande);
  useEffect(() => {
    grandeRef.current = grande;
  });
  const pushedHistory = useRef(false);
  const [pedirGaleria, setPedirGaleria] = useState(false);
  useBodyScrollLock(grande);
  const vistaAlto = useSyncExternalStore(suscribirVista, altoVisible, () => 0);
  const vistaArriba = useSyncExternalStore(suscribirVista, arribaVisible, () => 0);
  const escalaVista = useRef(1);

  const scene = useRef({ current, brand, safe, code: currentCode, navidad, tiempo });
  useEffect(() => {
    scene.current = { current, brand, safe, code: currentCode, navidad, tiempo };
    srcRef.current = productSrc;
  });
  const [imgTick, setImgTick] = useState(0);

  const [textIssues, setTextIssues] = useState<TextIssues>({ cut: [], tiny: [] });
  const [cajas, setCajas] = useState<CajaCapa[]>([]);
  const [cajasPiezas, setCajasPiezas] = useState<CajaCapa[]>([]);
  const drawStatic = useCallback(() => {
    if (!renderer.current || busyRef.current) return;
    const s = scene.current;
    renderer.current.draw(s.current, s.brand, { preview: true, safeZones: s.safe, code: s.code, navidad: s.navidad, t: s.tiempo, escala: escalaVista.current });
    if (s.tiempo !== null) return;
    const now = renderer.current.textIssues();
    setTextIssues((prev) => (JSON.stringify(prev) === JSON.stringify(now) ? prev : now));
    const ahora = renderer.current.capasCajas();
    setCajas((prev) => (JSON.stringify(prev) === JSON.stringify(ahora) ? prev : ahora));
    const piezasAhora = renderer.current.piezasCajas();
    setCajasPiezas((prev) => (JSON.stringify(prev) === JSON.stringify(piezasAhora) ? prev : piezasAhora));
  }, []);

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
  const gestoNuevo = useRef(false);
  const [altoPasos, setAltoPasos] = useState(0);

  const drawThumb = useCallback((target: HTMLCanvasElement, style: BackgroundId) => {
    const s = scene.current;
    if (renderer.current && s.current) renderer.current.drawBackgroundThumb(target, style, s.current, s.brand);
  }, []);

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

  const abrirGrande = () => {
    setPlaying(false);
    setHojaAbierta(false);
    setGrande(true);
  };
  const cerrarGrande = useCallback(() => {
    setNudgeOpen(false);
    if (pushedHistory.current) {
      pushedHistory.current = false;
      window.history.back();
    } else {
      setGrande(false);
    }
  }, []);

  // C-295: Escape y botón Atrás del teléfono cierran la pantalla completa sin sacar del editor
  useEffect(() => {
    if (!grande) return;
    if (!pushedHistory.current) {
      window.history.pushState({ studioGrande: true }, '');
      pushedHistory.current = true;
    }
    const onPop = () => {
      pushedHistory.current = false;
      setNudgeOpen(false);
      setGrande(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || capaSelRef.current || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      cerrarGrande();
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
    };
  }, [grande, cerrarGrande]);

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

  useEffect(() => {
    if (playing) return;
    const frame = requestAnimationFrame(drawStatic);
    return () => cancelAnimationFrame(frame);
  }, [current, brand, safe, tempImages, playing, drawStatic, currentCode, tiempo, mobileTab]);

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

  const format = current?.format ?? 'story';
  const alto = formatHeight(format);

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
    soltarPieza: (piezaId: string, texto: string) => {
      if (!current || !puedeAgregarCapa(current.capas)) return;
      const caja = cajasPiezas.find((c) => c.id === piezaId);
      const pos = caja ? { x: caja.cx / W, y: caja.cy / alto } : undefined;
      const nueva = capaDesdePieza(piezaId, texto, current.capas, pos);
      update((f) => ({
        ...f,
        piezasOcultas: f.piezasOcultas.includes(piezaId) ? f.piezasOcultas : [...f.piezasOcultas, piezaId],
        capas: [...f.capas, nueva],
      }));
      setCapaSel(nueva.id);
      setEnfocar((n) => n + 1);
    },
    devolverPieza: (piezaId: string) => {
      if (!current) return;
      const quitadas = new Set(current.capas.filter((c) => c.tipo === 'texto' && c.origenPieza === piezaId).map((c) => c.id));
      update((f) => ({
        ...f,
        piezasOcultas: f.piezasOcultas.filter((id) => id !== piezaId),
        capas: f.capas.filter((c) => !(c.tipo === 'texto' && c.origenPieza === piezaId)),
      }));
      if (capaSel && quitadas.has(capaSel)) setCapaSel(null);
    },
  };

  const elegirCapa = (cid: string | null) => {
    setCapaSel(cid);
    if (cid && step !== 4 && step !== 5) goStep(4);
  };

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

  const markCurrentExported = async () => {
    const f = flyers.find((x) => x.id === currentId);
    if (f) await studio.markExported([f]);
  };

  const checks = current ? flyerChecks(current, { src: productSrc, live: studio.live, coupons: studio.coupons, store: studio.store, text: textIssues }) : [];
  const ready = async () => !!current && (await gate(checks, goStep));

  const [fin, setFin] = useState<Final | null>(null);
  const abiertaDesde = useRef<{ id: string | null; desde: number }>({ id: null, desde: 0 });
  useEffect(() => {
    if (currentId && abiertaDesde.current.id !== currentId) abiertaDesde.current = { id: currentId, desde: Date.now() };
  }, [currentId]);

  const cerrarFin = () => {
    if (fin?.archivo) URL.revokeObjectURL(fin.archivo.url);
    setFin(null);
  };

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
    const epoch = ahoraEpoch();
    const r = renderer.current;
    let avance = 0;
    const dibujar = (t: number) => {
      r.draw(current, brand, { preview: false, t, epoch, code: currentCode, navidad });
      const f = Math.min(1, t / dur);
      if (f - avance >= 0.02) {
        avance = f;
        alAvanzar(f);
      }
    };
    dibujar(0);
    const llave = await navigator.wakeLock?.request('screen').catch(() => null);
    let video: VideoGrabado;
    try {
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

  const terminar = async (tipo: 'imagen' | 'video') => {
    if (!current || busyRef.current || !(await ready())) return;
    const primera = !current.exported.at;
    const fid = currentId;
    let poster: string | null = null;
    try {
      poster = canvasRef.current?.toDataURL('image/jpeg', 0.85) ?? null;
    } catch {
      // Sin póster
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
    const marca = medirTiempoFinal(primera, fid, abiertaDesde.current);
    setFin((f) => (f ? { ...f, fase: 'lista', progreso: 1, archivo, ...marca, semana: deLaSemana(fid) } : f));
  };

  const otraIgual = async () => {
    cerrarFin();
    cerrarGrande();
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
  const enlace = current && currentCode ? qrUrlFor(current, brand, currentCode) : '';
  const paso1Ok = current ? stepDone(1, current, productSrc) : false;
  const bloqueos = checks.filter((c) => c.level === 'block');
  const tieneBloqueos = bloqueos.length > 0;
  const hayCambiosPostExport = current ? hasChangesSinceExport(current) : false;
  const primerFaltante = current ? (contentProblems(current)[0] ?? bloqueos[0]?.text ?? '') : '';

  const pasos: Paso[] = current
    ? activeStepNums.map((k) => {
        const [, titulo, icono] = STEPS.find(([s]) => s === k)!;
        const n = current.capas.length;
        const disponible = k === 1 ? true : k === PASO_PUBLICAR ? paso1Ok && !tieneBloqueos : paso1Ok;
        const hecho =
          k === 1 ? paso1Ok
          : k === 2 ? stepDone(2, current, productSrc)
          : k === 3 ? vistos.includes(3) || Boolean(current.bg)
          : k === 4 ? vistos.includes(4) || n > 0
          : k === 5 ? vistos.includes(5) || current.anim !== 'entrada'
          : Boolean(current.exported.at) && !hayCambiosPostExport && !tieneBloqueos && !checks.some((c) => c.kind === 'redownload');
        const resumen =
          k === 1 ? (current.products[0]?.title && TEMPLATES[current.template].n ? current.products[0].title : TEMPLATES[current.template].label)
          : k === 2 ? (miss.length ? `Falta${miss.length > 1 ? 'n' : ''} ${miss.length} foto${miss.length > 1 ? 's' : ''}` : requiredPhotos(current.template) ? 'Fotos listas' : 'Sin fotos de producto')
          : k === 3 ? `${BACKGROUNDS[bgFor(current)]} · ${FORMATS[current.format].short}`
          : k === 4 ? (n ? `${n} pieza${n > 1 ? 's' : ''}` : 'Opcional')
          : k === 5 ? ANIMATIONS[current.anim]
          : tieneBloqueos ? 'Faltan datos'
          : hayCambiosPostExport ? 'Cambios nuevos'
          : checks.some((c) => c.kind === 'redownload') ? 'Actualizar imagen'
          : current.exported.at ? 'Descargada'
          : 'Revisar y descargar';
        return { titulo, icono, hecho, resumen, disponible };
      })
    : [];

  const siguientePasoNum = activeStepNums[activeIdx + 1] ?? null;
  const siguienteDisponible = siguientePasoNum !== null ? Boolean(pasos[activeIdx + 1]?.disponible) : false;
  const capaActivaObj = current && capaSel ? current.capas.find((c) => c.id === capaSel) ?? null : null;
  const idxCapaActiva = current && capaActivaObj ? current.capas.findIndex((c) => c.id === capaActivaObj.id) : -1;
  const solapadas = (() => {
    if (!current || !capaActivaObj) return [] as CajaCapa[];
    const caja = cajas.find((x) => x.id === capaActivaObj.id);
    if (!caja) return [] as CajaCapa[];
    return cajas.filter((x) => {
      const c = current.capas.find((l) => l.id === x.id);
      return c && !c.oculta && cajasSolapan(x, caja);
    });
  })();
  const elegirDebajo = () => {
    if (!capaActivaObj || solapadas.length < 2) return;
    const pos = solapadas.findIndex((c) => c.id === capaActivaObj.id);
    const next = solapadas[(pos - 1 + solapadas.length) % solapadas.length];
    if (next) setCapaSel(next.id);
  };

  const preview = (
    <div
      className={
        grande
          ? 'flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-1'
          : 'flex flex-col items-center gap-2 bg-white pb-2 lg:gap-3 lg:pb-0'
      }
    >
      {/* En pantalla completa móvil, la barra de acciones va anclada arriba del lienzo para nunca solapar la hoja */}
      {grande && current && (
        <div className="mb-1.5 flex shrink-0 max-w-full flex-col items-center gap-1">
          {capaActivaObj ? (
            <>
              <div role="toolbar" aria-label="Acciones de la pieza elegida" className="flex flex-wrap items-center justify-center gap-1 rounded-xl bg-white p-1 text-ink shadow-md">
                <button type="button" onClick={() => capas.duplicar(capaActivaObj.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-50 hover:text-brand-600" aria-label="Duplicar">
                  <IconoCopiar className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => capas.orden(capaActivaObj.id, 1)} disabled={idxCapaActiva === current.capas.length - 1} className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-50 hover:text-brand-600 disabled:opacity-35" aria-label="Subir capa">
                  <IconoFlechaArriba className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => capas.orden(capaActivaObj.id, -1)} disabled={idxCapaActiva <= 0} className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-50 hover:text-brand-600 disabled:opacity-35" aria-label="Bajar capa">
                  <IconoFlechaAbajo className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => capas.cambiar(capaActivaObj.id, { bloqueada: !capaActivaObj.bloqueada })} aria-pressed={capaActivaObj.bloqueada} className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-50 hover:text-brand-600" aria-label={capaActivaObj.bloqueada ? 'Desbloquear' : 'Bloquear'}>
                  {capaActivaObj.bloqueada ? <IconoCandado className="h-4 w-4" aria-hidden="true" /> : <IconoAbrirCandado className="h-4 w-4" aria-hidden="true" />}
                </button>
                {solapadas.length > 1 && (
                  <button type="button" onClick={elegirDebajo} className="inline-flex h-10 items-center rounded-lg px-2.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                    Debajo
                  </button>
                )}
                <button type="button" aria-pressed={nudgeOpen} onClick={() => setNudgeOpen((v) => !v)} className={`inline-flex h-10 items-center rounded-lg px-2.5 text-xs font-semibold ${nudgeOpen ? 'bg-brand-500 text-white' : 'hover:bg-brand-50 hover:text-brand-600'}`}>
                  1 px
                </button>
                <button type="button" onClick={() => capas.borrar(capaActivaObj.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-deal hover:bg-deal-bg" aria-label="Borrar">
                  <IconoEliminar className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {nudgeOpen && (
                <div role="group" aria-label="Mover 1 px" className="flex items-center gap-1 rounded-xl bg-white p-1 text-ink shadow-md">
                  <button type="button" onClick={() => capas.cambiar(capaActivaObj.id, { x: Math.max(0, capaActivaObj.x - 1 / W) })} className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-50" aria-label="Izquierda 1 px"><IconoFlechaIzquierda className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => capas.cambiar(capaActivaObj.id, { y: Math.max(0, capaActivaObj.y - 1 / alto) })} className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-50" aria-label="Subir 1 px"><IconoFlechaArriba className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => capas.cambiar(capaActivaObj.id, { y: Math.min(1, capaActivaObj.y + 1 / alto) })} className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-50" aria-label="Bajar 1 px"><IconoFlechaAbajo className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => capas.cambiar(capaActivaObj.id, { x: Math.min(1, capaActivaObj.x + 1 / W) })} className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-brand-50" aria-label="Derecha 1 px"><IconoFlechaDerecha className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              )}
            </>
          ) : (
            <p className="px-2 text-center text-xs text-white/80">
              Toca una pieza para moverla · doble toque en un texto para escribir
            </p>
          )}
        </div>
      )}

      <div className={grande ? 'flex min-h-0 w-full flex-1 items-center justify-center [container-type:size]' : 'flex w-full flex-col items-center'}>
        <div className={`relative min-h-0 select-none [-webkit-touch-callout:none] ${grande ? PREVIEW_GRANDE[format] : `w-full ${PREVIEW_CLASS[format]} lg:max-w-none`}`}>
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
              barraExterna={grande}
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
                if (grande) setHojaAbierta(true);
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
        </div>
      </div>
      {current && !grande && (
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" aria-pressed={playing} onClick={() => setPlaying((p) => !p)} className={toggleButton(playing)} aria-label={playing ? 'Detener la animación' : 'Ver la animación'}>
            {playing ? <IconoPausa className="h-4 w-4 sm:mr-1.5" aria-hidden="true" /> : <IconoPlay className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />}
            <span>{playing ? 'Detener' : 'Ver animación'}</span>
          </button>
          <button type="button" onClick={abrirGrande} className={`${adminPrimaryButton} h-11 sm:h-9 px-4 lg:hidden`}>
            <IconoMover className="h-4 w-4" aria-hidden="true" />
            Mover en lienzo
          </button>
          <button type="button" onClick={() => void terminar('imagen')} disabled={busy} className={`${adminSecondaryButton} h-11 sm:h-9 px-4`}>
            <IconoDescargar className="h-4 w-4" aria-hidden="true" />
            Sacar imagen
          </button>
        </div>
      )}
    </div>
  );

  const previewExtras = current && (
    <div className="flex flex-col items-center gap-2">
      {format === 'story' && (
        <label className="flex min-h-11 sm:min-h-0 items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={safe}
            onChange={(e) => {
              setSafe(e.target.checked);
              try {
                localStorage.setItem(SAFE_KEY, e.target.checked ? '1' : '0');
              } catch {
                // Sin almacenamiento
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

  const panelPaso = current && (
    <>
      {step === 1 && <StepContent studio={studio} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />}
      {step === 2 && <StepPhoto studio={studio} productSrc={productSrc} onFile={(i, f) => void onFile(i, f)} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />}
      {step === 3 && <StepDesign studio={studio} onAnim={replay} drawThumb={drawThumb} imgTick={imgTick} />}
      {step === 4 && (
        <StepCapas
          studio={studio}
          sel={capaSel}
          onSel={setCapaSel}
          acciones={capas}
          textoRef={textoCapaRef}
          pedirGaleria={pedirGaleria}
          onGaleriaVista={() => setPedirGaleria(false)}
          enfocar={enfocar}
          onMoverEnLienzo={abrirGrande}
        />
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

  const barraGrande = current && (
    <div className="flex min-h-14 shrink-0 items-center gap-1 px-2 pt-[env(safe-area-inset-top)] text-white">
      <button
        type="button"
        onClick={cerrarGrande}
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

  const anteriorPasoNum = activeStepNums[activeIdx - 1] ?? null;
  const hojaGrande = current && (
    <div className="shrink-0 rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] text-ink shadow-[0_-10px_30px_rgb(0_0_0/0.3)]">
      <button type="button" onClick={() => setHojaAbierta((v) => !v)} aria-expanded={hojaAbierta} aria-controls="studio-hoja" className="flex w-full justify-center pb-1 pt-2">
        <span className="h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
        <span className="sr-only">{hojaAbierta ? 'Bajar el panel del paso' : 'Subir el panel del paso'}</span>
      </button>
      <div className="flex items-center gap-1 px-2">
        <button type="button" onClick={() => anteriorPasoNum && goStep(anteriorPasoNum)} disabled={!anteriorPasoNum} aria-label="Paso anterior" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand-500">
          <IconoChevronIzquierda className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setHojaAbierta((v) => !v)} aria-expanded={hojaAbierta} aria-controls="studio-hoja" className="min-w-0 flex-1 rounded-lg py-1 text-center focus-visible:outline-2 focus-visible:outline-brand-500">
          <span className="block text-xs text-muted">Paso {activeIdx + 1} de {activeStepNums.length}</span>
          <span className="block truncate text-sm font-bold text-ink">{STEPS.find(([s]) => s === step)?.[1]}</span>
        </button>
        <button type="button" onClick={() => siguientePasoNum && siguienteDisponible && goStep(siguientePasoNum)} disabled={!siguientePasoNum || !siguienteDisponible} aria-label="Siguiente paso" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-brand-500">
          <IconoChevronDerecha className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Acciones contextuales según el paso actual (sin repetir botones fijos en todos los pasos) */}
      <div className="grid grid-cols-2 gap-2 px-3 py-2">
        {step === 4 ? (
          <>
            <button
              type="button"
              onClick={() => {
                setHojaAbierta(true);
                setPedirGaleria(false);
              }}
              className={adminSecondaryButton}
            >
              <IconoMas className="h-4 w-4" aria-hidden="true" />
              Piezas
            </button>
            <button
              type="button"
              onClick={() => {
                setHojaAbierta((v) => (capaActivaObj ? true : !v));
                if (capaActivaObj?.tipo === 'texto') setEnfocar((n) => n + 1);
              }}
              className={adminPrimaryButton}
            >
              {capaActivaObj ? 'Editar pieza' : 'Opciones'}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setHojaAbierta((v) => !v)} className={adminSecondaryButton}>
              {hojaAbierta ? 'Ocultar opciones' : `Editar ${STEPS.find(([s]) => s === step)?.[1]}`}
            </button>
            {siguientePasoNum ? (
              <button
                type="button"
                disabled={!siguienteDisponible}
                onClick={() => siguienteDisponible && goStep(siguientePasoNum)}
                className={adminPrimaryButton}
              >
                Siguiente
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => void terminar('imagen')} className={adminPrimaryButton}>
                <IconoDescargar className="h-4 w-4" aria-hidden="true" />
                Imagen
              </button>
            )}
          </>
        )}
      </div>

      {hojaAbierta && (
        <div id="studio-hoja" className="max-h-[42dvh] overflow-y-auto overscroll-contain border-t border-line px-3 pb-4 pt-3">
          <p className="mb-3 text-sm text-ink-soft">{STEP_HELP[step]}</p>
          {panelPaso}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {back}
      <section ref={editorRef} className="scroll-mt-20 rounded-2xl border border-line bg-white p-3 sm:p-4" aria-label="Editor">
        <div className="flex flex-col gap-3">
          {current && (
            <>
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
                  <button type="button" onClick={studio.undo} disabled={!studio.canUndo} className={`${adminIconButton} h-11 w-11 sm:h-9 sm:w-9`} aria-label="Deshacer (Ctrl+Z)" title="Deshacer (Ctrl+Z)">
                    <IconoDeshacer className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={studio.redo} disabled={!studio.canRedo} className={`${adminIconButton} h-11 w-11 sm:h-9 sm:w-9`} aria-label="Rehacer (Ctrl+Mayús+Z)" title="Rehacer (Ctrl+Mayús+Z)">
                    <IconoRehacer className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
                  <button type="button" onClick={() => void onDuplicate()} className={`${adminIconButton} h-11 w-11 sm:h-9 sm:w-9`} aria-label="Duplicar esta historia" title="Duplicar">
                    <IconoCopiar className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => void onRemove()} className={`${adminIconButton} h-11 w-11 text-deal hover:bg-deal-bg sm:h-9 sm:w-9`} aria-label="Eliminar esta historia" title="Eliminar">
                    <IconoEliminar className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </div>
              <span className="-mt-2 flex items-center gap-1 text-xs text-muted sm:hidden" aria-live="polite">
                {status === 'saved' && <IconoCheck className="h-3.5 w-3.5 text-success-strong" aria-hidden="true" />}
                {STATUS_TEXT[status]}
              </span>

              {/* Sin doble sticky: Pasos ya incluye sticky top-16 */}
              <Pasos
                pasos={pasos}
                actual={activeIdx}
                onIr={(i) => goStep(activeStepNums[i] ?? 1)}
                onAltura={setAltoPasos}
                etiqueta="Pasos de la historia"
              />

              {/* Móvil Variante A: selector Editar | Vista previa */}
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1 lg:hidden" role="tablist" aria-label="Modo del editor móvil">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileTab === 'editar'}
                  onClick={() => setMobileTab('editar')}
                  className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${mobileTab === 'editar' ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-soft hover:text-ink'}`}
                >
                  Editar
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileTab === 'preview'}
                  onClick={() => setMobileTab('preview')}
                  className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${mobileTab === 'preview' ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-soft hover:text-ink'}`}
                >
                  Vista previa
                </button>
              </div>
            </>
          )}

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className={`order-2 flex min-w-0 flex-col gap-4 lg:order-1 ${current && !grande && mobileTab === 'preview' ? 'max-lg:hidden' : ''}`}>
              {current ? (
                !grande && (
                  <>
                    <p className="text-sm text-ink-soft">
                      <strong className="text-ink">Paso {activeIdx + 1} de {activeStepNums.length}.</strong> {STEP_HELP[step]}
                    </p>
                    {panelPaso}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                      {anteriorPasoNum ? (
                        <button type="button" onClick={() => goStep(anteriorPasoNum)} className={adminSecondaryButton}>
                          Atrás
                        </button>
                      ) : (
                        <span />
                      )}
                      {siguientePasoNum && (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            disabled={!siguienteDisponible}
                            onClick={() => siguienteDisponible && goStep(siguientePasoNum)}
                            className={adminPrimaryButton}
                          >
                            Siguiente: {STEPS.find(([s]) => s === siguientePasoNum)?.[1]}
                          </button>
                          {!siguienteDisponible && primerFaltante && (
                            <span className="text-xs font-medium text-deal">{primerFaltante}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )
              ) : (
                <p className="py-12 text-center text-sm text-muted" aria-busy="true">
                  {loading ? 'Cargando ElectroStudio…' : 'Abriendo la historia…'}
                </p>
              )}
            </div>

            <div
              role={grande ? 'region' : undefined}
              aria-label={grande ? 'Editor en pantalla completa' : undefined}
              className={
                grande
                  ? 'fixed inset-x-0 top-0 z-[var(--z-drawer)] flex h-dvh flex-col overscroll-none bg-ink'
                  : `order-1 flex flex-col gap-2 lg:sticky lg:top-[calc(var(--tope-vista)+0.75rem)] lg:order-2 ${mobileTab === 'editar' ? 'max-lg:hidden' : ''}`
              }
              style={
                grande
                  ? { height: vistaAlto ? `${vistaAlto}px` : undefined, top: vistaArriba }
                  : ({ '--tope-vista': `calc(4rem + ${altoPasos}px)` } as CSSProperties)
              }
            >
              {grande && barraGrande}
              {preview}
              {grande ? hojaGrande : previewExtras}
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
            { icono: 'tocar', texto: 'Doble toque para escribir en un texto' },
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
            cerrarGrande();
            goStep(PASO_PUBLICAR);
          }}
        />
      )}
    </div>
  );
}
