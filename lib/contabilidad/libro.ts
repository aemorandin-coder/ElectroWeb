// C-230: el libro de ventas del mes, armado con las facturas del talonario. Módulo puro (el servidor le pasa los
// documentos; el Excel y la pantalla leen lo mismo).
//
// Lo que pidió la contadora el 16/11 (docs/plan/CONTABILIDAD.md §9): una línea por factura, con la fecha, el número de
// factura, el número de control, el RIF, el nombre, la base imponible, el total de la venta, el IVA y el comprobante de
// retención. Los montos van en el orden de siempre del libro (total, exento, base, alícuota, IVA y lo retenido).
// - Orden cronológico; el mismo día, por número.
// - Una factura anulada (o un papel que se dañó sin usar) se lista con "ANULADA" y en cero: no suma.
// - Una nota de crédito resta. El talonario de hoy no las emite, pero el libro ya las sabe leer.

import { hoyVe, r2 } from './montos';

export interface DocumentoParaLibro {
  id: string;
  tipo: string;
  estado: string;
  origen: string;
  etiqueta: string;
  numeroControl: string;
  emitidaEl: Date;
  compradorDocumento: string | null;
  compradorNombre: string | null;
  totalBs: number;
  exentoBs: number;
  baseBs: number;
  alicuota: number;
  ivaBs: number;
  ivaRetenidoBs: number | null;
  comprobanteRetencion: string | null;
}

export interface FilaLibro {
  id: string;
  /** El n.º de operación: 1, 2, 3… en el orden del libro */
  operacion: number;
  /** "2026-11-16", en hora de Venezuela */
  fecha: string;
  factura: string;
  control: string;
  documento: string;
  nombre: string;
  anulada: boolean;
  notaCredito: boolean;
  totalBs: number;
  exentoBs: number;
  baseBs: number;
  /** La alícuota, solo si la factura tiene algo gravado */
  alicuota: number | null;
  ivaBs: number;
  ivaRetenidoBs: number;
  comprobante: string;
}

export interface TotalesLibro {
  totalBs: number;
  exentoBs: number;
  baseBs: number;
  ivaBs: number;
  ivaRetenidoBs: number;
}

export interface LibroVentas {
  periodo: string;
  filas: FilaLibro[];
  totales: TotalesLibro;
  /** Lo gravado de cada alícuota: lo que va en la declaración */
  porAlicuota: Array<{ alicuota: number; baseBs: number; ivaBs: number }>;
  emitidas: number;
  anuladas: number;
  /** Las que retuvo un contribuyente especial (con su comprobante) */
  conRetencion: number;
}

const cero = (): TotalesLibro => ({ totalBs: 0, exentoBs: 0, baseBs: 0, ivaBs: 0, ivaRetenidoBs: 0 });

export function armarLibro(periodo: string, documentos: DocumentoParaLibro[]): LibroVentas {
  const orden = [...documentos].sort((a, b) => a.emitidaEl.getTime() - b.emitidaEl.getTime() || a.etiqueta.localeCompare(b.etiqueta, 'es', { numeric: true }));
  const totales = cero();
  const alicuotas = new Map<number, { baseBs: number; ivaBs: number }>();
  let emitidas = 0;
  let anuladas = 0;
  let conRetencion = 0;

  const filas = orden.map((d, i): FilaLibro => {
    const anulada = d.estado === 'ANULADA';
    const notaCredito = d.tipo === 'NOTA_CREDITO';
    const signo = notaCredito ? -1 : 1;
    const monto = (n: number | null) => (anulada ? 0 : r2(signo * (Number(n) || 0)));
    const fila: FilaLibro = {
      id: d.id,
      operacion: i + 1,
      fecha: hoyVe(d.emitidaEl),
      factura: d.etiqueta,
      control: d.numeroControl,
      documento: anulada ? '' : (d.compradorDocumento ?? ''),
      nombre: anulada ? 'ANULADA' : (d.compradorNombre ?? '').trim(),
      anulada,
      notaCredito,
      totalBs: monto(d.totalBs),
      exentoBs: monto(d.exentoBs),
      baseBs: monto(d.baseBs),
      alicuota: !anulada && Number(d.baseBs) > 0 ? Number(d.alicuota) : null,
      ivaBs: monto(d.ivaBs),
      ivaRetenidoBs: monto(d.ivaRetenidoBs),
      comprobante: anulada ? '' : (d.comprobanteRetencion ?? ''),
    };
    if (anulada) {
      anuladas++;
      return fila;
    }
    emitidas++;
    if (fila.ivaRetenidoBs !== 0) conRetencion++;
    totales.totalBs = r2(totales.totalBs + fila.totalBs);
    totales.exentoBs = r2(totales.exentoBs + fila.exentoBs);
    totales.baseBs = r2(totales.baseBs + fila.baseBs);
    totales.ivaBs = r2(totales.ivaBs + fila.ivaBs);
    totales.ivaRetenidoBs = r2(totales.ivaRetenidoBs + fila.ivaRetenidoBs);
    if (fila.alicuota !== null) {
      const a = alicuotas.get(fila.alicuota) ?? { baseBs: 0, ivaBs: 0 };
      alicuotas.set(fila.alicuota, { baseBs: r2(a.baseBs + fila.baseBs), ivaBs: r2(a.ivaBs + fila.ivaBs) });
    }
    return fila;
  });

  return {
    periodo,
    filas,
    totales,
    porAlicuota: [...alicuotas.entries()].sort((a, b) => b[0] - a[0]).map(([alicuota, v]) => ({ alicuota, ...v })),
    emitidas,
    anuladas,
    conRetencion,
  };
}

/** "16/11/2026" */
export function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
