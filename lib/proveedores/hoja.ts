// C-196: leer la primera hoja de un Excel (.xls o .xlsx) o un .csv en el navegador, sin librerías: la lista de un
// proveedor llega como sale de su sistema (la ferretería exporta .xls de Excel 97). Devuelve las filas como celdas
// (texto, número o booleano). Módulo puro: también corre en Node para las pruebas.
//
// - .xls: archivo compuesto (CFB) con el libro en formato BIFF8. Se leen la tabla de textos (SST) y las celdas de la
//   primera hoja (LABELSST, LABEL, NUMBER, RK, MULRK, FORMULA, BOOLERR).
// - .xlsx: un zip; se descomprime con DecompressionStream y se leen sharedStrings.xml y la primera hoja.
// - .csv: separado por ; , o tabulador, con comillas. UTF-8, o Windows-1252 si no es UTF-8 válido.
// Todo lleva topes: un archivo roto da error, no un ciclo sin fin.

export type Celda = string | number | boolean | null;

const FILAS_MAX = 25_000;
const COLUMNAS_MAX = 256;

export class ErrorHoja extends Error {}

/** La primera hoja del archivo. El tipo sale de sus primeros bytes, no del nombre. */
export async function leerHoja(datos: ArrayBuffer): Promise<Celda[][]> {
  const b = new Uint8Array(datos);
  if (b.length >= 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return leerXls(b);
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return leerXlsx(b);
  return leerCsv(b);
}

function poner(filas: Celda[][], fila: number, col: number, valor: Celda) {
  if (fila < 0 || fila >= FILAS_MAX || col < 0 || col >= COLUMNAS_MAX) return;
  while (filas.length <= fila) filas.push([]);
  const f = filas[fila];
  while (f.length < col) f.push(null);
  f[col] = valor;
}

/* ------------------------------------------------------------------ .xls (CFB + BIFF8) */

const FIN_CADENA = 0xfffffffe;

function leerCfb(b: Uint8Array): Map<string, Uint8Array> {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length < 512) throw new ErrorHoja('El archivo está incompleto');
  const tamSector = 1 << v.getUint16(0x1e, true);
  const tamMini = 1 << v.getUint16(0x20, true);
  if (tamSector !== 512 && tamSector !== 4096) throw new ErrorHoja('Formato de Excel desconocido');
  const sectores = Math.floor((b.length - tamSector) / tamSector);
  const sector = (n: number) => {
    if (n < 0 || n >= sectores) throw new ErrorHoja('El archivo está dañado');
    return b.subarray((n + 1) * tamSector, (n + 2) * tamSector);
  };
  // La tabla de sectores (FAT): los primeros 109 en la cabecera y el resto en la cadena DIFAT
  const sectoresFat: number[] = [];
  for (let i = 0; i < 109; i++) {
    const s = v.getUint32(0x4c + i * 4, true);
    if (s < 0xfffffffa) sectoresFat.push(s);
  }
  let difat = v.getUint32(0x44, true);
  for (let vuelta = 0; difat < 0xfffffffa && vuelta < 10_000; vuelta++) {
    const d = sector(difat);
    const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
    for (let i = 0; i < tamSector / 4 - 1; i++) {
      const s = dv.getUint32(i * 4, true);
      if (s < 0xfffffffa) sectoresFat.push(s);
    }
    difat = dv.getUint32(tamSector - 4, true);
  }
  const fat: number[] = [];
  for (const s of sectoresFat) {
    const d = sector(s);
    const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
    for (let i = 0; i < tamSector / 4; i++) fat.push(dv.getUint32(i * 4, true));
  }
  const cadena = (inicio: number, tabla: number[], limite: number): number[] => {
    const out: number[] = [];
    for (let s = inicio; s !== FIN_CADENA && s < 0xfffffffa; s = tabla[s] ?? FIN_CADENA) {
      out.push(s);
      if (out.length > limite) throw new ErrorHoja('El archivo está dañado');
    }
    return out;
  };
  const leerFlujo = (inicio: number, tam: number) => {
    const partes = cadena(inicio, fat, sectores);
    const out = new Uint8Array(partes.length * tamSector);
    partes.forEach((s, i) => out.set(sector(s), i * tamSector));
    return out.subarray(0, Math.min(tam, out.length));
  };
  // El directorio: nombre (UTF-16), tipo, primer sector y tamaño de cada flujo
  const dir = leerFlujo(v.getUint32(0x30, true), Number.MAX_SAFE_INTEGER);
  const dv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
  const entradas: Array<{ nombre: string; tipo: number; inicio: number; tam: number }> = [];
  for (let o = 0; o + 128 <= dir.length; o += 128) {
    const largo = Math.min(dv.getUint16(o + 0x40, true), 64);
    let nombre = '';
    for (let i = 0; i + 2 < largo; i += 2) nombre += String.fromCharCode(dv.getUint16(o + i, true));
    entradas.push({ nombre, tipo: dir[o + 0x42], inicio: dv.getUint32(o + 0x74, true), tam: dv.getUint32(o + 0x78, true) });
  }
  const raiz = entradas.find((e) => e.tipo === 5);
  const corte = v.getUint32(0x38, true) || 4096;
  // Los flujos chicos viven en el "mini flujo" de la raíz, en sectores de 64 bytes
  let mini: Uint8Array | null = null;
  let miniFat: number[] | null = null;
  const flujos = new Map<string, Uint8Array>();
  for (const e of entradas) {
    if (e.tipo !== 2) continue;
    if (e.tam >= corte) { flujos.set(e.nombre, leerFlujo(e.inicio, e.tam)); continue; }
    if (!raiz) continue;
    mini ??= leerFlujo(raiz.inicio, raiz.tam);
    if (!miniFat) {
      const m = leerFlujo(v.getUint32(0x3c, true), v.getUint32(0x40, true) * tamSector);
      const mv = new DataView(m.buffer, m.byteOffset, m.byteLength);
      miniFat = Array.from({ length: m.length / 4 }, (_, i) => mv.getUint32(i * 4, true));
    }
    const partes = cadena(e.inicio, miniFat, Math.ceil(mini.length / tamMini) + 1);
    const out = new Uint8Array(partes.length * tamMini);
    partes.forEach((s, i) => out.set(mini!.subarray(s * tamMini, (s + 1) * tamMini), i * tamMini));
    flujos.set(e.nombre, out.subarray(0, e.tam));
  }
  return flujos;
}

