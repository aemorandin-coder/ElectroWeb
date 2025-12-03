'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CompanySettings } from '@/types/settings';

interface SettingsContextType {
    settings: CompanySettings | null;
    isLoading: boolean;
    error: string | null;
    refreshSettings: () => Promise<void>;
    formatPrice: (priceUSD: number) => { usd: string; ves: string };
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings/public', {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSettings(data);
                setError(null);
            } else {
                setError('Failed to fetch settings');
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Error fetching settings');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

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
