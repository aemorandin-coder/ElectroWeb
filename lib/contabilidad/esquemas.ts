// C-229 y G-76: lo que aceptan las rutas de Contabilidad 2.0. Del navegador solo llegan elecciones y textos: los montos
// de una orden, el número de la factura y su control los pone el servidor o la imprenta digital autorizada.

import { z } from 'zod';
import { FECHA, HORA_24, normalizarDocumento } from './montos';
import { SERIE, SERIE_CONTROL } from './talonario';
import { contabilidadFileName } from '@/lib/private-uploads';

const texto = (min: number, max: number, mensaje: string) => z.string().trim().min(min, mensaje).max(max, mensaje);

export const MEDIOS_EMISION = ['TALONARIO', 'PORTAL_SENIAT', 'IMPRENTA_DIGITAL'] as const;
export const USOS_TALONARIO = ['NORMAL', 'CONTINGENCIA'] as const;

export const CAUSALES_CONTINGENCIA = [
  'Corte eléctrico prolongado',
  'Falla de internet',
  'Mantenimiento del portal SENIAT',
  'Avería del medio principal',
] as const;

export const CATEGORIAS_COMPRA = [
  'Mercancía',
  'Fletes (ZOOM / MRW)',
  'Embalaje y papelería',
  'Servicios (luz, agua, internet)',
  'Alquiler del local',
  'Honorarios profesionales',
  'Publicidad',
  'Mantenimiento',
  'Comisiones bancarias',
  'Impuestos y tasas',
  'Otros',
] as const;

export const compradorSchema = z
  .object({
    nombre: texto(2, 120, 'El nombre o la razón social, de 2 a 120 letras.'),
    documento: z.string().trim().transform((v, ctx) => {
      const n = normalizarDocumento(v);
      if (!n) ctx.addIssue({ code: 'custom', message: 'El RIF, la cédula o el pasaporte: una letra (V, E, J, G, P o C) y sus números.' });
      return n ?? v;
    }),
    domicilio: z.string().trim().max(200, 'El domicilio fiscal, hasta 200 letras.').optional().default(''),
    telefono: z.string().trim().max(30, 'El teléfono, hasta 30 caracteres.').optional().default(''),
  })
  .strict();

const fecha = z.string().regex(FECHA, 'La fecha de emisión no es válida.');
const horaOpcional = z.string().regex(HORA_24, 'La hora debe tener formato HH:MM:SS.').optional();
const periodoRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const condicion = z.enum(['CONTADO', 'CREDITO']);
const monedaOperacion = z.enum(['VES', 'USD']).default('VES');
const archivoPrivadoOpcional = z
  .string()
  .trim()
  .refine((v) => v === '' || contabilidadFileName(v), 'El archivo adjunto no es válido.')
  .optional();

/** C-230: la tasa BCV del día en que se escribe la factura (la contadora, 16/11), no la de la orden */
const tasa = z.number().positive('La tasa BCV tiene que ser mayor que 0.').max(100_000_000);

const renglonManual = z
  .object({
    cantidad: z.number().int('La cantidad va sin decimales.').min(1, 'La cantidad, de 1 en adelante.').max(9999),
    descripcion: texto(2, 90, 'La descripción, de 2 a 90 letras.'),
    exento: z.boolean(),
    /** El precio publicado, en dólares y con el IVA adentro si es gravado */
    precioUSD: z.number().positive('El precio tiene que ser mayor que 0.').max(1_000_000),
  })
  .strict();

const camposDigitalesOpcionales = {
  medio: z.enum(MEDIOS_EMISION).optional(),
  monedaOperacion: monedaOperacion.optional(),
  horaEmision: horaOpcional,
  contingenciaCausal: z.string().trim().max(120).optional(),
  numeroExterno: z.number().int().positive().max(99_999_999).optional(),
  numeroControlExterno: z.string().trim().min(4).max(30).optional(),
  pdfPrivadoRuta: archivoPrivadoOpcional,
  llaveIdempotencia: z.string().trim().min(8).max(80).optional(),
};

/** Lo que se pide al preparar (y al emitir) una factura */
export const pedidoFacturaSchema = z.discriminatedUnion('origen', [
  z
    .object({
      origen: z.literal('ORDEN'),
      ordenIds: z.array(z.string().min(1).max(40)).min(1).max(4),
      descripciones: z.array(texto(1, 90, 'Cada descripción, hasta 90 letras.')).max(60).optional(),
      comprador: compradorSchema.optional(),
      condicionPago: condicion.default('CONTADO'),
      fecha,
      tasa: tasa.optional(),
      numeroEsperado: z.number().int().positive().optional(),
      ...camposDigitalesOpcionales,
    })
    .strict(),
  z
    .object({
      origen: z.literal('TIENDA'),
      renglones: z.array(renglonManual).min(1, 'Agrega por lo menos un renglón.').max(60, 'Máximo 60 renglones por documento.'),
      tasa,
      comprador: compradorSchema,
      condicionPago: condicion.default('CONTADO'),
      fecha,
      numeroEsperado: z.number().int().positive().optional(),
      ...camposDigitalesOpcionales,
    })
    .strict(),
]);

