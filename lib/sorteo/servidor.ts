// C-212: el sorteo en el servidor: el vigente, los boletos de cada uno, la lista completa para el panel y el sorteo en sí.
// Las reglas están en reglas.ts (puras). Solo servidor.

import { cache } from 'react';
import type { Sorteo } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  boletosPorInvitar, codigoDeBoleto, codigoNuevo, comprasConBoleto, correoTapado, esCodigoSorteo, faltanParaProximo, huellaDe, nombreCorto,
  origenDeAmigos, origenDeCompra, repartirInvitaciones, sortear,
  type Boleto, type CompraConBoleto, type EstadoAmigo, type InvitacionDelSorteo, type OrdenParaSorteo,
} from './reglas';
import { avisarAmigoRegistrado } from './avisos';

/** De cada $1 vendido quedan unos 20 centavos (costo + 30 % + IVA): para estimar lo que dejó el sorteo */
export const MARGEN_ESTIMADO = 0.3 / 1.508;

/** El sorteo que se ve en la tienda: el activo más reciente. null si no hay ninguno */
export const getSorteoVigente = cache(async (): Promise<Sorteo | null> =>
  prisma.sorteo.findFirst({ where: { activo: true }, orderBy: { createdAt: 'desc' } }));

/** El participante de un cliente en el sorteo (con su código para invitar). Lo crea la primera vez */
export async function participanteDe(sorteoId: string, userId: string, invitadoPorId: string | null = null) {
  const existente = await prisma.participanteSorteo.findUnique({ where: { sorteoId_userId: { sorteoId, userId } } });
  if (existente) return existente;
  for (let intento = 0; intento < 5; intento++) {
    try {
      return await prisma.participanteSorteo.create({ data: { sorteoId, userId, codigo: codigoNuevo(), invitadoPorId } });
    } catch (error) {
      // Otro pedido lo creó a la vez, o el código salió repetido: se lee o se prueba otro
      const ya = await prisma.participanteSorteo.findUnique({ where: { sorteoId_userId: { sorteoId, userId } } });
      if (ya) return ya;
      if (intento === 4) throw error;
    }
  }
  throw new Error('No se pudo crear el participante');
}

/**
 * Un cliente nuevo que llegó por el enlace de otro (la cookie del enlace, proxy.ts): queda como su invitado. Si el código
 * no es de este sorteo, si se invita a sí mismo o el sorteo ya cerró, no pasa nada.
 */
export async function registrarInvitacion(codigo: string | null | undefined, nuevoUserId: string): Promise<boolean> {
  if (!esCodigoSorteo(codigo)) return false;
  const sorteo = await getSorteoVigente();
  if (!sorteo || new Date() > sorteo.hasta) return false;
  const invita = await prisma.participanteSorteo.findUnique({ where: { codigo } });
  if (!invita || invita.sorteoId !== sorteo.id || invita.userId === nuevoUserId) return false;
  const participante = await participanteDe(sorteo.id, nuevoUserId, invita.id);
  // C-255: true solo si quedó como su invitado (el correo de activación se lo dice)
  const quedo = participante.invitadoPorId === invita.id;
  // C-262: a quien invitó le llega a la campana que su amigo se unió, y qué le falta para contar
  if (quedo) await avisarAmigoRegistrado(invita.userId, nuevoUserId);
  return quedo;
}

/** C-255: si un código para invitar es de un participante del sorteo vigente (para decirle al que llega "te invitó un amigo") */
export async function esInvitacionVigente(codigo: string | null | undefined, sorteoId: string): Promise<boolean> {
  if (!esCodigoSorteo(codigo)) return false;
  const invita = await prisma.participanteSorteo.findUnique({ where: { codigo }, select: { sorteoId: true } });
  return invita?.sorteoId === sorteoId;
}

const ESTADOS_QUE_NO_CUENTAN = ['CANCELLED', 'REFUNDED'] as const;

