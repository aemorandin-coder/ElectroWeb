// Feed de productos (C-149): RSS 2.0 con los campos "g:" que leen el catálogo de Meta (Instagram y Facebook)
// y Google Merchant Center. Módulo puro: recibe el DTO público y devuelve el XML.
//
// Qué entra: productos físicos visibles, con precio y con foto. Los digitales (gift cards y recargas) quedan fuera:
// las políticas de comercio de Meta y de Google restringen la venta de moneda virtual y de códigos digitales.
// El `g:id` es el id del producto: el mismo que mandan los eventos de compra (C-145), para que un anuncio de catálogo
// sepa qué producto se vio y cuál se compró.

import type { PublicProduct } from '@/lib/dto/product';
import { plainText, productImages, siteUrl } from '@/lib/seo';

/** Texto dentro de una etiqueta XML: escapado y sin caracteres de control que XML 1.0 no admite. */
export function xmlText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const money = (amount: number) => `${amount.toFixed(2)} USD`;
const tag = (name: string, value: string | null | undefined) => (value ? `      <${name}>${xmlText(value)}</${name}>\n` : '');

const CONDITION = { REFURBISHED: 'refurbished', OPEN_BOX: 'used', USED: 'used' } as const;

/** ¿El producto puede ir en el feed? Físico, con precio y con al menos una foto. */
export function feedEligible(product: PublicProduct): boolean {
  return product.productType === 'PHYSICAL' && product.priceUSD > 0 && productImages(product).length > 0;
}

function feedItem(product: PublicProduct, deliveryEnabled: boolean): string {
  const [image, ...moreImages] = productImages(product);
  const regular = product.compareAtPriceUSD && product.compareAtPriceUSD > product.priceUSD ? product.compareAtPriceUSD : product.priceUSD;
  const onSale = regular > product.priceUSD;

  return [
    '    <item>\n',
    tag('g:id', product.id),
    tag('title', plainText(product.name, 150)),
    tag('description', plainText(product.description, 5000) || product.name),
    tag('link', `${siteUrl()}/productos/${product.slug}`),
    tag('g:image_link', image),
    ...moreImages.slice(0, 10).map((url) => tag('g:additional_image_link', url)),
    tag('g:availability', product.stock > 0 ? 'in stock' : 'out of stock'),
    // El precio publicado ya lleva el IVA (C-146). Con rebaja: el precio de antes y el de hoy, como en la ficha
    tag('g:price', money(regular)),
    onSale ? tag('g:sale_price', money(product.priceUSD)) : '',
    tag('g:condition', product.condition ? CONDITION[product.condition.kind] : 'new'),
    tag('g:brand', product.brand?.name),
    tag('g:gtin', product.gtin),
    tag('g:product_type', product.category.name),
    // El envío solo se declara cuando lo paga la tienda: con cobro a destino el flete lo fija ZOOM o MRW
    product.freeShipping && deliveryEnabled
      ? '      <g:shipping>\n        <g:country>VE</g:country>\n        <g:price>0.00 USD</g:price>\n      </g:shipping>\n'
      : '',
    '    </item>\n',
  ].join('');
}

export function buildProductFeed(products: PublicProduct[], store: { name: string; description: string | null; deliveryEnabled: boolean }): string {
  const items = products.filter(feedEligible).map((product) => feedItem(product, store.deliveryEnabled)).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n'
    + '  <channel>\n'
    + `    <title>${xmlText(store.name)}</title>\n`
    + `    <link>${xmlText(siteUrl())}</link>\n`
    + `    <description>${xmlText(store.description || `Catálogo de ${store.name}`)}</description>\n`
    + items
    + '  </channel>\n'
    + '</rss>\n'
  );
}
