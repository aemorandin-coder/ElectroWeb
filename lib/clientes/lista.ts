// C-276: la lista de Clientes del panel: los filtros con su cuenta, la búsqueda (nombre, correo, teléfono, cédula, RIF y
// empresa) y cada fila en lista blanca (lib/dto/cliente.ts). Solo clientes: rol USER (la contadora y el equipo, nunca).
import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { idsPorTexto } from '@/lib/busqueda-sql';
import { documentoVigente, firmaVigente, SLUG_TERMINOS_SALDO } from '@/lib/legal-docs';
import { estadoCuenta, estadoEmpresa, type FilaCliente } from '@/lib/dto/cliente';

/** C-213: una orden sigue abierta hasta que se entrega, se cancela o se devuelve */
export const ABIERTAS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED'];
export const NO_CUENTAN: OrderStatus[] = ['CANCELLED', 'REFUNDED'];

export const FILTROS_CLIENTES = ['todos', 'nuevos', 'sin-activar', 'con-pedidos', 'con-puntos', 'empresas', 'dormidos', 'suspendidos'] as const;
export type FiltroClientes = (typeof FILTROS_CLIENTES)[number];

export const POR_PAGINA = 25;
const DIA = 24 * 60 * 60 * 1000;

function inicioDelMes(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Lo que junta cada filtro, siempre sobre los clientes (rol USER) */
export function whereDeFiltro(filtro: FiltroClientes): Prisma.UserWhereInput {
  const hace30 = new Date(Date.now() - 30 * DIA);
  switch (filtro) {
    case 'nuevos': return { createdAt: { gte: inicioDelMes() } };
    case 'sin-activar': return { emailVerified: null };
    case 'con-pedidos': return { orders: { some: {} } };
    case 'con-puntos': return { balance: { is: { balance: { gt: 0 } } } };
    case 'empresas': return { profile: { is: { businessVerificationStatus: 'PENDING' } } };
    case 'dormidos': return {
      createdAt: { lt: hace30 },
      sesiones: { none: { lastSeenAt: { gte: hace30 } } },
      OR: [{ profile: { is: null } }, { profile: { is: { OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: hace30 } }] } } }],
    };
    case 'suspendidos': return { profile: { is: { accountStatus: 'SUSPENDED' } } };
    default: return {};
  }
}

/** Los clientes que coinciden con lo que se escribió: nombre y correo sin acentos; teléfono, cédula, RIF y empresa en el perfil */
export async function idsDeBusqueda(texto: string): Promise<string[] | null> {
  const q = texto.trim().slice(0, 100);
  if (!q) return null;
  const digitos = q.replace(/\D/g, '');
  const enPerfil: Prisma.ProfileWhereInput[] = [
    { companyName: { contains: q, mode: 'insensitive' } },
    { taxId: { contains: q, mode: 'insensitive' } },
    { businessRIF: { contains: q, mode: 'insensitive' } },
  ];
  if (digitos.length >= 4) {
    // El teléfono se guarda con o sin el 58, y la cédula con o sin la V: se busca por los dígitos (y sin el 0 inicial)
    const sinCero = digitos.replace(/^0/, '');
    enPerfil.push(
      { phone: { contains: sinCero } }, { whatsapp: { contains: sinCero } },
      { idNumber: { contains: digitos } }, { taxId: { contains: digitos } }, { businessRIF: { contains: digitos } },
    );
  }
  const [porNombre, perfiles] = await Promise.all([
    idsPorTexto('users', ['name', 'email'], q),
    prisma.profile.findMany({ where: { OR: enPerfil }, select: { userId: true }, take: 2000 }),
  ]);
  return [...new Set([...porNombre, ...perfiles.map((p) => p.userId)])];
}

