'use client';

import { useEffect, useRef, useState } from 'react';
import { IconoActualizar, IconoCerrar } from '@/components/iconos';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useTiempoReal } from '@/lib/realtime/hooks';

export default function AvisosDeVersion() {
  const { releaseUpdate, refreshVersionStatus } = useNotifications();
  const [ocultoParaId, setOcultoParaId] = useState<string | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  useTiempoReal(() => {}, { onReconectar: refreshVersionStatus });

  const serverId = releaseUpdate?.serverId ?? null;
  const mostrar = Boolean(releaseUpdate?.reloadAvailable && serverId && ocultoParaId !== serverId);

  useEffect(() => {
    const el = pillRef.current;
    if (!el || typeof el.showPopover !== 'function') return;
    try {
      if (mostrar) {
        if (el.matches(':popover-open')) el.hidePopover();
        el.showPopover();
      } else if (el.matches(':popover-open')) {
        el.hidePopover();
      }
    } catch {
      // Fallback fixed positioning via .es-update-pill
    }
  }, [mostrar]);

  if (!mostrar) return null;

  return (
    <div
      ref={pillRef}
      popover="manual"
      role="status"
      aria-live="polite"
      className="es-update-pill z-[var(--z-toast)] print:hidden"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-brand-600 bg-brand-700 px-3.5 py-2.5 text-white shadow-xl">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <IconoActualizar className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight text-white">Hay una mejora lista en el panel</p>
          <p className="text-xs leading-tight text-brand-200">Recarga cuando termines lo que haces.</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-white"
        >
          Recargar
        </button>
        <button
          type="button"
          onClick={() => setOcultoParaId(serverId)}
          aria-label="Posponer recarga"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-200 transition-colors hover:bg-brand-600 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          <IconoCerrar className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
