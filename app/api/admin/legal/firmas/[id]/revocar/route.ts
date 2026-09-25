import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';

// Pedirle a un cliente que firme de nuevo (C-103). Antes se BORRABA la aceptación y con ella la única prueba legal;
// ahora la firma queda como historial (revocada, con motivo) y el cliente firma otra vez.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const motivo = typeof body?.motivo === 'string' ? body.motivo.trim().slice(0, 300) : '';
  if (motivo.length < 5) return NextResponse.json({ error: 'Escribe el motivo (se le muestra al cliente)', field: 'motivo' }, { status: 400 });

  const hecho = await prisma.documentSignature.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: motivo, revokedById: session?.user?.id ?? null },
  });
  if (hecho.count !== 1) return NextResponse.json({ error: 'La firma no existe o ya se pidió de nuevo' }, { status: 409 });
  const firma = await prisma.documentSignature.findUniqueOrThrow({ where: { id }, include: { document: { select: { title: true, slug: true } } } });

  await prisma.notification.create({
    data: {
      userId: firma.userId,
      type: 'SYSTEM',
      title: 'Firma un documento de nuevo',
      message: `Necesitamos que vuelvas a firmar "${firma.document.title}": ${motivo}`,
      link: '/customer/documentos',
      icon: 'FiFileText',
    },
  }).catch(() => null);
  await registrarAccionAdmin(session, 'SECURITY_ADMIN_ACTION', { type: 'LEGAL_SIGNATURE', id }, {
    cambio: 'Firma pedida de nuevo', cliente: firma.userEmail, documento: firma.document.title, motivo,
  }, request);
  return NextResponse.json({ success: true });
}
