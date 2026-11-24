// C-229 y G-76: lo que sale del servidor de Contabilidad hacia el panel. Lista blanca estricta: montos en números,
// fechas en ISO y nada de la orden ni costos internos hacia roles sin permiso.

import type { CompraGasto, ConfigContable, DocumentoFiscal, ObligacionFiscal, PeriodoContable, Talonario } from '@prisma/client';
import type { Renglon } from '@/lib/contabilidad/montos';
import { etiquetaFactura, numeroControl, numeroFactura, quedan, usadas } from '@/lib/contabilidad/talonario';

export interface TalonarioDTO {
  id: string;
  uso: 'NORMAL' | 'CONTINGENCIA';
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
  proximoTexto: string | null;
  proximoControl: string | null;
}

export function talonarioDTO(t: Talonario): TalonarioDTO {
  const hay = t.estado === 'EN_USO' && t.proximo <= t.numeroHasta;
  return {
    id: t.id,
    uso: t.uso === 'CONTINGENCIA' ? 'CONTINGENCIA' : 'NORMAL',
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
  etiqueta: string;
  emitidaEl: string;
  emitidaHora: string | null;
  monedaOperacion: string;
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
  ivaRetenidoBs: number | null;
  comprobanteRetencion: string | null;
  retencionFecha: string | null;
  documentoAfectadoId: string | null;
  imprentaProveedor: string | null;
  pdfPrivadoRuta: string | null;
  estadoTransmision: string;
  contingenciaCausal: string | null;
  contingenciaReportadaEl: string | null;
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

export function etiquetaDocumento(d: { tipo: string; serie: string | null; numero: number; talonario?: Talonario | null }): { numeroTexto: string; etiqueta: string } {
  const numeroTexto = d.talonario ? numeroFactura(d.talonario, d.numero) : String(d.numero).padStart(4, '0');
  const prefijo = d.serie ?? (d.tipo === 'NOTA_CREDITO' ? 'NC' : d.tipo === 'NOTA_DEBITO' ? 'ND' : '');
  return { numeroTexto, etiqueta: etiquetaFactura(prefijo || null, numeroTexto) };
}

export function facturaDTO(
  d: DocumentoFiscal & { talonario?: Talonario | null; ordenes?: Array<{ id: string; orderNumber: string }> },
  nombres: Record<string, string> = {},
): FacturaDTO {
  const { numeroTexto, etiqueta } = etiquetaDocumento(d);
  return {
    id: d.id,
    tipo: d.tipo,
    medio: d.medio,
    serie: d.serie,
    numero: d.numero,
    numeroTexto,
    numeroControl: d.numeroControl,
    etiqueta,
    emitidaEl: d.emitidaEl.toISOString(),
    emitidaHora: d.emitidaHora ?? null,
    monedaOperacion: d.monedaOperacion,
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
    ivaRetenidoBs: d.ivaRetenidoBs === null ? null : n(d.ivaRetenidoBs),
    comprobanteRetencion: d.comprobanteRetencion ?? null,
    retencionFecha: d.retencionFecha ? d.retencionFecha.toISOString() : null,
    documentoAfectadoId: d.documentoAfectadoId ?? null,
    imprentaProveedor: d.imprentaProveedor ?? null,
    pdfPrivadoRuta: d.pdfPrivadoRuta ?? null,
    estadoTransmision: d.estadoTransmision,
    contingenciaCausal: d.contingenciaCausal ?? null,
    contingenciaReportadaEl: d.contingenciaReportadaEl ? d.contingenciaReportadaEl.toISOString() : null,
    ordenes: d.ordenes ?? [],
    talonario: d.talonario ? talonarioDTO(d.talonario) : null,
    creadoPor: nombres[d.creadoPorId] ?? null,
    anuladaPor: d.anuladaPorId ? (nombres[d.anuladaPorId] ?? null) : null,
    registradaEl: d.createdAt.toISOString(),
  };
}

export interface CompraGastoDTO {
  id: string;
  periodo: string;
  fechaEmision: string;
  proveedorNombre: string;
  proveedorRif: string;
  supplierId: string | null;
  numeroFactura: string;
  numeroControl: string;
  categoria: string;
  descripcion: string | null;
  baseBs: number;
  alicuota: number;
  ivaBs: number;
  exentoBs: number;
  totalBs: number;
  retencionIslrBs: number;
  comprobanteIslr: string | null;
  archivoPrivado: string | null;
  estadoRevision: 'PENDIENTE' | 'REVISADA' | 'FALTA_ALGO';
  notaRevision: string | null;
  revisadaEl: string | null;
}

export function compraGastoDTO(c: CompraGasto): CompraGastoDTO {
  return {
    id: c.id,
    periodo: c.periodo,
    fechaEmision: c.fechaEmision.toISOString(),
    proveedorNombre: c.proveedorNombre,
    proveedorRif: c.proveedorRif,
    supplierId: c.supplierId,
    numeroFactura: c.numeroFactura,
    numeroControl: c.numeroControl,
    categoria: c.categoria,
    descripcion: c.descripcion,
    baseBs: n(c.baseBs),
    alicuota: n(c.alicuota),
    ivaBs: n(c.ivaBs),
    exentoBs: n(c.exentoBs),
    totalBs: n(c.totalBs),
    retencionIslrBs: n(c.retencionIslrBs),
    comprobanteIslr: c.comprobanteIslr,
    archivoPrivado: c.archivoPrivado,
    estadoRevision: c.estadoRevision === 'REVISADA' ? 'REVISADA' : c.estadoRevision === 'FALTA_ALGO' ? 'FALTA_ALGO' : 'PENDIENTE',
    notaRevision: c.notaRevision,
    revisadaEl: c.revisadaEl ? c.revisadaEl.toISOString() : null,
  };
}

export interface ObligacionFiscalDTO {
  id: string;
  periodo: string;
  tipo: string;
  titulo: string;
  detalle: string | null;
  venceEl: string;
  montoBs: number;
  montoUSD: number | null;
  estado: 'POR_CALCULAR' | 'LISTA_PAGAR' | 'PAGADA';
  quienToca: 'CONTADORA' | 'DUENO' | 'LISTO';
  numeroPlanilla: string | null;
  comprobanteIslr: string | null;
  planillaPrivada: string | null;
  comprobantePagoPrivado: string | null;
  nominaEmpleados: number | null;
  nominaSalariosBs: number | null;
  nominaBonosBs: number | null;
  pagadaEl: string | null;
}

export function obligacionDTO(o: ObligacionFiscal): ObligacionFiscalDTO {
  return {
    id: o.id,
    periodo: o.periodo,
    tipo: o.tipo,
    titulo: o.titulo,
    detalle: o.detalle,
    venceEl: o.venceEl.toISOString(),
    montoBs: n(o.montoBs),
    montoUSD: o.montoUSD === null ? null : n(o.montoUSD),
    estado: o.estado === 'PAGADA' ? 'PAGADA' : o.estado === 'LISTA_PAGAR' ? 'LISTA_PAGAR' : 'POR_CALCULAR',
    quienToca: o.quienToca === 'DUENO' ? 'DUENO' : o.quienToca === 'LISTO' ? 'LISTO' : 'CONTADORA',
    numeroPlanilla: o.numeroPlanilla,
    comprobanteIslr: o.comprobanteIslr,
    planillaPrivada: o.planillaPrivada,
    comprobantePagoPrivado: o.comprobantePagoPrivado,
    nominaEmpleados: o.nominaEmpleados,
    nominaSalariosBs: o.nominaSalariosBs === null ? null : n(o.nominaSalariosBs),
    nominaBonosBs: o.nominaBonosBs === null ? null : n(o.nominaBonosBs),
    pagadaEl: o.pagadaEl ? o.pagadaEl.toISOString() : null,
  };
}

export interface PeriodoContableDTO {
  periodo: string;
  estado: 'ABIERTO' | 'DECLARADO' | 'CERRADO';
  excedenteAnteriorBs: number;
  debitoFiscalBs: number;
  creditoFiscalBs: number;
  retencionesIvaBs: number;
  ivaAPagarBs: number;
  nuevoExcedenteBs: number;
  numeroPlanillaIva: string | null;
  planillaIvaPrivada: string | null;
  comprobantePagoIvaPrivado: string | null;
  declaradoEl: string | null;
  pagadoEl: string | null;
  cerradoEl: string | null;
  firmaNombre: string | null;
  firmaTitulo: string | null;
  firmaCpc: string | null;
}

export function periodoDTO(p: PeriodoContable): PeriodoContableDTO {
  return {
    periodo: p.periodo,
    estado: p.estado === 'CERRADO' ? 'CERRADO' : p.estado === 'DECLARADO' ? 'DECLARADO' : 'ABIERTO',
    excedenteAnteriorBs: n(p.excedenteAnteriorBs),
    debitoFiscalBs: n(p.debitoFiscalBs),
    creditoFiscalBs: n(p.creditoFiscalBs),
    retencionesIvaBs: n(p.retencionesIvaBs),
    ivaAPagarBs: n(p.ivaAPagarBs),
    nuevoExcedenteBs: n(p.nuevoExcedenteBs),
    numeroPlanillaIva: p.numeroPlanillaIva,
    planillaIvaPrivada: p.planillaIvaPrivada,
    comprobantePagoIvaPrivado: p.comprobantePagoIvaPrivado,
    declaradoEl: p.declaradoEl ? p.declaradoEl.toISOString() : null,
    pagadoEl: p.pagadoEl ? p.pagadoEl.toISOString() : null,
    cerradoEl: p.cerradoEl ? p.cerradoEl.toISOString() : null,
    firmaNombre: p.firmaNombre,
    firmaTitulo: p.firmaTitulo,
    firmaCpc: p.firmaCpc,
  };
}

export interface Hito2027 {
  id: string;
  texto: string;
  hecho: boolean;
}

export interface ConfigContableDTO {
  canalEmision: 'TALONARIO' | 'PORTAL_SENIAT' | 'IMPRENTA_DIGITAL';
  imprentaProveedor: string | null;
  imprentaAmbiente: 'SANDBOX' | 'PRODUCCION';
  imprentaSerieDigital: string;
  imprentaProximoNumero: number;
  imprentaApiUrl: string | null;
  imprentaApiKeyConfigurada: boolean;
  alcaldiaAlicuota: number;
  alcaldiaMinimoBs: number;
  alcaldiaDiaLimite: number;
  ivaDiaLimite: number;
  alquilerArrendador: string | null;
  alquilerRif: string | null;
  alquilerTipo: 'PERSONA' | 'EMPRESA';
  alquilerCanonUSD: number;
  alquilerConIva: boolean;
  alquilerDiaPago: number;
  alquilerVenceEl: string | null;
  pensionesPorcentaje: number;
  pensionesDiaLimite: number;
  nominaBaseMinimaUSD: number;
  checklist2027: Hito2027[];
  avisosTelegram: boolean;
}

export const CHECKLIST_2027_BASE: Hito2027[] = [
  { id: 'c1', texto: 'Confirmar criterios fiscales con la contadora (digitales exentos y Puntos ES).', hecho: false },
  { id: 'c2', texto: 'Tener talonario de contingencia autorizado en el local (casilla hora y leyenda 00093).', hecho: false },
  { id: 'c3', texto: 'Probar emisión en el medio digital elegido (ene–mar 2027).', hecho: false },
  { id: 'c4', texto: '19/04/2027: anular facturas ordinarias sobrantes y avisar cambio de medio al SENIAT.', hecho: false },
  { id: 'c5', texto: 'Hasta 04/05/2027: pedir permiso de destrucción de sobrantes (15 días continuos, art. 24).', hecho: false },
];

export function configContableDTO(c: ConfigContable): ConfigContableDTO {
  const lista = Array.isArray(c.checklist2027)
    ? (c.checklist2027 as unknown[]).filter((x): x is Hito2027 => Boolean(x && typeof x === 'object' && 'id' in x && 'texto' in x))
    : CHECKLIST_2027_BASE;
  return {
    canalEmision: c.canalEmision === 'IMPRENTA_DIGITAL' ? 'IMPRENTA_DIGITAL' : c.canalEmision === 'PORTAL_SENIAT' ? 'PORTAL_SENIAT' : 'TALONARIO',
    imprentaProveedor: c.imprentaProveedor,
    imprentaAmbiente: c.imprentaAmbiente === 'PRODUCCION' ? 'PRODUCCION' : 'SANDBOX',
    imprentaSerieDigital: c.imprentaSerieDigital,
    imprentaProximoNumero: c.imprentaProximoNumero,
    imprentaApiUrl: c.imprentaApiUrl,
    imprentaApiKeyConfigurada: Boolean(process.env.IMPRENTA_DIGITAL_API_KEY?.trim()),
    alcaldiaAlicuota: n(c.alcaldiaAlicuota),
    alcaldiaMinimoBs: n(c.alcaldiaMinimoBs),
    alcaldiaDiaLimite: c.alcaldiaDiaLimite,
    ivaDiaLimite: c.ivaDiaLimite,
    alquilerArrendador: c.alquilerArrendador,
    alquilerRif: c.alquilerRif,
    alquilerTipo: c.alquilerTipo === 'PERSONA' ? 'PERSONA' : 'EMPRESA',
    alquilerCanonUSD: n(c.alquilerCanonUSD),
    alquilerConIva: c.alquilerConIva,
    alquilerDiaPago: c.alquilerDiaPago,
    alquilerVenceEl: c.alquilerVenceEl ? c.alquilerVenceEl.toISOString().slice(0, 10) : null,
    pensionesPorcentaje: n(c.pensionesPorcentaje),
    pensionesDiaLimite: c.pensionesDiaLimite,
    nominaBaseMinimaUSD: n(c.nominaBaseMinimaUSD),
    checklist2027: lista.length ? lista : CHECKLIST_2027_BASE,
    avisosTelegram: c.avisosTelegram,
  };
}

export interface MovimientosMesDTO {
  periodo: string;
  totalCobradoUSD: number;
  totalCobradoBs: number;
  porMetodo: Array<{ metodo: string; ordenes: number; totalUSD: number; totalBs: number }>;
  puntosES: {
    recargasUSD: number;
    consumosUSD: number;
    devolucionesUSD: number;
    comisionesPromotoresUSD: number;
    pasivoCierreUSD: number;
  };
  giftCards: {
    emitidasCantidad: number;
    emitidasUSD: number;
    canjeadasUSD: number;
  };
  /** Exclusivo del Dueño (SUPER_ADMIN). Jamás se envía a Contadora ni a Admin. */
  costos: {
    ventasNetasSinIvaUSD: number;
    costoMercanciaUSD: number;
    margenBrutoUSD: number;
    margenPorcentaje: number;
    ordenesSinCosto: number;
  } | null;
}
