'use client';

import {
  IconoAdvertencia, IconoClaqueta, IconoConfirmado, IconoCopiar, IconoEnlace, IconoImagen, IconoNovedad, IconoReloj,
} from '@/components/iconos';
import { toast } from 'react-hot-toast';
import { adminHint, adminInput, adminLabel, avisoAccion } from '@/lib/admin-ui';
import { duracionDe } from '@/lib/studio/animaciones';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { buildCaption } from '@/lib/studio/caption';
import { PASO_PUBLICAR, type FlyerCheck } from '@/lib/studio/checks';
import { formatHeight, qrUrlFor } from '@/lib/studio/engine';
import { sectionSummary, smallButton } from './ui';
import type { Studio } from './useStudio';

// C-116: cómo se ve cada revisión. Lo que impide descargar, en rojo; los avisos, en ámbar
const CHECK_STYLE: Record<FlyerCheck['level'], string> = {
  ok: 'border-line bg-surface text-success-strong',
  warn: avisoAccion,
  block: 'border-deal/30 bg-deal-bg text-deal',
};

interface Props {
  studio: Studio;
  checks: FlyerCheck[];
  busy: boolean;
  /** C-295: arman la imagen o el video y abren el final (compartir, descargar, Telegram…) */
  onPng: () => void;
  onVideo: () => void;
  goStep: (k: number) => void;
}

export default function StepPublish({ studio, checks, busy, onPng, onVideo, goStep }: Props) {
  const { current, update, brand, flyers, currentCode } = studio;
  const { confirm } = useConfirm();
  if (!current) return null;
  const batches = [...new Set(flyers.map((f) => f.batch).filter(Boolean))];
  // Enlace con la marca de la historia: lo que entra por aquí (y por el QR) cuenta en Resultados
  const link = currentCode ? qrUrlFor(current, brand, currentCode) : '';

  const generate = async () => {
    if (current.caption.trim()) {
      const ok = await confirm({ title: 'Escribir el texto de nuevo', message: 'Se reemplaza el texto que ya tienes.', confirmText: 'Reemplazar', cancelText: 'Cancelar' });
      if (!ok) return;
    }
    update((f) => ({ ...f, caption: buildCaption(f, brand, link, { whatsapp: studio.store?.whatsapp, navidad: studio.store?.navidad }) }));
  };

  const copyText = async (text: string, done: string) => {
    if (!text) {
      toast.error('No hay texto todavía');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(done);
    } catch {
      toast.error('Selecciónalo y cópialo');
    }
  };
  const copy = () => copyText(current.caption, 'Texto copiado');

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-1.5">
        {checks.map((c) => (
          <li key={c.text} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${CHECK_STYLE[c.level]}`}>
            {c.level === 'ok' ? (
              <IconoConfirmado className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : c.level === 'block' ? (
              <IconoAdvertencia className="h-4 w-4 shrink-0" aria-label="Impide descargar" />
            ) : (
              <IconoReloj className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className="flex-1">{c.text}</span>
            {c.level !== 'ok' && c.step && c.step !== PASO_PUBLICAR && (
              <button type="button" onClick={() => goStep(c.step as number)} className={smallButton}>
                Ir
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* C-295: sacar la imagen o el video lleva al final, donde se comparte, se descarga o va a Telegram */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onPng}
          disabled={busy}
          className="flex min-h-24 flex-col items-start justify-between gap-2 rounded-xl bg-brand-500 p-3 text-left text-white shadow-sm transition-[background-color,transform] hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <IconoImagen className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold">Sacar la imagen</span>
            <span className="block text-xs text-brand-50">PNG · 1080 × {formatHeight(current.format)}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onVideo}
          disabled={busy}
          className="flex min-h-24 flex-col items-start justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-left text-brand-700 transition-[background-color,transform] hover:bg-brand-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
            <IconoClaqueta className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold">Sacar el video</span>
            <span className="block text-xs text-ink-soft">MP4 · {duracionDe(current)} s · Full HD a 60 cuadros</span>
          </span>
        </button>
      </div>
      <p className={`${adminHint} -mt-2`}>Después la ves en grande y eliges: compartirla, descargarla o mandarla a Telegram.</p>

      {link && (
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <IconoEnlace className="h-4 w-4 text-brand-500" aria-hidden="true" />
            Enlace de esta historia
          </p>
          <div className="mt-2 flex gap-2">
            <input type="text" readOnly value={link} aria-label="Enlace de esta historia" onFocus={(e) => e.target.select()} className={`${adminInput()} h-9 font-mono text-xs`} />
            <button type="button" onClick={() => void copyText(link, 'Enlace copiado')} className={smallButton}>
              <IconoCopiar className="h-4 w-4" aria-hidden="true" />
              Copiar
            </button>
          </div>
          <p className={adminHint}>Úsalo en el sticker de enlace de Instagram. Las visitas y compras que lleguen por aquí o por el QR se ven en &quot;Resultados&quot;.</p>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor="caption" className="text-sm font-semibold text-ink">
            Texto para la publicación
          </label>
          <button type="button" onClick={() => void generate()} className={smallButton}>
            <IconoNovedad className="h-4 w-4" aria-hidden="true" />
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
          <IconoCopiar className="h-4 w-4" aria-hidden="true" />
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

    </div>
  );
}
