// C-288 · Lo que consume Claude y lo que falla, para Configuración → IA · Claude: el mes en hora de Venezuela, por uso; los pedidos
// por día; las últimas fallas y atajadas; y lo que habría costado el mes con cada modelo. Todo sale de IaPedido e IaAtajada
// (cifras: nunca lo que se mandó ni lo que se respondió). Solo servidor.

import { prisma } from '@/lib/prisma';
import { costoCon, MODELOS_IA } from './precios';

const ZONA = 'America/Caracas';
const DIA_MS = 86_400_000;

const dia = (fecha: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);

/** El primer instante del mes de Venezuela (UTC-4, sin cambio de hora): "2026-11-01 00:00" allá es las 04:00 en UTC */
export function inicioDelMes(ahora = new Date()): Date {
  const [anio, mes] = dia(ahora).split('-');
  return new Date(`${anio}-${mes}-01T04:00:00.000Z`);
}

export interface FilaConsumo {
  uso: string;
  pedidos: number;
  entrada: number;
  salida: number;
  busquedas: number;
  costoUsd: number;
  /** Lo que tarda un pedido, en promedio */
  ms: number;
  fallas: number;
}

export interface FallaReciente {
  id: string;
  uso: string;
  proveedor: string;
  modelo: string;
  falla: string;
  detalle: string | null;
  reintento: boolean;
  cuando: string;
  /** Solo en "Buscar en la web": si después de la falla de Claude siguió Groq. null en los demás usos */
  siguioGroq: boolean | null;
}

export interface AtajadaReciente {
  id: string;
  uso: string;
  regla: string;
  accion: string;
  antes: string;
  despues: string | null;
  referencia: string | null;
  cuando: string;
}

export interface Consumo {
  /** "noviembre de 2026" */
  mes: string;
  desde: string;
  /** Los usos del panel, sin las pruebas */
  porUso: FilaConsumo[];
  /** Lo que se gastó probando (la clave, las instrucciones): aparte */
  prueba: FilaConsumo | null;
  /** Todo junto: usos y pruebas */
  total: FilaConsumo;
  /** Los últimos 30 días, de hace 29 a hoy (hora de Venezuela): pedidos de los usos, sin las pruebas */
  porDia: Array<{ dia: string; pedidos: number }>;
  /** Lo que habría costado el mes con cada modelo, con los tokens y las búsquedas de verdad */
  comparacion: Array<{ modelo: string; costoUsd: number }>;
  fallas: FallaReciente[];
  /** Cuántas veces atajó cada regla este mes, por el id de la regla */
  atajadas: { totalMes: number; porRegla: Record<string, number>; ultimas: AtajadaReciente[] };
  /** C-292: el mes por proveedor (sin las pruebas): pedidos, tokens y costo */
  porProveedor: Array<{ proveedor: string; pedidos: number; entrada: number; salida: number; costoUsd: number; fallas: number }>;
  /** C-292: lo que el equipo marcó como "No sirvió" este mes, y los últimos */
  noSirvio: { totalMes: number; ultimos: Array<{ id: string; uso: string; proveedor: string; modelo: string; motivo: string; cuando: string }> };
}

const vacia = (uso: string): FilaConsumo => ({ uso, pedidos: 0, entrada: 0, salida: 0, busquedas: 0, costoUsd: 0, ms: 0, fallas: 0 });

