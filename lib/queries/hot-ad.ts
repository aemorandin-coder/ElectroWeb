// Popup promocional del home (C-25). Solo servidor.
// La imagen puede estar guardada como archivo (/uploads/...) o, en datos viejos, como base64 dentro de la BD.
// El base64 nunca se manda en el HTML: se sirve como archivo desde /api/public/hot-ad-image con una versión.

import { createHash } from 'crypto';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';

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

export const HOT_AD_IMAGE_ROUTE = '/api/public/hot-ad-image';

export const getHotAd = cache(async (): Promise<HotAd | null> => {
  const row = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: {
      hotAdEnabled: true, hotAdImage: true, hotAdLink: true, hotAdTransparentBg: true, hotAdShadowEnabled: true,
      hotAdShadowBlur: true, hotAdShadowOpacity: true, hotAdBackdropOpacity: true, hotAdBackdropColor: true,
    },
  });
  if (!row?.hotAdEnabled || !row.hotAdImage) return null;

  const raw = row.hotAdImage.trim();
  let image: string | null = null;
  if (raw.startsWith('data:')) {
    image = parseImageDataUri(raw) ? `${HOT_AD_IMAGE_ROUTE}?v=${imageVersion(raw)}` : null;
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
