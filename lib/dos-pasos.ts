// Verificación en dos pasos del panel (C-141): códigos de 6 dígitos de una app (Google Authenticator, Authy…),
// según RFC 6238 (TOTP, SHA-1, 30 s), más 10 códigos de respaldo de un solo uso. Decisión de Andrés del 30/09.
// Solo servidor: el secreto se guarda cifrado y los códigos de respaldo como HMAC.

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { qrSvg } from '@/lib/qr';
import { prisma } from '@/lib/prisma';

const PASO_S = 30;
const DIGITOS = 6;
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
// Códigos de respaldo: se copian a mano, así que sin I, L, O, U, 0 ni 1 (30 símbolos, 8 por código: unos 39 bits)
const ALFABETO_RESPALDO = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

/* ── Cifrado del secreto (AES-256-GCM, clave derivada de NEXTAUTH_SECRET, como el token de Telegram) ── */

function clave(): Buffer {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error('NEXTAUTH_SECRET no está configurado');
  return createHash('sha256').update(`dos-pasos:${secreto}`).digest();
}

function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', clave(), iv);
  const datos = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), datos.toString('base64')].join(':');
}

function descifrar(valor: string): string | null {
  const [version, iv, tag, datos] = valor.split(':');
  if (version !== 'v1' || !iv || !tag || !datos) return null;
  try {
    const d = createDecipheriv('aes-256-gcm', clave(), Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(datos, 'base64')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/* ── TOTP ── */

function aBase32(buf: Buffer): string {
  let bits = 0;
  let valor = 0;
  let salida = '';
  for (const byte of buf) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) salida += ALFABETO[(valor << (5 - bits)) & 31];
  return salida;
}

function deBase32(texto: string): Buffer {
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const letra of texto.replace(/=+$/, '').toUpperCase()) {
    const i = ALFABETO.indexOf(letra);
    if (i < 0) continue;
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** El código de 6 dígitos de un intervalo de 30 s (exportado para las pruebas). */
export function codigoDelPaso(secretoBase32: string, paso: number): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(paso));
  const hmac = createHmac('sha1', deBase32(secretoBase32)).update(contador).digest();
  const desde = hmac[hmac.length - 1] & 0x0f;
  const numero = (hmac.readUInt32BE(desde) & 0x7fffffff) % 10 ** DIGITOS;
  return String(numero).padStart(DIGITOS, '0');
}

export const pasoActual = (ahora = Date.now()) => Math.floor(ahora / 1000 / PASO_S);

/** El paso que coincide (tolera 30 s de desfase del reloj del teléfono) y es posterior al último usado. */
function pasoValido(secretoBase32: string, codigo: string, ultimoPaso: number): number | null {
  if (!/^\d{6}$/.test(codigo)) return null;
  const ahora = pasoActual();
  for (const paso of [ahora - 1, ahora, ahora + 1]) {
    if (paso <= ultimoPaso) continue;
    const esperado = Buffer.from(codigoDelPaso(secretoBase32, paso));
    if (timingSafeEqual(esperado, Buffer.from(codigo))) return paso;
  }
  return null;
}

/* ── Códigos de respaldo ── */

function huellaRespaldo(codigo: string): string {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error('NEXTAUTH_SECRET no está configurado');
  return createHmac('sha256', `respaldo-dos-pasos:${secreto}`).update(codigo.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
}

function nuevosCodigosRespaldo(): { codigos: string[]; huellas: string[] } {
  const codigos = Array.from({ length: 10 }, () => {
    const t = Array.from({ length: 8 }, () => ALFABETO_RESPALDO[randomInt(ALFABETO_RESPALDO.length)]).join('');
    return `${t.slice(0, 4)}-${t.slice(4)}`;
  });
  return { codigos, huellas: codigos.map(huellaRespaldo) };
}

/* ── Operaciones ── */

export async function estadoDosPasos(userId: string) {
  const f = await prisma.segundoFactor.findUnique({ where: { userId }, select: { activadoAt: true, codigosRespaldo: true } });
  return { activo: Boolean(f?.activadoAt), activadoAt: f?.activadoAt ?? null, codigosRestantes: f?.activadoAt ? f.codigosRespaldo.length : 0 };
}

/** Empieza (o reinicia) la configuración: devuelve el QR, la clave para escribir a mano y el enlace para el teléfono. */
export async function iniciarDosPasos(userId: string, correo: string) {
  const actual = await prisma.segundoFactor.findUnique({ where: { userId }, select: { activadoAt: true } });
  if (actual?.activadoAt) return null; // ya activo: no se cambia sin reiniciarlo desde Equipo
  const secreto = aBase32(randomBytes(20));
  await prisma.segundoFactor.upsert({
    where: { userId },
    create: { userId, secreto: cifrar(secreto), codigosRespaldo: [] },
    update: { secreto: cifrar(secreto), codigosRespaldo: [], ultimoPaso: 0 },
  });
  const emisor = 'Electro Shop';
  const uri = `otpauth://totp/${encodeURIComponent(`${emisor}:${correo}`)}?secret=${secreto}&issuer=${encodeURIComponent(emisor)}&algorithm=SHA1&digits=${DIGITOS}&period=${PASO_S}`;
  return { uri, clave: secreto.match(/.{1,4}/g)!.join(' '), qr: qrSvg(uri) };
}

/** Confirma con el primer código: activa y devuelve los códigos de respaldo (se muestran una sola vez). */
export async function activarDosPasos(userId: string, codigo: string): Promise<string[] | null> {
  const f = await prisma.segundoFactor.findUnique({ where: { userId } });
  if (!f || f.activadoAt) return null;
  const secreto = descifrar(f.secreto);
  const paso = secreto ? pasoValido(secreto, codigo.replace(/\s/g, ''), f.ultimoPaso) : null;
  if (paso === null) return null;
  const { codigos, huellas } = nuevosCodigosRespaldo();
  const r = await prisma.segundoFactor.updateMany({
    where: { userId, activadoAt: null },
    data: { activadoAt: new Date(), ultimoPaso: paso, codigosRespaldo: huellas },
  });
  return r.count === 1 ? codigos : null;
}

/**
 * ¿Es válido este código para entrar? Acepta el de la app o uno de respaldo (que se gasta).
 * El de la app no sirve dos veces: se guarda el último intervalo usado.
 */
export async function verificarCodigo(userId: string, codigo: string): Promise<boolean> {
  const f = await prisma.segundoFactor.findUnique({ where: { userId } });
  if (!f?.activadoAt) return false;
  const limpio = codigo.trim();
  if (/^\d{3}\s?\d{3}$/.test(limpio)) {
    const secreto = descifrar(f.secreto);
    const paso = secreto ? pasoValido(secreto, limpio.replace(/\s/g, ''), f.ultimoPaso) : null;
    if (paso === null) return false;
    const r = await prisma.segundoFactor.updateMany({ where: { userId, ultimoPaso: f.ultimoPaso }, data: { ultimoPaso: paso } });
    return r.count === 1;
  }
  const huella = huellaRespaldo(limpio);
  if (!f.codigosRespaldo.includes(huella)) return false;
  // Se gasta solo si la lista no cambió entre medio (dos entradas a la vez con el mismo código: una gana)
  const r = await prisma.segundoFactor.updateMany({
    where: { userId, codigosRespaldo: { equals: f.codigosRespaldo } },
    data: { codigosRespaldo: f.codigosRespaldo.filter((h) => h !== huella) },
  });
  return r.count === 1;
}

/** Códigos de respaldo nuevos (los anteriores dejan de servir). Pide un código de la app. */
export async function regenerarRespaldo(userId: string, codigo: string): Promise<string[] | null> {
  if (!/^\d{3}\s?\d{3}$/.test(codigo.trim()) || !(await verificarCodigo(userId, codigo))) return null;
  const { codigos, huellas } = nuevosCodigosRespaldo();
  await prisma.segundoFactor.update({ where: { userId }, data: { codigosRespaldo: huellas } });
  return codigos;
}

/** Borra la configuración: la próxima vez que entre tendrá que configurarla otra vez. */
export async function reiniciarDosPasos(userId: string): Promise<void> {
  await prisma.segundoFactor.deleteMany({ where: { userId } });
}