export async function listaDeClientes({ filtro, busqueda, pagina }: { filtro: FiltroClientes; busqueda: string; pagina: number }) {
  const ids = await idsDeBusqueda(busqueda);
  const base: Prisma.UserWhereInput = { role: 'USER', ...(ids ? { id: { in: ids } } : {}) };
  const where: Prisma.UserWhereInput = { AND: [base, whereDeFiltro(filtro)] };

  const [total, usuarios, cuentas, stats] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true, name: true, email: true, image: true, createdAt: true, emailVerified: true,
        profile: { select: { phone: true, whatsapp: true, idNumber: true, customerType: true, isBusinessAccount: true, companyName: true, businessVerificationStatus: true, accountStatus: true, lastLoginAt: true } },
        balance: { select: { balance: true } },
        accounts: { where: { provider: 'google' }, select: { id: true }, take: 1 },
      },
    }),
    // La cuenta de cada filtro, con la misma búsqueda
    Promise.all(FILTROS_CLIENTES.map((f) => prisma.user.count({ where: { AND: [base, whereDeFiltro(f)] } }))),
    // Las cifras de arriba no dependen de la búsqueda
    Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'USER', createdAt: { gte: inicioDelMes() } } }),
      prisma.user.count({ where: { role: 'USER', emailVerified: null } }),
      prisma.user.count({ where: { role: 'USER', orders: { some: { status: { in: ABIERTAS } } } } }),
    ]),
  ]);

  const idsPagina = usuarios.map((u) => u.id);
  const [pedidos, sesiones, terminos] = await Promise.all([
    prisma.order.groupBy({
      by: ['userId', 'status', 'paymentStatus'],
      where: { userId: { in: idsPagina } },
      _count: { _all: true },
      _sum: { totalUSD: true },
    }),
    prisma.userSession.findMany({
      where: { userId: { in: idsPagina }, esAdmin: false },
      orderBy: { lastSeenAt: 'desc' },
      distinct: ['userId'],
      select: { userId: true, lastSeenAt: true, dispositivo: true },
    }),
    documentoVigente(SLUG_TERMINOS_SALDO),
  ]);
  const firmas = new Map(await Promise.all(idsPagina.map(async (id) => [id, terminos ? (await firmaVigente(id, terminos)) !== null : false] as const)));

  const filas: FilaCliente[] = usuarios.map((u) => {
    const suyos = pedidos.filter((p) => p.userId === u.id);
    const sesion = sesiones.find((s) => s.userId === u.id);
    const p = u.profile;
    const esEmpresa = p?.customerType === 'COMPANY' || p?.isBusinessAccount === true;
    const ultimo = sesion?.lastSeenAt ?? p?.lastLoginAt ?? null;
    return {
      id: u.id,
      nombre: u.name,
      correo: u.email,
      foto: u.image,
      registro: u.createdAt.toISOString(),
      empresa: esEmpresa ? (p?.companyName?.trim() || 'Empresa') : null,
      sellos: {
        correo: u.emailVerified !== null,
        telefono: Boolean(p?.phone?.trim() || p?.whatsapp?.trim()),
        cedula: Boolean(p?.idNumber?.trim()),
        terminos: firmas.get(u.id) === true,
        empresa: esEmpresa ? estadoEmpresa(p?.businessVerificationStatus) : null,
        google: u.accounts.length > 0,
      },
      cuenta: estadoCuenta(p?.accountStatus),
      ultimoIngreso: ultimo ? { en: ultimo.toISOString(), dispositivo: sesion?.dispositivo ?? null } : null,
      pedidos: suyos.reduce((n, x) => n + x._count._all, 0),
      activos: suyos.filter((x) => ABIERTAS.includes(x.status)).reduce((n, x) => n + x._count._all, 0),
      gastado: Math.round(suyos.filter((x) => x.paymentStatus === 'PAID' && !NO_CUENTAN.includes(x.status)).reduce((n, x) => n + Number(x._sum.totalUSD ?? 0), 0) * 100) / 100,
      puntos: Number(u.balance?.balance ?? 0),
    };
  });

  return {
    filas,
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    cuentas: Object.fromEntries(FILTROS_CLIENTES.map((f, i) => [f, cuentas[i]])) as Record<FiltroClientes, number>,
    cifras: { clientes: stats[0], nuevosMes: stats[1], sinActivar: stats[2], conActivas: stats[3] },
  };
}
