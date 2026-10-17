// PDF mínimo para las constancias de firma (C-103). Sin dependencias: texto en Helvetica (WinAnsi, con acentos),
// saltos de línea y de página, y una imagen JPEG. Solo para el servidor.

const HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const HELVETICA_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

// Caracteres fuera de Latin-1 que WinAnsi sí tiene
const WIN_ANSI: Record<string, number> = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '•': 0x95, '–': 0x96, '—': 0x97, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '™': 0x99 };

function aWinAnsi(texto: string): string {
  let out = '';
  for (const ch of texto.normalize('NFC')) {
    const code = ch.codePointAt(0) ?? 63;
    if (WIN_ANSI[ch] !== undefined) out += String.fromCharCode(WIN_ANSI[ch]);
    else if (code === 0x2192) out += '->';
    else if (code >= 32 && code <= 255) out += ch;
    else out += '?';
  }
  return out;
}

function ancho(texto: string, bold: boolean, size: number): number {
  const tabla = bold ? HELVETICA_BOLD : HELVETICA;
  let total = 0;
  for (const ch of texto) {
    const base = ch.normalize('NFD')[0];
    const code = base.charCodeAt(0);
    total += code >= 32 && code <= 126 ? tabla[code - 32] : 556;
  }
  return (total * size) / 1000;
}

function escapar(texto: string): string {
  return aWinAnsi(texto).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function partirLineas(texto: string, maxAncho: number, bold: boolean, size: number): string[] {
  const lineas: string[] = [];
  for (const parrafo of texto.split('\n')) {
    let actual = '';
    for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (ancho(prueba, bold, size) <= maxAncho || !actual) actual = prueba;
      else {
        lineas.push(actual);
        actual = palabra;
      }
    }
    lineas.push(actual);
  }
  return lineas;
}

export type BloquePdf =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'parrafo'; texto: string; bold?: boolean; size?: number; color?: 'gris' | 'rojo' }
  | { tipo: 'vineta'; texto: string }
  | { tipo: 'espacio'; alto: number }
  | { tipo: 'linea' }
  /** Si quedan menos de `alto` puntos en la página, empieza otra (mantiene juntos un bloque y su firma) */
  | { tipo: 'mantenerJuntos'; alto: number }
  | { tipo: 'imagen'; jpeg: Buffer; ancho: number; alto: number; anchoPt: number };

const PAGINA = { ancho: 595.28, alto: 841.89, margen: 50 };

