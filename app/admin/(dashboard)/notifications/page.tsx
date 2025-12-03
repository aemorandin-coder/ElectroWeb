'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: any;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    urgent: 0,
    high: 0,
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=100');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        calculateStats(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (notifs: Notification[]) => {
    setStats({
      total: notifs.length,
      unread: notifs.filter(n => !n.isRead).length,
      urgent: notifs.filter(n => n.priority === 'URGENT').length,
      high: notifs.filter(n => n.priority === 'HIGH').length,
    });
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      calculateStats(notifications);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      calculateStats(notifications);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      calculateStats(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllRead = async () => {
    if (!confirm('¿Estás seguro de eliminar todas las notificaciones leídas?')) return;

    try {
      await fetch('/api/notifications?deleteAll=true', {
        method: 'DELETE',
      });

      setNotifications(prev => prev.filter(n => !n.isRead));
      calculateStats(notifications.filter(n => !n.isRead));
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      URGENT: 'bg-red-500 text-white',
      HIGH: 'bg-orange-500 text-white',
      MEDIUM: 'bg-blue-500 text-white',
      LOW: 'bg-gray-400 text-white',
    };
    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles[priority as keyof typeof styles] || styles.LOW}`}>
        {priority}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'NEW_ORDER':
        return (
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        );
      case 'LOW_STOCK':
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'OUT_OF_STOCK':
        return (
          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'STOCK_CRITICAL':
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'ORDER_PAID':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'PRODUCT_REQUEST':
        return (
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterRead === 'unread' && n.isRead) return false;
    if (filterRead === 'read' && !n.isRead) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between animate-fadeIn">
          <div>
            <h1 className="text-xl font-semibold text-[#212529]">Notificaciones</h1>
            <p className="text-xs text-[#6a6c6b] mt-0.5">
              Centro de notificaciones del sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={deleteAllRead} size="sm">
              Eliminar leídas
            </Button>
            <Button variant="primary" onClick={markAllAsRead} size="sm">
              Marcar todas como leídas
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 stagger-children">
          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm">
            <p className="text-xs text-[#6a6c6b] font-medium mb-1">Total</p>
            <p className="text-2xl font-semibold text-[#212529]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm">
            <p className="text-xs text-[#6a6c6b] font-medium mb-1">Sin Leer</p>
            <p className="text-2xl font-semibold text-blue-600">{stats.unread}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm">
            <p className="text-xs text-[#6a6c6b] font-medium mb-1">Urgentes</p>
            <p className="text-2xl font-semibold text-red-600">{stats.urgent}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm">
            <p className="text-xs text-[#6a6c6b] font-medium mb-1">Alta Prioridad</p>
            <p className="text-2xl font-semibold text-orange-600">{stats.high}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-[#e9ecef] p-3 shadow-sm">
          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:border-[#2a63cd] focus:ring-2 focus:ring-[#2a63cd]/10"
            >
              <option value="all">Todos los tipos</option>
              <option value="NEW_ORDER">Nuevas Órdenes</option>
              <option value="LOW_STOCK">Stock Bajo</option>
              <option value="OUT_OF_STOCK">Sin Stock</option>
              <option value="STOCK_CRITICAL">Stock Crítico</option>
              <option value="ORDER_PAID">Orden Pagada</option>
              <option value="PRODUCT_REQUEST">Solicitud de Producto</option>
            </select>

            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value)}
              className="px-3 py-2 text-sm bg-[#f8f9fa] border border-[#dee2e6] rounded-lg focus:outline-none focus:border-[#2a63cd] focus:ring-2 focus:ring-[#2a63cd]/10"
            >
              <option value="all">Todas</option>
              <option value="unread">Sin leer</option>
              <option value="read">Leídas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scrollable Notifications List */}
      <div className="flex-1 overflow-y-auto pr-2 mt-4">
        <div className="space-y-2">
        {isLoading ? (
          <div className="bg-white rounded-lg border border-[#e9ecef] p-12 text-center">
            <div className="w-8 h-8 border-2 border-[#2a63cd] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[#6a6c6b] mt-3">Cargando notificaciones...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#e9ecef] p-12 text-center">
            <svg className="w-16 h-16 text-[#adb5bd] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-semibold text-[#212529] mb-1">No hay notificaciones</h3>
            <p className="text-sm text-[#6a6c6b]">No se encontraron notificaciones con los filtros seleccionados</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg border border-[#e9ecef] p-4 shadow-sm transition-all hover:shadow-md ${
                !notification.isRead ? 'border-l-4 border-l-[#2a63cd] bg-[#f8f9fa]/30' : ''
              }`}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-[#f8f9fa] flex items-center justify-center">
                    {getTypeIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-[#212529]">
                          {notification.title}
                        </h3>
                        {getPriorityBadge(notification.priority)}
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#2a63cd]" />
                        )}
                      </div>
                      <p className="text-xs text-[#6a6c6b] mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[#adb5bd]">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {notification.actionUrl && (
                        <a
                          href={notification.actionUrl}
                          onClick={() => !notification.isRead && markAsRead(notification.id)}
                          className="p-2 hover:bg-[#f8f9fa] rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <svg className="w-4 h-4 text-[#2a63cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 hover:bg-[#f8f9fa] rounded-lg transition-colors"
                          title="Marcar como leída"
                        >
                          <svg className="w-4 h-4 text-[#6a6c6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
}
