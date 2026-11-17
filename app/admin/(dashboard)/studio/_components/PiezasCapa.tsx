'use client';

// C-272: lo que comparten el panel de un texto y el de un sticker (paso Textos y stickers): la cabecera con Duplicar y
// Borrar, el tamaño en px y la posición y el giro con números. C-273: el campo de números que se escribe tecla por tecla.
import { useState, type ComponentProps } from 'react';
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

/**
 * C-273: un número que se escribe tecla por tecla. Mientras se escribe, el campo muestra lo escrito y solo se aplica
 * cuando es un número dentro de su rango; al salir del campo, lo que quedó fuera se lleva al borde y vuelve el valor.
 * Antes el campo mostraba siempre el valor: escribir "80" en el tamaño dejaba 400 (el "8" solo no llegaba al mínimo y
 * el "0" se pegaba al 150 de antes), "0.3" quedaba en 0.6 y el "-" de un giro negativo saltaba a 0.
 */
export function CampoNumero({ valor, min, max, decimales = 0, onCambiar, onBlur, ...resto }: Omit<ComponentProps<typeof CampoUnidad>, 'value' | 'onChange' | 'min' | 'max' | 'type' | 'step'> & {
  valor: number;
  min: number;
  max: number;
  decimales?: number;
  onCambiar: (v: number) => void;
}) {
  const [borrador, setBorrador] = useState<string | null>(null);
  const redondear = (v: number) => Number(v.toFixed(decimales));
  return (
    <CampoUnidad
      {...resto}
      type="number"
      inputMode={decimales ? 'decimal' : 'numeric'}
      min={min}
      max={max}
      step={decimales ? 1 / 10 ** decimales : 1}
      value={borrador ?? String(valor)}
      onChange={(e) => {
        const texto = e.target.value;
        setBorrador(texto);
        const v = Number(texto);
        if (texto.trim() !== '' && Number.isFinite(v) && v >= min && v <= max) onCambiar(redondear(v));
      }}
      onBlur={(e) => {
        const v = Number(borrador);
        if (borrador !== null && borrador.trim() !== '' && Number.isFinite(v) && (v < min || v > max)) onCambiar(redondear(Math.min(max, Math.max(min, v))));
        setBorrador(null);
        onBlur?.(e);
      }}
    />
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
        <CampoNumero unidad="px" min={min} max={max} valor={valor} aria-labelledby={`${id}-tam-et`} onCambiar={onCambiar} />
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
          <CampoNumero id={`${id}-x`} unidad="px" min={0} max={W} valor={Math.round(capa.x * W)} onCambiar={(v) => onCambiar({ x: v / W })} />
        </div>
        <div>
          <label htmlFor={`${id}-y`} className={adminLabel}>De arriba abajo</label>
          <CampoNumero id={`${id}-y`} unidad="px" min={0} max={alto} valor={Math.round(capa.y * alto)} onCambiar={(v) => onCambiar({ y: v / alto })} />
        </div>
        <div>
          <label htmlFor={`${id}-giro`} className={adminLabel}>Giro</label>
          <CampoNumero id={`${id}-giro`} unidad="°" min={-180} max={180} valor={capa.giro} onCambiar={(v) => onCambiar({ giro: v })} />
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
