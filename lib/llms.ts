// llms.txt (C-149): un resumen de la tienda en Markdown para los asistentes de IA (formato de llmstxt.org).
// Módulo puro. Todo sale de Configuración y del catálogo: nada escrito a mano que la tienda pueda dejar de cumplir.

import type { PublicProduct } from '@/lib/dto/product';
import type { CategoryWithCount } from '@/lib/queries/seo';
import type { PublicSettings } from '@/lib/site-settings';
import { formatUSD } from '@/lib/currency';
import { plainText, siteUrl } from '@/lib/seo';

/** Productos que se listan uno por uno (el resto se encuentra por las categorías y el sitemap) */
const MAX_PRODUCTS = 200;

const DAYS: Array<[string, string]> = [
  ['monday', 'lunes'], ['tuesday', 'martes'], ['wednesday', 'miércoles'], ['thursday', 'jueves'],
  ['friday', 'viernes'], ['saturday', 'sábado'], ['sunday', 'domingo'],
];

/** Markdown en una línea: sin saltos y sin los caracteres que rompen un enlace o una lista. */
const md = (value: string | null | undefined, max = 200) => plainText(value, max).replace(/[[\]<>]/g, '');

/** Dirección completa, sin repetir la ciudad o el estado si la dirección ya los trae. */
function direccion(settings: PublicSettings): string {
  const address = settings.address ?? '';
  const extra = [settings.city, settings.state, 'Venezuela'].filter((part): part is string => typeof part === 'string' && part !== '' && !address.toLowerCase().includes(part.toLowerCase()));
  return [address, ...extra].join(', ');
}

function horario(settings: PublicSettings): string | null {
  const hours = settings.businessHours;
  if (!hours) return null;
  const open = DAYS.filter(([key]) => hours[key]?.enabled && hours[key].open && hours[key].close)
    .map(([key, name]) => `${name} de ${hours[key].open} a ${hours[key].close}`);
  return open.length > 0 ? open.join('; ') : null;
}

function productLine(product: PublicProduct): string {
  const prices = product.digitalVariants.map((v) => v.priceUSD).filter((n) => n > 0);
  const price = prices.length > 1 ? `desde ${formatUSD(Math.min(...prices))}` : formatUSD(prices[0] ?? product.priceUSD);
  const details = [
    price,
    product.brand?.name,
    product.category.name,
    product.condition ? `${product.condition.badge}, garantía de la tienda de ${product.condition.warrantyDays} días` : null,
    product.productType === 'DIGITAL' ? 'producto digital' : product.stock > 0 ? 'disponible' : 'agotado',
  ].filter(Boolean);
  return `- [${md(product.name, 150)}](${siteUrl()}/productos/${product.slug}): ${details.map((d) => md(d)).join(' · ')}`;
}

export interface LlmsInput {
  settings: PublicSettings;
  categories: CategoryWithCount[];
  products: PublicProduct[];
  /** Nombres de las formas de pago activas ("Pago Móvil", "Zelle") */
  paymentMethods: string[];
}

export function buildLlmsTxt({ settings, categories, products, paymentMethods }: LlmsInput): string {
  const site = siteUrl();
  const lugar = [settings.city, settings.state].filter(Boolean).join(', ');
  const lines: string[] = [];
  const section = (title: string, body: Array<string | null | false | undefined>) => {
    const rows = body.filter((row): row is string => Boolean(row));
    if (rows.length > 0) lines.push('', `## ${title}`, '', ...rows);
  };

  lines.push(`# ${md(settings.companyName)}`, '');
  lines.push(`> Tienda de tecnología${lugar ? ` en ${md(lugar)}` : ''}, Venezuela, con venta por internet en ${site}. ${categories.length > 0 ? `Vende ${md(categories.slice(0, 6).map((c) => c.name).join(', '), 300)}. ` : ''}Los precios se publican en dólares (USD) con su equivalente en bolívares.`);

  section('La tienda', [
    settings.legalName && `- Razón social: ${md(settings.legalName)}`,
    settings.rif && `- RIF: ${md(settings.rif)}`,
    settings.address && `- Dirección: ${md(direccion(settings), 300)}`,
    settings.phone && `- Teléfono: ${md(settings.phone)}`,
    settings.whatsapp && `- WhatsApp: ${md(settings.whatsapp)}`,
    settings.email && `- Correo: ${md(settings.email)}`,
    horario(settings) && `- Horario: ${horario(settings)}`,
    `- [Contacto](${site}/contacto)`,
  ]);

  section('Cómo se compra', [
    `- Precios en dólares (USD)${settings.taxEnabled ? ', con el IVA incluido' : ''}. El equivalente en bolívares se calcula con la tasa del día que muestra la tienda.`,
    paymentMethods.length > 0 && `- Formas de pago: ${paymentMethods.map((m) => md(m)).join(', ')}. La tienda muestra los datos de cada una al pagar.`,
    settings.deliveryEnabled && '- Envíos a toda Venezuela por ZOOM o MRW con cobro a destino: el flete se paga al retirar el paquete. Los productos marcados con "Envío gratis" los envía la tienda sin costo.',
    settings.localDeliveryEnabled && `- Delivery en ${md(settings.city) || 'la ciudad de la tienda'}${settings.deliveryFeeUSD > 0 ? `: ${formatUSD(settings.deliveryFeeUSD)} por pedido` : ''}.`,
    settings.pickupEnabled && `- Retiro en tienda${settings.pickupAddress ? `: ${md(settings.pickupAddress, 300)}` : ''}.`,
    products.some((p) => p.productType === 'DIGITAL') && '- Los productos digitales (códigos y recargas) no llevan envío: la página de cada uno dice cómo se entrega.',
    '- Hace falta una cuenta para comprar. El precio, la disponibilidad y las condiciones vigentes son los que muestra cada página del producto.',
  ]);

  section('Catálogo', [
    `- [Todos los productos](${site}/productos): ${products.length} ${products.length === 1 ? 'producto publicado' : 'productos publicados'}`,
    `- [Ofertas](${site}/productos?oferta=1)`,
    ...categories.map((c) => `- [${md(c.name)}](${site}/categorias/${c.slug}): ${c.count} ${c.count === 1 ? 'producto' : 'productos'}`),
  ]);

  section('Productos', [
    ...products.slice(0, MAX_PRODUCTS).map(productLine),
    products.length > MAX_PRODUCTS && `- Y ${products.length - MAX_PRODUCTS} más en el [catálogo](${site}/productos).`,
  ]);

  section('Empresas e instituciones', [
    `- [Pedir una cotización](${site}/cotizacion): presupuesto para compras de empresas e instituciones.`,
  ]);

  section('Más', [
    `- [Gift cards](${site}/gift-cards)`,
    `- [Servicios](${site}/servicios)`,
    `- [Solicitar un producto que no está en el catálogo](${site}/solicitar-producto)`,
    `- [Términos y condiciones](${site}/terminos)`,
    `- [Política de privacidad](${site}/privacidad)`,
  ]);

  section('Datos para programas', [
    `- [Sitemap](${site}/sitemap.xml)`,
    `- [Feed de productos (XML)](${site}/feed/productos.xml): productos físicos con precio, disponibilidad y fotos.`,
    '- Cada página de producto lleva datos estructurados de schema.org (Product y Offer) con el precio en USD.',
  ]);

  return `${lines.join('\n')}\n`;
}
