import { PAYMENT_LABELS } from '@/components/home/TrustBar';
import { buildLlmsTxt } from '@/lib/llms';
import { getActivePaymentMethodKinds } from '@/lib/queries/home';
import { getCategoriesWithProducts, getVisibleProducts, memoMinutes } from '@/lib/queries/seo';
import { getPublicSettings } from '@/lib/site-settings';

// Se arma al pedirlo (no en el build) y se guarda 10 minutos en memoria
export const dynamic = 'force-dynamic';

const llms = memoMinutes(10, async () => {
  const [settings, categories, products, paymentKinds] = await Promise.all([
    getPublicSettings(),
    getCategoriesWithProducts(),
    getVisibleProducts(),
    getActivePaymentMethodKinds(),
  ]);
  return buildLlmsTxt({ settings, categories, products, paymentMethods: paymentKinds.map((kind) => PAYMENT_LABELS[kind].label) });
});

/** /llms.txt (C-149): la tienda, cómo se compra y el catálogo, en Markdown, para los asistentes de IA. */
export async function GET() {
  try {
    return new Response(await llms(), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
    });
  } catch (error) {
    console.error('[llms.txt]', error);
    return new Response('No disponible por el momento', { status: 503, headers: { 'Retry-After': '600', 'Cache-Control': 'no-store' } });
  }
}
