'use client';

import { FiCheckCircle, FiClock, FiCopy, FiDownload, FiFilm, FiShare2, FiZap } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { adminHint, adminInput, adminLabel, adminPrimaryButton, adminSecondaryButton } from '@/lib/admin-ui';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { buildCaption } from '@/lib/studio/caption';
import { sectionSummary, smallButton, smallDangerButton } from './ui';
import type { Studio } from './useStudio';

export interface PublishCheck {
  ok: boolean;
  text: string;
  step?: number;
}

interface Props {
  studio: Studio;
  checks: PublishCheck[];
  busy: boolean;
  canShare: boolean;
  onPng: () => void;
  onVideo: () => void;
  onShare: () => void;
  goStep: (k: number) => void;
}

export default function StepPublish({ studio, checks, busy, canShare, onPng, onVideo, onShare, goStep }: Props) {
  const { current, update, brand, flyers, duplicate, remove } = studio;
  const { confirm } = useConfirm();
  if (!current) return null;
  const batches = [...new Set(flyers.map((f) => f.batch).filter(Boolean))];

  const generate = async () => {
    if (current.caption.trim()) {
      const ok = await confirm({ title: 'Escribir el texto de nuevo', message: 'Se reemplaza el texto que ya tienes.', confirmText: 'Reemplazar', cancelText: 'Cancelar' });
      if (!ok) return;
    }
    update((f) => ({ ...f, caption: buildCaption(f, brand) }));
  };

  const copy = async () => {
    if (!current.caption) {
      toast.error('No hay texto todavía');
      return;
    }
    try {
      await navigator.clipboard.writeText(current.caption);
      toast.success('Texto copiado');
    } catch {
      toast.error('Selecciónalo y cópialo');
    }
  };

  const askRemove = async () => {
    const ok = await confirm({ title: 'Eliminar historia', message: `¿Eliminar "${current.name}"? No se puede deshacer.`, confirmText: 'Eliminar', cancelText: 'Cancelar', type: 'danger' });
    if (ok) await remove();
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-1.5">
        {checks.map((c) => (
          <li key={c.text} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${c.ok ? 'border-line bg-surface text-success-strong' : 'border-warning/30 bg-warning/10 text-warning-strong'}`}>
            {c.ok ? <FiCheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> : <FiClock className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span className="flex-1">{c.text}</span>
            {!c.ok && c.step && (
              <button type="button" onClick={() => goStep(c.step as number)} className={smallButton}>
                Ir
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onPng} disabled={busy} className={adminPrimaryButton}>
          <FiDownload className="h-4 w-4" aria-hidden="true" />
          Descargar imagen
        </button>
        <button type="button" onClick={onVideo} disabled={busy} className={adminSecondaryButton}>
          <FiFilm className="h-4 w-4" aria-hidden="true" />
          Descargar video
        </button>
        {canShare && (
          <button type="button" onClick={onShare} disabled={busy} className={adminSecondaryButton}>
            <FiShare2 className="h-4 w-4" aria-hidden="true" />
            Compartir
          </button>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor="caption" className="text-sm font-semibold text-ink">
            Texto para la publicación
          </label>
          <button type="button" onClick={() => void generate()} className={smallButton}>
            <FiZap className="h-4 w-4" aria-hidden="true" />
            Escribirlo con los datos
          </button>
        </div>
        <textarea
          id="caption"
          rows={8}
          value={current.caption}
          onChange={(e) => update((f) => ({ ...f, caption: e.target.value }))}
          placeholder="Descripción, precio y hashtags"
          className={`${adminInput()} h-auto py-2`}
        />
        <button type="button" onClick={() => void copy()} className={`${smallButton} mt-2`}>
          <FiCopy className="h-4 w-4" aria-hidden="true" />
          Copiar texto
        </button>
      </div>

      <details className="border-t border-line pt-3" open={!!current.date || !!current.batch}>
        <summary className={sectionSummary}>Fecha, lote y nombre</summary>
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="f-date" className={adminLabel}>
                Fecha de publicación
              </label>
              <input id="f-date" type="date" value={current.date} onChange={(e) => update((f) => ({ ...f, date: e.target.value }))} className={adminInput()} />
            </div>
            <div>
              <label htmlFor="f-batch" className={adminLabel}>
                Lote
              </label>
              <input id="f-batch" type="text" list="studio-batches" value={current.batch} onChange={(e) => update((f) => ({ ...f, batch: e.target.value }))} placeholder="Ej: Componentes PC" className={adminInput()} />
              <datalist id="studio-batches">
                {batches.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
          </div>
          <p className={adminHint}>Con fecha, la historia aparece en la vista de semana; con lote, se descargan juntas.</p>
          <div>
            <label htmlFor="f-name" className={adminLabel}>
              Nombre interno
            </label>
            <input id="f-name" type="text" value={current.name} onChange={(e) => update((f) => ({ ...f, name: e.target.value }))} className={adminInput()} />
          </div>
        </div>
      </details>

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <button type="button" onClick={() => void duplicate()} className={smallButton}>
          Duplicar
        </button>
        <button type="button" onClick={() => void askRemove()} className={smallDangerButton}>
          Eliminar
        </button>
      </div>
    </div>
  );
}
