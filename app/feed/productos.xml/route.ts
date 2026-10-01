import { buildProductFeed } from '@/lib/feed';
import { getVisibleProducts, memoMinutes } from '@/lib/queries/seo';
import { getPublicSettings } from '@/lib/site-settings';

// Se arma al pedirlo (no en el build) y se guarda 10 minutos en memoria
export const dynamic = 'force-dynamic';

const feed = memoMinutes(10, async () => {
  const [settings, products] = await Promise.all([getPublicSettings(), getVisibleProducts({ productType: 'PHYSICAL' })]);
  return buildProductFeed(products, { name: settings.companyName, description: settings.tagline, deliveryEnabled: settings.deliveryEnabled });
});

/**
 * Feed de productos para el catálogo de Meta y para Google Merchant Center (C-149): /feed/productos.xml.
 * Si la base falla responde 503 en vez de un feed vacío: un feed vacío le dice a la plataforma que ya no hay productos.
 */
export async function GET() {
  try {
    return new Response(await feed(), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
    });
  } catch (error) {
    console.error('[feed/productos.xml]', error);
    return new Response('Feed no disponible por el momento', { status: 503, headers: { 'Retry-After': '600', 'Cache-Control': 'no-store' } });
  }
}
