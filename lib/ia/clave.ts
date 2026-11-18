// C-288 · La clave de la API de Anthropic que se pega en el panel, cifrada en la base de datos. Solo servidor.
// Mismo cifrado que el token del bot de Telegram (lib/telegram/token.ts): AES-256-GCM con una clave derivada de
// NEXTAUTH_SECRET, pero con su propia derivación: aunque alguien sacara una, no abre la otra. Si NEXTAUTH_SECRET cambia, la
// clave guardada deja de descifrarse y hay que pegarla otra vez (la tienda sigue con la del .env mientras tanto).
//
// La clave nunca sale del servidor: ni en una respuesta, ni en el registro, ni en la bitácora. Al panel solo llega
// `enmascarar(clave)`.

import crypto from 'crypto';

function llave(): Buffer {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error('NEXTAUTH_SECRET no está configurado');
  return crypto.createHash('sha256').update(`anthropic-api-key:${secreto}`).digest();
}

export function cifrarClave(clave: string): string {
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv('aes-256-gcm', llave(), iv);
  const cifrado = Buffer.concat([cifrador.update(clave, 'utf8'), cifrador.final()]);
  return ['v1', iv.toString('base64'), cifrador.getAuthTag().toString('base64'), cifrado.toString('base64')].join(':');
}

/** null si no hay nada guardado o no se puede descifrar (se cambió NEXTAUTH_SECRET, o el dato está dañado) */
export function descifrarClave(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const [version, iv, etiqueta, datos] = valor.split(':');
  if (version !== 'v1' || !iv || !etiqueta || !datos) return null;
  try {
    const descifrador = crypto.createDecipheriv('aes-256-gcm', llave(), Buffer.from(iv, 'base64'));
    descifrador.setAuthTag(Buffer.from(etiqueta, 'base64'));
    return Buffer.concat([descifrador.update(Buffer.from(datos, 'base64')), descifrador.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** "sk-ant-api03-…x7Qd" → "sk-ant-…x7Qd": lo único de la clave que llega al panel */
export function enmascarar(clave: string): string {
  return `sk-ant-…${clave.slice(-4)}`;
}

/** Las claves de Anthropic empiezan con "sk-ant-" y no llevan espacios ni saltos de línea */
export function formatoDeClaveValido(clave: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,300}$/.test(clave);
}
