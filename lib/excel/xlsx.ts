// C-230: escribir un .xlsx (Excel 2007 en adelante) sin librerías, para los libros de Contabilidad. Solo servidor (el zip
// usa zlib de Node). Lo justo para un libro contable:
// - varias hojas, con el ancho de cada columna y celdas combinadas;
// - la fila de los títulos, fija al bajar y repetida en cada hoja impresa;
// - apaisado en carta, a lo ancho de una página, con el pie y "Página 1 de 2";
// - fechas y montos de verdad (no texto), para que la contadora ordene y sume; los totales, con su fórmula y su valor.
// El texto va dentro de la celda (inlineStr), sin tabla de textos compartidos: Excel, LibreOffice y Google Sheets lo leen.

import { armarZip } from '@/lib/excel/zip';

export type Estilo =
  | 'normal' | 'titulo' | 'subtitulo' | 'encabezado' | 'texto' | 'textoCentro' | 'fecha' | 'monto' | 'porcentaje'
  | 'entero' | 'total' | 'totalMonto' | 'anulada' | 'nota' | 'etiqueta' | 'cifra';

export type Valor = string | number | null | undefined | { fecha: string } | { formula: string; valor: number };

export interface Celda {
  v: Valor;
  e?: Estilo;
}

export type Fila = Array<Celda | null>;

export interface Hoja {
  nombre: string;
  /** El ancho de cada columna, en caracteres */
  anchos: number[];
  filas: Fila[];
  /** Rangos combinados: 'A1:L1' */
  combinar?: string[];
  /** La fila de los títulos de las columnas (la primera es 1): queda fija al bajar y se repite en cada página impresa */
  filaTitulos?: number;
  /** El alto de algunas filas, en puntos: { 6: 30 } */
  altos?: Record<number, number>;
  /** Lo que va al pie de cada página impresa, a la izquierda (a la derecha, "Página 1 de 2") */
  pie?: string;
}

export interface Propiedades {
  titulo: string;
  autor: string;
}

// Los estilos, en el orden de cellXfs de styles.xml
const ESTILOS: Record<Estilo, number> = {
  normal: 0, titulo: 1, subtitulo: 2, encabezado: 3, texto: 4, textoCentro: 5, fecha: 6, monto: 7, porcentaje: 8,
  entero: 9, total: 10, totalMonto: 11, anulada: 12, nota: 13, etiqueta: 14, cifra: 15,
};

// Los colores del kit de marca (lib/marca.ts): el azul oscuro del logo, su claro, la tinta y las líneas
const AZUL = 'FF1A3B7E';
const AZUL_CLARO = 'FFEAEFFA';
const TINTA = 'FF212529';
const GRIS = 'FF6A6C6B';
const LINEA = 'FFDEE2E6';

const ESTILOS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00"/><numFmt numFmtId="166" formatCode="0&quot; %&quot;"/></numFmts>
<fonts count="7">
<font><sz val="10"/><color rgb="${TINTA}"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="14"/><color rgb="${AZUL}"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="10"/><color rgb="${GRIS}"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="${TINTA}"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="9"/><color rgb="${GRIS}"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="${GRIS}"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="${AZUL}"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="${AZUL_CLARO}"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="${LINEA}"/></bottom><diagonal/></border>
<border><left/><right/><top style="thin"><color rgb="${AZUL}"/></top><bottom style="thin"><color rgb="${AZUL}"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="16">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="165" fontId="4" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="165" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

