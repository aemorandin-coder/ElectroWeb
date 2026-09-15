'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiBell, FiCheck, FiTrash2 } from 'react-icons/fi';
import { adminCardFlush, adminEmpty, adminIconChip, adminSecondaryButton, adminSpinner } from '@/lib/admin-ui';
import { CATEGORY_LABELS, type AdminEventCategory } from '@/lib/admin-events/catalog';
import { notificationMeta, timeAgo } from '@/components/notifications/notification-meta';
import type { Notification } from '@/components/notifications/NotificationProvider';

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [AdminEventCategory, string][];
const fullDate = new Intl.DateTimeFormat('es-VE', { dateStyle: 'full', timeStyle: 'short' });

// Avisa a la campana y al menú lateral que cambió algo
const syncBadges = () => {
  window.dispatchEvent(new Event('refresh-notifications'));
  window.dispatchEvent(new Event('refresh-sidebar-counts'));
};

export default function Inbox() {
  const [category, setCategory] = useState<AdminEventCategory | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const query = useCallback((cursor?: string) => {
    const params = new URLSearchParams({ limit: '30' });
    if (category !== 'all') params.set('category', category);
    if (unreadOnly) params.set('unread', '1');
    if (cursor) params.set('cursor', cursor);
    return fetch(`/api/notifications?${params}`, { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<{ notifications: Notification[]; unreadCount: number; nextCursor: string | null }>;
    });
  }, [category, unreadOnly]);

  useEffect(() => {
    let cancelled = false;
    query()
      .then((data) => {
        if (cancelled) return;
        setItems(data.notifications);
        setUnreadCount(data.unreadCount);
        setNextCursor(data.nextCursor);
      })
      .catch(() => !cancelled && toast.error('No se pudieron cargar las notificaciones'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, reloadKey]);

  const changeFilter = (next: () => void) => {
    setLoading(true);
    next();
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await query(nextCursor);
      setItems((previous) => [...previous, ...data.notifications]);
      setNextCursor(data.nextCursor);
    } catch {
      toast.error('No se pudieron cargar más');
    } finally {
      setLoadingMore(false);
    }
  };

  const markRead = async (item: Notification) => {
    if (item.read) return;
    setItems((previous) => previous.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
    setUnreadCount((count) => Math.max(0, count - 1));
    await fetch(`/api/notifications/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: true }) }).catch(() => null);
    syncBadges();
  };

  const markAll = async () => {
    const response = await fetch('/api/notifications/mark-all-read', { method: 'PATCH' }).catch(() => null);
    if (!response?.ok) {
      toast.error('No se pudo marcar todo como leído');
      return;
    }
    setItems((previous) => previous.map((entry) => ({ ...entry, read: true })));
    setUnreadCount(0);
    syncBadges();
  };

  const remove = async (item: Notification) => {
    setItems((previous) => previous.filter((entry) => entry.id !== item.id));
    if (!item.read) setUnreadCount((count) => Math.max(0, count - 1));
    const response = await fetch(`/api/notifications/${item.id}`, { method: 'DELETE' }).catch(() => null);
    if (!response?.ok) {
      toast.error('No se pudo eliminar');
      setReloadKey((key) => key + 1);
    }
    syncBadges();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex w-max gap-1 lg:w-auto lg:flex-wrap" role="tablist" aria-label="Categoría">
            {([['all', 'Todas'], ...CATEGORIES] as [AdminEventCategory | 'all', string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={category === value}
                onClick={() => changeFilter(() => setCategory(value))}
                className={`h-9 whitespace-nowrap rounded-full border px-3 text-sm font-semibold transition-colors ${category === value ? 'border-brand-500 bg-brand-500 text-white' : 'border-line bg-white text-ink-soft hover:bg-surface'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink-soft">
            <input type="checkbox" checked={unreadOnly} onChange={(event) => changeFilter(() => setUnreadOnly(event.target.checked))} className="h-4 w-4 accent-brand-500" />
            Solo sin leer
          </label>
          <button type="button" onClick={markAll} disabled={unreadCount === 0} className={`${adminSecondaryButton} h-9 px-3`}>
            <FiCheck className="h-4 w-4" aria-hidden="true" />
            Marcar todo leído{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className={adminSpinner} aria-label="Cargando" /></div>
      ) : items.length === 0 ? (
        <div className={adminEmpty}>
          <FiBell className="h-10 w-10 text-subtle" aria-hidden="true" />
          <p className="mt-3 font-semibold text-ink">{unreadOnly ? 'Nada sin leer' : 'Sin notificaciones'}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Aquí llegan las ventas, recargas, solicitudes y alertas de la tienda. Elige qué llega en la pestaña Qué avisar.
          </p>
        </div>
      ) : (
        <ul className={`${adminCardFlush} divide-y divide-line`}>
          {items.map((item) => {
            const { Icon, tone } = notificationMeta(item.type);
            const href = item.link && item.link.startsWith('/') && !item.link.startsWith('//') ? item.link : null;
            return (
              <li key={item.id} className={`group relative flex gap-3 px-4 py-4 transition-colors hover:bg-surface sm:px-5 ${item.read ? '' : 'bg-brand-50'}`}>
                <span className={adminIconChip(tone)}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className={`text-sm ${item.read ? 'text-ink-soft' : 'font-semibold text-ink'}`}>
                      {href ? (
                        <Link href={href} onClick={() => markRead(item)} className="after:absolute after:inset-0">{item.title}</Link>
                      ) : (
                        <button type="button" onClick={() => markRead(item)} className="text-left after:absolute after:inset-0">{item.title}</button>
                      )}
                    </p>
                    <time dateTime={item.createdAt} title={fullDate.format(new Date(item.createdAt))} className="text-xs text-muted">{timeAgo(item.createdAt)}</time>
                  </div>
                  <p className="mt-1 text-sm text-muted">{item.message}</p>
                </div>
                {!item.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" aria-label="Sin leer" />}
                <button
                  type="button"
                  onClick={() => remove(item)}
                  aria-label={`Eliminar: ${item.title}`}
                  className="relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg text-muted hover:bg-white hover:text-deal lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                >
                  <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor && !loading && (
        <div className="flex justify-center">
          <button type="button" onClick={loadMore} disabled={loadingMore} className={adminSecondaryButton}>
            {loadingMore ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  );
}
