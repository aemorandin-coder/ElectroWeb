'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiCheck, FiCloud, FiDownload, FiPause, FiPlay } from 'react-icons/fi';
import { adminEmpty, adminHint, adminPrimaryButton } from '@/lib/admin-ui';
import { useDelNavegador } from '@/lib/hooks/useMontado';
import {
  DURATION,
  H,
  StudioImages,
  W,
  createRenderer,
  flyerImageSources,
  loadStudioFonts,
  missingImages,
  type ProductSrc,
  type StudioRenderer,
} from '@/lib/studio/engine';
import { refreshLinked } from '@/lib/studio/live';
import { TEMPLATES, normalizeFlyer, slugify, type StudioFlyer, type StudioFlyerData } from '@/lib/studio/schema';
import { makeZip } from '@/lib/studio/zip';
import { canvasBlob, downloadBlob, pickVideoType, recordCanvas, shareFile, uploadStudioImage } from './exporters';
import FlyerList from './FlyerList';
import StepContent, { slotDone } from './StepContent';
import StepDesign from './StepDesign';
import StepPhoto from './StepPhoto';
import StepPublish, { type PublishCheck } from './StepPublish';
import { toggleButton } from './ui';
import { useStudio, type SaveStatus } from './useStudio';

const STEPS: [number, string][] = [
  [1, 'Contenido'],
  [2, 'Foto'],
  [3, 'Diseño'],
  [4, 'Publicar'],
];
const SAFE_KEY = 'studio-safe';

const fileBase = (f: StudioFlyerData) => `${slugify(f.name || f.products[0]?.title || 'historia')}-electroshop-historia`;

function stepDone(k: number, f: StudioFlyerData, src: ProductSrc): boolean {
  if (k === 1) {
    if (f.template === 'mensaje') return !!f.msg.headline.trim();
    return f.products.slice(0, TEMPLATES[f.template].n).every(slotDone) && (f.template !== 'trio' || !!f.heading.trim());
  }
  if (k === 2) return missingImages(f, src).length === 0;
  if (k === 4) return !!f.caption.trim();
  return false;
}

function firstOpenStep(f: StudioFlyerData, src: ProductSrc): number {
  return [1, 2, 4].find((k) => !stepDone(k, f, src)) ?? 4;
}

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: '',
  dirty: 'Cambios sin guardar…',
  saving: 'Guardando…',
  saved: 'Guardado',
  error: 'No se pudo guardar',
};

