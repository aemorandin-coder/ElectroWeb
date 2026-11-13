// C-212: las reglas del sorteo (Andrés, 13/11: la PlayStation 4 reacondicionada, con el resultado el 20/12). Módulo puro,
// sin Prisma, para poder probarlo solo. Los boletos no se guardan: se cuentan de las órdenes pagadas y de las invitaciones
// cada vez, y se congelan en una lista al sortear.
// - Por compra: 1 boleto por cada compra pagada de la compra mínima o más en productos (el envío no suma). Una compra
//   que se partió en dos paquetes (C-199) cuenta como una. Cancelada o devuelta, no cuenta.
// - Sin comprar: 1 boleto por cada 2 amigos que se registran con tu enlace y verifican su correo, hasta un tope.
// - El equipo no participa. El ganador sale al azar entre todos los boletos.

import { createHash, randomInt } from 'node:crypto';

/** Dos órdenes del mismo cliente con menos de esto entre sí son la misma compra: C-199 crea los dos paquetes en el mismo pedido */
export const MISMA_COMPRA_MS = 30 * 1000;

export interface OrdenParaSorteo {
  orderNumber: string;
  subtotalUSD: number;
  createdAt: Date;
  /** PAID, y la orden no está cancelada ni devuelta */
  pagada: boolean;
}

export interface CompraConBoleto {
  /** "ORD-2026-0041" o "ORD-2026-0041 y ORD-2026-0042" */
  ordenes: string;
  subtotalUSD: number;
  fecha: Date;
}

/** Las compras de un cliente que dan boleto: las pagadas dentro de las fechas, juntando los paquetes de una misma compra */
export function comprasConBoleto(ordenes: OrdenParaSorteo[], desde: Date, hasta: Date, minimoUSD: number): CompraConBoleto[] {
  const validas = ordenes
    .filter((o) => o.pagada && o.createdAt >= desde && o.createdAt <= hasta)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const compras: Array<{ numeros: string[]; subtotal: number; fecha: Date; ultima: Date }> = [];
  for (const o of validas) {
    const anterior = compras[compras.length - 1];
    if (anterior && o.createdAt.getTime() - anterior.ultima.getTime() <= MISMA_COMPRA_MS) {
      anterior.numeros.push(o.orderNumber);
      anterior.subtotal += o.subtotalUSD;
      anterior.ultima = o.createdAt;
    } else {
      compras.push({ numeros: [o.orderNumber], subtotal: o.subtotalUSD, fecha: o.createdAt, ultima: o.createdAt });
    }
  }
  return compras
    .filter((c) => Math.round(c.subtotal * 100) >= Math.round(minimoUSD * 100))
    .map((c) => ({ ordenes: c.numeros.join(' y '), subtotalUSD: Math.round(c.subtotal * 100) / 100, fecha: c.fecha }));
}

export interface InvitadoParaSorteo {
  correoVerificado: boolean;
  telefono: string | null;
  cedula: string | null;
}

const soloCifras = (texto: string | null) => (texto ?? '').replace(/\D/g, '');

/**
 * Los invitados que cuentan: con el correo verificado y un teléfono, sin repetir un teléfono (ni una cédula, si la tiene)
 * ya contados en este sorteo (`yaUsados`, que se va llenando: así dos cuentas de la misma persona valen una sola vez). La
 * cédula no se exige: el registro no la pide (se pide en la primera compra, C-85).
 */
export function invitadosValidos(invitados: InvitadoParaSorteo[], yaUsados: Set<string>): number {
  let validos = 0;
  for (const i of invitados) {
    const telefono = soloCifras(i.telefono).slice(-10);
    const cedula = soloCifras(i.cedula);
    if (!i.correoVerificado || telefono.length < 10) continue;
    if (yaUsados.has(`t${telefono}`) || (cedula.length >= 5 && yaUsados.has(`c${cedula}`))) continue;
    yaUsados.add(`t${telefono}`);
    if (cedula.length >= 5) yaUsados.add(`c${cedula}`);
    validos++;
  }
  return validos;
}

/** 1 boleto por cada 2 invitados válidos, hasta el tope */
export const boletosPorInvitar = (validos: number, tope: number) => Math.min(Math.floor(validos / 2), Math.max(0, tope));

export interface Boleto {
  userId: string;
  email: string;
  /** "Compra ORD-2026-0041 ($24,50)" o "Invitó a 2 amigos" */
  detalle: string;
}

/** La huella de la lista de boletos: se guarda al sortear, para poder mostrar que la lista no cambió después */
export function huellaDe(boletos: Boleto[]): string {
  return createHash('sha256').update(boletos.map((b) => `${b.userId}|${b.detalle}`).join('\n')).digest('hex');
}

/** El ganador, al azar entre todos los boletos (cada boleto es una oportunidad). null si no hay boletos */
export function sortear(boletos: Boleto[], azar: (max: number) => number = randomInt): { indice: number; boleto: Boleto } | null {
  if (boletos.length === 0) return null;
  const indice = azar(boletos.length);
  return { indice, boleto: boletos[indice] };
}

/** "andres.morandin@gmail.com" → "an***@gmail.com": lo que se publica del ganador */
export function correoTapado(email: string): string {
  const [usuario, dominio] = email.split('@');
  if (!dominio) return '***';
  return `${usuario.slice(0, 2)}***@${dominio}`;
}

/** El código del enlace de cada participante: 8 letras y cifras, sin las que se confunden (0/O, 1/I/L) */
export function codigoNuevo(azar: (max: number) => number = randomInt): string {
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => letras[azar(letras.length)]).join('');
}

export const esCodigoSorteo = (valor: string | null | undefined): valor is string => typeof valor === 'string' && /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/.test(valor);
