// Destino y destinatario de una orden física (C-100). Solo servidor.
// El checkout manda códigos (ciudad, oficina); el nombre y la dirección de la oficina salen de la lista
// de ZOOM o MRW, no del navegador. El texto legible de `shippingAddress` también lo arma el servidor.

import { z } from 'zod';
import { documentoSchema, nombreSchema, telefonoSchema } from '@/lib/validations/registro';
import { NOMBRE_EMPRESA, nombreEstado, type Empresa, type ModoEnvio } from '@/lib/envios/empresas';
import { ciudadesZoom, oficinasZoom } from '@/lib/envios/zoom';
import { agenciasMrw } from '@/lib/envios/mrw';
import type { DeliveryMethod } from '@/lib/pricing';

const textoLibre = (max: number) =>
  z.string().transform((v) => v.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).pipe(z.string().max(max, 'Es muy largo'));

const envioSchema = z.object({
  carrier: z.enum(['ZOOM', 'MRW']).optional(),
  mode: z.enum(['OFFICE', 'DOOR']).optional(),
  state: textoLibre(60).optional(),
  cityCode: z.string().regex(/^\d{1,6}$/).optional(),
  city: textoLibre(80).optional(),
  officeCode: z.string().regex(/^[0-9A-Za-z-]{1,20}$/).optional(),
  address: textoLibre(250).optional(),
  reference: textoLibre(150).optional(),
  recipient: z.object({
    name: nombreSchema,
    idNumber: documentoSchema,
    phone: telefonoSchema,
  }),
});

export class DestinoError extends Error {
  field: string;
  constructor(message: string, field: string) {
    super(message);
    this.name = 'DestinoError';
    this.field = field;
  }
}

/** Lo que se guarda en la orden física. */
export interface DestinoOrden {
  shippingAddress: string;
  shippingCarrier: Empresa | null;
  shippingMode: ModoEnvio | null;
  shippingState: string | null;
  shippingCity: string | null;
  courierCityCode: string | null;
  courierOfficeCode: string | null;
  courierOfficeName: string | null;
  courierOfficeAddress: string | null;
  recipientName: string | null;
  recipientIdNumber: string | null;
  recipientPhone: string | null;
}

const VACIO: DestinoOrden = {
  shippingAddress: 'Retiro en tienda',
  shippingCarrier: null,
  shippingMode: null,
  shippingState: null,
  shippingCity: null,
  courierCityCode: null,
  courierOfficeCode: null,
  courierOfficeName: null,
  courierOfficeAddress: null,
  recipientName: null,
  recipientIdNumber: null,
  recipientPhone: null,
};

function exigirDireccion(address: string | undefined): string {
  if (!address || address.length < 10) {
    throw new DestinoError('Escribe la dirección completa: calle, casa o edificio y un punto de referencia.', 'address');
  }
  return address;
}

