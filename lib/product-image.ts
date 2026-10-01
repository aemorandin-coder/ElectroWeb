// Foto de producto con el sello de la tienda (C-117). Solo en el servidor (usa sharp y el disco).
// Si Andrés sube una foto con fondo transparente (o, desde C-133, con fondo blanco liso), la tienda arma la foto
// final: fondo blanco, el producto centrado y la cinta "ES" en la esquina inferior derecha, como las que antes armaba a mano.

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
/**
 * C-162: el borde de arriba de la franja, medido en `cinta-es.png` (en fracciones de su cuadro): toca el lado
 * izquierdo del cuadro a 0,6898 de su alto y baja con esa pendiente. Como el cuadro se corta por abajo, la franja
 * llegaba a su lado izquierdo antes que al borde de la foto y terminaba en un corte vertical. En las fotos que Andrés
 * armaba a mano la franja sigue en diagonal hasta el borde de abajo: ese tramo se dibuja aparte, del mismo azul.
 */
const FRANJA = { enIzquierda: 0.6898, pendiente: -0.8693, color: 'rgb(34,86,220)' };

let badgeCache: Promise<Array<{ input: Buffer; left: number; top: number }>> | null = null;

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
    // El tramo de la franja a la izquierda del cuadro: un triángulo hasta el borde de abajo de la foto.
    // Entra 2 px en el cuadro para que no quede una línea entre las dos piezas
    const solape = 2;
    const yEnCuadro = top + FRANJA.enIzquierda * size;
    const xAbajo = left + (S - yEnCuadro) / FRANJA.pendiente;
    const puntos = [
      [left + solape, yEnCuadro + FRANJA.pendiente * solape],
      [xAbajo, S],
      [left + solape, S],
    ].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const tramo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><polygon points="${puntos}" fill="${FRANJA.color}"/></svg>`);
    return [{ input: tramo, left: 0, top: 0 }, { input, left, top }];
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

/**
 * C-133: ¿la foto ya viene con fondo blanco liso? (la del proveedor, o una exportada sin transparencia)
 * Se mira el borde de una copia chica: casi todo tiene que ser blanco. Una foto que ya trae la cinta hecha a mano no
 * pasa, porque la cinta toca el borde de abajo y el de la derecha (~17 % del borde); una foto sobre una mesa o de
 * ambiente tampoco. Antes solo se armaba la foto con fondo transparente y la de Andrés del 30/09 (Audífonos Piston,
 * PNG sin transparencia y fondo blanco) quedó sin cinta.
 */
export async function hasPlainWhiteBackground(buffer: Buffer): Promise<boolean> {
  const LADO = 200;
  const ANILLO = 3;
  const { data, info } = await sharp(buffer)
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize(LADO, LADO, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let borde = 0;
  let blancos = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (x >= ANILLO && y >= ANILLO && x < info.width - ANILLO && y < info.height - ANILLO) continue;
      const i = (y * info.width + x) * info.channels;
      borde++;
      if (Math.min(data[i], data[i + 1], data[i + 2]) >= 240) blancos++;
    }
  }
  return borde > 0 && blancos / borde >= 0.97;
}

/**
 * Foto final: fondo blanco, producto centrado (sin el borde transparente que traiga) y la cinta. WebP.
 * C-161: con `cinta: false` se arma el mismo marco sin la cinta, para los productos usados (que no la llevan, C-119).
 * Antes un usado con la foto recortada quedaba tal cual: pegada a los bordes de la tarjeta y sin aire alrededor.
 */
export async function composeProductImage(buffer: Buffer, { cinta = true }: { cinta?: boolean } = {}): Promise<Buffer> {
  const S = PRODUCT_IMAGE_SIZE;
  const inner = Math.round(S * (1 - 2 * MARGIN));
  // trim() quita el borde del color de la esquina: en un PNG transparente, el aire transparente alrededor
  const trimmed = await sharp(buffer).rotate().trim().png().toBuffer();
  const product = await sharp(trimmed).resize(inner, inner, { fit: 'inside', withoutEnlargement: false }).png().toBuffer();
  const { width = inner, height = inner } = await sharp(product).metadata();
  const capas: sharp.OverlayOptions[] = [{ input: product, left: Math.round((S - width) / 2), top: Math.round((S - height) / 2) }];
  if (cinta) capas.push(...(await badgeOverlay()));
  return sharp({ create: { width: S, height: S, channels: 3, background: '#ffffff' } })
    .composite(capas)
    .webp({ quality: 90 })
    .toBuffer();
}
