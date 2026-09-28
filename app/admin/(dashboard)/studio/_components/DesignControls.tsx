'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiCheck, FiImage, FiPlus, FiX } from 'react-icons/fi';
import { adminHint, adminInput, adminLabel } from '@/lib/admin-ui';
import { bgFor, formatHeight, W } from '@/lib/studio/engine';
import {
  ANIMATIONS,
  BACKGROUNDS,
  EFFECTS,
  FORMATS,
  type AnimationId,
  type BackgroundId,
  type EffectId,
  type FormatId,
  type StudioBgPhoto,
  type StudioStyle,
} from '@/lib/studio/schema';
import { uploadStudioImage } from './exporters';
import { smallButton, toggleButton } from './ui';
import type { Studio } from './useStudio';

// Controles del paso Diseño que suma C-113: formato, estilos guardados, fondos con miniatura, foto de fondo,
// efectos, animación y colores de la historia

export type DrawThumb = (canvas: HTMLCanvasElement, style: BackgroundId) => void;

export function FormatPicker({ studio }: { studio: Studio }) {
  const { current, update } = studio;
  if (!current) return null;
  return (
    <fieldset>
      <legend className={adminLabel}>Formato</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.entries(FORMATS) as [FormatId, (typeof FORMATS)[FormatId]][]).map(([id, fm]) => (
          <button key={id} type="button" aria-pressed={current.format === id} onClick={() => update((f) => ({ ...f, format: id }))} className={toggleButton(current.format === id)}>
            {fm.label}
          </button>
        ))}
      </div>
      <p className={adminHint}>Historia para Stories y Reels; 4:5 y 1:1 para publicaciones del perfil.</p>
    </fieldset>
  );
}

export function StylesBar({ studio }: { studio: Studio }) {
  const { current, brand, setBrand, applyStyle } = studio;
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const inputId = useId();
  if (!current) return null;
  const save = () => {
    const clean = name.trim().slice(0, 30);
    if (!clean) return;
    const style: StudioStyle = {
      id: Date.now().toString(36),
      name: clean,
      bg: current.bg,
      anim: current.anim,
      fx: { ...current.fx },
      accent: current.accent,
      accent2: current.accent2,
    };
    setBrand((b) => ({ ...b, styles: [...b.styles.filter((s) => s.name !== clean), style].slice(-12) }));
    setNaming(false);
    setName('');
    toast.success(`Estilo "${clean}" guardado`);
  };
  return (
    <div>
      <p className={adminLabel}>Estilos guardados</p>
      <div className="flex flex-wrap items-center gap-2">
        {brand.styles.map((s) => (
          <span key={s.id} className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-white">
            <button type="button" onClick={() => applyStyle(s)} className="flex h-9 items-center gap-2 px-3 text-sm font-semibold text-ink hover:bg-surface">
              <span className="flex" aria-hidden="true">
                <span className="h-3 w-3 rounded-full border border-line" style={{ background: s.accent || brand.accent }} />
                <span className="-ml-1 h-3 w-3 rounded-full border border-line" style={{ background: s.accent2 || brand.accent2 }} />
              </span>
              {s.name}
            </button>
            <button
              type="button"
              onClick={() => setBrand((b) => ({ ...b, styles: b.styles.filter((x) => x.id !== s.id) }))}
              className="flex h-9 w-8 items-center justify-center border-l border-line text-muted hover:bg-surface hover:text-deal"
              aria-label={`Borrar el estilo ${s.name}`}
            >
              <FiX className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        {naming ? (
          <span className="flex items-center gap-1.5">
            <label htmlFor={inputId} className="sr-only">
              Nombre del estilo
            </label>
            <input
              id={inputId}
              type="text"
              value={name}
              autoFocus
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') setNaming(false);
              }}
              placeholder="Ej: Oferta roja"
              className={`${adminInput()} h-9 w-40`}
            />
            <button type="button" onClick={save} className={smallButton} aria-label="Guardar estilo">
              <FiCheck className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setNaming(true)} className={smallButton}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Guardar el actual
          </button>
        )}
      </div>
      <p className={adminHint}>Guarda fondo, animación, efectos y colores para aplicarlos a otra historia en un toque.</p>
    </div>
  );
}

function BgThumb({ style, height, drawThumb, deps }: { style: BackgroundId; height: number; drawThumb: DrawThumb; deps: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) drawThumb(ref.current, style);
  }, [style, drawThumb, deps, height]);
  return <canvas ref={ref} width={108} height={height} className="h-auto w-full rounded-md" aria-hidden="true" />;
}

