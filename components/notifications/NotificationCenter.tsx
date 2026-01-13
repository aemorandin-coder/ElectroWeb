'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiBell, FiCheck, FiCheckCircle, FiFilter } from 'react-icons/fi';
import { useNotifications } from './NotificationProvider';
import NotificationItem from './NotificationItem';

interface NotificationCenterProps {
    onClose: () => void;
    isMobile?: boolean;
}

export default function NotificationCenter({ onClose, isMobile = false }: NotificationCenterProps) {
    const { notifications, unreadCount, markAllAsRead, isLoading } = useNotifications();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    // ============== MOBILE VERSION (Ultra-Compact Glassmorphism) ==============
    if (isMobile) {
        return (
            <div className="w-full">
                {/* Compact Header */}
                <div
                    className="px-3 py-2.5 relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #2a63cd 0%, #1e4ba3 50%, #0ea5e9 100%)'
                    }}
                >
                    {/* Shimmer effect */}
                    <div
                        className="absolute inset-0 opacity-20"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                            animation: 'shimmer 2s infinite',
                        }}
                    />

                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-white/25 backdrop-blur-sm flex items-center justify-center">
                                <FiBell className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-white font-bold text-sm drop-shadow-sm">Notificaciones</span>
                        </div>
                        {unreadCount > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-white/25 text-white text-[10px] font-bold rounded-full backdrop-blur-sm">
                                    {unreadCount} nuevas
                                </span>
                                <button
                                    onClick={markAllAsRead}
                                    className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all active:scale-95"
                                    title="Marcar todas"
                                >
                                    <FiCheckCircle className="w-3.5 h-3.5 text-white" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Compact Filter Pills - Fixed visibility */}
                    <div className="flex gap-1.5 mt-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${filter === 'all'
                                ? 'bg-[#2a63cd] text-white shadow-lg'
                                : 'bg-white/90 text-gray-600 hover:bg-white shadow-sm'
                                }`}
                            style={{ boxShadow: filter === 'all' ? '0 4px 12px -2px rgba(42, 99, 205, 0.5)' : '0 2px 4px rgba(0,0,0,0.1)' }}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${filter === 'unread'
                                ? 'bg-[#2a63cd] text-white shadow-lg'
                                : 'bg-white/90 text-gray-600 hover:bg-white shadow-sm'
                                }`}
                            style={{ boxShadow: filter === 'unread' ? '0 4px 12px -2px rgba(42, 99, 205, 0.5)' : '0 2px 4px rgba(0,0,0,0.1)' }}
                        >
                            No leídas
                        </button>
                    </div>
                </div>

                {/* Notifications List - Ultra Compact */}
                <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 rounded-full border-2 border-[#2a63cd] border-t-transparent animate-spin" />
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 px-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2">
                                <FiBell className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium text-xs">
                                {filter === 'unread' ? 'Sin nuevas' : 'Sin notificaciones'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100/80">
                            {filteredNotifications.slice(0, 5).map((notification, index) => (
                                <div
                                    key={notification.id}
                                    className="animate-mobileItemIn"
                                    style={{ animationDelay: `${index * 60}ms` }}
                                >
                                    <NotificationItem notification={notification} isMobile={true} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Compact Footer */}
                {filteredNotifications.length > 0 && (
                    <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/80">
                        <Link
                            href="/customer/notifications"
                            onClick={onClose}
                            className="block w-full px-3 py-1.5 text-[11px] font-bold text-[#2a63cd] hover:bg-blue-50 rounded-lg transition-all text-center active:scale-[0.98]"
                        >
                            Ver todas las notificaciones
                        </Link>
                    </div>
                )}

                <style jsx>{`
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                    @keyframes mobileItemIn {
                        from {
                            opacity: 0;
                            transform: translateY(-8px) scale(0.97);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0) scale(1);
                        }
                    }
                    .animate-mobileItemIn {
                        animation: mobileItemIn 0.25s ease-out forwards;
                        opacity: 0;
                    }
                `}</style>
            </div>
        );
    }

    // ============== DESKTOP VERSION (Unchanged) ==============
    return (
        <div className="w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3]">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FiBell className="w-5 h-5" />
                        Notificaciones
                    </h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">
                            {unreadCount} nuevas
                        </span>
                    )}
                </div>

                {/* Filters and Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'all'
                            ? 'bg-white text-[#2a63cd]'
                            : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === 'unread'
                            ? 'bg-white text-[#2a63cd]'
                            : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                    >
                        No leídas
                    </button>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="p-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                            title="Marcar todas como leídas"
                        >
                            <FiCheckCircle className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[500px] overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2a63cd]"></div>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <FiBell className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium">
                            {filter === 'unread' ? 'No hay notificaciones nuevas' : 'No hay notificaciones'}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                            Te notificaremos cuando haya novedades
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredNotifications.map((notification, index) => (
                            <div
                                key={notification.id}
                                style={{ animationDelay: `${index * 50}ms` }}
                                className="animate-fadeIn"
                            >
                                <NotificationItem notification={notification} isMobile={false} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {filteredNotifications.length > 0 && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <Link
                        href="/customer/notifications"
                        onClick={onClose}
                        className="block w-full px-4 py-2 text-sm font-medium text-[#2a63cd] hover:bg-gray-100 rounded-lg transition-colors text-center"
                    >
                        Ver todas las notificaciones
                    </Link>
                </div>
            )}

            <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
        </div>
    );
}

