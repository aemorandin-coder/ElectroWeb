// C-212: el sorteo en el servidor: el vigente, los boletos de cada uno, la lista completa para el panel y el sorteo en sí.
// Las reglas están en reglas.ts (puras). Solo servidor.

import { cache } from 'react';
import type { Sorteo } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  boletosPorInvitar, codigoDeBoleto, codigoNuevo, comprasConBoleto, correoTapado, esCodigoSorteo, faltanParaProximo, huellaDe, nombreCorto,
  estrellaEn, origenDeAmigos, origenDeCompra, origenDeEstrella, origenDeResena, repartirInvitaciones, resenasConBoleto, sortear,
  type Boleto, type CompraConBoleto, type EstadoAmigo, type EstrellaParaSorteo, type InvitacionDelSorteo, type OrdenParaSorteo,
  type ResenaParaSorteo,
} from './reglas';
import { reglaDe } from './escala';
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

type FilaDeOrden = { orderNumber: string; subtotalUSD: unknown; createdAt: Date; paymentStatus: string; status: string; items?: Array<{ productId: string; quantity: number }> };

function ordenesParaSorteo(filas: FilaDeOrden[]): OrdenParaSorteo[] {
  return filas.map((o) => ({
    orderNumber: o.orderNumber,
    subtotalUSD: Number(o.subtotalUSD),
    createdAt: o.createdAt,
    pagada: o.paymentStatus === 'PAID' && !(ESTADOS_QUE_NO_CUENTAN as readonly string[]).includes(o.status),
    items: (o.items ?? []).map((i) => ({ productId: i.productId, cantidad: i.quantity })),
  }));
}

/** C-297: lo que se lee de cada orden para el sorteo (con sus productos, por el producto estrella) */
const SELECCION_ORDEN = {
  orderNumber: true, subtotalUSD: true, createdAt: true, paymentStatus: true, status: true,
  items: { select: { productId: true, quantity: true } },
} as const;

/** C-297: los productos estrella del sorteo, de la primera semana a la última, una vez por pedido */
export const estrellasDelSorteo = cache(async (sorteoId: string): Promise<EstrellaParaSorteo[]> => {
  const filas = await prisma.estrellaSorteo.findMany({
    where: { sorteoId },
    select: { id: true, productId: true, desde: true, hasta: true, boletos: true, product: { select: { name: true } } },
    orderBy: { desde: 'asc' },
  });
  return filas.map((f) => ({ id: f.id, productId: f.productId, nombre: f.product.name, desde: f.desde, hasta: f.hasta, boletos: f.boletos }));
});

