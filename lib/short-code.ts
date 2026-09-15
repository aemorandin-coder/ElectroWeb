import { randomInt } from 'crypto';

/**
 * Códigos de enlace corto de productos: electroshopve.com/p/<código> (C-27).
 * Sin 0/o ni 1/l/i para que se puedan dictar o escribir a mano sin confusión.
 */
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const LENGTH = 6;

interface ShortCodeDb {
  product: {
    findUnique(args: { where: { shortCode: string }; select: { id: true } }): Promise<{ id: string } | null>;
  };
}

export function randomShortCode(): string {
  return Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

/** Código que ningún otro producto usa. Recibe `prisma` o el cliente de una transacción. */
export async function generateShortCode(db: ShortCodeDb): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomShortCode();
    const taken = await db.product.findUnique({ where: { shortCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error('No se pudo generar un código corto único');
}

/** Limpia lo que llega en la URL. Devuelve null si no puede ser un código (la búsqueda ignora mayúsculas). */
export function normalizeShortCode(raw: string): string | null {
  const code = raw.trim();
  return /^[A-Za-z0-9]{2,12}$/.test(code) ? code : null;
}
