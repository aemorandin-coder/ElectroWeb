'use client';

import { SessionProvider } from 'next-auth/react';
import { CartProvider } from '@/contexts/CartContext';
import { ConfirmDialogProvider } from '@/contexts/ConfirmDialogContext';
import { SettingsProvider } from '@/contexts/SettingsContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Refetch when window regains focus
    >
      <CartProvider>
        <SettingsProvider>
          <ConfirmDialogProvider>
            {children}
          </ConfirmDialogProvider>
        </SettingsProvider>
      </CartProvider>
    </SessionProvider>
  );
}
