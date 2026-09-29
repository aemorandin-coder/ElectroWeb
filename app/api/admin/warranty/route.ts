import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { claimCode } from '@/lib/warranty';

const CLOSED = ['RESOLVED', 'REJECTED'] as const;

// GET — solicitudes de garantía (C-122). ?filtro=atender|abiertas|cerradas|todas y ?q= (código, pedido, cliente, producto)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_ORDERS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const filtro = searchParams.get('filtro') ?? 'atender';
  const q = (searchParams.get('q') ?? '').trim().slice(0, 80);

  const where: Prisma.WarrantyClaimWhereInput = {};
  if (filtro === 'atender') Object.assign(where, { awaitingStaff: true, status: { notIn: [...CLOSED] } });
  else if (filtro === 'abiertas') where.status = { notIn: [...CLOSED] };
  else if (filtro === 'cerradas') where.status = { in: [...CLOSED] };
  if (q) {
    const number = Number(q.replace(/^g-?/i, ''));
    where.OR = [
      ...(Number.isInteger(number) && number > 0 ? [{ number }] : []),
      { productName: { contains: q, mode: 'insensitive' } },
      { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
      { user: { name: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [claims, counts] = await Promise.all([
    prisma.warrantyClaim.findMany({
      where,
      orderBy: [{ awaitingStaff: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
      select: {
        id: true, number: true, productName: true, productCondition: true, status: true, resolution: true, reason: true,
        warrantyDays: true, deliveredAt: true, awaitingStaff: true, createdAt: true, updatedAt: true,
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true } },
      },
    }),
    Promise.all([
      prisma.warrantyClaim.count({ where: { awaitingStaff: true, status: { notIn: [...CLOSED] } } }),
      prisma.warrantyClaim.count({ where: { status: { notIn: [...CLOSED] } } }),
    ]),
  ]);

  return NextResponse.json({
    claims: claims.map(({ order, ...c }) => ({ ...c, code: claimCode(c.number), orderNumber: order.orderNumber })),
    counts: { atender: counts[0], abiertas: counts[1] },
  });
}
