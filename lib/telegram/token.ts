// Token del bot de Telegram cifrado en la base de datos (C-73). Solo servidor.
// AES-256-GCM con una clave derivada de NEXTAUTH_SECRET: si alguien lee la base de datos sin el .env, no
// obtiene el token. Si NEXTAUTH_SECRET cambia, el token deja de descifrarse y hay que pegarlo otra vez.
import crypto from 'crypto';

function key(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET no está configurado');
  return crypto.createHash('sha256').update(`telegram-bot-token:${secret}`).digest();
}

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const [version, iv, tag, data] = value.split(':');
  if (version !== 'v1' || !iv || !tag || !data) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** "123456789:AA…xyz9" → "123456789:••••xyz9" para mostrar en el panel. */
export function maskToken(token: string): string {
  const [id, rest = ''] = token.split(':');
  return `${id}:••••${rest.slice(-4)}`;
}
