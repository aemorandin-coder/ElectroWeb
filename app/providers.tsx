'use client';

import { SessionProvider } from 'next-auth/react';
import { CartProvider } from '@/contexts/CartContext';
import { ConfirmDialogProvider } from '@/contexts/ConfirmDialogContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { Toaster } from 'react-hot-toast';
import type { PublicSettings } from '@/lib/site-settings';
import { CatalogNavProvider, type NavCategory } from '@/contexts/CatalogNavContext';

export function Providers({
  children,
  initialSettings,
  navCategories = [],
}: {
  children: React.ReactNode;
  initialSettings: PublicSettings;
  navCategories?: NavCategory[];
}) {
  return (
    <SessionProvider
      // En dev Turbopack interrumpe HMR — valores conservadores evitan CLIENT_FETCH_ERROR
      refetchInterval={30 * 60}        // 30 min (era 5 min — demasiado agresivo con Turbopack)
      refetchOnWindowFocus={false}     // Desactivado: cada hot-reload dispara un refetch con body vacío
    >
      <CartProvider>
        <SettingsProvider initialSettings={initialSettings}>
          <CatalogNavProvider categories={navCategories}>
          <ConfirmDialogProvider>
            {children}
            <Toaster
              position="top-right"
              // Capa de toasts (PLAN.md §1.3): encima de modales y barra móvil, debajo del popup
              containerStyle={{ zIndex: 'var(--z-toast)' }}
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'white',
                  color: 'var(--color-ink)',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  border: '1px solid var(--color-line)',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--color-success-strong)',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'var(--color-deal)',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </ConfirmDialogProvider>
          </CatalogNavProvider>
        </SettingsProvider>
      </CartProvider>
    </SessionProvider>
  );
}
