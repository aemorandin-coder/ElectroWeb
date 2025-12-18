'use client';

import { useEffect, useState } from 'react';
import FaviconUpdater from './FaviconUpdater';

// LocalStorage keys for caching
const FAVICON_CACHE_KEY = 'electro_favicon_cache';
const COMPANY_NAME_CACHE_KEY = 'electro_company_name_cache';
const CACHE_EXPIRY_KEY = 'electro_settings_cache_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedSettings {
    favicon: string | null;
    companyName: string | null;
}

// Function to get cached settings synchronously
const getCachedSettings = (): CachedSettings | null => {
    if (typeof window === 'undefined') return null;

    try {
        const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
        if (expiry && Date.now() > parseInt(expiry)) {
            // Cache expired
            return null;
        }

        const favicon = localStorage.getItem(FAVICON_CACHE_KEY);
        const companyName = localStorage.getItem(COMPANY_NAME_CACHE_KEY);

        if (favicon || companyName) {
            return { favicon, companyName };
        }
    } catch {
        // localStorage not available
    }
    return null;
};

// Function to save settings to cache
const saveToCache = (favicon: string | null, companyName: string | null) => {
    if (typeof window === 'undefined') return;

    try {
        if (favicon) localStorage.setItem(FAVICON_CACHE_KEY, favicon);
        if (companyName) localStorage.setItem(COMPANY_NAME_CACHE_KEY, companyName);
        localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION));
    } catch {
        // localStorage not available
    }
};

export default function DynamicFavicon() {
    // Initialize from cache immediately
    const [settings, setSettings] = useState<CachedSettings>(() => {
        return getCachedSettings() || { favicon: null, companyName: null };
    });

    useEffect(() => {
        // Try to get from cache first
        const cached = getCachedSettings();
        if (cached && (cached.favicon || cached.companyName)) {
            setSettings(cached);
        }

        // Always fetch fresh data
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/settings/public', {
                    cache: 'no-store' // Avoid HTTP cache to get fresh data
                });

                if (response.ok) {
                    const data = await response.json();
                    const newSettings = {
                        favicon: data.favicon || null,
                        companyName: data.companyName || null
                    };

                    // Save to cache for future page loads
                    saveToCache(newSettings.favicon, newSettings.companyName);

                    // Update state
                    setSettings(newSettings);
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
                // Keep using cached data on error
            }
        };

        fetchSettings();

        // Refresh settings when window regains focus (user switches tabs)
        const handleFocus = () => {
            fetchSettings();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    return <FaviconUpdater favicon={settings.favicon} companyName={settings.companyName} />;
}
