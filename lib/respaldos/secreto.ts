// Secretos de los respaldos guardados en la base (C-165): el secreto del cliente de Google y el permiso (refresh token)
// de Drive. AES-256-GCM con una clave derivada de NEXTAUTH_SECRET, igual que el token de Telegram y la clave del SMTP.
// Si NEXTAUTH_SECRET cambia dejan de poder leerse y hay que volver a conectar Drive. Solo servidor.
import crypto from 'crypto';

const PREFIJO = 'bk1';

function clave(): Buffer {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error('NEXTAUTH_SECRET no está configurado');
  return crypto.createHash('sha256').update(`respaldos:${secreto}`).digest();
}

export function cifrarSecreto(texto: string): string {
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv('aes-256-gcm', clave(), iv);
  const datos = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
  return [PREFIJO, iv.toString('base64'), cifra.getAuthTag().toString('base64'), datos.toString('base64')].join(':');
}

/** El texto en claro, o null si falta, no tiene el formato o ya no se puede descifrar. */
export function leerSecreto(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith(`${PREFIJO}:`)) return null;
  const [, iv, etiqueta, datos] = valor.split(':');
  if (!iv || !etiqueta || !datos) return null;
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', clave(), Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(etiqueta, 'base64'));
    return Buffer.concat([d.update(Buffer.from(datos, 'base64')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}
