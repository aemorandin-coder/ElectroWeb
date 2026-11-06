import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * C-191: ¿hay que preguntarle al cliente si quiere recibir promociones por correo?
 * Solo cuando nunca lo decidió: ni sí ni no, en el registro, en Mi panel, en su perfil o con el enlace de baja.
 * El sí o el no se guarda con PATCH /api/customer/settings (notificaciones.emailPromotions), que anota la fecha.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
    select: { emailPromotions: true, emailPromotionsAt: true },
  });
  // Quien ya las tenía encendidas antes de C-191 (sin fecha) también decidió
  const preguntar = !prefs || (!prefs.emailPromotions && !prefs.emailPromotionsAt);
  return NextResponse.json({ preguntar });
}
