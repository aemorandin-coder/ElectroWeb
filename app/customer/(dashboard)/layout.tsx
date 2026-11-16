import type { Metadata } from 'next';
import MarcoMiPanel from '@/components/customer/MarcoMiPanel';
import { getSiteSettings } from '@/lib/site-settings';

// C-265: el layout es de servidor para llevar el título y quedar fuera de los buscadores (C-258: todas las pestañas de
// Mi panel decían el título de la portada). Cada página pone el suyo en su layout.tsx ("Mis pedidos | Electro Shop"); el
// noindex lo heredan todas. La plantilla se repite aquí: un título de texto en este nivel les borraba la de la raíz.
// El marco (menú, cabecera, barra del teléfono) es MarcoMiPanel.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: { default: 'Mi panel', template: `%s | ${settings.companyName || 'Electro Shop'}` },
    robots: { index: false, follow: false },
  };
}

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  return <MarcoMiPanel>{children}</MarcoMiPanel>;
}
