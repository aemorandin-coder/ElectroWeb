'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { VERSION_BUILD } from '@/lib/version-build';
import { novedadesHumanasDesde, type NovedadHumana } from '@/lib/version-novedades';

// Notificaciones del usuario de la sesión (campana del header y del panel, página de notificaciones) + novedades de versión (G-73 V1).

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

export interface ReleaseUpdateState {
  serverVersion: string;
  serverId: string;
  reloadAvailable: boolean;
  unreadRelease: NovedadHumana | null;
}

interface DatosVersionServidor {
  id: string;
  version: string;
  describe: string;
  visto: string | null;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  releaseUpdate: ReleaseUpdateState | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  dismissReleaseUpdate: () => Promise<void>;
  refreshVersionStatus: () => Promise<void>;
}

const POLL_MS = 60_000;
const VERSION_POLL_MS = 10 * 60_000;

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const defaultContextValue: NotificationContextType = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  releaseUpdate: null,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  fetchNotifications: async () => {},
  dismissReleaseUpdate: async () => {},
  refreshVersionStatus: async () => {},
};

export function useNotifications() {
  return useContext(NotificationContext) ?? defaultContextValue;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userType = session?.user?.userType;
  const role = session?.user?.role;
  const dosPasos = session?.user?.dosPasos === true;

  const isAdminPanel = userType === 'admin' && dosPasos;
  const isAccountant = role === 'ACCOUNTANT';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [releaseUpdate, setReleaseUpdate] = useState<ReleaseUpdateState | null>(null);
  const loadedFor = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId || isAccountant) return;
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
      // Sin conexión o servidor reiniciando
    } finally {
      if (firstLoad) setIsLoading(false);
    }
  }, [userId, isAccountant]);

  const refreshVersionStatus = useCallback(async () => {
    if (!isAdminPanel) return;
    const res = await fetch('/api/admin/version', { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) return;
    const datos = (await res.json().catch(() => null)) as DatosVersionServidor | null;
    if (!datos || typeof datos.id !== 'string') return;

    const reloadAvailable = datos.id !== VERSION_BUILD.id;
    const unreadRelease = !reloadAvailable && datos.visto !== datos.version
      ? novedadesHumanasDesde(datos.visto, VERSION_BUILD.version)
      : null;

    setReleaseUpdate({
      serverVersion: datos.version,
      serverId: datos.id,
      reloadAvailable,
      unreadRelease,
    });
  }, [isAdminPanel]);

  const dismissReleaseUpdate = useCallback(async () => {
    if (!isAdminPanel) return;
    setReleaseUpdate((prev) => (prev ? { ...prev, unreadRelease: null } : prev));
    await fetch('/api/admin/version', { method: 'POST' }).catch(() => null);
  }, [isAdminPanel]);

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
    if (releaseUpdate?.unreadRelease) {
      void dismissReleaseUpdate();
    }
    if (isAccountant) return;
    setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
    setUnreadCount(0);
    const response = await fetch('/api/notifications/mark-all-read', { method: 'PATCH', keepalive: true }).catch(() => null);
    if (!response?.ok) fetchNotifications();
    window.dispatchEvent(new Event('refresh-sidebar-counts'));
  }, [fetchNotifications, isAccountant, releaseUpdate, dismissReleaseUpdate]);

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

  useEffect(() => {
    if (!isAdminPanel) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void refreshVersionStatus();
    };
    const first = window.setTimeout(() => void refreshVersionStatus(), 0);
    const interval = window.setInterval(() => void refreshVersionStatus(), VERSION_POLL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [isAdminPanel, refreshVersionStatus]);

  const effectiveRelease = isAdminPanel ? releaseUpdate : null;
  const totalUnread = (userId && !isAccountant ? unreadCount : 0) + (effectiveRelease?.unreadRelease ? 1 : 0);

  const value = useMemo<NotificationContextType>(() => ({
    notifications: userId && !isAccountant ? notifications : [],
    unreadCount: totalUnread,
    isLoading,
    releaseUpdate: effectiveRelease,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
    dismissReleaseUpdate,
    refreshVersionStatus,
  }), [
    userId,
    isAccountant,
    notifications,
    totalUnread,
    isLoading,
    effectiveRelease,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
    dismissReleaseUpdate,
    refreshVersionStatus,
  ]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
