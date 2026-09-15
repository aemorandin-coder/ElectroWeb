'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FiBell, FiCheck } from 'react-icons/fi';
import { useNotifications } from './NotificationProvider';
import NotificationItem from './NotificationItem';

/** Contenido del desplegable de la campana: el mismo en escritorio y en móvil (C-73). */
export default function NotificationCenter({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const { notifications, unreadCount, markAllAsRead, isLoading } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const role = session?.user?.role;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const allHref = isAdmin ? '/admin/notifications' : '/customer/notifications';
  const visible = filter === 'unread' ? notifications.filter((notification) => !notification.read) : notifications;

  return (
    <div className="flex max-h-[min(70dvh,560px)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-base font-semibold text-ink">Notificaciones</p>
          <p className="text-xs text-muted">{unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo leído'}</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllAsRead} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-600 hover:bg-brand-50">
            <FiCheck className="h-4 w-4" aria-hidden="true" />
            Marcar todas
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-line px-3 py-2" role="tablist" aria-label="Filtro">
        {(['all', 'unread'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={`h-8 rounded-lg px-3 text-sm font-semibold transition-colors ${filter === value ? 'bg-brand-500 text-white' : 'text-ink-soft hover:bg-surface'}`}
          >
            {value === 'all' ? 'Todas' : `Sin leer${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {isLoading && notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">Cargando…</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <FiBell className="h-8 w-8 text-subtle" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-ink">{filter === 'unread' ? 'Nada sin leer' : 'Sin notificaciones'}</p>
            <p className="mt-0.5 text-sm text-muted">Aquí aparecen las novedades{isAdmin ? ' de la tienda' : ' de tus pedidos'}.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} onNavigate={onClose} />
            ))}
          </ul>
        )}
      </div>

      <Link href={allHref} onClick={onClose} className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-brand-50">
        Ver todas{isAdmin ? ' y configurar avisos' : ''}
      </Link>
    </div>
  );
}
