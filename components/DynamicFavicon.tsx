'use client';

import FaviconUpdater from './FaviconUpdater';
import { useSettings } from '@/contexts/SettingsContext';

// Settings públicos del servidor (SettingsProvider): llegan con el HTML, así que ya no hace falta
// el fetch al montar ni la caché en localStorage que evitaba el parpadeo.
export default function DynamicFavicon() {
    const { settings } = useSettings();

    return <FaviconUpdater favicon={settings?.favicon ?? null} companyName={settings?.companyName ?? null} />;
}
