import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { campanaSchema, leerBloques } from '@/lib/email-campaigns';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const campana = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!campana) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });

  const fallidos = await prisma.emailCampaignRecipient.findMany({
    where: { campaignId: id, status: 'FAILED' },
    select: { email: true, error: true },
    take: 20,
  });

  const { content, ...resto } = campana;
  return NextResponse.json({ ...resto, bloques: leerBloques(content), fallidos });
}

// PATCH — solo borradores: una campaña enviada o en curso no se reescribe
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const parsed = campanaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const actualizada = await prisma.emailCampaign.updateMany({
    where: { id, status: 'DRAFT' },
    data: { subject: parsed.data.subject, preheader: parsed.data.preheader || null, content: JSON.stringify(parsed.data.bloques) },
  });
  if (actualizada.count === 0) {
    return NextResponse.json({ error: 'Solo se pueden editar campañas en borrador' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const borrada = await prisma.emailCampaign.deleteMany({ where: { id, status: 'DRAFT' } });
  if (borrada.count === 0) {
    return NextResponse.json({ error: 'Solo se pueden borrar campañas en borrador' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
