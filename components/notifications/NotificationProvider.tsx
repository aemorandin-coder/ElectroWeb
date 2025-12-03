'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface Notification {
    id: string;
    type: 'ORDER_CONFIRMED' | 'ORDER_PAID' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' |
    'REVIEW_APPROVED' | 'REVIEW_REPLIED' | 'SYSTEM_UPDATE' | 'SYSTEM_MAINTENANCE' |
    'PROMOTION' | 'STOCK_ALERT';
    title: string;
    message: string;
    actionUrl?: string;
    icon?: string;
    read: boolean;
    createdAt: string;
}

export interface ToastNotification {
    id: string;
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
    duration?: number;
}

interface NotificationContextType {
    notifications: Notification[];
    toasts: ToastNotification[];
    unreadCount: number;
    showToast: (toast: Omit<ToastNotification, 'id'>) => void;
    dismissToast: (id: string) => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    fetchNotifications: () => Promise<void>;
    isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    const fetchNotifications = useCallback(async () => {
        if (!session?.user) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/notifications');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    const showToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
        const id = Math.random().toString(36).substring(7);
        const newToast: ToastNotification = {
            ...toast,
            id,
            duration: toast.duration || 5000,
        };

        setToasts(prev => [...prev, newToast]);

        // Auto dismiss
        setTimeout(() => {
            dismissToast(id);
        }, newToast.duration);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const markAsRead = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/notifications/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ read: true }),
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.map(n => (n.id === id ? { ...n, read: true } : n))
                );
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'PATCH',
            });

            if (response.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }, []);

    const deleteNotification = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/notifications/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    }, []);

    // Fetch notifications on mount and when user changes
    useEffect(() => {
        if (session?.user) {
            fetchNotifications();

            // Poll for new notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [session, fetchNotifications]);

    const value: NotificationContextType = {
        notifications,
        toasts,
        unreadCount,
        showToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchNotifications,
        isLoading,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