/** C-297: las reseñas de clientes escritas durante el sorteo (las rechazadas no cuentan; las pendientes, para "en revisión") */
async function resenasDelSorteo(sorteo: Sorteo, userId?: string): Promise<Array<ResenaParaSorteo & { userId: string; email: string | null; nombre: string | null }>> {
  if (sorteo.boletosPorResena <= 0) return [];
  const filas = await prisma.review.findMany({
    where: { createdAt: { gte: sorteo.desde, lte: sorteo.hasta }, rejectedAt: null, ...(userId ? { userId } : { user: { role: 'USER' } }) },
    select: { id: true, createdAt: true, isApproved: true, userId: true, product: { select: { name: true } }, user: { select: { email: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return filas
    .filter((f) => f.user.role === 'USER')
    .map((f) => ({ id: f.id, producto: f.product.name, fecha: f.createdAt, aprobada: f.isApproved, userId: f.userId, email: f.user.email, nombre: f.user.name }));
}

/** C-297: "Compra ORD-2026-0041 ($87,46)" */
const detalleDeCompra = (c: CompraConBoleto) => `Compra ${c.ordenes} ($${c.subtotalUSD.toFixed(2).replace('.', ',')})`;

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
  /** C-297: también los del producto estrella y los de una reseña */
  tipo: 'compra' | 'estrella' | 'resena' | 'amigos';
  /** "Compra ORD-2026-0041", "Producto estrella", "Tu reseña" o "Invitaste a 2 amigos" */
  origen: string;
  /** La compra en productos (USD), o null en uno de amigos o de reseña */
  monto: number | null;
  /** Los dos amigos del par ("Luisa P."), o [] en uno de compra */
  amigos: string[];
  /** Cuándo nació: la compra, la reseña, o el registro del segundo amigo del par */
  fecha: Date;
  /**
   * C-297: los boletos que nacieron juntos (los de una compra, con los de su producto estrella; los de una reseña; los de
   * un par de amigos) comparten el grupo: la tienda los muestra como una pila, con lo que dio cada parte
   */
  grupo: string;
  /** C-297: el producto estrella o el producto reseñado ("Mini DC UPS de 20000 mAh"), o null */
  producto: string | null;
}

export interface BoletosDeCliente {
  compras: CompraConBoleto[];
  invitados: number;
  invitadosValidos: number;
  porInvitar: number;
  /** C-297: los boletos por comprar (monto y producto estrella) y por reseñas */
  porCompra: number;
  porResena: number;
  /** C-297: sus reseñas aprobadas y las que esperan revisión (dan boleto al aprobarse) */
  resenas: number;
  resenasEnRevision: number;
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
  const [participante, ordenes, reparto, usuario, estrellas, resenas] = await Promise.all([
    participanteDe(sorteo.id, userId),
    prisma.order.findMany({
      where: { userId, createdAt: { gte: sorteo.desde, lte: sorteo.hasta } },
      select: SELECCION_ORDEN,
    }),
    invitacionesDelSorteo(sorteo),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    estrellasDelSorteo(sorteo.id),
    resenasDelSorteo(sorteo, userId),
  ]);
  const compras = comprasConBoleto(ordenesParaSorteo(ordenes), sorteo.desde, sorteo.hasta, reglaDe(sorteo), estrellas);
  const conBoleto = resenasConBoleto(resenas, sorteo.desde, sorteo.hasta);
  // C-264: sus amigos con el estado del reparto de todo el sorteo (el mismo que la lista que se sortea)
  const mios = reparto.filter((i) => i.invitaId === participante.id);
  const validos = cuentanDe(reparto, participante.id);
  const porInvitar = boletosPorInvitar(validos, sorteo.topeInvitar);
  // C-263: cada boleto con su código. Los de amigos, un par por boleto en el orden en que cuentan (el n.º de par es su origen)
  const cuentan = mios.filter((i) => i.estado === 'cuenta');
  const boletos: BoletoDelCliente[] = [
    // C-297: una compra da varios: los del monto y, después, los de su producto estrella (cada uno con su código)
    ...compras.flatMap<BoletoDelCliente>((c) => {
      const orden = c.ordenes.split(' y ')[0];
      const base = { monto: c.subtotalUSD, amigos: [], fecha: c.fecha, grupo: `compra:${orden}` };
      return [
        ...Array.from({ length: c.porMonto }, (_, k): BoletoDelCliente => ({
          ...base, codigo: codigoDeBoleto(sorteo.id, origenDeCompra(c.ordenes, k + 1)), tipo: 'compra', origen: `Compra ${orden}`, producto: null,
        })),
        ...Array.from({ length: c.estrella?.boletos ?? 0 }, (_, k): BoletoDelCliente => ({
          ...base, codigo: codigoDeBoleto(sorteo.id, origenDeEstrella(c.ordenes, k + 1)), tipo: 'estrella', origen: 'Producto estrella', producto: c.estrella?.nombre ?? null,
        })),
      ];
    }),
    ...conBoleto.flatMap((r) => Array.from({ length: sorteo.boletosPorResena }, (_, k): BoletoDelCliente => ({
      codigo: codigoDeBoleto(sorteo.id, origenDeResena(r.id, k + 1)), tipo: 'resena', origen: 'Tu reseña', monto: null, amigos: [], fecha: r.fecha,
      grupo: `resena:${r.id}`, producto: r.producto,
    }))),
    ...Array.from({ length: porInvitar }, (_, k): BoletoDelCliente => {
      const par = cuentan.slice(k * 2, k * 2 + 2);
      return {
        codigo: codigoDeBoleto(sorteo.id, origenDeAmigos(participante.codigo, k + 1)), tipo: 'amigos', origen: 'Invitaste a 2 amigos',
        monto: null, amigos: par.map((i) => nombreCorto(i.nombre)), fecha: par[1]?.fecha ?? par[0]?.fecha ?? sorteo.desde, grupo: `amigos:${k + 1}`, producto: null,
      };
    }),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const porCompra = compras.reduce((s, c) => s + c.boletos, 0);
  const porResena = conBoleto.length * Math.max(0, sorteo.boletosPorResena);
  return {
    compras, invitados: mios.length, invitadosValidos: validos, porInvitar, porCompra, porResena,
    resenas: conBoleto.length, resenasEnRevision: resenas.filter((r) => !r.aprobada).length,
    total: porCompra + porResena + porInvitar, enlace: `/sorteo?invita=${participante.codigo}`,
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
  /** C-297: porCompra son los de comprar (el monto y el producto estrella); porResena, los de sus reseñas */
  participantes: Array<{ userId: string; email: string; nombre: string; porCompra: number; porResena: number; porInvitar: number; invitados: number; aviso: string }>;
  /** Lo vendido en las compras que dieron boleto (productos, sin envío) */
  ventasUSD: number;
}

/** C-297: los boletos de una compra para la lista: "Compra ORD-… ($87,46)" si es uno; con varios, cuál es y si es del producto estrella */
function boletosDeLaCompra(sorteoId: string, userId: string, email: string, c: CompraConBoleto): Boleto[] {
  const detalle = detalleDeCompra(c);
  if (c.boletos === 1 && c.porMonto === 1) return [{ userId, email, detalle, codigo: codigoDeBoleto(sorteoId, origenDeCompra(c.ordenes)) }];
  return [
    ...Array.from({ length: c.porMonto }, (_, k): Boleto => ({
      userId, email, detalle: `${detalle}, boleto ${k + 1} de ${c.boletos}`, codigo: codigoDeBoleto(sorteoId, origenDeCompra(c.ordenes, k + 1)),
    })),
    ...Array.from({ length: c.estrella?.boletos ?? 0 }, (_, k): Boleto => ({
      userId, email, detalle: `${detalle}, boleto ${c.porMonto + k + 1} de ${c.boletos} (producto estrella)`, codigo: codigoDeBoleto(sorteoId, origenDeEstrella(c.ordenes, k + 1)),
    })),
  ];
}

/**
 * La lista completa de boletos, en un orden fijo (por compra, de la más vieja a la más nueva; después las reseñas y los de
 * invitar), con cada participante para el panel. El equipo no participa.
 */
export async function resumenDelSorteo(sorteo: Sorteo): Promise<ResumenSorteo> {
  const [ordenes, estrellas, resenas] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: sorteo.desde, lte: sorteo.hasta }, paymentStatus: 'PAID', status: { notIn: [...ESTADOS_QUE_NO_CUENTAN] }, user: { role: 'USER' } },
      select: { ...SELECCION_ORDEN, userId: true, user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    estrellasDelSorteo(sorteo.id),
    resenasDelSorteo(sorteo),
  ]);
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
  const regla = reglaDe(sorteo);
  for (const [userId, c] of porCliente) {
    const compras = comprasConBoleto(ordenesParaSorteo(c.ordenes), sorteo.desde, sorteo.hasta, regla, estrellas);
    let porCompra = 0;
    for (const compra of compras) {
      boletos.push(...boletosDeLaCompra(sorteo.id, userId, c.email, compra));
      porCompra += compra.boletos;
      ventasUSD += compra.subtotalUSD;
    }
    if (porCompra > 0) filas.set(userId, { userId, email: c.email, nombre: c.nombre, porCompra, porResena: 0, porInvitar: 0, invitados: 0, aviso: '' });
  }
  // C-297: con varios boletos por compra, "boleto 10 de 15" va después de "boleto 9 de 15" (numeric); las órdenes, igual que antes
  const porDetalle = (a: Boleto, b: Boleto) => a.detalle.localeCompare(b.detalle, 'es', { numeric: true });
  boletos.sort(porDetalle);

  // C-297: las reseñas aprobadas, de la más vieja a la más nueva, después de las compras
  const porResena = Math.max(0, sorteo.boletosPorResena);
  for (const r of resenasConBoleto(resenas, sorteo.desde, sorteo.hasta)) {
    if (!r.email || porResena === 0) continue;
    for (let k = 0; k < porResena; k++) {
      boletos.push({
        userId: r.userId, email: r.email, detalle: `Reseña de ${r.producto}${porResena > 1 ? ` (${k + 1} de ${porResena})` : ''}`,
        codigo: codigoDeBoleto(sorteo.id, origenDeResena(r.id, k + 1)),
      });
    }
    const fila = filas.get(r.userId) ?? { userId: r.userId, email: r.email, nombre: r.nombre ?? '', porCompra: 0, porResena: 0, porInvitar: 0, invitados: 0, aviso: '' };
    fila.porResena += porResena;
    filas.set(r.userId, fila);
  }

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
    const fila = filas.get(p.userId) ?? { userId: p.userId, email, nombre: p.user.name ?? '', porCompra: 0, porResena: 0, porInvitar: 0, invitados: 0, aviso: '' };
    fila.porInvitar = porInvitar;
    fila.invitados = invitados.length;
    // Para revisar a mano antes de sortear: invitados que no completaron la cuenta o repetidos
    if (validos < invitados.length) fila.aviso = `${invitados.length - validos} de sus invitados no cuentan (sin activar la cuenta, sin teléfono o repetidos)`;
    filas.set(p.userId, fila);
  }
  const totalDe = (f: ResumenSorteo['participantes'][number]) => f.porCompra + f.porResena + f.porInvitar;
  return { boletos, participantes: [...filas.values()].sort((a, b) => totalDe(b) - totalDe(a)), ventasUSD: Math.round(ventasUSD * 100) / 100 };
}

/**
 * C-297: el producto estrella de ahora en la tienda (/sorteo, su ficha, el catálogo y el carrito): la semana vigente del
 * sorteo vigente, con su producto publicado. null si no hay.
 */
export const estrellaDeAhora = cache(async (): Promise<{ sorteo: Sorteo; estrella: EstrellaParaSorteo } | null> => {
  const sorteo = await getSorteoVigente();
  if (!sorteo || sorteo.sorteadoAt) return null;
  const ahora = new Date();
  if (ahora < sorteo.desde || ahora > sorteo.hasta) return null;
  const estrellas = await estrellasDelSorteo(sorteo.id);
  const estrella = estrellaEn(estrellas, ahora);
  return estrella ? { sorteo, estrella } : null;
});

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
