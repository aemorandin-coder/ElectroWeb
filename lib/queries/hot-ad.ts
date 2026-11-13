// Popup promocional del home (C-25). Solo servidor.
// La imagen puede estar guardada como archivo (/uploads/...) o, en datos viejos, como base64 dentro de la BD.
// El base64 nunca se manda en el HTML: se sirve como archivo desde /api/public/hot-ad-image/<versión>.
// C-207: el saludo navideño ya no es un popup: es una franja del inicio (getSaludoNavidad).

import { createHash } from 'crypto';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { navidadActiva, TARJETA_NAVIDAD, varianteGorro, type TarjetaNavidadDatos, type VarianteGorro } from '@/lib/navidad';

export interface HotAd {
  /** URL de la imagen (archivo subido o la ruta que sirve el base64) */
  image: string;
  link: string | null;
  transparentBg: boolean;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowOpacity: number;
  backdropOpacity: number;
  backdropColor: string;
}

/** C-207: el saludo navideño del inicio (la franja que reemplazó a la tarjeta del popup), con su gorro */
export type SaludoNavidad = TarjetaNavidadDatos & { gorro: VarianteGorro };

// Solo formatos raster: un SVG servido desde el mismo dominio podría ejecutar scripts si se abre directo
const DATA_URI = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/;

export function parseImageDataUri(value: string): { mime: string; bytes: Buffer } | null {
  const match = DATA_URI.exec(value);
  if (!match) return null;
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  return bytes.length > 0 ? { mime: match[1], bytes } : null;
}

/** Versión corta de la imagen: cambia cuando el admin sube otra (y el popup vuelve a salir). */
export function imageVersion(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

// La versión va en la ruta y no en ?v=: Next 16 no optimiza imágenes locales con query string (C-23b)
export const HOT_AD_IMAGE_ROUTE = '/api/public/hot-ad-image';

/** Imagen base64 del popup lista para servir, o null si no hay popup activo con base64. */
export async function readHotAdImage(): Promise<{ mime: string; bytes: Buffer; version: string } | null> {
  const row = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: { hotAdEnabled: true, hotAdImage: true },
  });
  const raw = row?.hotAdEnabled ? row.hotAdImage?.trim() : null;
  const parsed = raw ? parseImageDataUri(raw) : null;
  return raw && parsed ? { ...parsed, version: imageVersion(raw) } : null;
}

const leerPromociones = cache(() =>
  prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: {
      hotAdEnabled: true, hotAdImage: true, hotAdLink: true, hotAdTransparentBg: true, hotAdShadowEnabled: true,
      hotAdShadowBlur: true, hotAdShadowOpacity: true, hotAdBackdropOpacity: true, hotAdBackdropColor: true,
      christmasTheme: true, christmasThemeFrom: true, christmasThemeUntil: true, christmasHat: true, christmasPopup: true,
      christmasPopupTitle: true, christmasPopupText: true, christmasPopupButton: true, christmasPopupLink: true,
    },
  })
);

/**
 * C-207: el saludo navideño va en una franja dentro del inicio y ya no tapa la tienda (Andrés, 13/11: "déjala como
 * franja"). Sale mientras el tema se ve y con "La franja navideña" elegida en Marketing → Navidad; si no, null.
 */
export const getSaludoNavidad = cache(async (): Promise<SaludoNavidad | null> => {
  const row = await leerPromociones();
  if (!row?.christmasPopup || !navidadActiva(row)) return null;
  return {
    titulo: row.christmasPopupTitle || TARJETA_NAVIDAD.titulo,
    mensaje: row.christmasPopupText || TARJETA_NAVIDAD.mensaje,
    boton: row.christmasPopupButton || TARJETA_NAVIDAD.boton,
    enlace: row.christmasPopupLink || TARJETA_NAVIDAD.enlace,
    gorro: varianteGorro(row.christmasHat),
  };
});

export const getHotAd = cache(async (): Promise<HotAd | null> => {
  const row = await leerPromociones();
  // Mientras sale el saludo navideño, la imagen del popup no sale (como cuando era la tarjeta, C-186): nada tapa la tienda
  if (!row?.hotAdEnabled || !row.hotAdImage || (row.christmasPopup && navidadActiva(row))) return null;

  const raw = row.hotAdImage.trim();
  let image: string | null = null;
  if (raw.startsWith('data:')) {
    image = parseImageDataUri(raw) ? `${HOT_AD_IMAGE_ROUTE}/${imageVersion(raw)}` : null;
  } else if ((raw.startsWith('/') && !raw.startsWith('//')) || raw.startsWith('https://')) {
    image = raw;
  }
  if (!image) return null;

  return {
    image,
    link: row.hotAdLink,
    transparentBg: row.hotAdTransparentBg ?? false,
    shadowEnabled: row.hotAdShadowEnabled ?? true,
    shadowBlur: row.hotAdShadowBlur ?? 20,
    shadowOpacity: row.hotAdShadowOpacity ?? 50,
    backdropOpacity: row.hotAdBackdropOpacity ?? 70,
    backdropColor: row.hotAdBackdropColor || '#000000',
  };
});
