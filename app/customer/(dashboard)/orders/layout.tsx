import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/site-settings';

// C-265: el título de la pestaña (antes, el de la portada). El noindex viene del layout de Mi panel. Lleva la plantilla
// porque debajo está Mis códigos (un título de texto aquí le borraba la de arriba).
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return { title: { default: 'Mis pedidos', template: `%s | ${settings.companyName || 'Electro Shop'}` } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
