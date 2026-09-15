'use client';

import Link from 'next/link';
import { FiTrash2 } from 'react-icons/fi';
import { adminIconChip } from '@/lib/admin-ui';
import { useNotifications, type Notification } from './NotificationProvider';
import { notificationMeta, timeAgo } from './notification-meta';

interface NotificationItemProps {
  notification: Notification;
  onNavigate?: () => void;
}

/** Una notificación de la campana. Con enlace, toda la fila abre y la marca leída (stretched link). */
export default function NotificationItem({ notification, onNavigate }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications();
  const { Icon, tone } = notificationMeta(notification.type);
  // Solo rutas internas: un enlace externo no se sigue desde la campana
  const href = notification.link && notification.link.startsWith('/') && !notification.link.startsWith('//') ? notification.link : null;

  const open = () => {
    markAsRead(notification.id);
    onNavigate?.();
  };

  return (
    <li className={`group relative flex gap-3 px-4 py-3 transition-colors hover:bg-surface ${notification.read ? '' : 'bg-brand-50'}`}>
      <span className={`${adminIconChip(tone)} h-9 w-9`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-snug ${notification.read ? 'text-ink-soft' : 'font-semibold text-ink'}`}>
          {href ? (
            <Link href={href} onClick={open} className="after:absolute after:inset-0 focus-visible:outline-none">
              {notification.title}
            </Link>
          ) : (
            <button type="button" onClick={() => markAsRead(notification.id)} className="text-left after:absolute after:inset-0">
              {notification.title}
            </button>
          )}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{notification.message}</p>
        <p className="mt-1 text-xs text-muted">
          <time dateTime={notification.createdAt}>{timeAgo(notification.createdAt)}</time>
        </p>
      </div>
      {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Sin leer" />}
      <button
        type="button"
        onClick={() => deleteNotification(notification.id)}
        aria-label="Eliminar notificación"
        className="relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg text-muted hover:bg-white hover:text-deal focus-visible:outline-2 focus-visible:outline-brand-500 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
      >
        <FiTrash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}