export async function leerDestino(raw: unknown, deliveryMethod: DeliveryMethod): Promise<DestinoOrden> {
  if (deliveryMethod === 'PICKUP') return VACIO;

  const parseado = envioSchema.safeParse(raw ?? {});
  if (!parseado.success) {
    const problema = parseado.error.issues[0];
    const campo = problema?.path.join('.') || 'shipping';
    throw new DestinoError(
      campo.startsWith('recipient') ? `Datos de quien recibe: ${problema?.message ?? 'revísalos'}` : 'Revisa los datos del envío.',
      campo
    );
  }
  const envio = parseado.data;
  const destinatario = {
    recipientName: envio.recipient.name,
    recipientIdNumber: envio.recipient.idNumber,
    recipientPhone: envio.recipient.phone,
  };
  const referencia = envio.reference ? ` Referencia: ${envio.reference}.` : '';

  if (deliveryMethod === 'LOCAL_DELIVERY') {
    const direccion = exigirDireccion(envio.address);
    return {
      ...VACIO,
      ...destinatario,
      shippingAddress: `Delivery en Guanare: ${direccion}.${referencia}`,
      shippingState: 'Portuguesa',
      shippingCity: 'Guanare',
    };
  }

  // SHIPPING: ZOOM o MRW, en oficina o puerta a puerta
  if (!envio.carrier) throw new DestinoError('Elige ZOOM o MRW.', 'carrier');
  if (!envio.mode) throw new DestinoError('Elige si retiras en oficina o lo recibes en tu casa.', 'mode');
  const empresa = NOMBRE_EMPRESA[envio.carrier];

  if (envio.carrier === 'ZOOM') {
    if (!envio.cityCode) throw new DestinoError('Elige la ciudad.', 'cityCode');
    const ciudades = await ciudadesZoom();
    if (!ciudades) throw new DestinoError('No pudimos confirmar el destino con ZOOM. Intenta en unos minutos o elige MRW.', 'cityCode');
    const ciudad = ciudades.find((c) => c.codigo === envio.cityCode);
    if (!ciudad) throw new DestinoError('ZOOM no hace envíos con cobro a destino a esa ciudad. Elige otra o usa MRW.', 'cityCode');

    const base = {
      ...VACIO,
      ...destinatario,
      shippingCarrier: 'ZOOM' as const,
      shippingMode: envio.mode,
      shippingState: ciudad.estado,
      shippingCity: ciudad.nombre,
      courierCityCode: ciudad.codigo,
    };

    if (envio.mode === 'OFFICE') {
      if (!envio.officeCode) throw new DestinoError('Elige la oficina donde vas a retirar.', 'officeCode');
      const oficinas = await oficinasZoom(ciudad.codigo);
      if (!oficinas) throw new DestinoError('No pudimos confirmar la oficina con ZOOM. Intenta en unos minutos o elige MRW.', 'officeCode');
      const oficina = oficinas.find((o) => o.codigo === envio.officeCode);
      if (!oficina) throw new DestinoError('Esa oficina de ZOOM ya no recibe envíos con cobro a destino. Elige otra.', 'officeCode');
      return {
        ...base,
        courierOfficeCode: oficina.codigo,
        courierOfficeName: oficina.nombre,
        courierOfficeAddress: oficina.direccion || null,
        shippingAddress: `${empresa} · Retiro en oficina ${oficina.nombre} (código ${oficina.codigo}), ${ciudad.nombre}, ${ciudad.estado}.${oficina.direccion ? ` ${oficina.direccion}.` : ''}`,
      };
    }

    const direccion = exigirDireccion(envio.address);
    return {
      ...base,
      shippingAddress: `${empresa} · A domicilio: ${direccion}, ${ciudad.nombre}, ${ciudad.estado}.${referencia}`,
    };
  }

  // MRW: agencias de su lista; puerta a puerta con ciudad escrita
  const agencias = await agenciasMrw();
  if (envio.mode === 'OFFICE') {
    if (!envio.officeCode) throw new DestinoError('Elige la agencia donde vas a retirar.', 'officeCode');
    const agencia = agencias.find((a) => a.codigo === envio.officeCode);
    if (!agencia) throw new DestinoError('Esa agencia de MRW no aparece en su lista. Elige otra.', 'officeCode');
    return {
      ...VACIO,
      ...destinatario,
      shippingCarrier: 'MRW',
      shippingMode: 'OFFICE',
      shippingState: agencia.estado,
      shippingCity: agencia.nombre,
      courierOfficeCode: agencia.codigo,
      courierOfficeName: agencia.nombre,
      courierOfficeAddress: agencia.direccion || null,
      shippingAddress: `${empresa} · Retiro en agencia ${agencia.nombre} (código ${agencia.codigo}), ${agencia.estado}.${agencia.direccion ? ` ${agencia.direccion}.` : ''}`,
    };
  }

  const estado = envio.state ? nombreEstado(envio.state) : '';
  if (!estado || !agencias.some((a) => a.estado === estado)) throw new DestinoError('Elige el estado.', 'state');
  if (!envio.city || envio.city.length < 2) throw new DestinoError('Escribe la ciudad.', 'city');
  const direccion = exigirDireccion(envio.address);
  return {
    ...VACIO,
    ...destinatario,
    shippingCarrier: 'MRW',
    shippingMode: 'DOOR',
    shippingState: estado,
    shippingCity: envio.city,
    shippingAddress: `${empresa} · A domicilio: ${direccion}, ${envio.city}, ${estado}.${referencia}`,
  };
}