function xml(texto: string): string {
  return texto.replace(CONTROL, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 1 → A, 27 → AA */
export function columna(n: number): string {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

/** "2026-11-16" → el número de serie de Excel (días desde el 30/12/1899) */
export function serieFecha(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return (Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

const numero = (n: number): string => (Number.isFinite(n) ? String(Math.round(n * 1e6) / 1e6) : '0');

function celdaXml(ref: string, celda: Celda): string {
  const s = ESTILOS[celda.e ?? 'normal'];
  const estilo = s ? ` s="${s}"` : '';
  const v = celda.v;
  if (v === null || v === undefined || v === '') return estilo ? `<c r="${ref}"${estilo}/>` : '';
  if (typeof v === 'number') return `<c r="${ref}"${estilo}><v>${numero(v)}</v></c>`;
  if (typeof v === 'string') return `<c r="${ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${xml(v.slice(0, 32_000))}</t></is></c>`;
  if ('fecha' in v) {
    const serie = serieFecha(v.fecha);
    return serie === null ? `<c r="${ref}"${estilo}/>` : `<c r="${ref}"${estilo}><v>${serie}</v></c>`;
  }
  return `<c r="${ref}"${estilo}><f>${xml(v.formula)}</f><v>${numero(v.valor)}</v></c>`;
}

/** El nombre de una pestaña: hasta 31 letras y sin [ ] : * ? / \ (Excel no abre el libro si no) */
export function nombreHoja(nombre: string, usados: Set<string>): string {
  const base = nombre.replace(/[[\]:*?/\\]/g, ' ').replace(/^'+|'+$/g, '').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Hoja';
  let final = base;
  for (let i = 2; usados.has(final.toLowerCase()); i++) final = `${base.slice(0, 31 - String(i).length - 1)} ${i}`;
  usados.add(final.toLowerCase());
  return final;
}

function hojaXml(h: Hoja): string {
  const filas = h.filas;
  const ultimaColumna = Math.max(1, h.anchos.length, ...filas.map((f) => f.length));
  const titulos = h.filaTitulos && h.filaTitulos > 0 && h.filaTitulos < filas.length ? h.filaTitulos : 0;

  const vista = titulos
    ? `<sheetView workbookViewId="0"><pane ySplit="${titulos}" topLeftCell="A${titulos + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${titulos + 1}" sqref="A${titulos + 1}"/></sheetView>`
    : '<sheetView workbookViewId="0"/>';
  const columnas = h.anchos.map((a, i) => `<col min="${i + 1}" max="${i + 1}" width="${numero(a)}" customWidth="1"/>`).join('');
  const datos = filas
    .map((fila, i) => {
      const r = i + 1;
      const alto = h.altos?.[r];
      const celdas = fila.map((c, j) => (c ? celdaXml(`${columna(j + 1)}${r}`, c) : '')).join('');
      return `<row r="${r}"${alto ? ` ht="${numero(alto)}" customHeight="1"` : ''}>${celdas}</row>`;
    })
    .join('');
  const combinadas = h.combinar?.length ? `<mergeCells count="${h.combinar.length}">${h.combinar.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
  // En el encabezado y el pie de la impresión, "&" abre un código (&P es la página): uno literal va doble
  const pie = h.pie ? `&amp;L${xml(h.pie.replace(/&/g, '&&'))}` : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${columna(ultimaColumna)}${Math.max(1, filas.length)}"/>
<sheetViews>${vista}</sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${columnas ? `<cols>${columnas}</cols>` : ''}
<sheetData>${datos}</sheetData>
${combinadas}
<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="1" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>${pie}&amp;RPágina &amp;P de &amp;N</oddFooter></headerFooter>
</worksheet>`;
}

/** El archivo .xlsx con sus hojas, listo para mandar (Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet) */
export function escribirXlsx(hojas: Hoja[], props: Propiedades, cuando: Date = new Date()): Buffer {
  if (hojas.length === 0) throw new Error('Un libro de Excel necesita al menos una hoja.');
  const usados = new Set<string>();
  const nombres = hojas.map((h) => nombreHoja(h.nombre, usados));
  const iso = cuando.toISOString().replace(/\.\d{3}Z$/, 'Z');

  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

  const relaciones = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const nucleo = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xml(props.titulo)}</dc:title><dc:creator>${xml(props.autor)}</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>
</cp:coreProperties>`;

  const aplicacion = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Electro Shop</Application></Properties>`;

  // Los títulos que se repiten al imprimir: 'Ventas'!$6:$6 (una comilla dentro del nombre va doble)
  const definidos = hojas
    .map((h, i) => (h.filaTitulos ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${xml(nombres[i].replace(/'/g, "''"))}'!$${h.filaTitulos}:$${h.filaTitulos}</definedName>` : ''))
    .join('');
  const libro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView activeTab="0"/></bookViews>
<sheets>${nombres.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${definidos ? `<definedNames>${definidos}</definedNames>` : ''}
<calcPr calcId="0" fullCalcOnLoad="1"/>
</workbook>`;

  const relacionesLibro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return armarZip([
    { nombre: '[Content_Types].xml', datos: tipos },
    { nombre: '_rels/.rels', datos: relaciones },
    { nombre: 'docProps/core.xml', datos: nucleo },
    { nombre: 'docProps/app.xml', datos: aplicacion },
    { nombre: 'xl/workbook.xml', datos: libro },
    { nombre: 'xl/_rels/workbook.xml.rels', datos: relacionesLibro },
    { nombre: 'xl/styles.xml', datos: ESTILOS_XML },
    ...hojas.map((h, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, datos: hojaXml(h) })),
  ], cuando);
}

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
