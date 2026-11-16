'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  IconoAdvertencia, IconoCheck, IconoClaqueta, IconoCompartir, IconoCopiar, IconoDescargar, IconoDeshacer, IconoEditar, IconoEliminar,
  IconoFlechaIzquierda, IconoImagen, IconoMas, IconoNube, IconoPausa, IconoPintura, IconoPlay, IconoRehacer, IconoTexto, type IconType,
} from '@/components/iconos';
import Pasos, { type Paso } from '@/components/admin/Pasos';
import { adminEmpty, adminHint, adminIconButton, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useDelNavegador } from '@/lib/hooks/useMontado';
import { PASO_PUBLICAR, firstOpenStep, flyerChecks, stepDone, type TextIssues } from '@/lib/studio/checks';
import { cambiarCapa, duplicarCapa, moverCapa, nuevaCapa, nuevoIdCapa, puedeAgregarCapa } from '@/lib/studio/capas';
import { cargarFuentes } from '@/lib/studio/fuentes';
import {
  DURATION,
  H,
  StudioImages,
  formatHeight,
  W,
  bgFor,
  createRenderer,
  flyerImageSources,
  loadStudioFonts,
  missingImages,
  type CajaCapa,
  type ProductSrc,
  type StudioRenderer,
} from '@/lib/studio/engine';
import { canvasBlob, downloadBlob, GrabacionInterrumpida, pickVideoType, recordCanvas, shareFile } from '@/lib/studio/exportar';
import {
  ANIMATIONS, BACKGROUNDS, FORMATS, TEMPLATES, requiredPhotos, type BackgroundId, type CapaTexto, type EstiloCapa, type FormatId, type StudioFlyerData,
} from '@/lib/studio/schema';
import { esErrorDeVersion } from '@/lib/version-build';
import { fileBase, uploadStudioImage } from './exporters';
import { AnimationPicker } from './DesignControls';
import Lienzo from './Lienzo';
import StepCapas, { type AccionesCapas } from './StepCapas';
import StepContent from './StepContent';
import StepDesign from './StepDesign';
import StepPhoto from './StepPhoto';
import StepPublish from './StepPublish';
import { useStudioContext } from './StudioContext';
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
    setStepFor((s) => ({ id: currentId, step: k, vistos: s.id === currentId && !s.vistos.includes(s.step) ? [...s.vistos, s.step] : s.id === currentId ? s.vistos : [] }));
    // Si el comienzo del editor quedó arriba de la pantalla (teléfono, después de un paso largo), se vuelve a él
    const top = editorRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) editorRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  const [slotFor, setSlotFor] = useState<{ id: string | null; slot: number }>({ id: null, slot: 0 });
  const activeSlot = slotFor.id === currentId ? slotFor.slot : 0;
  const setActiveSlot = useCallback((i: number) => setSlotFor({ id: currentId, slot: i }), [currentId]);

  const [playing, setPlaying] = useState(false);
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
  const canShare = useDelNavegador(() => typeof navigator.share === 'function' && typeof navigator.canShare === 'function', false);

  // Lo último que hay que dibujar, para el bucle de animación y las cargas de imágenes
  const scene = useRef({ current, brand, safe, code: currentCode, navidad });
  useEffect(() => {
    scene.current = { current, brand, safe, code: currentCode, navidad };
    srcRef.current = productSrc;
  });
  // Sube cada vez que llega una imagen: las miniaturas de los fondos con foto se vuelven a dibujar
  const [imgTick, setImgTick] = useState(0);

  // Textos que no caben ni con la letra más chica (C-116): se avisan en Publicar y al descargar
  const [textIssues, setTextIssues] = useState<TextIssues>({ cut: [], tiny: [] });
  // C-270: dónde quedó cada capa en el último dibujo, para tocarla en la vista previa
  const [cajas, setCajas] = useState<CajaCapa[]>([]);
  const drawStatic = useCallback(() => {
    if (!renderer.current || busyRef.current) return;
    const s = scene.current;
    renderer.current.draw(s.current, s.brand, { preview: true, safeZones: s.safe, code: s.code, navidad: s.navidad });
    const now = renderer.current.textIssues();
    setTextIssues((prev) => (JSON.stringify(prev) === JSON.stringify(now) ? prev : now));
    const ahora = renderer.current.capasCajas();
    setCajas((prev) => (JSON.stringify(prev) === JSON.stringify(ahora) ? prev : ahora));
  }, []);

  // C-270: la capa elegida (de esta historia) y lo que se hace con las capas
  const [selFor, setSelFor] = useState<{ id: string | null; capa: string | null }>({ id: null, capa: null });
  const capaSel = selFor.id === currentId && current?.capas.some((c) => c.id === selFor.capa) ? selFor.capa : null;
  const setCapaSel = useCallback((capa: string | null) => setSelFor({ id: currentId, capa }), [currentId]);
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

  // C-271: las fuentes que usan las capas se cargan al elegirlas; cuando llegan, se vuelve a dibujar
  const fuentesUsadas = current ? [...new Set(current.capas.map((c) => c.fuente))].sort().join(',') : '';
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
  }, [current, brand, safe, tempImages, playing, drawStatic, currentCode]);

  // Animación en la vista previa, en bucle
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    playStart.current = performance.now();
    const epoch = Date.now();
    const loop = (now: number) => {
      if (!busyRef.current && renderer.current) {
        const t = Math.min(DURATION, ((now - playStart.current) / 1000) % (DURATION + 0.8));
        const s = scene.current;
        renderer.current.draw(s.current, s.brand, { preview: true, safeZones: s.safe, t, epoch, code: s.code, navidad: s.navidad });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const replay = () => {
    if (playing) playStart.current = performance.now();
    else setPlaying(true);
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
    cambiar: (cid: string, cambio: Partial<CapaTexto>) => update((f) => ({ ...f, capas: cambiarCapa(f.capas, cid, cambio) })),
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
    if (cid && step !== 4) goStep(4);
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

  const exportPng = async () => {
    if (!(await ready())) return;
    await exclusive(async () => {
      if (!current) return;
      await studio.saveNow();
      const blob = await renderStill(current, productSrc, currentCode);
      if (!blob) throw new Error('No se pudo generar la imagen');
      downloadBlob(blob, `${fileBase(current)}.png`);
      await markCurrentExported();
    });
  };

  const share = async () => {
    if (!(await ready())) return;
    await exclusive(async () => {
      if (!current) return;
      const blob = await renderStill(current, productSrc, currentCode);
      if (!blob) throw new Error('No se pudo generar la imagen');
      if (!(await shareFile(blob, `${fileBase(current)}.png`, current.caption))) {
        downloadBlob(blob, `${fileBase(current)}.png`);
        toast('Este navegador no comparte archivos: se descargó la imagen');
      }
      await markCurrentExported();
    });
  };

  const exportVideo = async () => {
    if (!(await ready())) return;
    await exclusive(async () => {
      if (!current || !canvasRef.current || !renderer.current || !images.current) return;
      const type = pickVideoType();
      if (!type || !canvasRef.current.captureStream) throw new Error('Este navegador no puede grabar video. Prueba con Chrome.');
      await loadStudioFonts(current);
      await images.current.whenReady(flyerImageSources(current, brand, productSrc));
      const toastId = toast.loading(`Grabando el video (${DURATION} segundos). No cambies de pestaña.`);
      const epoch = Date.now();
      const r = renderer.current;
      let blob: Blob;
      try {
        blob = await recordCanvas(canvasRef.current, type, (t) => r.draw(current, brand, { preview: false, t, epoch, code: currentCode, navidad }), DURATION);
      } finally {
        // C-268: antes, si la grabación fallaba, el aviso "Grabando el video…" quedaba en pantalla junto al error
        toast.dismiss(toastId);
      }
      const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
      downloadBlob(blob, `${fileBase(current)}.${ext}`);
      if (ext === 'webm') toast('Tu navegador grabó en WEBM; Instagram prefiere MP4. Usa Chrome actualizado.');
      await markCurrentExported();
    });
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

  const preview = (
    <div className="flex flex-col items-center gap-2 bg-white pb-2 max-lg:-mx-3 max-lg:border-b max-lg:border-line max-lg:px-3 max-sm:pt-1 sm:max-lg:-mx-4 sm:max-lg:px-4 lg:gap-3 lg:pb-0">
      <div className={`relative w-full ${PREVIEW_CLASS[format]} ${bigPreview ? '' : PREVIEW_SMALL[format]} lg:max-w-none`}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          role="img"
          aria-label={current ? `Vista previa de ${current.name}` : 'Vista previa'}
          className="block h-auto w-full rounded-md bg-white shadow-lg"
        />
        {current && (
          <Lienzo
            canvasRef={canvasRef}
            alto={alto}
            capas={current.capas}
            cajas={cajas}
            sel={capaSel}
            activo={!playing && !busy}
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
          />
        )}
      </div>
      {current && (
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
        <button type="button" aria-pressed={bigPreview} onClick={() => setBigPreview((b) => !b)} className={`${toggleButton(bigPreview)} lg:hidden`}>
          {bigPreview ? 'Achicar la vista previa' : 'Agrandar la vista previa'}
        </button>
        <button type="button" onClick={() => void exportPng()} disabled={busy} className={`${adminSecondaryButton} h-9 px-3`}>
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
                  <p className="text-sm text-ink-soft">
                    <strong className="text-ink">Paso {step} de {STEPS.length}.</strong> {STEP_HELP[step]}
                  </p>
                  {step === 1 && <StepContent studio={studio} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />}
                  {step === 2 && <StepPhoto studio={studio} productSrc={productSrc} onFile={(i, f) => void onFile(i, f)} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />}
                  {step === 3 && <StepDesign studio={studio} onAnim={replay} drawThumb={drawThumb} imgTick={imgTick} />}
                  {step === 4 && <StepCapas studio={studio} sel={capaSel} onSel={setCapaSel} acciones={capas} textoRef={textoCapaRef} />}
                  {step === 5 && (
                    <div className="flex flex-col gap-4">
                      <AnimationPicker studio={studio} onAnim={replay} />
                      <p className={adminHint}>El video dura {DURATION} segundos y sale igual que la vista previa.</p>
                    </div>
                  )}
                  {step === PASO_PUBLICAR && (
                    <StepPublish
                      studio={studio}
                      checks={checks}
                      busy={busy}
                      canShare={canShare}
                      onPng={() => void exportPng()}
                      onVideo={() => void exportVideo()}
                      onShare={() => void share()}
                      goStep={goStep}
                    />
                  )}
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
              ) : (
                <p className="py-12 text-center text-sm text-muted" aria-busy="true">
                  {loading ? 'Cargando ElectroStudio…' : 'Abriendo la historia…'}
                </p>
              )}
            </div>

            {/* La vista previa queda fija debajo de la ruta de pasos mientras se recorre el paso: es la celda de la rejilla la
                que es sticky (así su recorrido es toda la rejilla). En el teléfono, lo que no es la vista previa va en el panel */}
            <div
              className="order-1 flex flex-col gap-2 max-lg:sticky max-lg:top-[var(--tope-vista)] max-lg:z-[var(--z-sticky)] lg:sticky lg:top-[calc(var(--tope-vista)+0.75rem)] lg:order-2"
              style={{ '--tope-vista': `calc(4rem + ${altoPasos}px)` } as CSSProperties}
            >
              {preview}
              <div className="hidden lg:block">{previewExtras}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
