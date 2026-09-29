// Solicitudes de garantía (C-122): lo que necesita el servidor. Las reglas y los textos están en lib/warranty.ts.

import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { detectFileType } from '@/lib/file-signature';
import { WARRANTY_PHOTOS_DIR, warrantyPhotoOwner } from '@/lib/private-uploads';
import { createNotification } from '@/lib/notifications';
import { sendWarrantyUpdateEmail } from '@/lib/email-service';
import { CLAIM_STATUS_CUSTOMER, CLAIM_STATUS_HELP, claimCode, WARRANTY_MAX_PHOTOS, type ClaimStatus } from '@/lib/warranty';

const PHOTO_URL_PREFIX = '/api/uploads/warranty/';
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/**
 * Guarda una foto del cliente fuera de public/. Se vuelve a codificar como JPEG de hasta 2000 px: pesa menos y pierde
 * los datos EXIF (las fotos del teléfono pueden traer la ubicación de la casa).
 */
export async function saveWarrantyPhoto(userId: string, file: File): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_PHOTO_BYTES) return { error: 'La foto pesa más de 8 MB' };
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = detectFileType(buffer);
  if (type !== 'jpg' && type !== 'png' && type !== 'webp') return { error: 'La foto tiene que ser JPG, PNG o WebP' };
  const jpeg = await sharp(buffer)
    .rotate()
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
    .catch(() => null);
  if (!jpeg) return { error: 'No se pudo leer la foto' };
  await mkdir(WARRANTY_PHOTOS_DIR, { recursive: true });
  const name = `garantia-${userId}-${Date.now()}-${randomBytes(4).toString('hex')}.jpg`;
  await writeFile(path.join(WARRANTY_PHOTOS_DIR, name), jpeg);
  return { url: `${PHOTO_URL_PREFIX}${name}` };
}

/** Fotos que manda el cliente con un mensaje: solo las suyas, ya subidas, hasta 4. null si alguna no vale */
export function parseCustomerPhotos(input: unknown, userId: string): string[] | null {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input) || input.length > WARRANTY_MAX_PHOTOS) return null;
  const urls: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string' || !item.startsWith(PHOTO_URL_PREFIX)) return null;
    const name = item.slice(PHOTO_URL_PREFIX.length);
    if (warrantyPhotoOwner(name) !== userId || !existsSync(path.join(WARRANTY_PHOTOS_DIR, name))) return null;
    urls.push(item);
  }
  return [...new Set(urls)];
}

export const photosToJson = (urls: string[]): string | null => (urls.length > 0 ? JSON.stringify(urls) : null);

export function photosFromJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Aviso al cliente (campana y correo) cuando el equipo responde o cambia el estado. Nunca por una nota interna */
export async function notifyCustomer(claim: {
  id: string;
  number: number;
  userId: string;
  productName: string;
  status: ClaimStatus;
  user: { name: string | null; email: string | null };
}, message: string | null) {
  const code = claimCode(claim.number);
  await createNotification({
    userId: claim.userId,
    type: 'WARRANTY_UPDATE',
    title: `Garantía ${code}: ${CLAIM_STATUS_CUSTOMER[claim.status]}`,
    message: message ? message.slice(0, 180) : CLAIM_STATUS_HELP[claim.status],
    link: `/customer/warranty?solicitud=${claim.id}`,
    icon: 'shield',
  });
  if (claim.user.email) {
    await sendWarrantyUpdateEmail(claim.user.email, {
      customerName: claim.user.name || 'Cliente',
      code,
      productName: claim.productName,
      status: CLAIM_STATUS_CUSTOMER[claim.status],
      statusHelp: CLAIM_STATUS_HELP[claim.status],
      message,
    }).catch((error) => console.error('[WARRANTY] Error enviando correo:', error));
  }
}
