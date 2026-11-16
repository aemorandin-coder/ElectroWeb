'use client';

// C-272: lo que comparten el panel de un texto y el de un sticker (paso Textos y stickers): la cabecera con Duplicar y
// Borrar, el tamaño en px y la posición y el giro con números.
import { IconoCopiar, IconoEliminar, IconoMas, IconoMenos } from '@/components/iconos';
import CampoUnidad from '@/components/admin/CampoUnidad';
import { adminHint, adminLabel } from '@/lib/admin-ui';
import type { CambioCapa } from '@/lib/studio/capas';
import { W } from '@/lib/studio/engine';
import type { StudioCapa } from '@/lib/studio/schema';
import { smallButton } from './ui';

export const iconoBorde = 'flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white text-ink-soft hover:bg-surface disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-500';

export function CabeceraCapa({ titulo, lleno, onDuplicar, onBorrar }: { titulo: string; lleno: boolean; onDuplicar: () => void; onBorrar: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="min-w-0 truncate text-sm font-semibold text-ink">{titulo}</p>
      <span className="flex shrink-0 gap-1.5">
        <button type="button" onClick={onDuplicar} disabled={lleno} className={smallButton}>
          <IconoCopiar className="h-4 w-4" aria-hidden="true" />
          Duplicar
        </button>
        <button type="button" onClick={onBorrar} className={`${smallButton} text-deal! hover:bg-deal-bg`}>
          <IconoEliminar className="h-4 w-4" aria-hidden="true" />
          Borrar
        </button>
      </span>
    </div>
  );
}

/** El tamaño en px: −, el campo, + y la barra */
export function CampoTamano({ id, valor, min, max, paso, onCambiar, ayuda }: {
  id: string;
  valor: number;
  min: number;
  max: number;
  paso: number;
  onCambiar: (v: number) => void;
  ayuda: string;
}) {
  return (
    <div>
      <span className={adminLabel} id={`${id}-tam-et`}>Tamaño</span>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={iconoBorde} onClick={() => onCambiar(valor - paso)} disabled={valor <= min} aria-label={`Más chico (${paso} px)`}>
          <IconoMenos className="h-4 w-4" aria-hidden="true" />
        </button>
        <CampoUnidad
          unidad="px"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={valor}
          aria-labelledby={`${id}-tam-et`}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= min) onCambiar(v);
          }}
        />
        <button type="button" className={iconoBorde} onClick={() => onCambiar(valor + paso)} disabled={valor >= max} aria-label={`Más grande (${paso} px)`}>
          <IconoMas className="h-4 w-4" aria-hidden="true" />
        </button>
        <input type="range" min={min} max={max} value={valor} aria-labelledby={`${id}-tam-et`} onChange={(e) => onCambiar(Number(e.target.value))} className="min-w-32 flex-1 accent-brand-500" />
      </div>
      <p className={adminHint}>{ayuda}</p>
    </div>
  );
}

export function PosicionGiro({ id, capa, alto, onCambiar }: { id: string; capa: StudioCapa; alto: number; onCambiar: (cambio: CambioCapa) => void }) {
  return (
    <details className="border-t border-line pt-3">
      <summary className="cursor-pointer text-sm font-semibold text-ink">Posición y giro, con números</summary>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={`${id}-x`} className={adminLabel}>De izquierda a derecha</label>
          <CampoUnidad id={`${id}-x`} unidad="px" type="number" inputMode="numeric" min={0} max={W} value={Math.round(capa.x * W)} onChange={(e) => onCambiar({ x: Math.min(1, Math.max(0, Number(e.target.value) / W)) })} />
        </div>
        <div>
          <label htmlFor={`${id}-y`} className={adminLabel}>De arriba abajo</label>
          <CampoUnidad id={`${id}-y`} unidad="px" type="number" inputMode="numeric" min={0} max={alto} value={Math.round(capa.y * alto)} onChange={(e) => onCambiar({ y: Math.min(1, Math.max(0, Number(e.target.value) / alto)) })} />
        </div>
        <div>
          <label htmlFor={`${id}-giro`} className={adminLabel}>Giro</label>
          <CampoUnidad id={`${id}-giro`} unidad="°" type="number" inputMode="numeric" min={-180} max={180} value={capa.giro} onChange={(e) => onCambiar({ giro: Math.max(-180, Math.min(180, Math.round(Number(e.target.value) || 0))) })} />
        </div>
        <button type="button" className={smallButton} onClick={() => onCambiar({ x: 0.5 })}>Centrar</button>
        {capa.giro !== 0 && (
          <button type="button" className={smallButton} onClick={() => onCambiar({ giro: 0 })}>Sin giro</button>
        )}
      </div>
      <p className={`${adminHint} mt-2`}>En la vista previa, las flechas del teclado mueven la pieza 1 px (con Mayús, 10).</p>
    </details>
  );
}