export type PedidoFactura = z.infer<typeof pedidoFacturaSchema>;

/** G-76: emisión de Nota de Crédito o Nota de Débito vinculada a una factura emitida (00093 art. 12 y 13) */
export const notaFiscalSchema = z
  .object({
    tipo: z.enum(['NOTA_CREDITO', 'NOTA_DEBITO']),
    documentoAfectadoId: z.string().min(1).max(40),
    motivo: texto(5, 200, 'Escribe el motivo de la nota (de 5 a 200 letras).'),
    fecha,
    horaEmision: horaOpcional,
    tasa: tasa.optional(),
    montoUSD: z.number().positive('El monto debe ser mayor que 0.').max(1_000_000).optional(),
    exento: z.boolean().optional().default(false),
    renglones: z.array(renglonManual).min(1).max(60).optional(),
    numeroExterno: z.number().int().positive().max(99_999_999).optional(),
    numeroControlExterno: z.string().trim().min(4).max(30).optional(),
    pdfPrivadoRuta: archivoPrivadoOpcional,
    llaveIdempotencia: z.string().trim().min(8).max(80).optional(),
  })
  .strict();

export type PedidoNotaFiscal = z.infer<typeof notaFiscalSchema>;

/** G-76: comprobante de retención de IVA recibido de un contribuyente especial (14 dígitos) */
export const retencionIvaSchema = z
  .object({
    ivaRetenidoBs: z.number().positive('El monto retenido debe ser mayor que 0.').max(1_000_000_000),
    comprobanteRetencion: z.string().trim().regex(/^\d{14}$/, 'El número de comprobante debe tener 14 dígitos (AAAAMMSSSSSSSS).'),
    retencionFecha: fecha,
  })
  .strict();

/** G-76: reporte al día siguiente de una factura emitida en contingencia (00093 art. 7) */
export const reportarContingenciaSchema = z
  .object({
    pdfPrivadoRuta: archivoPrivadoOpcional,
    numeroDigitalReferencia: z.string().trim().max(40).optional(),
  })
  .strict();

export const motivoSchema = z
  .object({
    motivo: texto(5, 200, 'Escribe el motivo, de 5 a 200 letras.'),
    numeroEsperado: z.number().int().positive().optional(),
  })
  .strict();

const entero = (mensaje: string) => z.number({ error: mensaje }).int(mensaje).min(1, mensaje).max(99_999_999, mensaje);

export const talonarioSchema = z
  .object({
    uso: z.enum(USOS_TALONARIO).optional().default('NORMAL'),
    serie: z.string().trim().toUpperCase().regex(SERIE, 'La serie: de 1 a 3 letras o números, como está impresa ("A").'),
    numeroDesde: entero('El primer número de factura.'),
    numeroHasta: entero('El último número de factura.'),
    proximo: entero('La próxima factura por usar.'),
    controlSerie: z.string().trim().regex(SERIE_CONTROL, 'Las dos cifras antes del guion ("00").'),
    controlDesde: entero('El primer número de control.'),
    controlHasta: entero('El último número de control.'),
    emisorNombre: texto(3, 120, 'La razón social, como está impresa.'),
    emisorRif: z.string().trim().transform((v, ctx) => {
      const n = normalizarDocumento(v);
      if (!n) ctx.addIssue({ code: 'custom', message: 'El RIF de la empresa, como está impreso (J-40590333-3).' });
      return n ?? v;
    }),
    emisorDomicilio: texto(10, 300, 'El domicilio fiscal, como está impreso.'),
    emisorTelefono: z.string().trim().max(40).optional().default(''),
    imprenta: texto(3, 120, 'El nombre de la imprenta, como está en el pie.'),
    imprentaRif: z.string().trim().transform((v, ctx) => {
      const n = normalizarDocumento(v);
      if (!n) ctx.addIssue({ code: 'custom', message: 'El RIF de la imprenta, como está en el pie.' });
      return n ?? v;
    }),
    autorizacion: texto(5, 120, 'La providencia de autorización de la imprenta, como está en el pie.'),
    elaboradoEl: z.union([fecha, z.literal('')]).optional().default(''),
  })
  .strict();

export type DatosTalonario = z.infer<typeof talonarioSchema>;

/** G-76: carga de compra o gasto para Libro de Compras y crédito fiscal */
export const compraGastoSchema = z
  .object({
    fechaEmision: fecha,
    proveedorNombre: texto(2, 120, 'Nombre o razón social del proveedor.'),
    proveedorRif: z.string().trim().transform((v, ctx) => {
      const n = normalizarDocumento(v);
      if (!n) ctx.addIssue({ code: 'custom', message: 'RIF o cédula del proveedor (ej. J-30112233-4).' });
      return n ?? v;
    }),
    supplierId: z.string().trim().max(40).optional(),
    numeroFactura: texto(1, 30, 'El número de factura.'),
    numeroControl: texto(1, 30, 'El número de control.'),
    categoria: texto(2, 60, 'Elige la categoría.'),
    descripcion: z.string().trim().max(200).optional().default(''),
    baseBs: z.number().min(0).max(1_000_000_000),
    alicuota: z.number().min(0).max(30).default(16),
    ivaBs: z.number().min(0).max(1_000_000_000),
    exentoBs: z.number().min(0).max(1_000_000_000).default(0),
    retencionIslrBs: z.number().min(0).max(1_000_000_000).optional().default(0),
    comprobanteIslr: z.string().trim().refine((v) => v === '' || /^\d{14}$/.test(v), 'El comprobante de retención ISLR debe tener 14 dígitos.').optional().default(''),
    archivoPrivado: archivoPrivadoOpcional,
  })
  .strict();

