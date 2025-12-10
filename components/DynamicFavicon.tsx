'use client';

import { useEffect, useState } from 'react';
import FaviconUpdater from './FaviconUpdater';

export default function DynamicFavicon() {
    const [favicon, setFavicon] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/settings/public');
                if (response.ok) {
                    const data = await response.json();
                    if (data.favicon) {
                        setFavicon(data.favicon);
                    }
                    if (data.companyName) {
                        setCompanyName(data.companyName);
                    }
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        };

        fetchSettings();
    }, []);

    return <FaviconUpdater favicon={favicon} companyName={companyName} />;
}
