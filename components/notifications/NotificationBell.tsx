'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FiBell } from 'react-icons/fi';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useNotifications } from './NotificationProvider';
import NotificationCenter from './NotificationCenter';

/**
 * Campana del header de la tienda y del panel (C-73).
 * Antes: estilos en línea con colores sueltos, <style jsx>, animaciones de rebote y un desplegable móvil con
 * transform + backdrop-filter. Ahora: panel fijo en móvil (hoja bajo el header), desplegable en escritorio,
 * Esc y clic afuera para cerrar, capas con las variables --z-*.
 */
export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  // En móvil el panel ocupa la pantalla y el fondo no debe desplazarse; en escritorio es un desplegable
  const [lockScroll, setLockScroll] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Se cierra sola al navegar: el estado recuerda en qué ruta se abrió
  const open = openedAt === pathname;
  const close = () => setOpenedAt(null);

  useBodyScrollLock(open && lockScroll);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenedAt(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const label = unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setLockScroll(window.matchMedia('(max-width: 1023px)').matches);
          setOpenedAt(open ? null : pathname);
        }}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface hover:text-ink ${open ? 'bg-surface text-ink' : ''}`}
      >
        <FiBell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-deal px-1 text-[11px] font-bold leading-none text-white" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[var(--z-dropdown)] bg-ink/30 lg:bg-transparent" onClick={close} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Notificaciones"
            className="fixed inset-x-3 top-16 z-[var(--z-dropdown)] overflow-hidden rounded-2xl border border-line bg-white shadow-lg lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[380px]"
          >
            <NotificationCenter onClose={close} />
          </div>
        </>
      )}
    </div>
  );
}