export const revisarCompraSchema = z
  .object({
    estadoRevision: z.enum(['PENDIENTE', 'REVISADA', 'FALTA_ALGO']),
    notaRevision: z.string().trim().max(240).optional().default(''),
  })
  .strict();

/** G-76: actualización de obligaciones mensuales (Alcaldía, IVA, Pensiones, Alquiler) */
export const obligacionUpdateSchema = z
  .object({
    id: z.string().min(1).max(40),
    estado: z.enum(['POR_CALCULAR', 'LISTA_PAGAR', 'PAGADA']).optional(),
    montoBs: z.number().min(0).max(1_000_000_000).optional(),
    montoUSD: z.number().min(0).max(10_000_000).nullable().optional(),
    numeroPlanilla: z.string().trim().max(50).nullable().optional(),
    comprobanteIslr: z.string().trim().refine((v) => v === '' || /^\d{14}$/.test(v), 'Comprobante de 14 dígitos.').nullable().optional(),
    planillaPrivada: archivoPrivadoOpcional,
    comprobantePagoPrivado: archivoPrivadoOpcional,
    nominaEmpleados: z.number().int().min(0).max(500).nullable().optional(),
    nominaSalariosBs: z.number().min(0).max(1_000_000_000).nullable().optional(),
    nominaBonosBs: z.number().min(0).max(1_000_000_000).nullable().optional(),
  })
  .strict();

/** G-76: hoja de IVA y cierre mensual firmado con candado */
export const cierrePeriodoSchema = z
  .object({
    periodo: z.string().regex(periodoRegex, 'Mes inválido (YYYY-MM).'),
    accion: z.enum(['ACTUALIZAR_EXCEDENTE', 'DECLARAR', 'PAGAR', 'CERRAR', 'REABRIR']),
    excedenteAnteriorBs: z.number().min(0).max(1_000_000_000).optional(),
    numeroPlanillaIva: z.string().trim().max(50).optional(),
    planillaIvaPrivada: archivoPrivadoOpcional,
    comprobantePagoIvaPrivado: archivoPrivadoOpcional,
  })
  .strict();

/** G-76: configuración contable y parámetros 2027 (solo dueño) */
export const configContableSchema = z
  .object({
    canalEmision: z.enum(MEDIOS_EMISION),
    imprentaProveedor: z.enum(['GENERICO_REST', 'THE_FACTORY_HKA', 'OTRO']).nullable().optional(),
    imprentaAmbiente: z.enum(['SANDBOX', 'PRODUCCION']).default('SANDBOX'),
    imprentaSerieDigital: z.string().trim().toUpperCase().regex(SERIE, 'Serie digital de 1 a 3 caracteres.').default('F'),
    imprentaProximoNumero: z.number().int().min(1).max(99_999_999).default(1),
    imprentaApiUrl: z.string().trim().refine((v) => v === '' || /^https:\/\/.+/i.test(v), 'La URL de la imprenta debe iniciar por https://').nullable().optional(),
    alcaldiaAlicuota: z.number().min(0).max(10).default(1.5),
    alcaldiaMinimoBs: z.number().min(0).max(1_000_000_000).default(0),
    alcaldiaDiaLimite: z.number().int().min(1).max(28).default(10),
    ivaDiaLimite: z.number().int().min(1).max(28).default(15),
    alquilerArrendador: z.string().trim().max(120).nullable().optional(),
    alquilerRif: z.string().trim().refine((v) => v === '' || Boolean(normalizarDocumento(v)), 'RIF del arrendador inválido.').nullable().optional(),
    alquilerTipo: z.enum(['PERSONA', 'EMPRESA']).default('EMPRESA'),
    alquilerCanonUSD: z.number().min(0).max(100_000).default(0),
    alquilerConIva: z.boolean().default(false),
    alquilerDiaPago: z.number().int().min(1).max(28).default(5),
    alquilerVenceEl: z.union([fecha, z.literal('')]).nullable().optional(),
    pensionesPorcentaje: z.number().min(0).max(30).default(9),
    pensionesDiaLimite: z.number().int().min(1).max(28).default(18),
    nominaBaseMinimaUSD: z.number().min(0).max(10_000).default(0),
    checklist2027: z.array(z.object({ id: z.string().max(20), texto: z.string().max(240), hecho: z.boolean() }).strict()).max(12).optional(),
    avisosTelegram: z.boolean().default(true),
  })
  .strict();

export type ConfigContableInput = z.infer<typeof configContableSchema>;
