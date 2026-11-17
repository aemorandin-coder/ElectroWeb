// C-229: lo que aceptan las rutas de Contabilidad. Del navegador solo llegan elecciones y textos: los montos de una
// orden, el número de la factura y su control los pone el servidor (CLAUDE.md, reglas de dinero).

import { z } from 'zod';
import { FECHA, normalizarDocumento } from './montos';
import { SERIE, SERIE_CONTROL } from './talonario';

const texto = (min: number, max: number, mensaje: string) => z.string().trim().min(min, mensaje).max(max, mensaje);

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
const condicion = z.enum(['CONTADO', 'CREDITO']);
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

/** Lo que se pide al preparar (y al emitir) una factura de talonario */
export const pedidoFacturaSchema = z.discriminatedUnion('origen', [
  z
    .object({
      origen: z.literal('ORDEN'),
      /** Una o dos órdenes de la misma compra (la física y la digital) */
      ordenIds: z.array(z.string().min(1).max(40)).min(1).max(4),
      /** Las descripciones corregidas (un serial, un nombre más corto), en el orden de los renglones */
      descripciones: z.array(texto(1, 90, 'Cada descripción, hasta 90 letras.')).max(60).optional(),
      comprador: compradorSchema.optional(),
      condicionPago: condicion.default('CONTADO'),
      fecha,
      /** Sin ella, la de hoy de Configuración (solo si la fecha es hoy) */
      tasa: tasa.optional(),
      numeroEsperado: z.number().int().positive().optional(),
    })
    .strict(),
  z
    .object({
      origen: z.literal('TIENDA'),
      renglones: z.array(renglonManual).min(1, 'Agrega por lo menos un renglón.').max(12, 'El talonario tiene 12 renglones.'),
      tasa,
      comprador: compradorSchema,
      condicionPago: condicion.default('CONTADO'),
      fecha,
      numeroEsperado: z.number().int().positive().optional(),
    })
    .strict(),
]);

export type PedidoFactura = z.infer<typeof pedidoFacturaSchema>;

export const motivoSchema = z
  .object({
    motivo: texto(5, 200, 'Escribe el motivo, de 5 a 200 letras.'),
    numeroEsperado: z.number().int().positive().optional(),
  })
  .strict();

const entero = (mensaje: string) => z.number({ error: mensaje }).int(mensaje).min(1, mensaje).max(99_999_999, mensaje);

export const talonarioSchema = z
  .object({
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