/** Un número RK de Excel: entero de 30 bits o los 30 bits altos de un double, quizás dividido entre 100 */
function rk(valor: number): number {
  let n: number;
  if (valor & 0x02) {
    n = valor >> 2;
  } else {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setUint32(4, valor & 0xfffffffc, true);
    dv.setUint32(0, 0, true);
    n = dv.getFloat64(0, true);
  }
  return valor & 0x01 ? n / 100 : n;
}

/** Caracteres de un texto BIFF8: comprimidos (Latin-1, un byte) o UTF-16 */
function caracteres(b: Uint8Array, o: number, cuantos: number, anchos: boolean): string {
  let s = '';
  if (anchos) for (let i = 0; i < cuantos; i++) s += String.fromCharCode(b[o + 2 * i] | (b[o + 2 * i + 1] << 8));
  else for (let i = 0; i < cuantos; i++) s += String.fromCharCode(b[o + i]);
  return s;
}

/** Un texto con largo de 16 bits (LABEL, STRING): cch, opciones, caracteres */
function textoCorto(b: Uint8Array, o: number, fin: number): string {
  if (o + 3 > fin) return '';
  const cch = b[o] | (b[o + 1] << 8);
  const anchos = (b[o + 2] & 0x01) === 1;
  const max = Math.floor((fin - o - 3) / (anchos ? 2 : 1));
  return caracteres(b, o + 3, Math.min(cch, max), anchos);
}

