'use client';

import { adminPageHeader, adminPageSubtitle, adminPageTitle } from '@/lib/admin-ui';
import Studio from './_components/Studio';

// ElectroStudio (C-112): historias y videos para Instagram con los productos y precios reales de la tienda.
// Reemplaza a "Imágenes para redes" de Marketing y viene del artefacto "Flyers ElectroShop" de Andrés.
export default function StudioPage() {
  return (
    <div>
      <div className={adminPageHeader}>
        <div>
          <h1 className={adminPageTitle}>ElectroStudio</h1>
          <p className={adminPageSubtitle}>Historias y videos para Instagram con los productos, precios y ofertas de la tienda.</p>
        </div>
      </div>
      <Studio />
    </div>
  );
}
