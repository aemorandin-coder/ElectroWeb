// Servidor de correo (SMTP) configurado en el panel: lo que lo protege (C-160). Solo servidor.
// - La contraseña se guarda cifrada (AES-256-GCM, clave derivada de NEXTAUTH_SECRET, como el token de Telegram y el
//   secreto de los dos pasos). Una contraseña guardada antes de C-160 en texto plano se sigue leyendo y se cifra sola
//   la primera vez que se usa. Si NEXTAUTH_SECRET cambia, deja de descifrarse y hay que escribirla otra vez.
// - La conexión verifica el certificado del servidor. Solo `SMTP_ALLOW_SELF_SIGNED=true` en el .env lo desactiva,
//   para un servidor propio con certificado autofirmado (antes se desactivaba siempre).
import crypto from 'crypto';

const PREFIJO = 'smtp1';

function clave(): Buffer {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error('NEXTAUTH_SECRET no está configurado');
  return crypto.createHash('sha256').update(`smtp-password:${secreto}`).digest();
}

export function claveSmtpCifrada(valor: string | null | undefined): boolean {
  return Boolean(valor && valor.startsWith(`${PREFIJO}:`));
}

export function cifrarClaveSmtp(texto: string): string {
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv('aes-256-gcm', clave(), iv);
  const datos = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
  return [PREFIJO, iv.toString('base64'), cifra.getAuthTag().toString('base64'), datos.toString('base64')].join(':');
}

/** La contraseña en claro. Una guardada sin cifrar (de antes de C-160) se devuelve tal cual; null si no se puede leer. */
export function leerClaveSmtp(valor: string | null | undefined): string | null {
  if (!valor) return null;
  if (!claveSmtpCifrada(valor)) return valor;
  const [, iv, tag, datos] = valor.split(':');
  if (!iv || !tag || !datos) return null;
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', clave(), Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(datos, 'base64')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Opciones TLS de nodemailer: el certificado se verifica salvo que el .env diga lo contrario. */
export function opcionesTlsSmtp(): { rejectUnauthorized: false } | Record<string, never> {
  return process.env.SMTP_ALLOW_SELF_SIGNED === 'true' ? { rejectUnauthorized: false } : {};
}
