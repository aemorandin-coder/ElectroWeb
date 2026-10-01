// Lo que la tienda le dice a los buscadores, a las redes y a las IA (C-149): direcciones absolutas,
// datos estructurados (schema.org) y códigos de barras. Módulo puro: sin base de datos ni React.
// Regla: aquí no se afirma nada que la tienda no muestre ya en pantalla (ni devoluciones, ni plazos, ni costos de envío).

import type { PublicProduct } from '@/lib/dto/product';
import type { PublicSettings } from '@/lib/site-settings';

export const siteUrl = (): string => (process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com').replace(/\/+$/, '');

/**
 * Dirección absoluta de una página o de un archivo de la tienda.
 * Las fotos nuevas se guardan como /api/uploads/…, y robots.txt cierra /api/: hacia afuera salen por /uploads/…
 * (el mismo archivo, por el rewrite de next.config.js).
 */
export function absoluteUrl(url: string | null | undefined): string | null {
  if (!url || url.startsWith('data:')) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const path = (url.startsWith('/') ? url : `/${url}`).replace(/^\/api\/uploads\//, '/uploads/');
  return `${siteUrl()}${path}`;
}

/** Fotos del producto sin repetir y con dirección absoluta, la principal primero. */
export function productImages(product: Pick<PublicProduct, 'mainImage' | 'images'>): string[] {
  const urls = [product.mainImage, ...product.images].map(absoluteUrl).filter((src): src is string => Boolean(src));
  return [...new Set(urls)];
}

/**
 * Código de barras del fabricante (GTIN: UPC de 12, EAN de 8 o 13, o de 14), solo si es válido.
 * Un código interno escrito a mano no pasa el dígito de control, y los prefijos de uso interno de las tiendas
 * (02, 04 y 2) no identifican un producto fuera de ella: publicarlos como GTIN es un dato falso.
 */
export function validGtin(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/[\s-]/g, '');
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits) || /^0+$/.test(digits)) return null;
  const body = digits.slice(0, -1).split('').reverse();
  const sum = body.reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  if ((10 - (sum % 10)) % 10 !== Number(digits.slice(-1))) return null;
  if (digits.length !== 8) {
    const prefix = digits.padStart(14, '0').slice(1, 4);
    if (/^(02|04|2)/.test(prefix)) return null;
  }
  return digits;
}

/** Texto en una línea, sin espacios repetidos y cortado en una palabra. */
export function plainText(value: string | null | undefined, max: number): string {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max / 2)).trimEnd()}…`;
}

/** Contenido de un <script type="application/ld+json">: sin "<" para que un texto del catálogo no cierre la etiqueta. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

const storeId = () => `${siteUrl()}/#tienda`;

const DAYS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};
const HOUR = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Redes de la tienda que tienen dirección web (las de Configuración → Redes). */
function socialLinks(settings: PublicSettings): string[] {
  const urls = [
    settings.instagram, settings.facebook, settings.twitter, settings.youtube, settings.telegram, settings.tiktok,
    ...settings.socialMedia.filter((s) => s.enabled).map((s) => s.url),
  ].filter((url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url));
  return [...new Set(urls)];
}

/**
 * La tienda como negocio: nombre, RIF, dirección, teléfono, horario y redes, todo de Configuración.
 * Con dirección es una tienda de electrónica con local; sin ella, una tienda en línea.
 */