/**
 * La tabla de textos compartidos (SST) y sus CONTINUE. Cuando un texto se corta entre dos registros, el siguiente
 * empieza con un byte que dice si lo que sigue va comprimido o en UTF-16.
 */
function leerSst(trozos: Uint8Array[]): string[] {
  let t = 0;
  let o = 8; // cstTotal y cstUnique
  const total = trozos[0].length >= 8 ? new DataView(trozos[0].buffer, trozos[0].byteOffset).getUint32(4, true) : 0;
  const byte = (): number => {
    while (t < trozos.length && o >= trozos[t].length) { t++; o = 0; }
    if (t >= trozos.length) throw new ErrorHoja('La tabla de textos del Excel está incompleta');
    return trozos[t][o++];
  };
  const u16 = () => byte() | (byte() << 8);
  const u32 = () => (u16() | (u16() << 16)) >>> 0;
  const textos: string[] = [];
  for (let n = 0; n < Math.min(total, 1_000_000); n++) {
    const cch = u16();
    const opciones = byte();
    let anchos = (opciones & 0x01) === 1;
    const runs = opciones & 0x08 ? u16() : 0;
    const ext = opciones & 0x04 ? u32() : 0;
    let s = '';
    let faltan = cch;
    while (faltan > 0) {
      if (o >= trozos[t].length) {
        t++; o = 0;
        if (t >= trozos.length) throw new ErrorHoja('La tabla de textos del Excel está incompleta');
        anchos = (trozos[t][o++] & 0x01) === 1;
      }
      const caben = Math.min(faltan, Math.floor((trozos[t].length - o) / (anchos ? 2 : 1)));
      if (caben <= 0) { o = trozos[t].length; continue; }
      s += caracteres(trozos[t], o, caben, anchos);
      o += caben * (anchos ? 2 : 1);
      faltan -= caben;
    }
    for (let i = 0; i < runs * 4 + ext; i++) byte();
    textos.push(s);
  }
  return textos;
}

