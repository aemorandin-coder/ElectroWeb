// G-76: Paquete integral de Contabilidad en Excel (.xlsx) con 5 pestañas usando lib/excel/xlsx.ts (cero dependencias).
// Incluye: Ventas, Compras, IVA 99030 (con sello C.P.C.), Obligaciones y Movimientos (sin costos ni márgenes).

import { columna, escribirXlsx, type Celda, type Fila, type Hoja } from '@/lib/excel/xlsx';
import type { CompraGastoDTO, MovimientosMesDTO, ObligacionFiscalDTO, PeriodoContableDTO } from '@/lib/dto/contabilidad';
import { fechaCorta, type LibroVentas } from './libro';
import { hojaLibroVentas, mesTitulo, type EmpresaLibro } from './libro-excel';
import { hoyVe, nombreMes } from './montos';
import type { FirmaDTO } from './mesa';

const t = (v: string, e: Celda['e'] = 'texto'): Celda => ({ v, e });
const m = (v: number): Celda => ({ v, e: 'monto' });

function hojaCompras(compras: CompraGastoDTO[], empresa: EmpresaLibro, periodo: string): Hoja {
  const cols = [
    { titulo: 'N.º', ancho: 6 },
    { titulo: 'Fecha', ancho: 11 },
    { titulo: 'N.º de factura', ancho: 14 },
    { titulo: 'N.º de control', ancho: 15 },
    { titulo: 'RIF proveedor', ancho: 14 },
    { titulo: 'Proveedor', ancho: 32 },
    { titulo: 'Categoría', ancho: 20 },
    { titulo: 'Total compra', ancho: 15 },
    { titulo: 'Exento', ancho: 13 },
    { titulo: 'Base imponible', ancho: 15 },
    { titulo: 'Alícuota', ancho: 9 },
    { titulo: 'IVA crédito fiscal', ancho: 15 },
    { titulo: 'Estado revisión', ancho: 15 },
  ];
  const ultima = columna(cols.length);
  const FILA_TITULOS = 6;
  const filas: Fila[] = [
    [t('Libro de compras y gastos', 'titulo')],
    [t(`${empresa.nombre}${empresa.rif ? ` · RIF ${empresa.rif}` : ''}`, 'subtitulo')],
    [t(`${mesTitulo(periodo)} · Montos en bolívares`, 'subtitulo')],
    [],
    [],
    cols.map((c) => t(c.titulo, 'encabezado')),
  ];

  compras.forEach((c, idx) => {
    filas.push([
      { v: idx + 1, e: 'entero' },
      { v: { fecha: c.fechaEmision.slice(0, 10) }, e: 'fecha' },
      t(c.numeroFactura, 'textoCentro'),
      t(c.numeroControl, 'textoCentro'),
      t(c.proveedorRif),
      t(c.proveedorNombre),
      t(c.categoria),
      m(c.totalBs),
      m(c.exentoBs),
      m(c.baseBs),
      { v: c.alicuota, e: 'porcentaje' },
      m(c.ivaBs),
      t(c.estadoRevision === 'REVISADA' ? 'Revisada' : c.estadoRevision === 'FALTA_ALGO' ? 'Falta algo' : 'Pendiente', 'textoCentro'),
    ]);
  });

  const desde = FILA_TITULOS + 1;
  const hasta = FILA_TITULOS + compras.length;
  const suma = (col: number, val: number): Celda =>
    compras.length ? { v: { formula: `SUM(${columna(col)}${desde}:${columna(col)}${hasta})`, valor: val }, e: 'totalMonto' } : { v: 0, e: 'totalMonto' };
  const filaTotales = filas.length + 1;
  const totTotal = compras.reduce((s, c) => s + c.totalBs, 0);
  const totExento = compras.reduce((s, c) => s + c.exentoBs, 0);
  const totBase = compras.reduce((s, c) => s + c.baseBs, 0);
  const totIva = compras.reduce((s, c) => s + c.ivaBs, 0);
  filas.push([
    t('Totales de compras', 'total'), t('', 'total'), t('', 'total'), t('', 'total'), t('', 'total'), t('', 'total'), t('', 'total'),
    suma(8, totTotal), suma(9, totExento), suma(10, totBase), t('', 'total'), suma(12, totIva), t('', 'total'),
  ]);

  return {
    nombre: 'Compras',
    anchos: cols.map((c) => c.ancho),
    filas,
    combinar: [`A1:${ultima}1`, `A2:${ultima}2`, `A3:${ultima}3`, `A${filaTotales}:G${filaTotales}`],
    filaTitulos: FILA_TITULOS,
    altos: { 1: 22, [FILA_TITULOS]: 38 },
    pie: `${empresa.nombre} · Libro de compras de ${nombreMes(periodo)}`,
  };
}

