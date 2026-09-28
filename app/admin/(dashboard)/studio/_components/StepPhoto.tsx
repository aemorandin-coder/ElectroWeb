'use client';

import { useId, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiImage } from 'react-icons/fi';
import { adminHint, adminInput, adminLabel, adminNotice } from '@/lib/admin-ui';
import { SPEC_ICONS } from '@/lib/studio/icons';
import { TEMPLATES, type StudioProductSlot } from '@/lib/studio/schema';
import { dropZone, smallButton } from './ui';
import type { Studio } from './useStudio';

interface Props {
  studio: Studio;
  productSrc: (p: StudioProductSlot, i: number) => string;
  onFile: (index: number, file: File) => void;
  activeSlot: number;
  setActiveSlot: (i: number) => void;
}

export default function StepPhoto({ studio, productSrc, onFile, activeSlot, setActiveSlot }: Props) {
  const { current, update } = studio;
  if (!current) return null;
  const isMsg = current.template === 'mensaje';
  const n = isMsg ? 1 : TEMPLATES[current.template].n;
  const setSlot = (i: number, patch: Partial<StudioProductSlot>) =>
    update((f) => ({ ...f, products: f.products.map((s, k) => (k === i ? { ...s, ...patch } : s)) }));

  return (
    <div className="flex flex-col gap-4">
      <div className={adminNotice('neutral')}>
        <p className="font-semibold text-ink">Cómo poner la foto</p>
        <p className="mt-1">
          Si elegiste el producto de la tienda, su foto ya está puesta. Para otra, tócala abajo y elige un archivo, arrástrala o
          cópiala (clic derecho, Copiar imagen) y pulsa Ctrl+V con el recuadro marcado.
        </p>
      </div>
      {isMsg && <p className={adminHint}>En un mensaje la imagen es opcional. Si no pones ninguna, puedes usar un ícono de fondo.</p>}
      {Array.from({ length: n }, (_, i) => {
        const p = current.products[i];
        if (!p) return null;
        return (
          <PhotoSlot
            key={i}
            label={isMsg ? 'Imagen' : p.title || `Producto ${i + 1}`}
            src={productSrc(p, i)}
            optional={isMsg}
            active={activeSlot === i && n > 1}
            cutout={p.cutout}
            onActivate={() => setActiveSlot(i)}
            onFile={(file) => onFile(i, file)}
            onCutout={(v) => setSlot(i, { cutout: v })}
            onClear={() => setSlot(i, { imageUrl: '' })}
          />
        );
      })}
      {isMsg && (
        <div>
          <label htmlFor="m-icon" className={adminLabel}>
            Ícono de fondo
          </label>
          <select id="m-icon" value={current.msg.icon} onChange={(e) => update((f) => ({ ...f, msg: { ...f.msg, icon: e.target.value } }))} className={adminInput()}>
            <option value="ninguno">Ninguno</option>
            {[...SPEC_ICONS, ['estrella', 'Estrella'], ['reloj', 'Reloj'], ['regalo', 'Regalo'], ['camion', 'Envío'], ['chat', 'Chat'], ['ubicacion', 'Ubicación']].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

interface SlotProps {
  label: string;
  src: string;
  optional: boolean;
  active: boolean;
  cutout: boolean;
  onActivate: () => void;
  onFile: (file: File) => void;
  onCutout: (v: boolean) => void;
  onClear: () => void;
}

function PhotoSlot({ label, src, optional, active, cutout, onActivate, onFile, onCutout, onClear }: SlotProps) {
  const [over, setOver] = useState(false);
  const inputId = useId();
  const missing = !src && !optional;
  return (
    <div className={`flex flex-col gap-2 rounded-xl ${active ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`} onPointerDown={onActivate} onFocus={onActivate}>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <label
        htmlFor={inputId}
        className={dropZone(over, missing)}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
          {src ? (
            // Vista chica de la foto recién pegada (blob:) o subida: next/image no sirve para blob:
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-contain" />
          ) : (
            <FiImage className="h-6 w-6 text-muted" aria-hidden="true" />
          )}
        </span>
        <span className="flex min-w-0 flex-col text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            {src ? (
              <FiCheckCircle className="h-4 w-4 text-success-strong" aria-hidden="true" />
            ) : missing ? (
              <FiAlertTriangle className="h-4 w-4 text-warning-strong" aria-hidden="true" />
            ) : null}
            {src ? 'Foto lista · cambiar' : missing ? 'Falta la foto' : 'Agregar imagen (opcional)'}
          </span>
          <span className="text-muted">Toca para elegir un archivo, arrástralo aquí o pega con Ctrl+V</span>
        </span>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
      </label>
      {src && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={cutout} onChange={(e) => onCutout(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            Quitar fondo blanco
          </label>
          <button type="button" onClick={onClear} className={smallButton}>
            Quitar imagen
          </button>
        </div>
      )}
    </div>
  );
}