export function BackgroundPicker({ studio, drawThumb, imgTick }: { studio: Studio; drawThumb: DrawThumb; imgTick: number }) {
  const { current, update, brand } = studio;
  if (!current) return null;
  const bg = bgFor(current);
  const h = Math.round((108 * formatHeight(current.format)) / W);
  // Cuando cambia algo que se ve en las miniaturas, se vuelven a dibujar
  const deps = [current.format, current.template, current.accent, current.accent2, brand.accent, brand.accent2, JSON.stringify(current.bgPhoto), current.products[0]?.imageUrl, imgTick].join('|');
  return (
    <fieldset>
      <legend className={adminLabel}>Fondo</legend>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {(Object.entries(BACKGROUNDS) as [BackgroundId, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={bg === id}
            onClick={() => update((f) => ({ ...f, bg: id }))}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 ${
              bg === id ? 'border-brand-500 bg-brand-50 text-ink' : 'border-transparent text-ink-soft hover:border-line'
            }`}
          >
            <BgThumb style={id} height={h} drawThumb={drawThumb} deps={deps} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Slider({ id, label, value, min, max, onChange, unit = '' }: { id: string; label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div>
      <label htmlFor={id} className="flex justify-between text-sm font-semibold text-ink">
        {label}
        <span className="font-normal text-muted">
          {value}
          {unit}
        </span>
      </label>
      <input id={id} type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-brand-500" />
    </div>
  );
}

export function PhotoControls({ studio }: { studio: Studio }) {
  const { current, update } = studio;
  const [uploading, setUploading] = useState(false);
  const fileId = useId();
  if (!current || (current.bg !== 'foto' && current.bg !== 'fotoproducto')) return null;
  const bp = current.bgPhoto;
  const set = (patch: Partial<StudioBgPhoto>) => update((f) => ({ ...f, bgPhoto: { ...f.bgPhoto, ...patch } }));
  const own = current.bg === 'foto';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
      {own ? (
        <div className="flex items-center gap-3">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
            {bp.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista chica de la foto subida
              <img src={bp.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <FiImage className="h-6 w-6 text-muted" aria-hidden="true" />
            )}
          </span>
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-ink">{bp.url ? 'Tu foto de fondo' : 'Sube una foto: el local, el mostrador, un unboxing'}</span>
            <label htmlFor={fileId} className={`${smallButton} cursor-pointer self-start`}>
              {uploading ? 'Subiendo…' : bp.url ? 'Cambiar foto' : 'Subir foto'}
            </label>
            <input
              id={fileId}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setUploading(true);
                try {
                  const url = await uploadStudioImage(file);
                  set({ url });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'No se pudo subir la foto');
                } finally {
                  setUploading(false);
                }
              }}
            />
          </div>
        </div>
      ) : (
        <p className={adminHint}>Usa la foto del primer producto, desenfocada detrás del contenido.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider id="bp-blur" label="Desenfoque" value={bp.blur} min={0} max={40} onChange={(v) => set({ blur: v })} />
        <Slider id="bp-darken" label="Oscurecer" value={bp.darken} min={0} max={85} unit="%" onChange={(v) => set({ darken: v })} />
        <Slider id="bp-zoom" label="Acercar" value={bp.zoom} min={100} max={250} unit="%" onChange={(v) => set({ zoom: v })} />
        <Slider id="bp-x" label="Mover a los lados" value={bp.x} min={0} max={100} onChange={(v) => set({ x: v })} />
        <Slider id="bp-y" label="Mover arriba y abajo" value={bp.y} min={0} max={100} onChange={(v) => set({ y: v })} />
        <label className="flex items-center gap-2 self-end pb-1 text-sm text-ink">
          <input type="checkbox" checked={bp.tint} onChange={(e) => set({ tint: e.target.checked })} className="h-4 w-4 accent-brand-500" />
          Teñir con el color de la marca
        </label>
      </div>
      <p className={adminHint}>El texto se pone blanco u oscuro solo, según la foto. Si algo no se lee, sube &quot;Oscurecer&quot;.</p>
    </div>
  );
}

export function EffectsPicker({ studio, onAnim }: { studio: Studio; onAnim: () => void }) {
  const { current, update } = studio;
  if (!current) return null;
  return (
    <>
      <fieldset>
        <legend className={adminLabel}>Efectos</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(EFFECTS) as [EffectId, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={current.fx[id]}
              onClick={() => {
                update((f) => ({ ...f, fx: { ...f.fx, [id]: !f.fx[id] } }));
                if (!current.fx[id] && id !== 'reflejo') onAnim();
              }}
              className={toggleButton(current.fx[id])}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={adminLabel}>Animación del video</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(ANIMATIONS) as [AnimationId, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={current.anim === id}
              onClick={() => {
                update((f) => ({ ...f, anim: id }));
                onAnim();
              }}
              className={toggleButton(current.anim === id)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className={adminHint}>Al elegir una, se reproduce en la vista previa. &quot;Escribir&quot; hace aparecer los títulos letra por letra.</p>
      </fieldset>
    </>
  );
}

export function StoryColors({ studio }: { studio: Studio }) {
  const { current, update, brand } = studio;
  if (!current) return null;
  const own = !!(current.accent || current.accent2);
  return (
    <div>
      <p className={adminLabel}>Colores de esta historia</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="color" value={current.accent || brand.accent} onChange={(e) => update((f) => ({ ...f, accent: e.target.value }))} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1" />
          Principal
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="color" value={current.accent2 || brand.accent2} onChange={(e) => update((f) => ({ ...f, accent2: e.target.value }))} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1" />
          Secundario
        </label>
        {own && (
          <button type="button" onClick={() => update((f) => ({ ...f, accent: '', accent2: '' }))} className={smallButton}>
            Usar los de la marca
          </button>
        )}
      </div>
      <p className={adminHint}>{own ? 'Solo cambian en esta historia.' : 'Por ahora usa los de la marca (abajo, en "Marca y ajustes").'}</p>
    </div>
  );
}