function hojaResumenIva(iva: PeriodoContableDTO, empresa: EmpresaLibro, firma: FirmaDTO | null): Hoja {
  const filas: Fila[] = [
    [t('Resumen mensual de IVA (Forma 99030)', 'titulo')],
    [t(`${empresa.nombre}${empresa.rif ? ` · RIF ${empresa.rif}` : ''}`, 'subtitulo')],
    [t(`${mesTitulo(iva.periodo)} · Estado: ${iva.estado}`, 'subtitulo')],
    [],
    [t('Concepto', 'encabezado'), t('Monto Bs.', 'encabezado')],
    [t('(+) Débito fiscal · IVA de las ventas', 'etiqueta'), { v: iva.debitoFiscalBs, e: 'cifra' }],
    [t('(−) Crédito fiscal · IVA de las compras', 'etiqueta'), { v: iva.creditoFiscalBs, e: 'cifra' }],
    [t('(−) Excedente del mes anterior', 'etiqueta'), { v: iva.excedenteAnteriorBs, e: 'cifra' }],
    [t('(−) Retenciones de IVA recibidas (contribuyentes especiales)', 'etiqueta'), { v: iva.retencionesIvaBs, e: 'cifra' }],
    [t('(=) IVA neto a pagar', 'total'), { v: iva.ivaAPagarBs, e: 'totalMonto' }],
    [t('Excedente de crédito fiscal para el mes siguiente', 'etiqueta'), { v: iva.nuevoExcedenteBs, e: 'cifra' }],
    [],
    [t(`N.º de planilla SENIAT: ${iva.numeroPlanillaIva || 'Pendiente'}`, 'nota')],
    [t(firma ? `Sello contable: ${firma.nombre} · ${firma.titulo} · C.P.C. ${firma.cpc}` : 'Pendiente de firma y sello C.P.C.', 'nota')],
  ];
  return {
    nombre: 'IVA 99030',
    anchos: [54, 20],
    filas,
    combinar: ['A1:B1', 'A2:B2', 'A3:B3', 'A13:B13', 'A14:B14'],
    altos: { 1: 22, 5: 28 },
    pie: `${empresa.nombre} · IVA ${nombreMes(iva.periodo)}`,
  };
}

function hojaObligaciones(obligaciones: ObligacionFiscalDTO[], empresa: EmpresaLibro, periodo: string): Hoja {
  const cols = [
    { titulo: 'Obligación', ancho: 38 },
    { titulo: 'Detalle', ancho: 44 },
    { titulo: 'Vencimiento', ancho: 13 },
    { titulo: 'Monto Bs.', ancho: 16 },
    { titulo: 'Estado', ancho: 16 },
    { titulo: 'Planilla / Comp.', ancho: 18 },
  ];
  const filas: Fila[] = [
    [t('Calendario de obligaciones fiscales y parafiscales', 'titulo')],
    [t(`${empresa.nombre}${empresa.rif ? ` · RIF ${empresa.rif}` : ''}`, 'subtitulo')],
    [t(mesTitulo(periodo), 'subtitulo')],
    [],
    [],
    cols.map((c) => t(c.titulo, 'encabezado')),
  ];
  for (const o of obligaciones) {
    filas.push([
      t(o.titulo),
      t(o.detalle ?? ''),
      { v: { fecha: o.venceEl.slice(0, 10) }, e: 'fecha' },
      m(o.montoBs),
      t(o.estado === 'PAGADA' ? 'Pagada' : o.estado === 'LISTA_PAGAR' ? 'Lista para pagar' : 'Por calcular', 'textoCentro'),
      t(o.numeroPlanilla || o.comprobanteIslr || '', 'textoCentro'),
    ]);
  }
  return {
    nombre: 'Obligaciones',
    anchos: cols.map((c) => c.ancho),
    filas,
    combinar: ['A1:F1', 'A2:F2', 'A3:F3'],
    filaTitulos: 6,
    altos: { 1: 22, 6: 30 },
  };
}

