// C-222: cómo se dice desde dónde sale un producto. El equipo, 14/11: "Sale desde La Victoria" no lo entiende quien no
// conoce La Victoria; el estado sí. Eligió "Desde Aragua" con el ícono de ubicación (la A de las maquetas de C-220). La
// tarjeta dice el estado; la ficha, la ciudad y el estado; el carrito, el pago, el pedido y el correo, los dos. Todo sale
// de aquí, para que se diga igual en todos lados. Sin Prisma: sirve en el navegador.

/** La tienda despacha desde aquí (ZOOM: Guanare, código 43) */
export const ORIGEN_TIENDA_CIUDAD = 'Guanare';
export const ORIGEN_TIENDA_ESTADO = 'Portuguesa';

export interface Origen {
  ciudad: string;
  /** El estado de ZOOM ("Aragua"). Vacío si todavía no se sabe: se dice la ciudad */
  estado: string;
  /** Sale de la tienda (Guanare): se puede retirar ahí */
  propio: boolean;
}

export const ORIGEN_TIENDA: Origen = { ciudad: ORIGEN_TIENDA_CIUDAD, estado: ORIGEN_TIENDA_ESTADO, propio: true };

/** C-224: el equipo, 14/11: "Tenemos 14 años en el mercado de Portuguesa, ahora vamos a toda Venezuela" (desde 2012) */
export const TIENDA_DESDE = 2012;
export const aniosDeLaTienda = (hoy: Date = new Date()) => hoy.getFullYear() - TIENDA_DESDE;

/** "aragua", "nueva-esparta": el estado en la dirección del filtro del catálogo (`?desde=`) */
export function slugEstado(estado: string): string {
  return estado.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** El nombre corto, para la tarjeta y el filtro: el estado, o la ciudad si no se sabe el estado */
export const lugarDe = (o: Pick<Origen, 'ciudad' | 'estado'>) => o.estado || o.ciudad;

/** "Sale de La Victoria, estado Aragua": la ficha */
export function saleDe(o: Pick<Origen, 'ciudad' | 'estado'>): string {
  return o.estado ? `Sale de ${o.ciudad}, estado ${o.estado}` : `Sale de ${o.ciudad}`;
}

/** "desde Aragua (La Victoria)": un paquete, en el carrito, el pago, el pedido y el correo. `mayuscula` para empezar una frase */
export function paqueteDesde(estado: string | null | undefined, ciudad: string | null | undefined, mayuscula = false): string {
  const texto = estado && ciudad ? `desde ${estado} (${ciudad})` : `desde ${estado || ciudad || 'otra ciudad'}`;
  return mayuscula ? `D${texto.slice(1)}` : texto;
}
