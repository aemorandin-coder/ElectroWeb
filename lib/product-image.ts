// Foto de producto con el sello de la tienda (C-117). Solo en el servidor (usa sharp y el disco).
// Si Andrés sube un PNG con fondo transparente, la tienda arma la foto final: fondo blanco, el producto
// centrado y la cinta "ES" en la esquina inferior derecha, como las que antes armaba a mano.

import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/** Lado de la foto final (cuadrada) */
export const PRODUCT_IMAGE_SIZE = 1200;
/** Aire alrededor del producto, por lado */
const MARGIN = 0.08;
/**
 * La cinta, medida sobre las fotos que Andrés armaba a mano: el cuadro de la cinta mide 0,42 del ancho,
 * empieza en x = 0,665 y a 0,358 del borde de abajo, y se corta en los bordes de la foto.
 */
const BADGE = { size: 0.42, left: 0.665, fromBottom: 0.358 };
const BADGE_FILE = path.join(process.cwd(), 'public', 'images', 'brand', 'cinta-es.png');

let badgeCache: Promise<{ input: Buffer; left: number; top: number }> | null = null;

/** La cinta ya escalada y recortada al borde de la foto (se prepara una vez) */
function badgeOverlay() {
  badgeCache ??= (async () => {
    const S = PRODUCT_IMAGE_SIZE;
    const size = Math.round(S * BADGE.size);
    const left = Math.round(S * BADGE.left);
    const top = Math.round(S - S * BADGE.fromBottom);
    const input = await sharp(await readFile(BADGE_FILE))
      .resize(size, size)
      .extract({ left: 0, top: 0, width: Math.min(size, S - left), height: Math.min(size, S - top) })
      .png()
      .toBuffer();
    return { input, left, top };
  })();
  // Si falla (archivo movido), el próximo intento vuelve a leerlo
  badgeCache.catch(() => {
    badgeCache = null;
  });
  return badgeCache;
}

/** ¿La imagen tiene fondo transparente de verdad? (canal alfa con píxeles transparentes, no solo el canal) */
export async function hasTransparency(buffer: Buffer): Promise<boolean> {
  const img = sharp(buffer);
  const meta = await img.metadata();
  if (!meta.hasAlpha) return false;
  const { channels } = await img.stats();
  return (channels[3]?.min ?? 255) < 250;
}

/** Foto final: fondo blanco, producto centrado (sin el borde transparente que traiga) y la cinta. WebP. */
export async function composeProductImage(buffer: Buffer): Promise<Buffer> {
  const S = PRODUCT_IMAGE_SIZE;
  const inner = Math.round(S * (1 - 2 * MARGIN));
  // trim() quita el borde del color de la esquina: en un PNG transparente, el aire transparente alrededor
  const trimmed = await sharp(buffer).rotate().trim().png().toBuffer();
  const product = await sharp(trimmed).resize(inner, inner, { fit: 'inside', withoutEnlargement: false }).png().toBuffer();
  const { width = inner, height = inner } = await sharp(product).metadata();
  const badge = await badgeOverlay();
  return sharp({ create: { width: S, height: S, channels: 3, background: '#ffffff' } })
    .composite([
      { input: product, left: Math.round((S - width) / 2), top: Math.round((S - height) / 2) },
      badge,
    ])
    .webp({ quality: 90 })
    .toBuffer();
}
