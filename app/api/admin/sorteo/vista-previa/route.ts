// C-221: antes de guardar un cambio al sorteo, qué cambia para los clientes (PLAN.md §1.9): los boletos de hoy contra los
// que tendrían con los datos nuevos, y cuántos clientes ganan o pierden. No guarda nada.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { erroresPorCampo, esquemaSorteo, finDelDia, inicioDelDia } from '@/lib/sorteo/esquema';
import { efectoDelCambio } from '@/lib/sorteo/servidor';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const parsed = esquemaSorteo.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa los campos marcados', fields: erroresPorCampo(parsed.error.issues) }, { status: 400 });
  }
  const actual = await prisma.sorteo.findFirst({ orderBy: { createdAt: 'desc' } });
  // Sin sorteo, o con uno ya sorteado, lo que se guarde es un sorteo nuevo: no le cambia nada a nadie
  if (!actual || actual.sorteadoAt) return NextResponse.json({ efecto: null });
  const d = parsed.data;
  // Solo lo que cuenta boletos: las fechas, la compra mínima, el tope por invitar y (C-297) la escala y las reseñas
  const nuevo = {
    ...actual,
    desde: inicioDelDia(d.desde),
    hasta: finDelDia(d.hasta),
    compraMinimaUSD: new Prisma.Decimal(d.compraMinimaUSD),
    topeInvitar: d.topeInvitar,
    boletosPorCompra: d.boletosPorCompra ?? actual.boletosPorCompra,
    escalaUSD: d.escalaUSD === undefined ? actual.escalaUSD : new Prisma.Decimal(d.escalaUSD),
    boletosPorEscala: d.boletosPorEscala ?? actual.boletosPorEscala,
    boletosPorResena: d.boletosPorResena ?? actual.boletosPorResena,
  };
  return NextResponse.json({ efecto: await efectoDelCambio(actual, nuevo) });
}