function hojaMovimientos(mov: MovimientosMesDTO, empresa: EmpresaLibro): Hoja {
  const filas: Fila[] = [
    [t('Movimientos de la tienda web y Puntos ES', 'titulo')],
    [t(`${empresa.nombre}${empresa.rif ? ` · RIF ${empresa.rif}` : ''}`, 'subtitulo')],
    [t(mesTitulo(mov.periodo), 'subtitulo')],
    [],
    [t('Forma de pago / Concepto', 'encabezado'), t('Órdenes', 'encabezado'), t('Total USD', 'encabezado'), t('Total Bs.', 'encabezado')],
    ...mov.porMetodo.map((r): Fila => [t(r.metodo), { v: r.ordenes, e: 'entero' }, m(r.totalUSD), m(r.totalBs)]),
    [t('Total cobrado en el mes', 'total'), { v: mov.porMetodo.reduce((s, r) => s + r.ordenes, 0), e: 'entero' }, m(mov.totalCobradoUSD), m(mov.totalCobradoBs)],
    [],
    [t('Puntos ES · Recargas aprobadas (USD)', 'etiqueta'), null, { v: mov.puntosES.recargasUSD, e: 'cifra' }],
    [t('Puntos ES · Consumos en tienda (USD)', 'etiqueta'), null, { v: mov.puntosES.consumosUSD, e: 'cifra' }],
    [t('Puntos ES · Devoluciones por garantía (USD)', 'etiqueta'), null, { v: mov.puntosES.devolucionesUSD, e: 'cifra' }],
    [t('Puntos ES · Comisiones promotores (USD)', 'etiqueta'), null, { v: mov.puntosES.comisionesPromotoresUSD, e: 'cifra' }],
    [t('Puntos ES · Adeudado a clientes al cierre (USD)', 'total'), null, { v: mov.puntosES.pasivoCierreUSD, e: 'totalMonto' }],
  ];
  return {
    nombre: 'Movimientos',
    anchos: [44, 12, 16, 18],
    filas,
    combinar: ['A1:D1', 'A2:D2', 'A3:D3'],
    altos: { 1: 22, 5: 28 },
  };
}

export function paqueteContableXlsx(params: {
  libro: LibroVentas;
  compras: CompraGastoDTO[];
  iva: PeriodoContableDTO;
  obligaciones: ObligacionFiscalDTO[];
  movimientos: MovimientosMesDTO;
  empresa: EmpresaLibro;
  firma: FirmaDTO | null;
  generado?: Date;
}): { nombre: string; datos: Buffer } {
  const generado = params.generado ?? new Date();
  const ventas = hojaLibroVentas(params.libro, params.empresa, generado);
  if (params.firma) {
    ventas.filas.push([t(`Firmado contablemente por: ${params.firma.nombre} (${params.firma.titulo} · C.P.C. ${params.firma.cpc}) · Generado ${fechaCorta(hoyVe(generado))}`, 'nota')]);
  }
  const datos = escribirXlsx(
    [
      ventas,
      hojaCompras(params.compras, params.empresa, params.libro.periodo),
      hojaResumenIva(params.iva, params.empresa, params.firma),
      hojaObligaciones(params.obligaciones, params.empresa, params.libro.periodo),
      hojaMovimientos(params.movimientos, params.empresa),
    ],
    {
      titulo: `Contabilidad ${nombreMes(params.libro.periodo)}`,
      autor: params.empresa.nombre || 'Electro Shop',
    },
    generado,
  );
  return { nombre: `contabilidad-${params.libro.periodo}.xlsx`, datos };
}
