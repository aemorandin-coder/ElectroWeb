import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { emitAdminEvent } from '@/lib/admin-events';
import { limpiarCodigo, solicitudSchema } from '@/lib/influencer-admin';

// C-167: un cliente pide entrar al programa de promotores. Una solicitud abierta por persona; una rechazada puede
// volver a pedirse a los 30 días. El equipo la aprueba o la rechaza en Marketing → Promotores.
export const dynamic = 'force-dynamic';
const DIAS_PARA_REPETIR = 30;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const usuario = session?.user as { id?: string; role?: string } | undefined;
  if (!usuario?.id) return NextResponse.json({ error: 'Inicia sesión para pedirlo' }, { status: 401 });
  if (!checkRateLimit(usuario.id, 'promotor:solicitud', RATE_LIMITS.SENSITIVE).success) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto.' }, { status: 429 });
  }
  const datos = solicitudSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: datos.error.issues[0]?.message ?? 'Revisa los datos' }, { status: 400 });

  const cuenta = await prisma.user.findUnique({
    where: { id: usuario.id },
    select: { id: true, name: true, email: true, emailVerified: true, role: true, influencerProfile: { select: { id: true } } },
  });
  if (!cuenta) return NextResponse.json({ error: 'Tu cuenta no puede pedirlo' }, { status: 403 });
  if (cuenta.role !== 'USER') return NextResponse.json({ error: 'Las cuentas del equipo no entran al programa' }, { status: 403 });
  if (!cuenta.emailVerified) return NextResponse.json({ error: 'Verifica tu correo antes de pedirlo (revisa tu bandeja o Mi perfil).' }, { status: 400 });
  if (cuenta.influencerProfile) return NextResponse.json({ error: 'Ya eres promotor' }, { status: 409 });

  const ultima = await prisma.influencerApplication.findFirst({ where: { userId: cuenta.id }, orderBy: { createdAt: 'desc' } });
  if (ultima?.status === 'PENDING') return NextResponse.json({ error: 'Ya tienes una solicitud en revisión' }, { status: 409 });
  if (ultima?.status === 'REJECTED' && ultima.reviewedAt && Date.now() - ultima.reviewedAt.getTime() < DIAS_PARA_REPETIR * 24 * 3600_000) {
    return NextResponse.json({ error: `Podrás volver a pedirlo ${DIAS_PARA_REPETIR} días después de la respuesta anterior.` }, { status: 409 });
  }

  const wantedCode = datos.data.wantedCode ? limpiarCodigo(datos.data.wantedCode).slice(0, 20) || null : null;
  const solicitud = await prisma.influencerApplication.create({
    data: { userId: cuenta.id, channels: datos.data.channels, followers: datos.data.followers ?? null, message: datos.data.message || null, wantedCode },
  });

  emitAdminEvent({
    type: 'PROMOTER_APPLICATION',
    title: `Solicitud de promotor · ${cuenta.name || cuenta.email || 'cliente'}`.slice(0, 150),
    summary: 'Un cliente quiere entrar al programa de promotores.',
    fields: [['Dónde publica', datos.data.channels.slice(0, 120)], ['Seguidores', datos.data.followers ?? null]],
    link: '/admin/marketing#promotores',
  });
  return NextResponse.json({ ok: true, id: solicitud.id }, { status: 201 });
}
