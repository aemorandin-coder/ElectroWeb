'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { IconoCheck, IconoNotificaciones, IconoNovedad } from '@/components/iconos';
import { adminDato, adminIconChip } from '@/lib/admin-ui';
import { useNotifications } from './NotificationProvider';
import NotificationItem from './NotificationItem';

/** Contenido del desplegable de la campana: el mismo en escritorio y en móvil (C-73 + G-73 V1). */
export default function NotificationCenter({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const { notifications, unreadCount, isLoading, releaseUpdate, markAllAsRead, dismissReleaseUpdate } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const role = session?.user?.role;
  const isAccountant = role === 'ACCOUNTANT';
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const allHref = isAccountant ? '/admin/versiones' : isAdmin ? '/admin/notifications' : '/customer/notifications';
  const versionHref = role === 'SUPER_ADMIN' ? '/admin/settings#sistema' : '/admin/versiones';

  const visible = filter === 'unread' ? notifications.filter((notification) => !notification.read) : notifications;
  const unreadRelease = releaseUpdate?.unreadRelease ?? null;
  const nothingToShow = visible.length === 0 && !unreadRelease;

  return (
    <div className="flex max-h-[min(70dvh,560px)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-base font-semibold text-ink">Notificaciones</p>
          <p className="text-xs text-muted">{unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo leído'}</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllAsRead} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-600 hover:bg-brand-50">
            <IconoCheck className="h-4 w-4" aria-hidden="true" />
            Marcar todas
          </button>
        )}
      </div>

      {!isAccountant && (
        <div className="flex gap-1 border-b border-line px-3 py-2" role="tablist" aria-label="Filtro">
          {(['all', 'unread'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`min-h-8 rounded-lg border-b-2 px-3 py-1 text-sm font-semibold transition-colors ${filter === value ? 'border-brand-700 bg-brand-500 text-white' : 'border-transparent text-ink-soft hover:bg-surface'}`}
            >
              {value === 'all' ? 'Todas' : `Sin leer${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {unreadRelease && (
          <div className="border-b border-line bg-brand-50/75 px-4 py-3.5">
            <div className="flex items-start gap-3">
              <span className={`${adminIconChip('brand')} h-9 w-9`}>
                <IconoNovedad className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink">{unreadRelease.titulo}</p>
                  <span className={adminDato}>v{unreadRelease.version}</span>
                </div>
                <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-ink-soft">
                  {unreadRelease.puntos.map((p) => (
                    <li key={p.modulo}>
                      <strong className="font-semibold text-ink">{p.modulo}:</strong> {p.texto}
                    </li>
                  ))}
                  {unreadRelease.restantes > 0 && (
                    <li className="text-muted">Y {unreadRelease.restantes} mejoras más.</li>
                  )}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void dismissReleaseUpdate()}
                    className="inline-flex min-h-9 items-center rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
                  >
                    Entendido
                  </button>
                  <Link
                    href={versionHref}
                    onClick={() => {
                      void dismissReleaseUpdate();
                      onClose();
                    }}
                    className="inline-flex min-h-9 items-center rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading && notifications.length === 0 && !unreadRelease ? (
          <p className="px-4 py-10 text-center text-sm text-muted">Cargando…</p>
        ) : nothingToShow ? (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <IconoNotificaciones className="h-8 w-8 text-subtle" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-ink">{filter === 'unread' ? 'Nada sin leer' : 'Sin notificaciones'}</p>
            <p className="mt-0.5 text-sm text-muted">Aquí aparecen las novedades{isAdmin || isAccountant ? ' del panel y la tienda' : ' de tus pedidos'}.</p>
          </div>
        ) : visible.length > 0 ? (
          <ul className="divide-y divide-line">
            {visible.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} onNavigate={onClose} />
            ))}
          </ul>
        ) : null}
      </div>

      <Link href={allHref} onClick={onClose} className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-brand-50">
        {isAccountant ? 'Ver historial de versiones' : `Ver todas${isAdmin ? ' y configurar avisos' : ''}`}
      </Link>
    </div>
  );
}
