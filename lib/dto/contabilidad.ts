// C-229: lo que sale del servidor de Contabilidad hacia el panel. Lista blanca: montos en números, fechas en ISO y
// nada de la orden que no vaya en la factura (ni costos ni notas internas).

import type { DocumentoFiscal, Talonario } from '@prisma/client';
import type { Renglon } from '@/lib/contabilidad/montos';
import { etiquetaFactura, numeroControl, numeroFactura, quedan, usadas } from '@/lib/contabilidad/talonario';

export interface TalonarioDTO {
  id: string;
  serie: string;
  numeroDesde: number;
  numeroHasta: number;
  proximo: number;
  controlSerie: string;
  controlDesde: number;
  controlHasta: number;
  emisorNombre: string;
  emisorRif: string;
  emisorDomicilio: string;
  emisorTelefono: string | null;
  imprenta: string;
  imprentaRif: string;
  autorizacion: string;
  elaboradoEl: string | null;
  estado: string;
  quedan: number;
  usadas: number;
  /** "0072" y "00-000572", o null si se agotó */
  proximoTexto: string | null;
  proximoControl: string | null;
}

export function talonarioDTO(t: Talonario): TalonarioDTO {
  const hay = t.estado === 'EN_USO' && t.proximo <= t.numeroHasta;
  return {
    id: t.id,
    serie: t.serie,
    numeroDesde: t.numeroDesde,
    numeroHasta: t.numeroHasta,
    proximo: t.proximo,
    controlSerie: t.controlSerie,
    controlDesde: t.controlDesde,
    controlHasta: t.controlHasta,
    emisorNombre: t.emisorNombre,
    emisorRif: t.emisorRif,
    emisorDomicilio: t.emisorDomicilio,
    emisorTelefono: t.emisorTelefono,
    imprenta: t.imprenta,
    imprentaRif: t.imprentaRif,
    autorizacion: t.autorizacion,
    elaboradoEl: t.elaboradoEl ? t.elaboradoEl.toISOString() : null,
    estado: t.estado,
    quedan: quedan(t),
    usadas: usadas(t),
    proximoTexto: hay ? numeroFactura(t, t.proximo) : null,
    proximoControl: hay ? numeroControl(t, t.proximo) : null,
  };
}

export interface CompradorDTO {
  tipo: 'PERSONA' | 'EMPRESA';
  nombre: string;
  documento: string;
  domicilio: string;
  telefono: string;
}

export interface FacturaDTO {
  id: string;
  tipo: string;
  medio: string;
  serie: string | null;
  numero: number;
  numeroTexto: string;
  numeroControl: string;
  /** "A-0072" */
  etiqueta: string;
  emitidaEl: string;
  periodo: string;
  estado: 'EMITIDA' | 'ANULADA';
  motivoAnulacion: string | null;
  anuladaEl: string | null;
  origen: string;
  comprador: CompradorDTO | null;
  condicionPago: 'CONTADO' | 'CREDITO';
  renglones: Renglon[];
  descuentoBs: number;
  baseBs: number;
  alicuota: number;
  ivaBs: number;
  exentoBs: number;
  totalBs: number;
  totalUSD: number | null;
  tasa: number | null;
  ordenes: Array<{ id: string; orderNumber: string }>;
  talonario: TalonarioDTO | null;
  creadoPor: string | null;
  anuladaPor: string | null;
  registradaEl: string;
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** Los renglones guardados, leídos con cuidado (es JSON) */
export function leerRenglones(valor: unknown): Renglon[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
    .map((r) => ({
      cantidad: n(r.cantidad),
      descripcion: typeof r.descripcion === 'string' ? r.descripcion : '',
      exento: r.exento === true,
      precioUnitarioBs: n(r.precioUnitarioBs),
      montoBs: n(r.montoBs),
    }));
}

export function facturaDTO(
  d: DocumentoFiscal & { talonario?: Talonario | null; ordenes?: Array<{ id: string; orderNumber: string }> },
  nombres: Record<string, string> = {},
): FacturaDTO {
  const numeroTexto = d.talonario ? numeroFactura(d.talonario, d.numero) : String(d.numero).padStart(4, '0');
  return {
    id: d.id,
    tipo: d.tipo,
    medio: d.medio,
    serie: d.serie,
    numero: d.numero,
    numeroTexto,
    numeroControl: d.numeroControl,
    etiqueta: etiquetaFactura(d.serie, numeroTexto),
    emitidaEl: d.emitidaEl.toISOString(),
    periodo: d.periodo,
    estado: d.estado === 'ANULADA' ? 'ANULADA' : 'EMITIDA',
    motivoAnulacion: d.motivoAnulacion,
    anuladaEl: d.anuladaEl ? d.anuladaEl.toISOString() : null,
    origen: d.origen,
    comprador: d.compradorNombre
      ? {
          tipo: d.compradorTipo === 'EMPRESA' ? 'EMPRESA' : 'PERSONA',
          nombre: d.compradorNombre,
          documento: d.compradorDocumento ?? '',
          domicilio: d.compradorDomicilio ?? '',
          telefono: d.compradorTelefono ?? '',
        }
      : null,
    condicionPago: d.condicionPago === 'CREDITO' ? 'CREDITO' : 'CONTADO',
    renglones: leerRenglones(d.renglones),
    descuentoBs: n(d.descuentoBs),
    baseBs: n(d.baseBs),
    alicuota: n(d.alicuota),
    ivaBs: n(d.ivaBs),
    exentoBs: n(d.exentoBs),
    totalBs: n(d.totalBs),
    totalUSD: d.totalUSD === null ? null : n(d.totalUSD),
    tasa: d.tasa === null ? null : n(d.tasa),
    ordenes: d.ordenes ?? [],
    talonario: d.talonario ? talonarioDTO(d.talonario) : null,
    creadoPor: nombres[d.creadoPorId] ?? null,
    anuladaPor: d.anuladaPorId ? (nombres[d.anuladaPorId] ?? null) : null,
    registradaEl: d.createdAt.toISOString(),
  };
}