function ordenesParaSorteo(filas: Array<{ orderNumber: string; subtotalUSD: unknown; createdAt: Date; paymentStatus: string; status: string }>): OrdenParaSorteo[] {
  return filas.map((o) => ({
    orderNumber: o.orderNumber,
    subtotalUSD: Number(o.subtotalUSD),
    createdAt: o.createdAt,
    pagada: o.paymentStatus === 'PAID' && !(ESTADOS_QUE_NO_CUENTAN as readonly string[]).includes(o.status),
  }));
}

/** C-264: una invitación del sorteo con quién invitó (su participante) y el nombre del amigo, para la pantalla y los avisos */
export type InvitacionCargada = InvitacionDelSorteo & { invitaId: string; nombre: string | null };
export type InvitacionRepartida = { invitaId: string; amigoId: string; nombre: string | null; estado: EstadoAmigo; fecha: Date };

/**
 * C-264: todas las invitaciones del sorteo (los amigos registrados dentro de las fechas), en el orden en que se
 * registraron con el enlace. Antes se leían las de cada participante por separado.
 */
export async function cargarInvitaciones(sorteo: Sorteo): Promise<InvitacionCargada[]> {
  const filas = await prisma.participanteSorteo.findMany({
    where: { sorteoId: sorteo.id, invitadoPorId: { not: null }, user: { createdAt: { gte: sorteo.desde, lte: sorteo.hasta } } },
    select: {
      userId: true, invitadoPorId: true, createdAt: true,
      user: { select: { name: true, emailVerified: true, profile: { select: { phone: true, idNumber: true } } } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return filas.map((f) => ({
    invitaId: f.invitadoPorId as string, amigoId: f.userId, fecha: f.createdAt, nombre: f.user.name,
    correoVerificado: Boolean(f.user.emailVerified), telefono: f.user.profile?.phone ?? null, cedula: f.user.profile?.idNumber ?? null,
  }));
}

/**
 * C-264: el reparto de todo el sorteo (repartirInvitaciones), en el mismo orden de las invitaciones. `sinContar`: ese amigo
 * como si todavía no contara, para comparar antes y después de que active su cuenta o agregue su teléfono (los avisos).
 */
export function repartir(invitaciones: InvitacionCargada[], sinContar: string | null = null): InvitacionRepartida[] {
  const estados = repartirInvitaciones(invitaciones.map((i) => (i.amigoId === sinContar ? { ...i, correoVerificado: false } : i)));
  return invitaciones.map((i) => ({ invitaId: i.invitaId, amigoId: i.amigoId, nombre: i.nombre, estado: estados.get(i.amigoId) ?? 'falta-activar', fecha: i.fecha }));
}

/** C-264: el reparto de ahora, una vez por pedido */
export const invitacionesDelSorteo = cache(async (sorteo: Sorteo) => repartir(await cargarInvitaciones(sorteo)));

/** C-264: cuántos amigos de un participante cuentan en un reparto */
export const cuentanDe = (reparto: InvitacionRepartida[], invitaId: string) => reparto.filter((i) => i.invitaId === invitaId && i.estado === 'cuenta').length;

/** C-262: un amigo invitado como lo ve quien invita: su nombre corto y su estado (nunca su correo ni su teléfono) */
export interface AmigoInvitado {
  nombre: string;
  estado: EstadoAmigo;
}

/**
 * C-263: un boleto del cliente, como lo dibuja la tienda (el boleto épico). `origen` es lo que dice el boleto; `monto` y
 * `amigos` solo salen en la pantalla, debajo del boleto (ni la imagen que se descarga ni el flyer los llevan).
 */
export interface BoletoDelCliente {
  codigo: string;
  tipo: 'compra' | 'amigos';
  /** "Compra ORD-2026-0041" o "Invitaste a 2 amigos" */
  origen: string;
  /** La compra en productos (USD), o null en uno de amigos */
  monto: number | null;
  /** Los dos amigos del par ("Luisa P."), o [] en uno de compra */
  amigos: string[];
  /** Cuándo nació: la compra, o el registro del segundo amigo del par */
  fecha: Date;
}

export interface BoletosDeCliente {
  compras: CompraConBoleto[];
  invitados: number;
  invitadosValidos: number;
  porInvitar: number;
  total: number;
  /** Su enlace para invitar (la ruta, sin el dominio) */
  enlace: string;
  /** C-262: cada amigo que se registró con su enlace, en orden, con su estado */
  amigos: AmigoInvitado[];
  /** C-262: cuántos amigos más hacen falta para el próximo boleto por invitar (0: ya ganó todos los del tope) */
  faltanParaProximo: number;
  /** Hasta cuántos boletos se ganan invitando en este sorteo */
  tope: number;
  /** C-263: cada boleto, del más viejo al más nuevo, con su código */
  boletos: BoletoDelCliente[];
  /** C-263: su correo tapado ("an***@gmail.com"): así participa, y así se anuncia al ganador */
  correo: string;
  /** C-263: el enlace corto para invitar (la ruta, sin el dominio): /s/<código> */
  enlaceCorto: string;
}

/** Los boletos de un cliente y su enlace para invitar (Mi panel y /sorteo) */
export async function boletosDeCliente(sorteo: Sorteo, userId: string): Promise<BoletosDeCliente> {
  const [participante, ordenes, reparto, usuario] = await Promise.all([
    participanteDe(sorteo.id, userId),
    prisma.order.findMany({
      where: { userId, createdAt: { gte: sorteo.desde, lte: sorteo.hasta } },
      select: { orderNumber: true, subtotalUSD: true, createdAt: true, paymentStatus: true, status: true },
    }),
    invitacionesDelSorteo(sorteo),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ]);
  const compras = comprasConBoleto(ordenesParaSorteo(ordenes), sorteo.desde, sorteo.hasta, Number(sorteo.compraMinimaUSD));
  // C-264: sus amigos con el estado del reparto de todo el sorteo (el mismo que la lista que se sortea)
  const mios = reparto.filter((i) => i.invitaId === participante.id);
  const validos = cuentanDe(reparto, participante.id);
  const porInvitar = boletosPorInvitar(validos, sorteo.topeInvitar);
  // C-263: cada boleto con su código. Los de amigos, un par por boleto en el orden en que cuentan (el n.º de par es su origen)
  const cuentan = mios.filter((i) => i.estado === 'cuenta');
  const boletos: BoletoDelCliente[] = [
    ...compras.map<BoletoDelCliente>((c) => ({
      codigo: codigoDeBoleto(sorteo.id, origenDeCompra(c.ordenes)), tipo: 'compra', origen: `Compra ${c.ordenes.split(' y ')[0]}`,
      monto: c.subtotalUSD, amigos: [], fecha: c.fecha,
    })),
    ...Array.from({ length: porInvitar }, (_, k): BoletoDelCliente => {
      const par = cuentan.slice(k * 2, k * 2 + 2);
      return {
        codigo: codigoDeBoleto(sorteo.id, origenDeAmigos(participante.codigo, k + 1)), tipo: 'amigos', origen: 'Invitaste a 2 amigos',
        monto: null, amigos: par.map((i) => nombreCorto(i.nombre)), fecha: par[1]?.fecha ?? par[0]?.fecha ?? sorteo.desde,
      };
    }),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  return {
    compras, invitados: mios.length, invitadosValidos: validos, porInvitar, total: compras.length + porInvitar, enlace: `/sorteo?invita=${participante.codigo}`,
    amigos: mios.map((i) => ({ nombre: nombreCorto(i.nombre), estado: i.estado })),
    faltanParaProximo: faltanParaProximo(validos, sorteo.topeInvitar),
    tope: sorteo.topeInvitar,
    boletos,
    correo: usuario?.email ? correoTapado(usuario.email) : '',
    enlaceCorto: `/s/${participante.codigo}`,
  };
}

export interface ResumenSorteo {
  boletos: Boleto[];
  participantes: Array<{ userId: string; email: string; nombre: string; porCompra: number; porInvitar: number; invitados: number; aviso: string }>;
  /** Lo vendido en las compras que dieron boleto (productos, sin envío) */
  ventasUSD: number;
}

/**
 * La lista completa de boletos, en un orden fijo (por compra, de la más vieja a la más nueva; después los de invitar), con
 * cada participante para el panel. El equipo no participa.
 */
export async function resumenDelSorteo(sorteo: Sorteo): Promise<ResumenSorteo> {
  const ordenes = await prisma.order.findMany({
    where: { createdAt: { gte: sorteo.desde, lte: sorteo.hasta }, paymentStatus: 'PAID', status: { notIn: [...ESTADOS_QUE_NO_CUENTAN] }, user: { role: 'USER' } },
    select: { userId: true, orderNumber: true, subtotalUSD: true, createdAt: true, paymentStatus: true, status: true, user: { select: { email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  // Se sortea un correo: una cuenta sin correo no participa
  const porCliente = new Map<string, { email: string; nombre: string; ordenes: typeof ordenes }>();
  for (const o of ordenes) {
    if (!o.userId || !o.user?.email) continue;
    const c = porCliente.get(o.userId) ?? { email: o.user.email, nombre: o.user.name ?? '', ordenes: [] as typeof ordenes };
    c.ordenes.push(o);
    porCliente.set(o.userId, c);
  }

  const boletos: Boleto[] = [];
  const filas = new Map<string, ResumenSorteo['participantes'][number]>();
  let ventasUSD = 0;
  for (const [userId, c] of porCliente) {
    const compras = comprasConBoleto(ordenesParaSorteo(c.ordenes), sorteo.desde, sorteo.hasta, Number(sorteo.compraMinimaUSD));
    for (const compra of compras) {
      boletos.push({
        userId, email: c.email, detalle: `Compra ${compra.ordenes} ($${compra.subtotalUSD.toFixed(2).replace('.', ',')})`,
        codigo: codigoDeBoleto(sorteo.id, origenDeCompra(compra.ordenes)),
      });
      ventasUSD += compra.subtotalUSD;
    }
    if (compras.length > 0) filas.set(userId, { userId, email: c.email, nombre: c.nombre, porCompra: compras.length, porInvitar: 0, invitados: 0, aviso: '' });
  }
  boletos.sort((a, b) => a.detalle.localeCompare(b.detalle));

  // Los de invitar, en el orden en que entraron los participantes. Un teléfono o una cédula cuentan una sola vez en todo el
  // sorteo, para quien invitó primero (C-264: el mismo reparto que ve cada cliente en "Tus boletos"; antes se lo quedaba
  // quien había entrado antes al sorteo). Se reparte aquí sin la caché del pedido: es la lista que se sortea
  const participantes = await prisma.participanteSorteo.findMany({
    where: { sorteoId: sorteo.id, user: { role: 'USER' } },
    select: { id: true, userId: true, codigo: true, user: { select: { email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const reparto = repartir(await cargarInvitaciones(sorteo));
  for (const p of participantes) {
    if (!p.user.email) continue;
    const email = p.user.email;
    const invitados = reparto.filter((i) => i.invitaId === p.id);
    if (invitados.length === 0) continue;
    const validos = cuentanDe(reparto, p.id);
    const porInvitar = boletosPorInvitar(validos, sorteo.topeInvitar);
    for (let i = 0; i < porInvitar; i++) {
      boletos.push({ userId: p.userId, email, detalle: `Invitó a 2 amigos (${i + 1} de ${porInvitar})`, codigo: codigoDeBoleto(sorteo.id, origenDeAmigos(p.codigo, i + 1)) });
    }
    const fila = filas.get(p.userId) ?? { userId: p.userId, email, nombre: p.user.name ?? '', porCompra: 0, porInvitar: 0, invitados: 0, aviso: '' };
    fila.porInvitar = porInvitar;
    fila.invitados = invitados.length;
    // Para revisar a mano antes de sortear: invitados que no completaron la cuenta o repetidos
    if (validos < invitados.length) fila.aviso = `${invitados.length - validos} de sus invitados no cuentan (sin activar la cuenta, sin teléfono o repetidos)`;
    filas.set(p.userId, fila);
  }
  return { boletos, participantes: [...filas.values()].sort((a, b) => b.porCompra + b.porInvitar - (a.porCompra + a.porInvitar)), ventasUSD: Math.round(ventasUSD * 100) / 100 };
}

export interface EfectoDelCambio {
  boletosAntes: number;
  boletosDespues: number;
  /** Clientes que quedan con menos boletos que hoy, y con más */
  pierden: number;
  ganan: number;
}

/**
 * C-221: qué les pasa a los clientes si el sorteo cambia a `nuevo`, sin guardarlo (PLAN.md §1.9: un cambio a algo publicado
 * muestra a cuántos afecta antes de guardar). Cuenta los boletos de cada uno con los datos de hoy y con los nuevos.
 */
export async function efectoDelCambio(actual: Sorteo, nuevo: Sorteo): Promise<EfectoDelCambio> {
  const [antes, despues] = await Promise.all([resumenDelSorteo(actual), resumenDelSorteo(nuevo)]);
  const porCliente = (r: ResumenSorteo) => {
    const cuenta = new Map<string, number>();
    for (const b of r.boletos) cuenta.set(b.userId, (cuenta.get(b.userId) ?? 0) + 1);
    return cuenta;
  };
  const a = porCliente(antes);
  const d = porCliente(despues);
  let pierden = 0;
  let ganan = 0;
  for (const userId of new Set([...a.keys(), ...d.keys()])) {
    const x = a.get(userId) ?? 0;
    const y = d.get(userId) ?? 0;
    if (y < x) pierden++;
    else if (y > x) ganan++;
  }
  return { boletosAntes: antes.boletos.length, boletosDespues: despues.boletos.length, pierden, ganan };
}

/** Sortea una sola vez, cuando ya cerró: congela la lista (su huella) y guarda el ganador */
export async function sortearAhora(sorteoId: string): Promise<{ ok: true; sorteo: Sorteo } | { ok: false; error: string }> {
  const sorteo = await prisma.sorteo.findUnique({ where: { id: sorteoId } });
  if (!sorteo) return { ok: false, error: 'No existe ese sorteo' };
  if (sorteo.sorteadoAt) return { ok: false, error: 'Este sorteo ya se hizo' };
  if (new Date() <= sorteo.hasta) return { ok: false, error: 'Todavía está abierto: se sortea después de la fecha de cierre' };
  const { boletos } = await resumenDelSorteo(sorteo);
  const resultado = sortear(boletos);
  if (!resultado) return { ok: false, error: 'No hay boletos para sortear' };
  // Solo si nadie sorteó a la vez (la condición va en la misma escritura)
  const hecho = await prisma.sorteo.updateMany({
    where: { id: sorteo.id, sorteadoAt: null },
    data: {
      sorteadoAt: new Date(),
      ganadorUserId: resultado.boleto.userId,
      ganadorEmail: resultado.boleto.email,
      ganadorDetalle: `Boleto ${resultado.indice + 1} de ${boletos.length}: ${resultado.boleto.detalle}`,
      ganadorCodigo: resultado.boleto.codigo,
      boletosAlSortear: boletos.length,
      huellaLista: huellaDe(boletos),
    },
  });
  if (hecho.count === 0) return { ok: false, error: 'Este sorteo ya se hizo' };
  return { ok: true, sorteo: await prisma.sorteo.findUniqueOrThrow({ where: { id: sorteo.id } }) };
}
