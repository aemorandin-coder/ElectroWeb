'use client';

import { useEffect, useRef } from 'react';
import toast, { resolveValue, useToaster, type Toast, type ToastType } from 'react-hot-toast';
import { IconoCargando, IconoCerrar, IconoConfirmado, IconoError, IconoInfo } from '@/components/iconos';

interface DocumentWithAriaNotify extends Document {
  ariaNotify?: (message: string, options?: { priority?: 'normal' | 'high' }) => void;
}

const STYLE_BY_TYPE: Record<ToastType, { border: string; plate: string }> = {
  success: { border: 'border-l-success-strong', plate: 'bg-success-strong/10 text-success-strong' },
  error: { border: 'border-l-deal', plate: 'bg-deal-bg text-deal' },
  loading: { border: 'border-l-brand-500', plate: 'bg-brand-50 text-brand-600' },
  blank: { border: 'border-l-brand-700', plate: 'bg-brand-50 text-brand-700' },
  custom: { border: 'border-l-brand-500', plate: 'bg-brand-50 text-brand-600' },
};

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') return <IconoConfirmado className="h-4 w-4" aria-hidden="true" />;
  if (type === 'error') return <IconoError className="h-4 w-4" aria-hidden="true" />;
  if (type === 'loading') return <IconoCargando className="h-4 w-4 animate-spin" aria-hidden="true" />;
  return <IconoInfo className="h-4 w-4" aria-hidden="true" />;
}

/** Snackbars Top Layer (`popover="manual"`) conectados a `react-hot-toast` bajo el Kit 2.0. */
export default function ElectroToaster() {
  const regionRef = useRef<HTMLDivElement>(null);
  const announcedIds = useRef<Set<string>>(new Set());
  const { toasts, handlers } = useToaster({ duration: 4000 });
  const { startPause, endPause } = handlers;

  const visibleCount = toasts.length;
  const latestId = toasts[0]?.id ?? '';

  useEffect(() => {
    const el = regionRef.current;
    if (!el || typeof el.showPopover !== 'function') return;
    try {
      if (visibleCount > 0) {
        if (el.matches(':popover-open')) el.hidePopover();
        el.showPopover();
      } else if (el.matches(':popover-open')) {
        el.hidePopover();
      }
    } catch {
      // Fallback CSS position: fixed con --z-toast cuando el navegador no soporta popover="manual"
    }
  }, [visibleCount, latestId]);

  useEffect(() => {
    const doc = document as DocumentWithAriaNotify;
    for (const t of toasts) {
      if (!t.visible || announcedIds.current.has(t.id)) continue;
      announcedIds.current.add(t.id);
      if (typeof t.message === 'string' && typeof doc.ariaNotify === 'function') {
        doc.ariaNotify(t.message, { priority: t.type === 'error' ? 'high' : 'normal' });
      }
    }
    if (toasts.length === 0 && announcedIds.current.size > 40) {
      announcedIds.current.clear();
    }
  }, [toasts]);

  return (
    <div
      ref={regionRef}
      popover="manual"
      role="region"
      aria-label="Avisos"
      onMouseEnter={startPause}
      onMouseLeave={endPause}
      onFocus={startPause}
      onBlur={endPause}
      className={`es-toast-region z-[var(--z-toast)] flex flex-col items-end gap-2.5 print:hidden ${visibleCount === 0 ? 'hidden' : ''}`}
    >
      {toasts.map((t: Toast) => {
        if (t.type === 'custom') {
          return (
            <div key={t.id} className="es-toast-item" data-leaving={!t.visible}>
              {resolveValue(t.message, t)}
            </div>
          );
        }

        const style = STYLE_BY_TYPE[t.type] ?? STYLE_BY_TYPE.blank;
        const messageNode = resolveValue(t.message, t);

        return (
          <div
            key={t.id}
            data-leaving={!t.visible}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`es-toast-item flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-line border-l-4 ${style.border} bg-white p-3.5 shadow-lg`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.plate}`}>
              <ToastIcon type={t.type} />
            </span>
            <p className="min-w-0 flex-1 pt-0.5 text-sm font-medium leading-snug text-ink [overflow-wrap:anywhere]">
              {messageNode}
            </p>
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              aria-label="Cerrar aviso"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <IconoCerrar className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
