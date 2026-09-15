'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

// Notificaciones del usuario de la sesión (campana del header y del panel, página de notificaciones).
// C-73: el contador sale del servidor (antes contaba solo entre las últimas 50), la carga inicial es la única
// que muestra "cargando" (antes la página parpadeaba cada 30 s) y no se consulta con la pestaña oculta.

export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    icon?: string | null;
    read: boolean;
    createdAt: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    fetchNotifications: () => Promise<void>;
}

const POLL_MS = 60_000;

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const defaultContextValue: NotificationContextType = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    markAsRead: async () => { },
    markAllAsRead: async () => { },
    deleteNotification: async () => { },
    fetchNotifications: async () => { },
};

export function useNotifications() {
    return useContext(NotificationContext) ?? defaultContextValue;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const loadedFor = useRef<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        const firstLoad = loadedFor.current !== userId;
        if (firstLoad) setIsLoading(true);
        try {
            const response = await fetch('/api/notifications?limit=30', { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
                setUnreadCount(Number(data.unreadCount) || 0);
                loadedFor.current = userId;
            }
        } catch {
            // Sin conexión o servidor reiniciando: se vuelve a intentar en la próxima consulta
        } finally {
            if (firstLoad) setIsLoading(false);
        }
    }, [userId]);

    const markAsRead = useCallback(async (id: string) => {
        const target = notifications.find((notification) => notification.id === id);
        if (!target || target.read) return;
        setNotifications((previous) => previous.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));
        setUnreadCount((count) => Math.max(0, count - 1));
        const response = await fetch(`/api/notifications/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ read: true }),
            keepalive: true,
        }).catch(() => null);
        if (!response?.ok) fetchNotifications();
        window.dispatchEvent(new Event('refresh-sidebar-counts'));
    }, [notifications, fetchNotifications]);

    const markAllAsRead = useCallback(async () => {
        setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
        setUnreadCount(0);
        const response = await fetch('/api/notifications/mark-all-read', { method: 'PATCH', keepalive: true }).catch(() => null);
        if (!response?.ok) fetchNotifications();
        window.dispatchEvent(new Event('refresh-sidebar-counts'));
    }, [fetchNotifications]);

    const deleteNotification = useCallback(async (id: string) => {
        const target = notifications.find((notification) => notification.id === id);
        setNotifications((previous) => previous.filter((notification) => notification.id !== id));
        if (target && !target.read) setUnreadCount((count) => Math.max(0, count - 1));
        const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE', keepalive: true }).catch(() => null);
        if (!response?.ok) fetchNotifications();
        window.dispatchEvent(new Event('refresh-sidebar-counts'));
    }, [notifications, fetchNotifications]);

    useEffect(() => {
        if (!userId) return;
        const refresh = () => {
            if (document.visibilityState === 'visible') fetchNotifications();
        };
        // Primera carga fuera del cuerpo del efecto (sin setState síncrono)
        const first = window.setTimeout(fetchNotifications, 0);
        const interval = window.setInterval(refresh, POLL_MS);
        document.addEventListener('visibilitychange', refresh);
        window.addEventListener('refresh-notifications', fetchNotifications);
        return () => {
            window.clearTimeout(first);
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', refresh);
            window.removeEventListener('refresh-notifications', fetchNotifications);
        };
    }, [userId, fetchNotifications]);

    const value = useMemo<NotificationContextType>(() => ({
        notifications: userId ? notifications : [],
        unreadCount: userId ? unreadCount : 0,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchNotifications,
    }), [userId, notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification, fetchNotifications]);

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
