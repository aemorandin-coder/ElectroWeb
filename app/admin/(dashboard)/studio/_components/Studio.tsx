'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiArrowLeft, FiCheck, FiCloud, FiCopy, FiCornerUpLeft, FiCornerUpRight, FiDownload, FiPause, FiPlay, FiTrash2 } from 'react-icons/fi';
import { adminEmpty, adminHint, adminIconButton, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useDelNavegador } from '@/lib/hooks/useMontado';
import { firstOpenStep, flyerChecks, stepDone, type TextIssues } from '@/lib/studio/checks';
import {
  DURATION,
  H,
  StudioImages,
  formatHeight,
  W,
  createRenderer,
  flyerImageSources,
  loadStudioFonts,
  missingImages,
  type ProductSrc,
  type StudioRenderer,
} from '@/lib/studio/engine';
import { FORMATS, TEMPLATES, type BackgroundId, type FormatId, type StudioFlyerData } from '@/lib/studio/schema';
import { canvasBlob, downloadBlob, fileBase, pickVideoType, recordCanvas, shareFile, uploadStudioImage } from './exporters';
import StepContent from './StepContent';
import StepDesign from './StepDesign';
import StepPhoto from './StepPhoto';
import StepPublish from './StepPublish';
import { useStudioContext } from './StudioContext';
import { toggleButton } from './ui';
import { useDownloadGate } from './useDownloadGate';
import type { SaveStatus } from './useStudio';

const STEPS: [number, string][] = [
  [1, 'Contenido'],
  [2, 'Foto'],
  [3, 'Diseño'],
  [4, 'Publicar'],
];
const SAFE_KEY = 'studio-safe';

/** Qué se hace en cada paso (C-116, fase 2): una línea arriba del paso */
const STEP_HELP: Record<number, string> = {
  1: 'Qué publicar y el producto. Con un producto de la tienda, el precio y la oferta se ponen solos.',
  2: 'La foto de cada producto: pégala (Ctrl+V), arrástrala o elígela. Mejor con fondo blanco o transparente.',
  3: 'Opcional: formato, fondo, efectos y colores. Si no cambias nada, queda con el diseño de la plantilla.',
  4: 'Revisa la lista, descarga la imagen o el video y copia el texto para Instagram.',
};

/** Vista previa chica del teléfono, para que el editor quede a la vista (se agranda con un botón) */
const PREVIEW_SMALL: Record<FormatId, string> = {
  story: 'max-lg:max-w-[9rem]',
  post45: 'max-lg:max-w-[11rem]',
  post11: 'max-lg:max-w-[12rem]',
};