function leerXls(b: Uint8Array): Celda[][] {
  const flujos = leerCfb(b);
  const libro = flujos.get('Workbook') ?? flujos.get('Book');
  if (!libro) throw new ErrorHoja('No es un libro de Excel');
  const dv = new DataView(libro.buffer, libro.byteOffset, libro.byteLength);
  // Los registros: tipo y largo (16 bits cada uno) y los datos
  type Registro = { tipo: number; o: number; largo: number };
  const registros: Registro[] = [];
  const porPosicion = new Map<number, number>();
  for (let o = 0; o + 4 <= libro.length;) {
    const tipo = dv.getUint16(o, true);
    const largo = dv.getUint16(o + 2, true);
    if (o + 4 + largo > libro.length) break;
    porPosicion.set(o, registros.length);
    registros.push({ tipo, o: o + 4, largo });
    o += 4 + largo;
  }
  let sst: string[] = [];
  let primeraHoja = -1;
  for (let i = 0; i < registros.length; i++) {
    const r = registros[i];
    if (r.tipo === 0x00fc) {
      const trozos = [libro.subarray(r.o, r.o + r.largo)];
      for (let j = i + 1; j < registros.length && registros[j].tipo === 0x003c; j++) trozos.push(libro.subarray(registros[j].o, registros[j].o + registros[j].largo));
      sst = leerSst(trozos);
    }
    // BOUNDSHEET: dónde empieza cada hoja; la primera hoja de cálculo (tipo 0) es la que vale
    if (r.tipo === 0x0085 && primeraHoja < 0 && r.largo >= 6 && libro[r.o + 5] === 0) primeraHoja = dv.getUint32(r.o, true);
    // EOF: terminan las definiciones globales del libro
    if (r.tipo === 0x000a) break;
  }
  if (primeraHoja < 0) throw new ErrorHoja('El Excel no tiene hojas');
  const inicio = porPosicion.get(primeraHoja);
  if (inicio === undefined) throw new ErrorHoja('El Excel está dañado');
  const filas: Celda[][] = [];
  let formulaPendiente: { fila: number; col: number } | null = null;
  for (let i = inicio + 1; i < registros.length; i++) {
    const { tipo, o, largo } = registros[i];
    if (tipo === 0x000a) break;
    const fila = largo >= 4 ? dv.getUint16(o, true) : 0;
    const col = largo >= 4 ? dv.getUint16(o + 2, true) : 0;
    switch (tipo) {
      case 0x00fd: // LABELSST
        if (largo >= 10) poner(filas, fila, col, sst[dv.getUint32(o + 6, true)] ?? '');
        break;
      case 0x0204: // LABEL
        poner(filas, fila, col, textoCorto(libro, o + 6, o + largo));
        break;
      case 0x0203: // NUMBER
        if (largo >= 14) poner(filas, fila, col, dv.getFloat64(o + 6, true));
        break;
      case 0x027e: // RK
        if (largo >= 10) poner(filas, fila, col, rk(dv.getUint32(o + 6, true)));
        break;
      case 0x00bd: { // MULRK: varias celdas seguidas en una fila
        const n = Math.floor((largo - 6) / 6);
        for (let k = 0; k < n; k++) poner(filas, fila, col + k, rk(dv.getUint32(o + 4 + k * 6 + 2, true)));
        break;
      }
      case 0x0205: // BOOLERR
        if (largo >= 8 && libro[o + 7] === 0) poner(filas, fila, col, libro[o + 6] === 1);
        break;
      case 0x0006: // FORMULA: el último resultado calculado
        if (largo >= 14) {
          if (dv.getUint16(o + 12, true) !== 0xffff) poner(filas, fila, col, dv.getFloat64(o + 6, true));
          else if (libro[o + 6] === 0) formulaPendiente = { fila, col };
          else if (libro[o + 6] === 1) poner(filas, fila, col, libro[o + 8] === 1);
        }
        break;
      case 0x0207: // STRING: el texto de la fórmula anterior
        if (formulaPendiente) poner(filas, formulaPendiente.fila, formulaPendiente.col, textoCorto(libro, o, o + largo));
        formulaPendiente = null;
        break;
    }
  }
  return filas;
}

/* ------------------------------------------------------------------ .xlsx (zip + XML) */

async function inflar(datos: Uint8Array): Promise<Uint8Array> {
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

async function leerZip(b: Uint8Array, quiero: (nombre: string) => boolean): Promise<Map<string, string>> {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let fin = -1;
  for (let o = b.length - 22; o >= Math.max(0, b.length - 65_557); o--) {
    if (v.getUint32(o, true) === 0x06054b50) { fin = o; break; }
  }
  if (fin < 0) throw new ErrorHoja('El .xlsx está dañado');
  const total = v.getUint16(fin + 10, true);
  let o = v.getUint32(fin + 16, true);
  const out = new Map<string, string>();
  const utf8 = new TextDecoder('utf-8');
  for (let i = 0; i < total && o + 46 <= b.length; i++) {
    if (v.getUint32(o, true) !== 0x02014b50) break;
    const metodo = v.getUint16(o + 10, true);
    const comprimido = v.getUint32(o + 20, true);
    const largoNombre = v.getUint16(o + 28, true);
    const largoExtra = v.getUint16(o + 30, true);
    const largoComentario = v.getUint16(o + 32, true);
    const local = v.getUint32(o + 42, true);
    const nombre = utf8.decode(b.subarray(o + 46, o + 46 + largoNombre));
    o += 46 + largoNombre + largoExtra + largoComentario;
    if (!quiero(nombre) || local + 30 > b.length) continue;
    const datos = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const crudo = b.subarray(datos, datos + comprimido);
    const plano = metodo === 0 ? crudo : metodo === 8 ? await inflar(crudo) : null;
    if (plano) out.set(nombre, utf8.decode(plano));
  }
  return out;
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function desescapar(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return ENTIDADES[e.toLowerCase()] ?? '';
  });
}
const textoDe = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => desescapar(m[1])).join('');

