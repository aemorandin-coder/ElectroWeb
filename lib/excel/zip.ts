// C-230: un .zip mínimo, para armar un .xlsx sin librerías (un .xlsx es un zip de archivos XML). Solo servidor: comprime
// con zlib de Node. Cada archivo va con deflate, su CRC-32 y su nombre en UTF-8; sin zip64 (un libro del mes pesa unos KB).

import { deflateRawSync } from 'node:zlib';

export interface ArchivoZip {
  nombre: string;
  datos: Buffer | string;
}

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** La fecha y la hora de MS-DOS que lleva cada archivo del zip (desde 1980) */
function fechaDos(d: Date): { fecha: number; hora: number } {
  const anio = Math.min(2107, Math.max(1980, d.getFullYear()));
  return {
    fecha: ((anio - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
  };
}

const UTF8 = 0x0800;
const DEFLATE = 8;
const VERSION = 20;

export function armarZip(archivos: ArchivoZip[], cuando: Date = new Date()): Buffer {
  const { fecha, hora } = fechaDos(cuando);
  const partes: Buffer[] = [];
  const central: Buffer[] = [];
  let desplazamiento = 0;

  for (const a of archivos) {
    const nombre = Buffer.from(a.nombre, 'utf8');
    const crudo = typeof a.datos === 'string' ? Buffer.from(a.datos, 'utf8') : a.datos;
    const comprimido = deflateRawSync(crudo, { level: 9 });
    const crc = crc32(crudo);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(UTF8, 6);
    local.writeUInt16LE(DEFLATE, 8);
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(fecha, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(crudo.length, 22);
    local.writeUInt16LE(nombre.length, 26);
    local.writeUInt16LE(0, 28);
    partes.push(local, nombre, comprimido);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(VERSION, 4);
    c.writeUInt16LE(VERSION, 6);
    c.writeUInt16LE(UTF8, 8);
    c.writeUInt16LE(DEFLATE, 10);
    c.writeUInt16LE(hora, 12);
    c.writeUInt16LE(fecha, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(comprimido.length, 20);
    c.writeUInt32LE(crudo.length, 24);
    c.writeUInt16LE(nombre.length, 28);
    // Extra, comentario, disco y atributos: en cero
    c.writeUInt32LE(desplazamiento, 42);
    central.push(c, nombre);

    desplazamiento += local.length + nombre.length + comprimido.length;
  }

  const directorio = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(archivos.length, 8);
  fin.writeUInt16LE(archivos.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...partes, directorio, fin]);
}
