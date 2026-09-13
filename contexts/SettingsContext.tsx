'use client';

import React, { createContext, useContext, useState } from 'react';
import type { PublicSettings } from '@/lib/site-settings';

interface SettingsContextType {
    settings: PublicSettings | null;
    isLoading: boolean;
    error: string | null;
    refreshSettings: () => Promise<void>;
    formatPrice: (priceUSD: number) => { usd: string; ves: string };
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// El layout lee los settings públicos en el servidor (getPublicSettings) y los pasa aquí:
// no hay fetch al montar. refreshSettings sigue disponible para recargarlos bajo demanda.
export function SettingsProvider({
    children,
    initialSettings = null,
}: {
    children: React.ReactNode;
    initialSettings?: PublicSettings | null;
}) {
    const [settings, setSettings] = useState<PublicSettings | null>(initialSettings);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/settings/public', {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                },
            });

            if (!response.ok) { setIsLoading(false); return; }

            // Leer como texto primero — previene crash si Turbopack interrumpe la respuesta
            const text = await response.text();
            if (!text || text.trim() === '') { setIsLoading(false); return; }

            let data: any;
            try { data = JSON.parse(text); } catch { setIsLoading(false); return; }

            setSettings(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Error fetching settings');
        } finally {
            setIsLoading(false);
        }
    };

    const formatPrice = (priceUSD: number) => {
        const usd = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(priceUSD);

        let ves = '';
        if (settings?.exchangeRateVES) {
            const priceVES = priceUSD * settings.exchangeRateVES;
            ves = new Intl.NumberFormat('es-VE', {
                style: 'currency',
                currency: 'VES',
                minimumFractionDigits: 2
            }).format(priceVES);
        }

        return { usd, ves };
    };

    return (
        <SettingsContext.Provider value={{ settings, isLoading, error, refreshSettings: fetchSettings, formatPrice }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
