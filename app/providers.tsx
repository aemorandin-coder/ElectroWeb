'use client';

import { SessionProvider } from 'next-auth/react';
import { CartProvider } from '@/contexts/CartContext';
import { ConfirmDialogProvider } from '@/contexts/ConfirmDialogContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // En dev Turbopack interrumpe HMR — valores conservadores evitan CLIENT_FETCH_ERROR
      refetchInterval={30 * 60}        // 30 min (era 5 min — demasiado agresivo con Turbopack)
      refetchOnWindowFocus={false}     // Desactivado: cada hot-reload dispara un refetch con body vacío
    >
      <CartProvider>
        <SettingsProvider>
          <ConfirmDialogProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#fff',
                  color: '#212529',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  border: '1px solid #e9ecef',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '14px',
                  fontWeight: '500',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </ConfirmDialogProvider>
        </SettingsProvider>
      </CartProvider>
    </SessionProvider>
  );
}