/** Arma el PDF con los bloques en orden; `pie` va al final de cada página (por ejemplo, la huella del documento). */
export function generarPdf(bloques: BloquePdf[], pie: string): Buffer {
  const util = PAGINA.ancho - PAGINA.margen * 2;
  const paginas: string[][] = [[]];
  let y = PAGINA.alto - PAGINA.margen;
  const imagenes: Array<{ jpeg: Buffer; ancho: number; alto: number }> = [];

  const nuevaPagina = () => {
    paginas.push([]);
    y = PAGINA.alto - PAGINA.margen;
  };
  const texto = (t: string, x: number, size: number, bold: boolean, color: string) => {
    paginas[paginas.length - 1].push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapar(t)}) Tj ET`);
  };
  const escribir = (t: string, size: number, bold: boolean, color: string, sangria = 0, prefijo?: string) => {
    const alto = size * 1.4;
    partirLineas(t, util - sangria, bold, size).forEach((linea, i) => {
      if (y - alto < PAGINA.margen + 30) nuevaPagina();
      y -= alto;
      if (prefijo && i === 0) texto(prefijo, PAGINA.margen + sangria - 10, size, bold, color);
      texto(linea, PAGINA.margen + sangria, size, bold, color);
    });
  };

  for (const b of bloques) {
    if (b.tipo === 'titulo') escribir(b.texto, 17, true, '0.08 0.1 0.15');
    else if (b.tipo === 'subtitulo') { y -= 6; escribir(b.texto, 11.5, true, '0.08 0.1 0.15'); }
    else if (b.tipo === 'parrafo') escribir(b.texto, b.size ?? 10, Boolean(b.bold), b.color === 'rojo' ? '0.75 0.1 0.1' : b.color === 'gris' ? '0.4 0.43 0.48' : '0.15 0.17 0.2');
    else if (b.tipo === 'vineta') escribir(b.texto, 10, false, '0.15 0.17 0.2', 14, '•');
    else if (b.tipo === 'espacio') y -= b.alto;
    else if (b.tipo === 'mantenerJuntos') { if (y - b.alto < PAGINA.margen + 30) nuevaPagina(); }
    else if (b.tipo === 'linea') {
      y -= 8;
      paginas[paginas.length - 1].push(`0.85 0.87 0.9 RG 0.8 w ${PAGINA.margen} ${y.toFixed(2)} m ${PAGINA.ancho - PAGINA.margen} ${y.toFixed(2)} l S`);
      y -= 8;
    } else if (b.tipo === 'imagen') {
      const altoPt = (b.anchoPt * b.alto) / b.ancho;
      if (y - altoPt < PAGINA.margen + 30) nuevaPagina();
      y -= altoPt;
      imagenes.push({ jpeg: b.jpeg, ancho: b.ancho, alto: b.alto });
      paginas[paginas.length - 1].push(`q ${b.anchoPt.toFixed(2)} 0 0 ${altoPt.toFixed(2)} ${PAGINA.margen} ${y.toFixed(2)} cm /Im${imagenes.length} Do Q`);
    }
  }

  return armar(paginas.map((ops, i) => [...ops,
    `BT /F1 7.5 Tf 0.45 0.48 0.52 rg ${PAGINA.margen} 28 Td (${escapar(`${pie} · Página ${i + 1} de ${paginas.length}`)}) Tj ET`]), imagenes, PAGINA.ancho, PAGINA.alto);
}

interface Enlace { x: number; y: number; w: number; h: number; url: string }

/** Escribe el archivo: las páginas (operaciones de dibujo), las imágenes JPEG, el tamaño de la hoja y los enlaces
 *  de cada página (en coordenadas del PDF). */
function armar(paginas: string[][], imagenes: Array<{ jpeg: Buffer; ancho: number; alto: number }>, anchoHoja: number, altoHoja: number, enlaces: Enlace[][] = []): Buffer {
  // Objetos: 1 catálogo, 2 páginas, 3 y 4 fuentes, luego imágenes, luego (contenido, página) por página
  const objetos: Buffer[] = [];
  const agregar = (contenido: Buffer | string) => {
    objetos.push(typeof contenido === 'string' ? Buffer.from(contenido, 'latin1') : contenido);
    return objetos.length;
  };
  agregar('<< /Type /Catalog /Pages 2 0 R >>');
  agregar('PENDIENTE');
  agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const idsImagen = imagenes.map((img) => agregar(Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${img.ancho} /Height ${img.alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>\nstream\n`, 'latin1'),
    img.jpeg,
    Buffer.from('\nendstream', 'latin1'),
  ])));
  const xobjects = idsImagen.map((id, i) => `/Im${i + 1} ${id} 0 R`).join(' ');
  const idsPagina: number[] = [];
  paginas.forEach((ops, i) => {
    const stream = Buffer.from(ops.join('\n'), 'latin1');
    const idContenido = agregar(Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, 'latin1'), stream, Buffer.from('\nendstream', 'latin1')]));
    const idsEnlace = (enlaces[i] ?? []).map((e) => agregar(`<< /Type /Annot /Subtype /Link /Rect [${[e.x, e.y, e.x + e.w, e.y + e.h].map((n) => n.toFixed(2)).join(' ')}] /Border [0 0 0] /A << /S /URI /URI (${escapar(e.url)}) >> >>`));
    const anotaciones = idsEnlace.length ? ` /Annots [${idsEnlace.map((id) => `${id} 0 R`).join(' ')}]` : '';
    idsPagina.push(agregar(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${anchoHoja} ${altoHoja}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xobjects ? ` /XObject << ${xobjects} >>` : ''} >>${anotaciones} /Contents ${idContenido} 0 R >>`));
  });
  objetos[1] = Buffer.from(`<< /Type /Pages /Kids [${idsPagina.map((id) => `${id} 0 R`).join(' ')}] /Count ${idsPagina.length} >>`, 'latin1');

  const partes: Buffer[] = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  const offsets: number[] = [];
  let pos = partes[0].length;
  objetos.forEach((obj, i) => {
    offsets.push(pos);
    const cuerpo = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), obj, Buffer.from('\nendobj\n', 'latin1')]);
    partes.push(cuerpo);
    pos += cuerpo.length;
  });
  const xref = [`xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('');
  partes.push(Buffer.from(`${xref}trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(partes);
}

/* ── Lienzo libre (C-182): para documentos con diseño, como el presupuesto ──
 * Las coordenadas van desde la esquina de arriba a la izquierda, en puntos (72 por pulgada). La hoja es carta. */

export type Rgb = [number, number, number];

/** "#0a1530" → [0.04, 0.08, 0.19] */
export function rgb(hex: string): Rgb {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const color = (c: Rgb) => c.map((v) => v.toFixed(3)).join(' ');

export interface EstiloTexto { tam: number; negrita?: boolean; color?: Rgb; alinear?: 'izq' | 'der' | 'centro' }
export interface MarcaLienzo { ops: number; enlaces: number }

export class Lienzo {
  readonly ancho = 612;
  readonly alto = 792;
  private paginas: string[][] = [[]];
  private enlaces: Enlace[][] = [[]];
  private actual = 0;
  private imagenes: Array<{ jpeg: Buffer; ancho: number; alto: number }> = [];

  get numeroDePaginas() { return this.paginas.length; }
  pagina() {
    this.paginas.push([]);
    this.enlaces.push([]);
    this.actual = this.paginas.length - 1;
  }
  /** Dibuja en una página ya hecha (para el pie con "Página 1 de 2", al final) */
  enPagina(n: number, dibujar: () => void) {
    const antes = this.actual;
    this.actual = n;
    dibujar();
    this.actual = antes;
  }
  /** Hasta dónde va dibujada la página. Con `deshacer` se borra lo que vino después (para mantener juntos un bloque:
   *  se dibuja y, si no cupo, se borra y se dibuja en la hoja siguiente); con `debajo`, se dibuja debajo de eso (el
   *  fondo de un recuadro, que se mide después de escribirlo). */
  get posicion(): MarcaLienzo { return { ops: this.paginas[this.actual].length, enlaces: this.enlaces[this.actual].length }; }
  deshacer(m: MarcaLienzo) {
    this.paginas[this.actual].length = m.ops;
    this.enlaces[this.actual].length = m.enlaces;
  }
  debajo(m: MarcaLienzo, dibujar: () => void) {
    const ops = this.paginas[this.actual];
    const antes = ops.length;
    dibujar();
    ops.splice(m.ops, 0, ...ops.splice(antes));
  }
  private op(s: string) { this.paginas[this.actual].push(s); }
  private yPdf(y: number) { return this.alto - y; }

  /** Lo que se dibuje dentro sale girado `grados` (positivo: en el sentido de las agujas del reloj) alrededor de (x, y) */
  girado(x: number, y: number, grados: number, dibujar: () => void) {
    const a = (-grados * Math.PI) / 180;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const yp = this.yPdf(y);
    this.op(`q 1 0 0 1 ${x.toFixed(2)} ${yp.toFixed(2)} cm ${c.toFixed(4)} ${s.toFixed(4)} ${(-s).toFixed(4)} ${c.toFixed(4)} 0 0 cm 1 0 0 1 ${(-x).toFixed(2)} ${(-yp).toFixed(2)} cm`);
    dibujar();
    this.op('Q');
  }

  poligono(puntos: Array<[number, number]>, relleno: Rgb) {
    this.op(`q ${color(relleno)} rg ${puntos.map(([x, y], i) => `${x.toFixed(2)} ${this.yPdf(y).toFixed(2)} ${i ? 'l' : 'm'}`).join(' ')} h f Q`);
  }

  /** Un código QR (matriz de módulos oscuros) en un cuadrado de `lado` puntos, con su margen blanco */
  qr(x: number, y: number, lado: number, matriz: boolean[][], c: Rgb) {
    const n = matriz.length + 8;
    const m = lado / n;
    const cuadros: string[] = [];
    matriz.forEach((fila, f) => fila.forEach((oscuro, k) => {
      if (oscuro) cuadros.push(`${(x + (k + 4) * m).toFixed(2)} ${this.yPdf(y + (f + 5) * m).toFixed(2)} ${(m + 0.05).toFixed(2)} ${(m + 0.05).toFixed(2)} re`);
    }));
    this.op(`q ${color(c)} rg ${cuadros.join(' ')} f Q`);
  }

  /** Una zona que se toca o se pulsa para abrir `url` (en el teléfono, el PDF abre el enlace) */
  enlace(x: number, y: number, w: number, h: number, url: string) {
    this.enlaces[this.actual].push({ x, y: this.yPdf(y + h), w, h, url });
  }

  medir(t: string, tam: number, negrita = false) { return ancho(t, negrita, tam); }
  lineas(t: string, anchoMax: number, tam: number, negrita = false) { return partirLineas(t, anchoMax, negrita, tam); }

  /** Rectángulo (con esquinas redondeadas si `radio`): relleno, borde o los dos */
  rect(x: number, y: number, w: number, h: number, o: { relleno?: Rgb; borde?: Rgb; grosor?: number; radio?: number }) {
    const r = Math.min(o.radio ?? 0, w / 2, h / 2);
    const x0 = x, y0 = this.yPdf(y + h), x1 = x + w, y1 = this.yPdf(y);
    let camino: string;
    if (r > 0) {
      const k = 0.5523 * r;
      camino = [
        `${(x0 + r).toFixed(2)} ${y0.toFixed(2)} m`, `${(x1 - r).toFixed(2)} ${y0.toFixed(2)} l`,
        `${(x1 - r + k).toFixed(2)} ${y0.toFixed(2)} ${x1.toFixed(2)} ${(y0 + r - k).toFixed(2)} ${x1.toFixed(2)} ${(y0 + r).toFixed(2)} c`,
        `${x1.toFixed(2)} ${(y1 - r).toFixed(2)} l`,
        `${x1.toFixed(2)} ${(y1 - r + k).toFixed(2)} ${(x1 - r + k).toFixed(2)} ${y1.toFixed(2)} ${(x1 - r).toFixed(2)} ${y1.toFixed(2)} c`,
        `${(x0 + r).toFixed(2)} ${y1.toFixed(2)} l`,
        `${(x0 + r - k).toFixed(2)} ${y1.toFixed(2)} ${x0.toFixed(2)} ${(y1 - r + k).toFixed(2)} ${x0.toFixed(2)} ${(y1 - r).toFixed(2)} c`,
        `${x0.toFixed(2)} ${(y0 + r).toFixed(2)} l`,
        `${x0.toFixed(2)} ${(y0 + r - k).toFixed(2)} ${(x0 + r - k).toFixed(2)} ${y0.toFixed(2)} ${(x0 + r).toFixed(2)} ${y0.toFixed(2)} c h`,
      ].join(' ');
    } else {
      camino = `${x0.toFixed(2)} ${y0.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`;
    }
    const pintar = o.relleno && o.borde ? 'B' : o.relleno ? 'f' : 'S';
    this.op(`q ${o.relleno ? `${color(o.relleno)} rg ` : ''}${o.borde ? `${color(o.borde)} RG ${(o.grosor ?? 1).toFixed(2)} w ` : ''}${camino} ${pintar} Q`);
  }

  linea(x1: number, y1: number, x2: number, y2: number, c: Rgb, grosor = 1) {
    this.op(`q ${color(c)} RG ${grosor.toFixed(2)} w ${x1.toFixed(2)} ${this.yPdf(y1).toFixed(2)} m ${x2.toFixed(2)} ${this.yPdf(y2).toFixed(2)} l S Q`);
  }

  /** Una línea de texto con la base en `y` (alineada a la izquierda, a la derecha o centrada en `x`) */
  texto(x: number, y: number, t: string, e: EstiloTexto) {
    const w = ancho(t, Boolean(e.negrita), e.tam);
    const xx = e.alinear === 'der' ? x - w : e.alinear === 'centro' ? x - w / 2 : x;
    this.op(`BT /${e.negrita ? 'F2' : 'F1'} ${e.tam} Tf ${color(e.color ?? [0.13, 0.15, 0.16])} rg ${xx.toFixed(2)} ${this.yPdf(y).toFixed(2)} Td (${escapar(t)}) Tj ET`);
    return w;
  }

  /** Un párrafo cortado al ancho, desde `y` (arriba de la primera línea). Devuelve dónde termina. */
  parrafo(x: number, y: number, anchoMax: number, t: string, e: EstiloTexto & { interlinea?: number }) {
    const alto = e.tam * (e.interlinea ?? 1.35);
    let yy = y;
    for (const linea of partirLineas(t, anchoMax, Boolean(e.negrita), e.tam)) {
      yy += alto;
      this.texto(e.alinear === 'der' ? x + anchoMax : e.alinear === 'centro' ? x + anchoMax / 2 : x, yy - alto * 0.25, linea, e);
    }
    return yy;
  }

  altoParrafo(anchoMax: number, t: string, e: EstiloTexto & { interlinea?: number }) {
    return partirLineas(t, anchoMax, Boolean(e.negrita), e.tam).length * e.tam * (e.interlinea ?? 1.35);
  }

  /** Una imagen JPEG (RGB). La misma imagen dibujada varias veces va una sola vez en el archivo. */
  imagen(jpeg: Buffer, anchoPx: number, altoPx: number, x: number, y: number, w: number, h: number) {
    let n = this.imagenes.findIndex((im) => im.jpeg === jpeg) + 1;
    if (!n) n = this.imagenes.push({ jpeg, ancho: anchoPx, alto: altoPx });
    this.op(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${this.yPdf(y + h).toFixed(2)} cm /Im${n} Do Q`);
  }

  pdf(): Buffer {
    return armar(this.paginas, this.imagenes, this.ancho, this.alto, this.enlaces);
  }
}