export default function Studio() {
  const studio = useStudio();
  const { loading, flyers, current, currentId, brand, status, update } = studio;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const images = useRef<StudioImages | null>(null);
  const renderer = useRef<StudioRenderer | null>(null);
  // Fotos pegadas que aún se están subiendo: se ven al instante, antes de tener su ruta en la tienda
  const [tempImages, setTempImages] = useState<Record<string, string>>({});
  const srcRef = useRef<ProductSrc>((p) => p.imageUrl);
  const productSrc: ProductSrc = useCallback((p, i) => tempImages[`${currentId}:${i}`] || p.imageUrl, [tempImages, currentId]);

  const [stepFor, setStepFor] = useState<{ id: string | null; step: number }>({ id: null, step: 1 });
  // Al abrir otra historia se va al primer paso pendiente; después el paso solo cambia cuando la persona lo elige
  if (current && currentId && stepFor.id !== currentId) setStepFor({ id: currentId, step: firstOpenStep(current, productSrc) });
  const step = stepFor.id === currentId ? stepFor.step : 1;
  const goStep = (k: number) => setStepFor({ id: currentId, step: k });
  const [slotFor, setSlotFor] = useState<{ id: string | null; slot: number }>({ id: null, slot: 0 });
  const activeSlot = slotFor.id === currentId ? slotFor.slot : 0;
  const setActiveSlot = useCallback((i: number) => setSlotFor({ id: currentId, slot: i }), [currentId]);

  const [playing, setPlaying] = useState(false);
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
  const scene = useRef({ current, brand, safe });
  useEffect(() => {
    scene.current = { current, brand, safe };
    srcRef.current = productSrc;
  });

  const drawStatic = useCallback(() => {
    if (!renderer.current || busyRef.current) return;
    const s = scene.current;
    renderer.current.draw(s.current, s.brand, { preview: true, safeZones: s.safe });
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
      frame = requestAnimationFrame(drawStatic);
    };
    void loadStudioFonts().then(drawStatic);
    return () => cancelAnimationFrame(frame);
  }, [drawStatic, loading]);

  // Imagen fija cada vez que cambia algo (si no se está reproduciendo la animación)
  useEffect(() => {
    if (playing) return;
    const frame = requestAnimationFrame(drawStatic);
    return () => cancelAnimationFrame(frame);
  }, [current, brand, safe, tempImages, playing, drawStatic]);

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
        renderer.current.draw(s.current, s.brand, { preview: true, safeZones: s.safe, t, epoch });
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
      const n = f.template === 'mensaje' ? 1 : TEMPLATES[f.template].n;
      const slot = Math.min(activeSlot, n - 1);
      void onFile(slot, file);
      toast.success(n > 1 ? `Foto pegada en el producto ${slot + 1}` : 'Foto pegada');
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [activeSlot, onFile]);

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

  const renderStill = async (f: StudioFlyerData, src: ProductSrc): Promise<Blob | null> => {
    const r = renderer.current;
    const canvas = canvasRef.current;
    if (!r || !canvas || !images.current) return null;
    await loadStudioFonts();
    await images.current.whenReady(flyerImageSources(f, brand, src));
    const prev = srcRef.current;
    srcRef.current = src;
    r.draw(f, brand, { preview: false });
    const blob = await canvasBlob(canvas);
    srcRef.current = prev;
    return blob;
  };

  const warnMissing = (f: StudioFlyerData) => {
    const miss = missingImages(f, productSrc);
    if (miss.length) toast(`Sale sin foto de: ${miss.join(', ')}`, { icon: <FiAlertTriangle className="text-warning-strong" aria-hidden="true" /> });
  };

  const exportPng = () =>
    exclusive(async () => {
      if (!current) return;
      await studio.saveNow();
      warnMissing(current);
      const blob = await renderStill(current, productSrc);
      if (!blob) throw new Error('No se pudo generar la imagen');
      downloadBlob(blob, `${fileBase(current)}.png`);
    });

  const share = () =>
    exclusive(async () => {
      if (!current) return;
      const blob = await renderStill(current, productSrc);
      if (!blob) throw new Error('No se pudo generar la imagen');
      if (!(await shareFile(blob, `${fileBase(current)}.png`, current.caption))) {
        downloadBlob(blob, `${fileBase(current)}.png`);
        toast('Este navegador no comparte archivos: se descargó la imagen');
      }
    });

  const exportVideo = () =>
    exclusive(async () => {
      if (!current || !canvasRef.current || !renderer.current || !images.current) return;
      const type = pickVideoType();
      if (!type || !canvasRef.current.captureStream) throw new Error('Este navegador no puede grabar video. Prueba con Chrome.');
      warnMissing(current);
      await loadStudioFonts();
      await images.current.whenReady(flyerImageSources(current, brand, productSrc));
      const toastId = toast.loading(`Grabando el video (${DURATION} segundos). No cambies de pestaña.`);
      const epoch = Date.now();
      const r = renderer.current;
      const blob = await recordCanvas(canvasRef.current, type, (t) => r.draw(current, brand, { preview: false, t, epoch }));
      toast.dismiss(toastId);
      const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
      downloadBlob(blob, `${fileBase(current)}.${ext}`);
      if (ext === 'webm') toast('Tu navegador grabó en WEBM; Instagram prefiere MP4. Usa Chrome actualizado.');
    });

  const exportZip = (list: StudioFlyer[], name: string) =>
    exclusive(async () => {
      if (!list.length) return;
      await studio.saveNow();
      const live = await studio.liveFor(list);
      const files: { name: string; blob: Blob }[] = [];
      let missing = 0;
      const toastId = toast.loading(`Preparando 1 de ${list.length}…`);
      for (let i = 0; i < list.length; i++) {
        toast.loading(`Preparando ${i + 1} de ${list.length}…`, { id: toastId });
        const f = refreshLinked(normalizeFlyer(list[i]), live);
        const src: ProductSrc = list[i].id === currentId ? productSrc : (p) => p.imageUrl;
        if (missingImages(f, src).length) missing++;
        const blob = await renderStill(f, src);
        if (blob) files.push({ name: `${String(i + 1).padStart(2, '0')}-${fileBase(f)}.png`, blob });
      }
      toast.dismiss(toastId);
      if (!files.length) throw new Error('No se pudo generar');
      downloadBlob(await makeZip(files), `${slugify(name)}-historias.zip`);
      if (missing) toast(`${missing} historia(s) sin foto de producto`);
    });

  if (loading) {
    return (
      <div className={adminEmpty} aria-busy="true">
        <p className="text-sm text-muted">Cargando ElectroStudio…</p>
      </div>
    );
  }

  const miss = current ? missingImages(current, productSrc) : [];
  const checks: PublishCheck[] = current
    ? [
        { ok: stepDone(1, current, productSrc), text: current.template === 'mensaje' ? 'Titular escrito' : 'Textos y precio completos', step: 1 },
        { ok: miss.length === 0, text: miss.length ? `Falta la foto de: ${miss.join(', ')}` : 'Fotos listas', step: 2 },
        { ok: !!current.caption.trim(), text: 'Texto para Instagram escrito' },
      ]
    : [];

  const preview = (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        role="img"
        aria-label={current ? `Vista previa de la historia ${current.name}` : 'Vista previa'}
        className="aspect-[9/16] h-auto w-full max-w-[15rem] rounded-md bg-white shadow-lg sm:max-w-xs lg:w-[min(100%,calc((100dvh_-_14rem)*9/16))] lg:max-w-none"
      />
      {current && (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" aria-pressed={playing} onClick={() => setPlaying((p) => !p)} className={toggleButton(playing)}>
              {playing ? <FiPause className="mr-1.5 h-4 w-4" aria-hidden="true" /> : <FiPlay className="mr-1.5 h-4 w-4" aria-hidden="true" />}
              {playing ? 'Detener' : 'Ver animación'}
            </button>
            <button type="button" onClick={() => void exportPng()} disabled={busy} className={`${adminPrimaryButton} h-9 px-3`}>
              <FiDownload className="h-4 w-4" aria-hidden="true" />
              Imagen
            </button>
          </div>
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
          <p className={`${adminHint} text-center`}>{miss.length ? `Falta la foto de: ${miss.join(', ')}` : 'Historia de Instagram: 1080 × 1920 (9:16).'}</p>
        </>
      )}
    </div>
  );

  // Teléfono: vista previa, editor y lista. lg: editor y vista previa, lista abajo. Desde 1360 px (85rem, en rem para que Tailwind lo ordene después de lg): las tres columnas
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] min-[85rem]:grid-cols-[15rem_minmax(0,1fr)_24rem]">
      <aside className="order-3 rounded-2xl border border-line bg-white p-4 lg:col-span-2 min-[85rem]:order-1 min-[85rem]:col-span-1 min-[85rem]:sticky min-[85rem]:top-20">
        <FlyerList flyers={flyers} currentId={currentId} busy={busy} onSelect={(id) => void studio.select(id)} onNew={() => void studio.create()} onZip={(l, n) => void exportZip(l, n)} />
      </aside>

      <section className="order-2 rounded-2xl border border-line bg-white p-4 lg:order-1 min-[85rem]:order-2" aria-label="Editor">
        {current ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="truncate text-base font-bold text-ink">{current.name || 'Sin nombre'}</h2>
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

            {step === 1 && <StepContent studio={studio} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />}
            {step === 2 && <StepPhoto studio={studio} productSrc={productSrc} onFile={(i, f) => void onFile(i, f)} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />}
            {step === 3 && <StepDesign studio={studio} onAnim={replay} />}
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
            {step < 4 && (
              <div className="flex justify-end border-t border-line pt-3">
                <button type="button" onClick={() => goStep(step + 1)} className={adminPrimaryButton}>
                  Siguiente: {STEPS[step][1]}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={adminEmpty}>
            <p className="font-semibold text-ink">Aún no hay historias</p>
            <p className="mt-1 text-sm text-muted">Crea la primera: elige un producto de la tienda y en un minuto la tienes lista para Instagram.</p>
            <button type="button" onClick={() => void studio.create()} className={`${adminPrimaryButton} mt-4`}>
              Nueva historia
            </button>
          </div>
        )}
      </section>

      <div className="order-1 lg:sticky lg:top-20 lg:order-2 min-[85rem]:order-3">{preview}</div>
    </div>
  );
}
