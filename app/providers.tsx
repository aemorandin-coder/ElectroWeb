'use client';

import { SessionProvider } from 'next-auth/react';
import { CartProvider } from '@/contexts/CartContext';
import { ConfirmDialogProvider } from '@/contexts/ConfirmDialogContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import ElectroToaster from '@/components/ui/ElectroToaster';
import type { PublicSettings } from '@/lib/site-settings';
import { CatalogNavProvider, type NavCategory, type NavDepartamento } from '@/contexts/CatalogNavContext';
import { SorteoCompraProvider } from '@/contexts/SorteoCompraContext';
import type { SorteoParaCompra } from '@/lib/sorteo/estrella';

export function Providers({
  children,
  initialSettings,
  navCategories = [],
  navDepartamentos = [],
  sorteoCompra = null,
}: {
  children: React.ReactNode;
  initialSettings: PublicSettings;
  navCategories?: NavCategory[];
  navDepartamentos?: NavDepartamento[];
  /** C-297: la escala de boletos y el producto estrella del sorteo abierto (null sin sorteo) */
  sorteoCompra?: SorteoParaCompra | null;
}) {
  return (
    <SessionProvider
      // En dev Turbopack interrumpe HMR — valores conservadores evitan CLIENT_FETCH_ERROR
      refetchInterval={30 * 60}        // 30 min (era 5 min — demasiado agresivo con Turbopack)
      refetchOnWindowFocus={false}     // Desactivado: cada hot-reload dispara un refetch con body vacío
    >
      <CartProvider>
        <SettingsProvider initialSettings={initialSettings}>
          <CatalogNavProvider categories={navCategories} departamentos={navDepartamentos}>
          <SorteoCompraProvider valor={sorteoCompra}>
          <ConfirmDialogProvider>
            {children}
            <ElectroToaster />
          </ConfirmDialogProvider>
          </SorteoCompraProvider>
          </CatalogNavProvider>
        </SettingsProvider>
      </CartProvider>
    </SessionProvider>
  );
}
