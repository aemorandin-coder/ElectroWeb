'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FiX } from 'react-icons/fi';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { safeHotAdLink, shouldShowHotAd, type HotAdRecord } from '@/lib/hot-ad';
import type { HotAd } from '@/lib/queries/hot-ad';

// Popup promocional del home (C-23, decisión D2): se puede cerrar al instante (X, Esc o el fondo),
// aparece como mucho una vez cada 24 h por promoción y no antes de SHOW_DELAY_MS.
const STORAGE_KEY = 'hotAd:v2';
const LEGACY_PERMANENT_KEY = 'hotAdPermanentlyDismissed';
const LEGACY_SESSION_KEY = 'hotAdDismissed';
const SHOW_DELAY_MS = 2500;

function readRecord(): HotAdRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HotAdRecord) : null;
  } catch {
    return null;
  }
}

function writeRecord(record: HotAdRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Modo privado o almacenamiento lleno: el popup simplemente puede volver a salir
  }
}

function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 0, 0, ${opacity})`;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})`;
}

/** `hotAd` lo lee el home en el servidor (getHotAd): ya no viaja en los settings de todas las páginas (C-25). */
export default function HotAdOverlay({ hotAd }: { hotAd: HotAd }) {
  const image = hotAd.image;
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  // Copia para el manejador de Esc (se registra una vez al abrir)
  const dontShowAgainRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    const timer = setTimeout(() => {
      let legacyPermanent = false;
      try {
        legacyPermanent = localStorage.getItem(LEGACY_PERMANENT_KEY) === 'true';
        // Las claves viejas se migran: "no volver a mostrar" se respeta para la promoción actual
        localStorage.removeItem(LEGACY_PERMANENT_KEY);
        sessionStorage.removeItem(LEGACY_SESSION_KEY);
      } catch {
        // Sin acceso al almacenamiento: se decide solo con lo que haya
      }
      const now = Date.now();
      if (legacyPermanent) {
        writeRecord({ image, shownAt: now, dismissed: true });
        return;
      }
      if (!shouldShowHotAd(readRecord(), image, now)) return;
      writeRecord({ image, shownAt: now });
      setOpen(true);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [image]);

  const close = () => {
    if (dontShowAgainRef.current) writeRecord({ image, shownAt: Date.now(), dismissed: true });
    setOpen(false);
  };
  // El manejador de teclado usa siempre la versión actual de close
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button, input'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  const link = safeHotAdLink(hotAd.link);
  const shadow = hotAd.shadowEnabled
    ? `0 0 ${hotAd.shadowBlur}px ${hotAd.shadowBlur / 2}px rgba(0, 0, 0, ${hotAd.shadowOpacity / 100})`
    : 'none';

  const picture = (
    // Dimensiones desconocidas (imagen subida por el admin): <img> con object-contain
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt="Promoción especial"
      className={`block h-auto max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain ${hotAd.transparentBg ? '' : 'rounded-2xl'}`}
      style={{ boxShadow: shadow }}
    />
  );

  return (
    <div
      className="fixed inset-0 z-[var(--z-popup)] flex items-center justify-center overflow-y-auto p-4 motion-safe:animate-fadeIn pb-[calc(1rem+env(safe-area-inset-bottom))]"
      style={{ backgroundColor: hexToRgba(hotAd.backdropColor, hotAd.backdropOpacity / 100) }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Promoción" className="flex max-w-full flex-col items-center gap-3">
        <div className="relative max-w-full">
          {link?.external ? (
            <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={close} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              {picture}
            </a>
          ) : link ? (
            <Link href={link.href} onClick={close} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              {picture}
            </Link>
          ) : (
            picture
          )}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="Cerrar promoción"
            className="absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-lg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <FiX className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-ink/60 px-4 text-sm font-medium text-white">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => {
              dontShowAgainRef.current = event.target.checked;
              setDontShowAgain(event.target.checked);
            }}
            className="h-4 w-4 accent-brand-500"
          />
          No volver a mostrar esta promoción
        </label>
      </div>
    </div>
  );
}
