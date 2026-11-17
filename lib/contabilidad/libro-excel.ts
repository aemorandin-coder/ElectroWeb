// C-230: el libro de ventas del mes en Excel, como lo pidió la contadora (docs/plan/CONTABILIDAD.md §9). Solo servidor.
// Arriba, la empresa y el mes; después una fila por factura con sus columnas; los totales con su fórmula; y debajo, lo que
// va en la declaración. La hoja sola sirve también para el Excel del mes con una pestaña por libro (C-232).

import { escribirXlsx, columna, type Celda, type Fila, type Hoja } from '@/lib/excel/xlsx';
import { fechaCorta, type LibroVentas } from './libro';
import { hoyVe, nombreMes } from './montos';

export interface EmpresaLibro {
  nombre: string;
  rif: string;
}

const COLUMNAS: Array<{ titulo: string; ancho: number }> = [
  { titulo: 'N.º', ancho: 6 },
  { titulo: 'Fecha', ancho: 11 },
  { titulo: 'N.º de factura', ancho: 12 },
  { titulo: 'N.º de control', ancho: 13 },
  { titulo: 'RIF o C.I.', ancho: 14 },
  { titulo: 'Nombre o razón social', ancho: 34 },
  { titulo: 'Total de la venta (con IVA)', ancho: 15 },
  { titulo: 'Exento o no sujeto', ancho: 14 },
  { titulo: 'Base imponible', ancho: 15 },
  { titulo: 'Alícuota', ancho: 9 },
  { titulo: 'IVA', ancho: 14 },
  { titulo: 'IVA retenido', ancho: 13 },
  { titulo: 'N.º de comprobante de retención', ancho: 18 },
];

const FILA_TITULOS = 6;

const t = (v: string, e: Celda['e'] = 'texto'): Celda => ({ v, e });
const m = (v: number): Celda => ({ v, e: 'monto' });

/** "Noviembre de 2026" */
export const mesTitulo = (periodo: string): string => nombreMes(periodo).replace(/^./, (c) => c.toUpperCase());

export function hojaLibroVentas(libro: LibroVentas, empresa: EmpresaLibro, generado: Date): Hoja {
  const ultima = columna(COLUMNAS.length);
  const mes = mesTitulo(libro.periodo);
  const filas: Fila[] = [
    [t('Libro de ventas', 'titulo')],
    [t(`${empresa.nombre}${empresa.rif ? ` · RIF ${empresa.rif}` : ''}`, 'subtitulo')],
    [t(`${mes} · Montos en bolívares`, 'subtitulo')],
    [],
    [],
    COLUMNAS.map((c) => t(c.titulo, 'encabezado')),
  ];

  for (const f of libro.filas) {
    filas.push([
      { v: f.operacion, e: 'entero' },
      { v: { fecha: f.fecha }, e: 'fecha' },
      t(f.factura, 'textoCentro'),
      t(f.control, 'textoCentro'),
      t(f.documento),
      t(f.nombre || '', f.anulada ? 'anulada' : 'texto'),
      m(f.totalBs),
      m(f.exentoBs),
      m(f.baseBs),
      f.alicuota === null ? t('', 'textoCentro') : { v: f.alicuota, e: 'porcentaje' },
      m(f.ivaBs),
      m(f.ivaRetenidoBs),
      t(f.comprobante, 'textoCentro'),
    ]);
  }

  // Los totales: con su fórmula (si la contadora corrige una fila, se recalculan) y su valor (para quien no recalcula)
  const desde = FILA_TITULOS + 1;
  const hasta = FILA_TITULOS + libro.filas.length;
  const suma = (col: number, valor: number): Celda =>
    libro.filas.length ? { v: { formula: `SUM(${columna(col)}${desde}:${columna(col)}${hasta})`, valor }, e: 'totalMonto' } : { v: 0, e: 'totalMonto' };
  const filaTotales = filas.length + 1;
  filas.push([
    t('Totales del mes', 'total'), t('', 'total'), t('', 'total'), t('', 'total'), t('', 'total'), t('', 'total'),
    suma(7, libro.totales.totalBs), suma(8, libro.totales.exentoBs), suma(9, libro.totales.baseBs), t('', 'total'),
    suma(11, libro.totales.ivaBs), suma(12, libro.totales.ivaRetenidoBs), t('', 'total'),
  ]);

  filas.push([]);
  const filaResumen = filas.length + 1;
  filas.push([t('Para la declaración', 'titulo')]);
  const renglon = (texto: string, valor: number): Fila => [t(texto, 'etiqueta'), null, null, null, null, null, { v: valor, e: 'cifra' }];
  const resumen: Fila[] = libro.porAlicuota.length
    ? libro.porAlicuota.flatMap((a) => [
      renglon(`Ventas gravadas con la alícuota del ${a.alicuota} %: base imponible`, a.baseBs),
      renglon(`IVA de esas ventas (débito fiscal), ${a.alicuota} %`, a.ivaBs),
    ])
    : [renglon('Ventas gravadas: base imponible', 0), renglon('IVA de esas ventas (débito fiscal)', 0)];
  resumen.push(renglon('Ventas exentas o no sujetas', libro.totales.exentoBs));
  resumen.push(renglon('IVA que retuvieron los compradores (contribuyentes especiales)', libro.totales.ivaRetenidoBs));
  filas.push(...resumen);
  filas.push([t('Facturas emitidas', 'etiqueta'), null, null, null, null, null, { v: libro.emitidas, e: 'entero' }]);
  filas.push([t('Facturas anuladas', 'etiqueta'), null, null, null, null, null, { v: libro.anuladas, e: 'entero' }]);
  filas.push([]);
  filas.push([t(`Preparado con el panel de Electro Shop el ${fechaCorta(hoyVe(generado))}. Lo revisa y lo firma la contadora.`, 'nota')]);

  // Los textos largos van en celdas combinadas: así se leen enteros en Excel, LibreOffice y Google Sheets
  const combinadas = [`A1:${ultima}1`, `A2:${ultima}2`, `A3:${ultima}3`, `A${filaTotales}:F${filaTotales}`, `A${filaResumen}:F${filaResumen}`, `A${filas.length}:${ultima}${filas.length}`];
  // Las etiquetas del resumen ocupan de la A a la F
  for (let r = filaResumen + 1; r < filaResumen + 1 + resumen.length + 2; r++) combinadas.push(`A${r}:F${r}`);

  return {
    nombre: 'Ventas',
    anchos: COLUMNAS.map((c) => c.ancho),
    filas,
    combinar: combinadas,
    filaTitulos: FILA_TITULOS,
    altos: { 1: 22, [FILA_TITULOS]: 42 },
    pie: `${empresa.nombre} · Libro de ventas de ${nombreMes(libro.periodo)}`,
  };
}

/** El archivo: "libro-de-ventas-2026-11.xlsx" */
export function libroVentasXlsx(libro: LibroVentas, empresa: EmpresaLibro, generado: Date = new Date()): { nombre: string; datos: Buffer } {
  const datos = escribirXlsx([hojaLibroVentas(libro, empresa, generado)], {
    titulo: `Libro de ventas de ${nombreMes(libro.periodo)}`,
    autor: empresa.nombre || 'Electro Shop',
  }, generado);
  return { nombre: `libro-de-ventas-${libro.periodo}.xlsx`, datos };
}