/** Proporción de la vista previa y su ancho en escritorio (alto disponible × proporción) */
const PREVIEW_CLASS: Record<FormatId, string> = {
  story: 'aspect-[9/16] max-w-[15rem] sm:max-w-xs lg:w-[min(100%,calc((100dvh_-_14rem)*9/16))]',
  post45: 'aspect-[4/5] max-w-xs sm:max-w-sm lg:w-[min(100%,calc((100dvh_-_14rem)*4/5))]',
  post11: 'aspect-square max-w-xs sm:max-w-sm lg:w-[min(100%,calc(100dvh_-_14rem))]',
};

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

  const [stepFor, setStepFor] = useState<{ id: string | null; step: number }>({ id: null, step: 1 });
  // Al abrir otra historia se va al paso pedido (?paso=, desde el inicio) o al primero pendiente;
  // después el paso solo cambia cuando la persona lo elige
  const askedStep = Number(params.get('paso'));
  if (current && currentId && stepFor.id !== currentId) {
    setStepFor({ id: currentId, step: askedStep >= 1 && askedStep <= 4 ? askedStep : firstOpenStep(current, productSrc) });
  }
  const step = stepFor.id === currentId ? stepFor.step : 1;
  const editorRef = useRef<HTMLElement | null>(null);
  const goStep = (k: number) => {
    setStepFor({ id: currentId, step: k });
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
  const scene = useRef({ current, brand, safe, code: currentCode });
  useEffect(() => {
    scene.current = { current, brand, safe, code: currentCode };
    srcRef.current = productSrc;
  });
  // Sube cada vez que llega una imagen: las miniaturas de los fondos con foto se vuelven a dibujar
  const [imgTick, setImgTick] = useState(0);

  // Textos que no caben ni con la letra más chica (C-116): se avisan en Publicar y al descargar
  const [textIssues, setTextIssues] = useState<TextIssues>({ cut: [], tiny: [] });
  const drawStatic = useCallback(() => {
    if (!renderer.current || busyRef.current) return;
    const s = scene.current;
    renderer.current.draw(s.current, s.brand, { preview: true, safeZones: s.safe, code: s.code });
    const now = renderer.current.textIssues();
    setTextIssues((prev) => (JSON.stringify(prev) === JSON.stringify(now) ? prev : now));
  }, []);

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
        renderer.current.draw(s.current, s.brand, { preview: true, safeZones: s.safe, t, epoch, code: s.code });
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

  /** Bloquea la vista previa mientras se exporta y la devuelve al terminar */
  const exclusive = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo exportar');
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
    await loadStudioFonts();
    await images.current.whenReady(flyerImageSources(f, brand, src));
    const prev = srcRef.current;
    srcRef.current = src;
    r.draw(f, brand, { preview: false, code });
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
      await loadStudioFonts();
      await images.current.whenReady(flyerImageSources(current, brand, productSrc));
      const toastId = toast.loading(`Grabando el video (${DURATION} segundos). No cambies de pestaña.`);
      const epoch = Date.now();
      const r = renderer.current;
      const blob = await recordCanvas(canvasRef.current, type, (t) => r.draw(current, brand, { preview: false, t, epoch, code: currentCode }));
      toast.dismiss(toastId);
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
      <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
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

  const preview = (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        role="img"
        aria-label={current ? `Vista previa de ${current.name}` : 'Vista previa'}
        className={`${PREVIEW_CLASS[format]} ${bigPreview ? '' : PREVIEW_SMALL[format]} h-auto w-full rounded-md bg-white shadow-lg lg:max-w-none`}
      />
      {current && (
        <>
          <button type="button" aria-pressed={bigPreview} onClick={() => setBigPreview((b) => !b)} className={`${toggleButton(bigPreview)} lg:hidden`}>
            {bigPreview ? 'Achicar la vista previa' : 'Agrandar la vista previa'}
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" aria-pressed={playing} onClick={() => setPlaying((p) => !p)} className={toggleButton(playing)}>
              {playing ? <FiPause className="mr-1.5 h-4 w-4" aria-hidden="true" /> : <FiPlay className="mr-1.5 h-4 w-4" aria-hidden="true" />}
              {playing ? 'Detener' : 'Ver animación'}
            </button>
            <button type="button" onClick={() => void exportPng()} disabled={busy} className={`${adminSecondaryButton} h-9 px-3`}>
              <FiDownload className="h-4 w-4" aria-hidden="true" />
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
        </>
      )}
    </div>
  );

  // Teléfono: vista previa y editor debajo. lg: editor y vista previa al lado. La lista está en el inicio (C-116).
  return (
    <div>
      {back}
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section ref={editorRef} className="order-2 scroll-mt-20 rounded-2xl border border-line bg-white p-4 lg:order-1" aria-label="Editor">
        {current ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h1 className="truncate text-base font-bold text-ink">{current.name || 'Sin nombre'}</h1>
              <span className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={studio.undo} disabled={!studio.canUndo} className={adminIconButton} aria-label="Deshacer (Ctrl+Z)" title="Deshacer (Ctrl+Z)">
                  <FiCornerUpLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={studio.redo} disabled={!studio.canRedo} className={adminIconButton} aria-label="Rehacer (Ctrl+Mayús+Z)" title="Rehacer (Ctrl+Mayús+Z)">
                  <FiCornerUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
                <button type="button" onClick={() => void onDuplicate()} className={adminIconButton} aria-label="Duplicar esta historia" title="Duplicar">
                  <FiCopy className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => void onRemove()} className={`${adminIconButton} text-deal hover:bg-deal-bg`} aria-label="Eliminar esta historia" title="Eliminar">
                  <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            </div>
            <div className="-mt-3 flex justify-end">
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted" aria-live="polite">
                {status === 'saved' && <FiCheck className="h-3.5 w-3.5 text-success-strong" aria-hidden="true" />}
                {status === 'saving' && <FiCloud className="h-3.5 w-3.5" aria-hidden="true" />}
                {status === 'error' && <FiAlertTriangle className="h-3.5 w-3.5 text-deal" aria-hidden="true" />}
                {STATUS_TEXT[status]}
              </span>
            </div>
            <nav aria-label="Pasos" className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-surface p-1">
              {STEPS.map(([k, label]) => {
                const done = k !== 3 && stepDone(k, current, productSrc);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => goStep(k)}
                    aria-current={step === k ? 'step' : undefined}
                    className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 ${
                      step === k ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                        done ? 'border-success-strong bg-success-strong text-white' : 'border-line-strong bg-white'
                      }`}
                    >
                      {done ? <FiCheck className="h-3.5 w-3.5" aria-label="Listo" /> : k}
                    </span>
                    {label}
                  </button>
                );
              })}
            </nav>
            <p className="-mt-1 text-sm text-ink-soft">
              <strong className="text-ink">Paso {step} de 4.</strong> {STEP_HELP[step]}
            </p>

            {step === 1 && <StepContent studio={studio} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />}
            {step === 2 && <StepPhoto studio={studio} productSrc={productSrc} onFile={(i, f) => void onFile(i, f)} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />}
            {step === 3 && <StepDesign studio={studio} onAnim={replay} drawThumb={drawThumb} imgTick={imgTick} />}
            {step === 4 && (
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
              {step < 4 && (
                <button type="button" onClick={() => goStep(step + 1)} className={adminPrimaryButton}>
                  Siguiente: {STEPS[step][1]}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted" aria-busy="true">
            {loading ? 'Cargando ElectroStudio…' : 'Abriendo la historia…'}
          </p>
        )}
      </section>

      <div className="order-1 lg:sticky lg:top-20 lg:order-2">{preview}</div>
    </div>
    </div>
  );
}