export function storeJsonLd(settings: PublicSettings): Record<string, unknown> {
  const hasAddress = Boolean(settings.address && settings.city);
  const logo = absoluteUrl(settings.logo);
  const hours = Object.entries(settings.businessHours ?? {})
    .filter(([day, h]) => DAYS[day] && h?.enabled && HOUR.test(h.open) && HOUR.test(h.close))
    .map(([day, h]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${DAYS[day]}`, opens: h.open, closes: h.close }));
  const sameAs = socialLinks(settings);

  return {
    '@context': 'https://schema.org',
    '@type': hasAddress ? 'ElectronicsStore' : 'OnlineStore',
    '@id': storeId(),
    name: settings.companyName,
    legalName: settings.legalName || undefined,
    url: siteUrl(),
    logo: logo ?? undefined,
    image: logo ?? undefined,
    description: settings.tagline || undefined,
    taxID: settings.rif || undefined,
    telephone: settings.phone || settings.whatsapp || undefined,
    email: settings.email || undefined,
    address: hasAddress
      ? {
        '@type': 'PostalAddress',
        streetAddress: settings.address,
        addressLocality: settings.city,
        addressRegion: settings.state || undefined,
        addressCountry: 'VE',
      }
      : undefined,
    openingHoursSpecification: hasAddress && hours.length > 0 ? hours : undefined,
    currenciesAccepted: hasAddress ? 'USD, VES' : undefined,
    areaServed: settings.deliveryEnabled ? { '@type': 'Country', name: 'Venezuela' } : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

/** El sitio y su buscador (/productos?search=). */
export function websiteJsonLd(settings: PublicSettings): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl()}/#sitio`,
    url: siteUrl(),
    name: settings.companyName,
    inLanguage: 'es-VE',
    publisher: { '@id': storeId() },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl()}/productos?search={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Ruta de navegación: [{ name, path }] de la portada hacia adentro. */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl()}${item.path}`,
    })),
  };
}

/** Los productos de una página del catálogo, en el orden en que se ven. */
export function productListJsonLd(name: string, products: Array<Pick<PublicProduct, 'name' | 'slug'>>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name,
      url: `${siteUrl()}/productos/${product.slug}`,
    })),
  };
}

const CONDITION_SCHEMA = { REFURBISHED: 'RefurbishedCondition', OPEN_BOX: 'UsedCondition', USED: 'UsedCondition' } as const;

export interface ProductJsonLdInput {
  product: PublicProduct;
  rating: { average: number; count: number };
  reviews: Array<{ rating: number; comment: string; createdAt: string; userName: string }>;
  /** La tienda envía a todo el país (Configuración → Envíos) */
  deliveryEnabled: boolean;
}

/**
 * Ficha de producto para Google: precio, disponibilidad, condición, marca, código de barras y reseñas.
 * - Un digital con varios montos se publica como un rango (del monto más barato al más caro), no con un precio que nadie paga.
 * - El costo del envío solo se declara cuando es gratis: con cobro a destino el flete lo fija ZOOM o MRW, no la tienda.
 * - Caja abierta ya no está sellada: para Google es "usado" (C-119).
 */
export function productJsonLd({ product, rating, reviews, deliveryEnabled }: ProductJsonLdInput): Record<string, unknown> {
  const url = `${siteUrl()}/productos/${product.slug}`;
  const isDigital = product.productType === 'DIGITAL';
  const inStock = isDigital || product.stock > 0;
  const variantPrices = product.digitalVariants.map((v) => v.priceUSD).filter((n) => n > 0);
  const common = {
    url,
    priceCurrency: 'USD',
    availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`,
    itemCondition: `https://schema.org/${product.condition ? CONDITION_SCHEMA[product.condition.kind] : 'NewCondition'}`,
    seller: { '@id': storeId() },
  };

  const offers = variantPrices.length > 1
    ? {
      '@type': 'AggregateOffer',
      ...common,
      lowPrice: Math.min(...variantPrices).toFixed(2),
      highPrice: Math.max(...variantPrices).toFixed(2),
      offerCount: variantPrices.length,
    }
    : {
      '@type': 'Offer',
      ...common,
      price: (variantPrices[0] ?? product.priceUSD).toFixed(2),
      // Una oferta con fecha de cierre: hasta cuándo vale este precio
      priceValidUntil: product.oferta?.endsAt ? product.oferta.endsAt.slice(0, 10) : undefined,
      shippingDetails: !isDigital && product.freeShipping && deliveryEnabled
        ? {
          '@type': 'OfferShippingDetails',
          shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'USD' },
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'VE' },
        }
        : undefined,
    };

  const images = productImages(product);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#producto`,
    name: product.name,
    description: plainText(product.description, 5000) || undefined,
    image: images.length > 0 ? images : undefined,
    // El mismo identificador del feed de productos y de los eventos de compra (C-145)
    sku: product.id,
    gtin: product.gtin ?? undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    category: product.category.name,
    offers,
    aggregateRating: rating.count > 0
      ? { '@type': 'AggregateRating', ratingValue: rating.average.toFixed(1), reviewCount: rating.count, bestRating: 5, worstRating: 1 }
      : undefined,
    review: reviews.length > 0
      ? reviews.slice(0, 10).map((review) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: review.userName },
        datePublished: review.createdAt.slice(0, 10),
        reviewBody: review.comment ? plainText(review.comment, 1000) : undefined,
        reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 },
      }))
      : undefined,
  };
}
