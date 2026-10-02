import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { codigoLibre, proponerCodigo } from '@/lib/influencer-cupon';

// C-167: solicitudes para ser promotor. Las pendientes primero, con un código libre ya propuesto para aprobar de un clic.
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const solicitudes = await prisma.influencerApplication.findMany({
    where: { OR: [{ status: 'PENDING' }, { reviewedAt: { gte: new Date(Date.now() - 30 * 24 * 3600_000) } }] },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    include: {
      user: {
        select: {
          id: true, name: true, email: true, emailVerified: true, createdAt: true,
          _count: { select: { orders: true } },
        },
      },
    },
  });

  const filas = [];
  for (const s of solicitudes) {
    let propuesto: string | null = null;
    if (s.status === 'PENDING') {
      const base = proponerCodigo(s.wantedCode || s.user.name || s.user.email?.split('@')[0] || 'PROMO');
      propuesto = base;
      for (let n = 2; n < 20 && !(await codigoLibre(propuesto)); n++) propuesto = `${base}${n}`;
    }
    filas.push({
      id: s.id,
      status: s.status,
      channels: s.channels,
      followers: s.followers,
      message: s.message,
      wantedCode: s.wantedCode,
      reviewNote: s.reviewNote,
      createdAt: s.createdAt.toISOString(),
      reviewedAt: s.reviewedAt?.toISOString() ?? null,
      suggestedCode: propuesto,
      user: {
        id: s.user.id, name: s.user.name, email: s.user.email, verified: Boolean(s.user.emailVerified),
        since: s.user.createdAt.toISOString(), orders: s.user._count.orders,
      },
    });
  }
  return NextResponse.json({ solicitudes: filas, pendientes: filas.filter((f) => f.status === 'PENDING').length });
}
