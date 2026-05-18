import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/influencers — list all with stats
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const influencers = await prisma.influencer.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      conversions: {
        select: { id: true, type: true, commission: true, status: true, grossAmount: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = influencers.map((inf) => {
    const approved = inf.conversions.filter((c) => c.status === 'APPROVED');
    const pending = inf.conversions.filter((c) => c.status === 'PENDING');
    return {
      id: inf.id,
      code: inf.code,
      name: inf.name,
      commissionRate: Number(inf.commissionRate),
      status: inf.status,
      notes: inf.notes,
      createdAt: inf.createdAt,
      user: inf.user,
      stats: {
        totalConversions: inf.conversions.length,
        pendingConversions: pending.length,
        pendingCommission: pending.reduce((s, c) => s + Number(c.commission), 0),
        approvedCommission: approved.reduce((s, c) => s + Number(c.commission), 0),
        totalGross: inf.conversions.reduce((s, c) => s + Number(c.grossAmount), 0),
      },
    };
  });

  return NextResponse.json(formatted);
}

// POST /api/influencers — create influencer from existing user
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await req.json();
  const { userId, code, name, commissionRate, notes } = body;

  if (!userId || !code || !name) {
    return NextResponse.json({ error: 'userId, code y name son requeridos' }, { status: 400 });
  }

  const upperCode = (code as string).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (upperCode.length < 3 || upperCode.length > 20) {
    return NextResponse.json({ error: 'El código debe tener entre 3 y 20 caracteres (letras, números, _ -)' }, { status: 400 });
  }

  // Check user exists and isn't already an influencer
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, influencerProfile: true } });
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  if (user.influencerProfile) return NextResponse.json({ error: 'Este usuario ya es influencer' }, { status: 409 });

  // Check code uniqueness
  const existing = await prisma.influencer.findUnique({ where: { code: upperCode } });
  if (existing) return NextResponse.json({ error: 'El código ya está en uso' }, { status: 409 });

  const influencer = await prisma.influencer.create({
    data: {
      userId,
      code: upperCode,
      name,
      commissionRate: commissionRate ?? 5,
      notes: notes ?? null,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(influencer, { status: 201 });
}
