import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { campanaSchema, leerBloques } from '@/lib/email-campaigns';
import { exigirVersion, registrarCambio, respuestaCambiado, respuestaNoExiste } from '@/lib/edicion/registro';
import { nombreDeSesion } from '@/lib/edicion/servidor';
import { publicarRecursoCambiado } from '@/lib/realtime/bus';
import { editoresDe } from '@/lib/realtime/presencia';

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
  // C-170: la versión con que se abrió el editor; si otra persona guardó antes, se avisa en vez de pisarla
  const crudo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const v = exigirVersion(crudo?.baseUpdatedAt);
  if ('respuesta' in v) return v.respuesta;
  const { baseUpdatedAt: _version, ...resto } = crudo ?? {};
  void _version;
  const parsed = campanaSchema.safeParse(resto);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const actualizada = await prisma.emailCampaign.updateMany({
    where: { id, status: 'DRAFT', updatedAt: v.base },
    data: { subject: parsed.data.subject, preheader: parsed.data.preheader || null, content: JSON.stringify(parsed.data.bloques) },
  });
  if (actualizada.count === 0) {
    const ahora = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!ahora) return respuestaNoExiste('campaña');
    if (ahora.status !== 'DRAFT') return NextResponse.json({ error: 'Solo se pueden editar campañas en borrador' }, { status: 409 });
    return respuestaCambiado({
      tipo: 'EMAIL_CAMPAIGN', id, etiqueta: 'campaña', femenino: true,
      actual: { subject: ahora.subject, preheader: ahora.preheader || '', bloques: leerBloques(ahora.content), updatedAt: ahora.updatedAt.toISOString() },
    });
  }
  const guardada = await prisma.emailCampaign.findUnique({ where: { id }, select: { updatedAt: true, subject: true } });
  await registrarCambio({ session, request, recurso: `campaign:${id}`, tipo: 'EMAIL_CAMPAIGN', id, nombre: guardada?.subject ?? 'Campaña', campos: ['asunto o contenido'] });
  return NextResponse.json({ ok: true, updatedAt: guardada?.updatedAt.toISOString() ?? null });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  // C-170: otra persona la tiene abierta ahora: se avisa antes de borrarla (con ?forzar=1 se sigue)
  const editores = editoresDe(`campaign:${id}`, session?.user?.id);
  if (editores.length > 0 && new URL(request.url).searchParams.get('forzar') !== '1') {
    return NextResponse.json({ error: `${editores.map((e) => e.nombre).join(' y ')} la está editando ahora mismo`, conflicto: 'en_edicion', editores }, { status: 409 });
  }
  const borrada = await prisma.emailCampaign.deleteMany({ where: { id, status: 'DRAFT' } });
  if (borrada.count === 0) {
    return NextResponse.json({ error: 'Solo se pueden borrar campañas en borrador' }, { status: 409 });
  }
  publicarRecursoCambiado(`campaign:${id}`, 'eliminado', { id: session?.user?.id ?? '', nombre: nombreDeSesion(session) });
  return NextResponse.json({ ok: true });
}
