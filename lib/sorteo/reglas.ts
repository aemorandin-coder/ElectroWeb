// C-212: las reglas del sorteo (Andrés, 13/11: la PlayStation 4 reacondicionada, con el resultado el 20/12). Módulo puro,
// sin Prisma, para poder probarlo solo. Los boletos no se guardan: se cuentan de las órdenes pagadas y de las invitaciones
// cada vez, y se congelan en una lista al sortear.
// - Por compra: 1 boleto por cada compra pagada de la compra mínima o más en productos (el envío no suma). Una compra
//   que se partió en dos paquetes (C-199) cuenta como una. Cancelada o devuelta, no cuenta.
// - Invitando amigos: 1 boleto por cada 2 amigos que se registran con tu enlace y activan su cuenta, hasta un tope. Cada
//   persona cuenta una sola vez en todo el sorteo, para quien la invitó primero (C-264).
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

/** 1 boleto por cada 2 invitados válidos, hasta el tope */
export const boletosPorInvitar = (validos: number, tope: number) => Math.min(Math.floor(validos / 2), Math.max(0, tope));

/** C-262: el estado de cada amigo invitado, como lo ve quien invita (y como cuenta en el sorteo, C-264) */
export type EstadoAmigo = 'cuenta' | 'falta-activar' | 'falta-telefono' | 'repetido';

/** C-264: una invitación del sorteo: el amigo (su usuario) y cuándo se registró con el enlace */
export interface InvitacionDelSorteo extends InvitadoParaSorteo {
  amigoId: string;
  /** Cuándo se registró con el enlace: el orden de "quien lo invitó primero" */
  fecha: Date;
}

/**
 * C-264: todas las invitaciones del sorteo repartidas de una vez. El equipo, 15/11, viendo el caso dibujado (la misma
 * persona con dos cuentas, cada una con el enlace de alguien distinto): "para quien lo invitó primero". Una persona (un
 * teléfono, o una cédula si la tiene) cuenta una sola vez en todo el sorteo, para quien la invitó primero entre sus
 * cuentas que ya cuentan. Antes cada cliente contaba a sus amigos por su lado (los dos la veían como "Cuenta") y la lista
 * del sorteo se la daba a quien había entrado antes al sorteo: Luis creía tener un boleto y el día del sorteo no lo tenía.
 * Lo usan la pantalla de cada cliente, la lista que se sortea y los avisos, así que lo que se ve es lo que cuenta:
 * - `cuenta`: activó su cuenta, tiene teléfono y su teléfono (o su cédula) no contó antes;
 * - `falta-activar`: no abrió el enlace del correo (mientras tanto no se queda con su teléfono);
 * - `falta-telefono`: entró con Google o sin teléfono: cuenta cuando lo agrega en su cuenta;
 * - `repetido`: su teléfono o su cédula ya contaron con una cuenta que se registró antes.
 * La cédula no se exige: el registro no la pide (se pide en la primera compra, C-85).
 */
export function repartirInvitaciones(invitaciones: InvitacionDelSorteo[]): Map<string, EstadoAmigo> {
  const orden = [...invitaciones].sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || a.amigoId.localeCompare(b.amigoId));
  const usados = new Set<string>();
  const estados = new Map<string, EstadoAmigo>();
  for (const i of orden) {
    if (!i.correoVerificado) {
      estados.set(i.amigoId, 'falta-activar');
      continue;
    }
    const telefono = soloCifras(i.telefono).slice(-10);
    if (telefono.length < 10) {
      estados.set(i.amigoId, 'falta-telefono');
      continue;
    }
    const cedula = soloCifras(i.cedula);
    if (usados.has(`t${telefono}`) || (cedula.length >= 5 && usados.has(`c${cedula}`))) {
      estados.set(i.amigoId, 'repetido');
      continue;
    }
    usados.add(`t${telefono}`);
    if (cedula.length >= 5) usados.add(`c${cedula}`);
    estados.set(i.amigoId, 'cuenta');
  }
  return estados;
}

/**
 * C-262: cuántos amigos más hacen falta para el próximo boleto por invitar (1 o 2), o 0 si ya se ganaron todos los del tope.
 * `validos` son los que cuentan.
 */
export function faltanParaProximo(validos: number, tope: number): number {
  if (tope <= 0 || boletosPorInvitar(validos, tope) >= tope) return 0;
  return 2 - (validos % 2);
}

/** C-262: "Luisa Pérez" → "Luisa P.": cómo ve quien invita a cada amigo (sin el correo ni el teléfono) */
export function nombreCorto(nombre: string | null | undefined): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'Un amigo';
  const primero = partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
  if (partes.length === 1) return primero;
  return `${primero} ${partes[partes.length - 1].charAt(0).toUpperCase()}.`;
}

export interface Boleto {
  userId: string;
  email: string;
  /** "Compra ORD-2026-0041 ($24,50)" o "Invitó a 2 amigos" */
  detalle: string;
  /** C-263: el código del boleto ("F3E-XEP"), el mismo que ve el cliente. No entra en la huella de la lista */
  codigo: string;
}

/** C-263: de dónde salió un boleto, para su código: la compra (su primera orden) o el n.º de par de amigos del participante */
export const origenDeCompra = (ordenes: string) => `compra:${ordenes.split(' y ')[0]}`;
export const origenDeAmigos = (codigoParticipante: string, par: number) => `amigos:${codigoParticipante}:${par}`;

/**
 * C-263: el código de un boleto, calculado de lo que lo originó y sin guardarlo: la huella (sha256) del sorteo y del origen,
 * escrita con las 31 letras y cifras del código para invitar (sin 0/O ni 1/I/L), 6 caracteres: "F3E-XEP". No cambia cuando
 * entran boletos de otros (no es un número de la lista) y el panel lo calcula igual para cada boleto de la lista que se
 * sortea. Hay 887 millones: con 2.000 boletos, 2 en 1.000 de que dos se repitan (el panel los muestra igual, con su detalle).
 */
export function codigoDeBoleto(sorteoId: string, origen: string): string {
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let n = createHash('sha256').update(`${sorteoId}|${origen}`).digest().readUIntBE(0, 5) % letras.length ** 6;
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo = letras[n % letras.length] + codigo;
    n = Math.floor(n / letras.length);
  }
  return `${codigo.slice(0, 3)}-${codigo.slice(3)}`;
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
