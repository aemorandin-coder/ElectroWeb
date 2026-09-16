import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { campanaSchema, contarDestinatarios, enviando, iniciarEnvio } from '@/lib/email-campaigns';

// GET — campañas y cuántos clientes aceptan promociones hoy
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const campanas = await prisma.emailCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, subject: true, status: true, totalRecipients: true, sentCount: true, failedCount: true,
      lastError: true, createdAt: true, startedAt: true, finishedAt: true,
    },
  });

  // Un reinicio del servidor corta el envío en curso: al abrir el panel se reanuda solo
  for (const campana of campanas) {
    if (campana.status === 'SENDING' && !enviando(campana.id)) iniciarEnvio(campana.id);
  }

  const [destinatarios, ajustes] = await Promise.all([
    contarDestinatarios(),
    prisma.emailSettings.findUnique({ where: { id: 'default' }, select: { marketingEnabled: true, dailyLimit: true } }),
  ]);

  return NextResponse.json({
    campanas,
    destinatarios,
    marketingActivo: ajustes?.marketingEnabled ?? false,
    limiteDiario: ajustes?.dailyLimit ?? 500,
  });
}

// POST — nuevo borrador
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = campanaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const campana = await prisma.emailCampaign.create({
    data: {
      subject: parsed.data.subject,
      preheader: parsed.data.preheader || null,
      content: JSON.stringify(parsed.data.bloques),
      createdById: session?.user?.id ?? null,
    },
    select: { id: true },
  });
  return NextResponse.json(campana, { status: 201 });
}
