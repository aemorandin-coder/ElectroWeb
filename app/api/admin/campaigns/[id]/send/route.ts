import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { emitAdminEvent } from '@/lib/admin-events';
import { destinatariosWhere, iniciarEnvio } from '@/lib/email-campaigns';

type Params = { params: Promise<{ id: string }> };

const accionSchema = z.object({ accion: z.enum(['enviar', 'pausar', 'reanudar']) });

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const parsed = accionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  const { accion } = parsed.data;

  const campana = await prisma.emailCampaign.findUnique({ where: { id }, select: { id: true, status: true, subject: true } });
  if (!campana) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });

  if (accion === 'pausar') {
    const r = await prisma.emailCampaign.updateMany({ where: { id, status: 'SENDING' }, data: { status: 'PAUSED', lastError: null } });
    if (r.count === 0) return NextResponse.json({ error: 'La campaña no se está enviando' }, { status: 409 });
    return NextResponse.json({ status: 'PAUSED' });
  }

  const ajustes = await prisma.emailSettings.findUnique({ where: { id: 'default' }, select: { marketingEnabled: true } });
  if (!ajustes?.marketingEnabled) {
    return NextResponse.json({ error: 'Los correos de marketing están desactivados. Actívalos en Configuración → Correo.' }, { status: 409 });
  }

  if (accion === 'reanudar') {
    const r = await prisma.emailCampaign.updateMany({ where: { id, status: { in: ['PAUSED', 'SENDING'] } }, data: { status: 'SENDING', lastError: null } });
    if (r.count === 0) return NextResponse.json({ error: 'Solo se reanuda una campaña pausada' }, { status: 409 });
    iniciarEnvio(id);
    return NextResponse.json({ status: 'SENDING' });
  }

  // enviar: la lista de destinatarios se fija en este momento y una sola vez
  const usuarios = await prisma.user.findMany({ where: destinatariosWhere, select: { id: true, email: true } });
  if (usuarios.length === 0) {
    return NextResponse.json({ error: 'Ningún cliente con correo verificado aceptó recibir promociones todavía.' }, { status: 409 });
  }

  const empezada = await prisma.$transaction(async (tx) => {
    const marcada = await tx.emailCampaign.updateMany({
      where: { id, status: 'DRAFT' },
      data: { status: 'SENDING', startedAt: new Date(), totalRecipients: usuarios.length, lastError: null },
    });
    if (marcada.count === 0) return false;
    await tx.emailCampaignRecipient.createMany({
      data: usuarios.map((u) => ({ campaignId: id, userId: u.id, email: u.email as string })),
      skipDuplicates: true,
    });
    return true;
  });
  if (!empezada) return NextResponse.json({ error: 'Esta campaña ya se envió o se está enviando' }, { status: 409 });

  iniciarEnvio(id);
  emitAdminEvent({
    type: 'EMAIL_CAMPAIGN_STARTED',
    title: `Campaña enviándose · ${campana.subject}`.slice(0, 150),
    summary: `${session?.user?.name || 'Un administrador'} empezó a enviar una campaña a ${usuarios.length} clientes`,
    link: '/admin/marketing#campanas',
  });
  return NextResponse.json({ status: 'SENDING', totalRecipients: usuarios.length });
}
