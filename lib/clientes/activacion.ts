// C-276: reenviar el enlace de activación a un cliente desde el panel, con los mismos topes que el reenvío del cliente
// (app/api/auth/resend-verification: 3 por hora y uno por minuto) y el mismo correo. Solo en el servidor.
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email-service';

const MAXIMO_POR_HORA = 3;
const MINIMO_ENTRE_ENVIOS_S = 60;

export async function reenviarActivacion(userId: string): Promise<{ ok: true; correo: string } | { ok: false; error: string; status: number }> {
  const u = await prisma.user.findFirst({ where: { id: userId, role: 'USER' }, select: { id: true, email: true, name: true, emailVerified: true, profile: { select: { accountStatus: true } } } });
  if (!u?.email) return { ok: false, error: 'Ese cliente no tiene correo', status: 404 };
  if (u.emailVerified) return { ok: false, error: 'Su correo ya está verificado', status: 409 };
  if (u.profile?.accountStatus === 'SUSPENDED') return { ok: false, error: 'La cuenta está suspendida: reactívala antes', status: 409 };
  const hace1h = new Date(Date.now() - 60 * 60 * 1000);
  const [recientes, ultimo] = await Promise.all([
    prisma.emailVerificationToken.count({ where: { userId: u.id, createdAt: { gte: hace1h } } }),
    prisma.emailVerificationToken.findFirst({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
  ]);
  if (recientes >= MAXIMO_POR_HORA) return { ok: false, error: 'Ya se le enviaron 3 enlaces en la última hora. Prueba más tarde.', status: 429 };
  if (ultimo && (Date.now() - ultimo.createdAt.getTime()) / 1000 < MINIMO_ENTRE_ENVIOS_S) return { ok: false, error: 'Se le envió uno hace menos de un minuto.', status: 429 };
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.emailVerificationToken.create({ data: { userId: u.id, token, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  await sendVerificationEmail(u.email, token, u.name || undefined);
  return { ok: true, correo: u.email };
}
