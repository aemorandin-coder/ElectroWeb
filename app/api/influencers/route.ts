import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { asegurarCupones } from '@/lib/influencer-cupon';
import { motivoEfectivo } from '@/lib/influencer-commission';
import { crearPromotor, PromotorError, promotorSchema } from '@/lib/influencer-admin';

// GET /api/influencers — list all with stats
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  // C-167: los promotores de antes reciben su cupón la primera vez que se abre la lista
  await asegurarCupones();

  const influencers = await prisma.influencer.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      coupon: { select: { id: true } },
      conversions: {
        select: { id: true, type: true, commission: true, status: true, grossAmount: true, baseAmount: true, createdAt: true, heldReason: true },
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
      customerDiscountPercent: inf.customerDiscountPercent,
      // Sin cupón: un cupón normal ya usaba su código antes de C-167
      hasCoupon: inf.coupon !== null,
      status: inf.status,
      notes: inf.notes,
      createdAt: inf.createdAt,
      user: inf.user,
      stats: {
        totalConversions: inf.conversions.length,
        pendingConversions: pending.length,
        // Las que no se acreditan solas: esperan la revisión del equipo
        toReview: pending.filter((c) => motivoEfectivo(c)).length,
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

  const parsed = promotorSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  try {
    const promotor = await crearPromotor(parsed.data);
    return NextResponse.json({ ...promotor, commissionRate: Number(promotor.commissionRate) }, { status: 201 });
  } catch (error) {
    if (error instanceof PromotorError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error creando el promotor:', error);
    return NextResponse.json({ error: 'No se pudo crear el promotor' }, { status: 500 });
  }
}
