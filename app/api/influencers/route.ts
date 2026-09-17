import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Antes el % de comisión llegaba sin validar (500%, texto, negativo)
const crearSchema = z.object({
  userId: z.string().min(1, 'Elige el usuario').max(40),
  code: z.string().trim().min(3, 'El código debe tener entre 3 y 20 caracteres').max(20, 'El código debe tener entre 3 y 20 caracteres'),
  name: z.string().trim().min(2, 'El nombre es muy corto').max(80),
  commissionRate: z.coerce.number().min(0, 'La comisión no puede ser negativa').max(50, 'La comisión máxima es 50%').default(5),
  notes: z.string().trim().max(500).nullable().optional(),
});

// GET /api/influencers — list all with stats
export async function GET() {
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

  const parsed = crearSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const { userId, code, name, commissionRate, notes } = parsed.data;

  const upperCode = code.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
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
      commissionRate,
      notes: notes || null,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(influencer, { status: 201 });
}
