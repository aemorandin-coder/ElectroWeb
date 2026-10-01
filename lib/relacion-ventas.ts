// Relación de ventas del mes (C-147): la lista de órdenes pagadas, con su base, su IVA y su factura, para el contador.
// No es un libro de ventas ni un documento fiscal: es lo que la tienda cobró por la web, ordenado.
// Módulo puro: el mes en hora de Venezuela, los totales y el archivo CSV.

export interface FilaVenta {
  /** Fecha del pago (ISO) */
  fecha: string;
  orden: string;
  factura: string | null;
  cliente: string;
  /** Cédula o RIF */
  documento: string;
  tipo: 'Persona' | 'Empresa';
  domicilioFiscal: string | null;
  baseUSD: number;
  ivaUSD: number;
  totalUSD: number;
  tasa: number;
  totalBs: number;
  pago: string;
  /** Parte pagada con Puntos ES */
  puntosUSD: number;
  /** Cancelada o reembolsada después de pagarse: se lista y no suma */
  anulada: boolean;
}

export interface TotalesVentas {
  ordenes: number;
  anuladas: number;
  sinFactura: number;
  baseUSD: number;
  ivaUSD: number;
  totalUSD: number;
  totalBs: number;
  puntosUSD: number;
}

/** Venezuela está en UTC−4 todo el año */
const DESFASE_HORAS = 4;

/** "2026-09" → el mes completo en hora de Venezuela. null si no es un mes válido. */
export function rangoMes(mes: string | null | undefined): { desde: Date; hasta: Date } | null {
  const partes = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(mes ?? '');
  if (!partes) return null;
  const anio = Number(partes[1]);
  const m = Number(partes[2]);
  if (anio < 2020 || anio > 2100) return null;
  return { desde: new Date(Date.UTC(anio, m - 1, 1, DESFASE_HORAS)), hasta: new Date(Date.UTC(anio, m, 1, DESFASE_HORAS)) };
}

/** El mes de hoy en Venezuela ("2026-10") */
export function mesActual(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit' }).format(ahora).slice(0, 7);
}

const centimos = (n: number) => Math.round(n * 100);

/** Suma solo las órdenes válidas: una anulada se lista, pero no cuenta. */
export function totalesVentas(filas: FilaVenta[]): TotalesVentas {
  const validas = filas.filter((f) => !f.anulada);
  const suma = (campo: 'baseUSD' | 'ivaUSD' | 'totalUSD' | 'totalBs' | 'puntosUSD') => validas.reduce((total, f) => total + centimos(f[campo]), 0) / 100;
  return {
    ordenes: validas.length,
    anuladas: filas.length - validas.length,
    sinFactura: validas.filter((f) => !f.factura).length,
    baseUSD: suma('baseUSD'),
    ivaUSD: suma('ivaUSD'),
    totalUSD: suma('totalUSD'),
    totalBs: suma('totalBs'),
    puntosUSD: suma('puntosUSD'),
  };
}

const fechaVe = (iso: string) => new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
/** Número con coma decimal y sin separador de miles: como lo lee Excel en español */
const numero = (n: number) => n.toFixed(2).replace('.', ',');

/**
 * Celda de texto: entre comillas y, si empieza por = + - o @, con un apóstrofo delante.
 * El nombre y el domicilio los escribe el cliente: sin esto, "=HYPERLINK(...)" se ejecutaría al abrir el archivo.
 */
export function celda(valor: string | null | undefined): string {
  const texto = (valor ?? '').replace(/[\r\n\t]+/g, ' ').trim();
  const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

const COLUMNAS = [
  'Fecha de pago', 'Orden', 'Factura n.º', 'Cliente', 'Cédula o RIF', 'Tipo', 'Domicilio fiscal',
  'Base imponible USD', 'IVA USD', 'Total USD', 'Tasa BCV', 'Total Bs.', 'Forma de pago', 'Pagado con Puntos ES USD', 'Estado',
];

/** El archivo: punto y coma entre columnas (Excel en español) y una fila de totales al final. */
export function csvRelacionVentas(filas: FilaVenta[]): string {
  const totales = totalesVentas(filas);
  const lineas = [
    COLUMNAS.map(celda).join(';'),
    ...filas.map((f) => [
      celda(fechaVe(f.fecha)), celda(f.orden), celda(f.factura), celda(f.cliente), celda(f.documento), celda(f.tipo), celda(f.domicilioFiscal),
      numero(f.baseUSD), numero(f.ivaUSD), numero(f.totalUSD), numero(f.tasa), numero(f.totalBs), celda(f.pago), numero(f.puntosUSD),
      celda(f.anulada ? 'Anulada (no suma)' : 'Válida'),
    ].join(';')),
    [
      celda('Totales (sin las anuladas)'), celda(`${totales.ordenes} órdenes`), '', '', '', '', '',
      numero(totales.baseUSD), numero(totales.ivaUSD), numero(totales.totalUSD), '', numero(totales.totalBs), '', numero(totales.puntosUSD), '',
    ].join(';'),
  ];
  return lineas.join('\r\n');
}