/** "B12" → columna 1 (desde 0) y fila 11 */
function referencia(ref: string): { fila: number; col: number } | null {
  const m = /^([A-Z]{1,3})(\d{1,7})$/.exec(ref);
  if (!m) return null;
  let col = 0;
  for (const letra of m[1]) col = col * 26 + (letra.charCodeAt(0) - 64);
  return { fila: Number(m[2]) - 1, col: col - 1 };
}

async function leerXlsx(b: Uint8Array): Promise<Celda[][]> {
  const indice = await leerZip(b, (n) => n === 'xl/workbook.xml' || n === 'xl/_rels/workbook.xml.rels' || n === 'xl/sharedStrings.xml');
  // La primera hoja del libro, por su relación (no siempre se llama sheet1.xml)
  let ruta = 'xl/worksheets/sheet1.xml';
  const rid = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(indice.get('xl/workbook.xml') ?? '')?.[1];
  const destino = rid ? new RegExp(`<Relationship\\b[^>]*Id="${rid.replace(/[^\w-]/g, '')}"[^>]*Target="([^"]+)"`).exec(indice.get('xl/_rels/workbook.xml.rels') ?? '')?.[1]
    ?? new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid.replace(/[^\w-]/g, '')}"`).exec(indice.get('xl/_rels/workbook.xml.rels') ?? '')?.[1] : undefined;
  if (destino) ruta = destino.startsWith('/') ? destino.slice(1) : `xl/${destino.replace(/^\.\//, '')}`;
  const hoja = (await leerZip(b, (n) => n === ruta)).get(ruta);
  if (!hoja) throw new ErrorHoja('El .xlsx no tiene hojas');
  const compartidos = [...(indice.get('xl/sharedStrings.xml') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textoDe(m[1]));
  const filas: Celda[][] = [];
  for (const m of hoja.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1];
    const cuerpo = m[2] ?? '';
    const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
    const pos = ref ? referencia(ref) : null;
    if (!pos) continue;
    const tipo = /\bt="(\w+)"/.exec(attrs)?.[1] ?? 'n';
    const v = /<v>([\s\S]*?)<\/v>/.exec(cuerpo)?.[1];
    let valor: Celda = null;
    if (tipo === 's') valor = v !== undefined ? compartidos[Number(v)] ?? '' : '';
    else if (tipo === 'inlineStr') valor = textoDe(cuerpo);
    else if (tipo === 'str') valor = v !== undefined ? desescapar(v) : '';
    else if (tipo === 'b') valor = v === '1';
    else if (tipo === 'e') valor = null;
    else if (v !== undefined && v !== '') { const n = Number(v); valor = Number.isFinite(n) ? n : desescapar(v); }
    poner(filas, pos.fila, pos.col, valor);
  }
  return filas;
}

/* ------------------------------------------------------------------ .csv */

function leerCsv(b: Uint8Array): Celda[][] {
  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch {
    texto = new TextDecoder('windows-1252').decode(b);
  }
  texto = texto.replace(/^\uFEFF/, '');
  const salto = texto.search(/\r?\n/);
  const primera = salto >= 0 ? texto.slice(0, salto) : texto;
  const sep = [';', '\t', ','].map((c) => ({ c, n: primera.split(c).length })).sort((a, z) => z.n - a.n)[0].c;
  const filas: Celda[][] = [];
  let fila: Celda[] = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') comillas = false;
      else campo += ch;
      continue;
    }
    if (ch === '"' && campo === '') comillas = true;
    else if (ch === sep) { fila.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      if (fila.some((c) => c !== '')) filas.push(fila);
      fila = [];
      if (filas.length >= FILAS_MAX) break;
    } else campo += ch;
  }
  if (campo !== '' || fila.length > 0) { fila.push(campo); if (fila.some((c) => c !== '')) filas.push(fila); }
  return filas.map((f) => f.slice(0, COLUMNAS_MAX));
}
