'use client';

import { useState } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiTrash2, FiPackage, FiCreditCard, FiTruck, FiShoppingBag, FiStar, FiGift, FiAlertCircle } from 'react-icons/fi';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function NotificationsPage() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const getNotificationIcon = (type: string) => {
        const icons: Record<string, { icon: any; bg: string; color: string }> = {
            ORDER_CONFIRMED: { icon: FiPackage, bg: 'bg-blue-100', color: 'text-blue-600' },
            ORDER_PAID: { icon: FiCreditCard, bg: 'bg-green-100', color: 'text-green-600' },
            ORDER_SHIPPED: { icon: FiTruck, bg: 'bg-indigo-100', color: 'text-indigo-600' },
            ORDER_DELIVERED: { icon: FiGift, bg: 'bg-emerald-100', color: 'text-emerald-600' },
            ORDER_CANCELLED: { icon: FiAlertCircle, bg: 'bg-red-100', color: 'text-red-600' },
            PROMOTION: { icon: FiStar, bg: 'bg-amber-100', color: 'text-amber-600' },
            REVIEW: { icon: FiStar, bg: 'bg-purple-100', color: 'text-purple-600' },
        };
        return icons[type] || { icon: FiBell, bg: 'bg-gray-100', color: 'text-gray-600' };
    };

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-[#e9ecef]" />
                    <div className="absolute inset-0 rounded-full border-2 border-[#2a63cd] border-t-transparent animate-spin" />
                </div>
                <p className="mt-4 text-sm text-[#6a6c6b]">Cargando notificaciones...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-[#212529]">Notificaciones</h1>
                    <p className="text-sm text-[#6a6c6b]">
                        {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#2a63cd] bg-[#2a63cd]/10 rounded-lg hover:bg-[#2a63cd]/20 transition-colors"
                        >
                            <FiCheckCircle className="w-4 h-4" />
                            Marcar todas como leídas
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === 'all'
                            ? 'bg-[#2a63cd] text-white'
                            : 'bg-[#f8f9fa] text-[#6a6c6b] hover:bg-[#e9ecef]'
                        }`}
                >
                    Todas ({notifications.length})
                </button>
                <button
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === 'unread'
                            ? 'bg-[#2a63cd] text-white'
                            : 'bg-[#f8f9fa] text-[#6a6c6b] hover:bg-[#e9ecef]'
                        }`}
                >
                    No leídas ({unreadCount})
                </button>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#e9ecef] p-12 text-center">
                    <div className="w-16 h-16 bg-[#f8f9fa] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FiBell className="w-8 h-8 text-[#adb5bd]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#212529] mb-2">
                        {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
                    </h3>
                    <p className="text-sm text-[#6a6c6b]">
                        Te notificaremos cuando haya novedades sobre tus pedidos
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-[#e9ecef] overflow-hidden divide-y divide-[#e9ecef]">
                    {filteredNotifications.map((notification) => {
                        const iconConfig = getNotificationIcon(notification.type);
                        const IconComponent = iconConfig.icon;

                        return (
                            <div
                                key={notification.id}
                                className={`p-4 transition-colors ${!notification.read ? 'bg-blue-50/50' : 'hover:bg-[#f8f9fa]'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconConfig.bg}`}>
                                        <IconComponent className={`w-5 h-5 ${iconConfig.color}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h4 className={`text-sm font-semibold ${!notification.read ? 'text-[#212529]' : 'text-[#495057]'}`}>
                                                    {notification.title}
                                                </h4>
                                                <p className="text-sm text-[#6a6c6b] mt-0.5">{notification.message}</p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 rounded-full bg-[#2a63cd] flex-shrink-0 mt-2" />
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-xs text-[#adb5bd]">
                                                {format(new Date(notification.createdAt), "d MMM, HH:mm", { locale: es })}
                                            </span>

                                            {notification.link && (
                                                <Link
                                                    href={notification.link}
                                                    className="text-xs font-medium text-[#2a63cd] hover:underline"
                                                >
                                                    Ver detalles
                                                </Link>
                                            )}

                                            {!notification.read && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    className="text-xs font-medium text-[#6a6c6b] hover:text-[#212529] flex items-center gap-1"
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
