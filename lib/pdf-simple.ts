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
    const pieOps = `BT /F1 7.5 Tf 0.45 0.48 0.52 rg ${PAGINA.margen} 28 Td (${escapar(`${pie} · Página ${i + 1} de ${paginas.length}`)}) Tj ET`;
    const stream = Buffer.from([...ops, pieOps].join('\n'), 'latin1');
    const idContenido = agregar(Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, 'latin1'), stream, Buffer.from('\nendstream', 'latin1')]));
    idsPagina.push(agregar(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGINA.ancho} ${PAGINA.alto}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xobjects ? ` /XObject << ${xobjects} >>` : ''} >> /Contents ${idContenido} 0 R >>`));
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
