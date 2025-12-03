'use client';

import { useState } from 'react';
import { FiCheck, FiCheckCircle, FiFilter } from 'react-icons/fi';
import { useNotifications } from './NotificationProvider';
import NotificationItem from './NotificationItem';

interface NotificationCenterProps {
    onClose: () => void;
}

export default function NotificationCenter({ onClose }: NotificationCenterProps) {
    const { notifications, unreadCount, markAllAsRead, isLoading } = useNotifications();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

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
                                <NotificationItem notification={notification} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {filteredNotifications.length > 0 && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 text-sm font-medium text-[#2a63cd] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Ver todas las notificaciones
                    </button>
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

// Import FiBell
import { FiBell } from 'react-icons/fi';
