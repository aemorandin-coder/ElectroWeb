'use client';

import { useState } from 'react';
import { IconoCheck, IconoChevronDerecha, IconoConfirmado, IconoLista, IconoNotificaciones } from '@/components/iconos';
import Filtros from '@/components/admin/Filtros';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { notificationMeta, timeAgo } from '@/components/notifications/notification-meta';
import { adminIconChip, adminSecondaryButton } from '@/lib/admin-ui';
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
            {/* Header (C-251b: en el teléfono el botón baja a su línea en vez de apretar el título) */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-ink">Notificaciones</h1>
                    <p className="text-sm text-muted">
                        {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={markAllAsRead}
                            className={adminSecondaryButton}
                        >
                            <IconoConfirmado className="w-4 h-4" />
                            Marcar todas como leídas
                        </button>
                    )}
                </div>
            </div>

            {/* C-265: la lista y, al lado desde 1280 px, qué avisa la tienda (antes la lista ocupaba todo el ancho) */}
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="min-w-0 space-y-3">
            {/* C-251b: los filtros en píldoras (PLAN.md §1.7); C-265, en una línea */}
            <Filtros
                tamano="chica"
                etiqueta="Filtrar notificaciones"
                valor={filter}
                onCambiar={setFilter}
                filtros={[
                    { valor: 'all', etiqueta: 'Todas', ayuda: 'Las últimas 30', Icono: IconoLista, cuenta: notifications.length },
                    { valor: 'unread', etiqueta: 'No leídas', ayuda: 'Lo nuevo para ti', Icono: IconoNotificaciones, cuenta: unreadCount },
                ]}
            />

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="bg-white rounded-xl border border-line p-12 text-center">
                    <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <IconoNotificaciones className="w-8 h-8 text-subtle" />
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
                                                    <IconoCheck className="w-3 h-3" />
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
            <aside className="rounded-2xl border border-line bg-white p-4" aria-labelledby="que-avisamos">
                <h2 id="que-avisamos" className="text-sm font-semibold text-ink">Qué te avisamos</h2>
                <p className="mt-1 text-sm text-ink-soft">
                    Tus pedidos, tus Puntos ES y tus garantías te llegan siempre aquí. Los favoritos, las reseñas y las ofertas, si los quieres.
                </p>
                <Link href="/customer/profile?tab=notificaciones" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    Elegir mis avisos <IconoChevronDerecha className="h-4 w-4" aria-hidden="true" />
                </Link>
            </aside>
            </div>
        </div>
    );
}