export async function leerConsumo(ahora = new Date()): Promise<Consumo> {
  const desde = inicioDelMes(ahora);
  const hace30 = new Date(ahora.getTime() - 30 * DIA_MS);
  const [grupos, conFalla, deClaude, porDiaCrudo, fallasCrudas, atajadasPorRegla, atajadasUltimas, proveedoresCrudo, fallasPorProveedor, noSirvioMes, noSirvioUltimos] = await Promise.all([
    prisma.iaPedido.groupBy({
      by: ['uso'], where: { createdAt: { gte: desde } },
      _count: { _all: true }, _sum: { entrada: true, salida: true, busquedas: true, costoUsd: true }, _avg: { ms: true },
    }),
    prisma.iaPedido.groupBy({ by: ['uso'], where: { createdAt: { gte: desde }, falla: { not: null } }, _count: { _all: true } }),
    prisma.iaPedido.aggregate({ where: { createdAt: { gte: desde }, proveedor: 'anthropic' }, _sum: { entrada: true, salida: true, busquedas: true } }),
    prisma.iaPedido.findMany({ where: { createdAt: { gte: hace30 }, uso: { not: 'prueba' } }, select: { createdAt: true }, take: 50_000 }),
    prisma.iaPedido.findMany({
      where: { falla: { not: null } }, orderBy: { createdAt: 'desc' }, take: 20,
      select: { id: true, uso: true, proveedor: true, modelo: true, falla: true, detalle: true, reintento: true, createdAt: true },
    }),
    prisma.iaAtajada.groupBy({ by: ['regla'], where: { createdAt: { gte: desde } }, _count: { _all: true } }),
    prisma.iaAtajada.findMany({ orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, uso: true, regla: true, accion: true, antes: true, despues: true, referencia: true, createdAt: true } }),
    // C-292: por proveedor y lo que no sirvió
    prisma.iaPedido.groupBy({ by: ['proveedor'], where: { createdAt: { gte: desde }, uso: { not: 'prueba' } }, _count: { _all: true }, _sum: { entrada: true, salida: true, costoUsd: true } }),
    prisma.iaPedido.groupBy({ by: ['proveedor'], where: { createdAt: { gte: desde }, uso: { not: 'prueba' }, falla: { not: null } }, _count: { _all: true } }),
    prisma.iaPedido.count({ where: { noSirvioAt: { gte: desde } } }),
    prisma.iaPedido.findMany({ where: { noSirvioAt: { not: null } }, orderBy: { noSirvioAt: 'desc' }, take: 20, select: { id: true, uso: true, proveedor: true, modelo: true, noSirvioMotivo: true, noSirvioAt: true } }),
  ]);
  const fallasProv = new Map(fallasPorProveedor.map((g) => [g.proveedor, g._count._all]));

  const fallasPorUso = new Map(conFalla.map((g) => [g.uso, g._count._all]));
  const filas = grupos.map((g): FilaConsumo => ({
    uso: g.uso,
    pedidos: g._count._all,
    entrada: g._sum.entrada ?? 0,
    salida: g._sum.salida ?? 0,
    busquedas: g._sum.busquedas ?? 0,
    costoUsd: Number(g._sum.costoUsd ?? 0),
    ms: Math.round(g._avg.ms ?? 0),
    fallas: fallasPorUso.get(g.uso) ?? 0,
  }));
  const total = filas.reduce((t, f) => ({
    ...t,
    pedidos: t.pedidos + f.pedidos, entrada: t.entrada + f.entrada, salida: t.salida + f.salida, busquedas: t.busquedas + f.busquedas,
    costoUsd: t.costoUsd + f.costoUsd, fallas: t.fallas + f.fallas,
    ms: t.pedidos + f.pedidos > 0 ? Math.round((t.ms * t.pedidos + f.ms * f.pedidos) / (t.pedidos + f.pedidos)) : 0,
  }), vacia('total'));

  // Los últimos 30 días, sin huecos: un día sin pedidos es una barra en cero
  const cuenta = new Map<string, number>();
  for (const p of porDiaCrudo) cuenta.set(dia(p.createdAt), (cuenta.get(dia(p.createdAt)) ?? 0) + 1);
  const porDia = Array.from({ length: 30 }, (_, i) => {
    const d = dia(new Date(ahora.getTime() - (29 - i) * DIA_MS));
    return { dia: d, pedidos: cuenta.get(d) ?? 0 };
  });

  const usado = { entrada: deClaude._sum.entrada ?? 0, salida: deClaude._sum.salida ?? 0, busquedas: deClaude._sum.busquedas ?? 0 };

  // ¿Siguió Groq después de la falla de Claude en "Buscar en la web"? Un pedido de Groq en los 2 minutos siguientes
  const fallasDeBusqueda = fallasCrudas.filter((f) => f.uso === 'busqueda' && f.proveedor === 'anthropic');
  const groq = fallasDeBusqueda.length > 0
    ? await prisma.iaPedido.findMany({ where: { proveedor: 'groq', createdAt: { gte: fallasDeBusqueda[fallasDeBusqueda.length - 1].createdAt } }, select: { createdAt: true }, take: 500 })
    : [];

  return {
    mes: new Intl.DateTimeFormat('es-VE', { timeZone: ZONA, month: 'long', year: 'numeric' }).format(ahora),
    desde: desde.toISOString(),
    porUso: filas.filter((f) => f.uso !== 'prueba'),
    prueba: filas.find((f) => f.uso === 'prueba') ?? null,
    total,
    porDia,
    comparacion: MODELOS_IA.map((m) => ({ modelo: m.id, costoUsd: costoCon(m.id, usado) })),
    fallas: fallasCrudas.map((f): FallaReciente => ({
      id: f.id, uso: f.uso, proveedor: f.proveedor, modelo: f.modelo, falla: f.falla ?? '', detalle: f.detalle, reintento: f.reintento,
      cuando: f.createdAt.toISOString(),
      siguioGroq: f.uso === 'busqueda' && f.proveedor === 'anthropic'
        ? groq.some((g) => g.createdAt.getTime() >= f.createdAt.getTime() && g.createdAt.getTime() <= f.createdAt.getTime() + 120_000)
        : null,
    })),
    atajadas: {
      totalMes: atajadasPorRegla.reduce((t, g) => t + g._count._all, 0),
      porRegla: Object.fromEntries(atajadasPorRegla.map((g) => [g.regla, g._count._all])),
      ultimas: atajadasUltimas.map((a): AtajadaReciente => ({
        id: a.id, uso: a.uso, regla: a.regla, accion: a.accion, antes: a.antes, despues: a.despues, referencia: a.referencia, cuando: a.createdAt.toISOString(),
      })),
    },
    porProveedor: proveedoresCrudo.map((g) => ({
      proveedor: g.proveedor,
      pedidos: g._count._all,
      entrada: g._sum.entrada ?? 0,
      salida: g._sum.salida ?? 0,
      costoUsd: Number(g._sum.costoUsd ?? 0),
      fallas: fallasProv.get(g.proveedor) ?? 0,
    })),
    noSirvio: {
      totalMes: noSirvioMes,
      ultimos: noSirvioUltimos.map((p) => ({ id: p.id, uso: p.uso, proveedor: p.proveedor, modelo: p.modelo, motivo: p.noSirvioMotivo ?? '', cuando: (p.noSirvioAt ?? new Date()).toISOString() })),
    },
  };
}
