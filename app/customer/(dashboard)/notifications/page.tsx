'use client';

import { useState } from 'react';
import { FiBell, FiCheck, FiCheckCircle } from 'react-icons/fi';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { notificationMeta, timeAgo } from '@/components/notifications/notification-meta';
import { adminTab, adminIconChip } from '@/lib/admin-ui';
import Link from 'next/link';

export default function NotificationsPage() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-line" />
                    <div className="absolute inset-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                </div>
                <p className="mt-4 text-sm text-muted">Cargando notificaciones...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Notificaciones</h1>
                    <p className="text-sm text-muted">
                        {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
                        >
                            <FiCheckCircle className="w-4 h-4" />
                            Marcar todas como leídas
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                    onClick={() => setFilter('all')}
                    className={adminTab(filter === 'all')}
                >
                    Todas ({notifications.length})
                </button>
                <button
                    onClick={() => setFilter('unread')}
                    className={adminTab(filter === 'unread')}
                >
                    No leídas ({unreadCount})
                </button>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="bg-white rounded-xl border border-line p-12 text-center">
                    <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FiBell className="w-8 h-8 text-subtle" />
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">
                        {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
                    </h3>
                    <p className="text-sm text-muted">
                        Te notificaremos cuando haya novedades sobre tus pedidos
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-line overflow-hidden divide-y divide-line">
                    {filteredNotifications.map((notification) => {
                        const meta = notificationMeta(notification.type);
                        const IconComponent = meta.Icon;

                        return (
                            <div
                                key={notification.id}
                                className={`p-4 transition-colors ${!notification.read ? 'bg-brand-50/50' : 'hover:bg-surface'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <span className={adminIconChip(meta.tone)}>
                                        <IconComponent className="w-4 h-4" />
                                    </span>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h4 className={`text-sm font-semibold ${!notification.read ? 'text-ink' : 'text-ink-soft'}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="text-sm text-muted mt-0.5">{notification.message}</p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-xs text-subtle">
                                                {timeAgo(notification.createdAt)}
                                            </span>

                                            {notification.link && (
                                                <Link
                                                    href={notification.link}
                                                    className="text-xs font-medium text-brand-600 hover:underline"
                                                >
                                                    Ver detalles
                                                </Link>
                                            )}

                                            {!notification.read && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    className="text-xs font-medium text-muted hover:text-ink flex items-center gap-1"
                                                >
                                                    <FiCheck className="w-3 h-3" />
                                                    Marcar como leída
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
