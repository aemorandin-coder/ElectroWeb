import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { approveConversion } from '@/lib/influencer-commission';

type Params = { params: Promise<{ id: string }> };

// GET /api/influencers/[id] — detail with full conversion history
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;

  const influencer = await prisma.influencer.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      conversions: {
        include: { referredUser: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!influencer) return NextResponse.json({ error: 'Influencer no encontrado' }, { status: 404 });
  return NextResponse.json(influencer);
}

// PATCH /api/influencers/[id] — edit or approve conversions
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  // Approve conversions
  if (body.action === 'approve_conversions') {
    const { conversionIds } = body as { conversionIds: string[] };
    if (!Array.isArray(conversionIds) || conversionIds.length === 0) {
      return NextResponse.json({ error: 'conversionIds requerido' }, { status: 400 });
    }
    const results = await Promise.allSettled(conversionIds.map(approveConversion));
    const approved = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return NextResponse.json({ approved, failed });
  }

  // Reject conversions
  if (body.action === 'reject_conversions') {
    const { conversionIds } = body as { conversionIds: string[] };
    await prisma.referralConversion.updateMany({
      where: { id: { in: conversionIds }, influencerId: id, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });
    return NextResponse.json({ ok: true });
  }

  // Update influencer fields
  const { name, commissionRate, status, notes } = body;
  const updated = await prisma.influencer.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(commissionRate !== undefined && { commissionRate }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/influencers/[id] — remove influencer profile (user keeps account)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  await prisma.influencer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
