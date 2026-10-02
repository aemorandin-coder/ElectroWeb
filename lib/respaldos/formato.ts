// Formato de los respaldos cifrados (C-165). Solo Node: lo usan el servidor y scripts/respaldo-descifrar.ts.
//
// El respaldo se cifra con una clave AES-256 nueva en cada archivo; esa clave se guarda dentro del archivo, envuelta con
// la clave PÚBLICA del dueño (RSA-4096, OAEP con SHA-256). Para abrirlo hace falta la clave PRIVADA, que el servidor no
// conoce: quien robe el servidor, la cuenta de Drive o el archivo no puede leerlo.
//
//   "ESBK1\n" · largo de la clave envuelta (2 bytes) · clave envuelta · IV (12 bytes) · datos cifrados · etiqueta GCM (16 bytes)
//
// La cabecera entra como dato autenticado: si alguien la cambia, el archivo no se abre.
import crypto from 'crypto';
import fs from 'fs';
import { open, rename, rm } from 'fs/promises';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';

const MAGICO = Buffer.from('ESBK1\n', 'latin1');
const LARGO_IV = 12;
const LARGO_ETIQUETA = 16;
const MAX_CLAVE_ENVUELTA = 1024;

export interface ParDeClaves {
  publicKeyPem: string;
  privateKeyPem: string;
  fingerprint: string;
}

/** Huella de una clave pública (SHA-256 del DER), en grupos de 4 para leerla: "A1B2 C3D4 …". */
export function huellaDeClavePublica(publicKeyPem: string): string {
  const der = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
  const hex = crypto.createHash('sha256').update(der).digest('hex').toUpperCase();
  return (hex.slice(0, 32).match(/.{4}/g) ?? []).join(' ');
}

export function generarParDeClaves(): Promise<ParDeClaves> {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      'rsa',
      { modulusLength: 4096, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } },
      (error, publicKeyPem, privateKeyPem) => {
        if (error) return reject(error);
        resolve({ publicKeyPem, privateKeyPem, fingerprint: huellaDeClavePublica(publicKeyPem) });
      },
    );
  });
}

export interface ResultadoCifrado {
  sizeBytes: number;
  md5: string;
}

/** Cifra `origen` hacia `destino` (permisos 0600). Devuelve el tamaño y el MD5 del archivo cifrado, tal como queda en disco. */
export async function cifrarArchivo(origen: string, destino: string, publicKeyPem: string): Promise<ResultadoCifrado> {
  const clavePublica = crypto.createPublicKey(publicKeyPem);
  const claveAes = crypto.randomBytes(32);
  const iv = crypto.randomBytes(LARGO_IV);
  const envuelta = crypto.publicEncrypt({ key: clavePublica, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, claveAes);
  const largo = Buffer.alloc(2);
  largo.writeUInt16BE(envuelta.length);
  const cabecera = Buffer.concat([MAGICO, largo, envuelta, iv]);

  const cifra = crypto.createCipheriv('aes-256-gcm', claveAes, iv);
  cifra.setAAD(cabecera);

  const md5 = crypto.createHash('md5');
  let sizeBytes = 0;
  const contar = new Transform({
    transform(chunk: Buffer, _codificacion, siguiente) {
      md5.update(chunk);
      sizeBytes += chunk.length;
      siguiente(null, chunk);
    },
  });

  async function* cifrado() {
    yield cabecera;
    for await (const trozo of fs.createReadStream(origen)) {
      const c = cifra.update(trozo as Buffer);
      if (c.length) yield c;
    }
    const resto = cifra.final();
    if (resto.length) yield resto;
    yield cifra.getAuthTag();
  }

  try {
    await pipeline(Readable.from(cifrado()), contar, fs.createWriteStream(destino, { mode: 0o600 }));
  } catch (error) {
    await rm(destino, { force: true });
    throw error;
  }
  return { sizeBytes, md5: md5.digest('hex') };
}

/**
 * Descifra `origen` con la clave privada y lo deja en `destino`. Escribe en un archivo parcial y solo lo renombra
 * si la etiqueta GCM coincide: un archivo alterado o una clave equivocada no dejan nada a medias.
 */
export async function descifrarArchivo(origen: string, destino: string, privateKeyPem: string): Promise<void> {
  const archivo = await open(origen, 'r');
  const parcial = `${destino}.parcial`;
  try {
    const { size } = await archivo.stat();
    const inicio = Buffer.alloc(MAGICO.length + 2);
    await archivo.read(inicio, 0, inicio.length, 0);
    if (!inicio.subarray(0, MAGICO.length).equals(MAGICO)) throw new Error('No es un respaldo de ElectroShop (cabecera desconocida).');
    const largoEnvuelta = inicio.readUInt16BE(MAGICO.length);
    if (largoEnvuelta < 1 || largoEnvuelta > MAX_CLAVE_ENVUELTA) throw new Error('Cabecera dañada.');

    const resto = Buffer.alloc(largoEnvuelta + LARGO_IV);
    await archivo.read(resto, 0, resto.length, inicio.length);
    const envuelta = resto.subarray(0, largoEnvuelta);
    const iv = resto.subarray(largoEnvuelta);
    const cabecera = Buffer.concat([inicio, resto]);
    const inicioDatos = cabecera.length;
    if (size < inicioDatos + LARGO_ETIQUETA) throw new Error('El archivo está incompleto.');

    let claveAes: Buffer;
    try {
      claveAes = crypto.privateDecrypt({ key: crypto.createPrivateKey(privateKeyPem), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, envuelta);
    } catch {
      throw new Error('La clave privada no corresponde a este respaldo.');
    }

    const etiqueta = Buffer.alloc(LARGO_ETIQUETA);
    await archivo.read(etiqueta, 0, LARGO_ETIQUETA, size - LARGO_ETIQUETA);
    const descifra = crypto.createDecipheriv('aes-256-gcm', claveAes, iv);
    descifra.setAAD(cabecera);
    descifra.setAuthTag(etiqueta);

    const datos = size === inicioDatos + LARGO_ETIQUETA ? Readable.from([]) : fs.createReadStream(origen, { start: inicioDatos, end: size - LARGO_ETIQUETA - 1 });
    try {
      await pipeline(datos, descifra, fs.createWriteStream(parcial, { mode: 0o600 }));
    } catch {
      throw new Error('El archivo está alterado o incompleto: la comprobación de integridad falló.');
    }
    await rename(parcial, destino);
  } finally {
    await archivo.close();
    await rm(parcial, { force: true });
  }
}
