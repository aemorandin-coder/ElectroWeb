/**
 * C-219: enviar un correo de plantilla a un cliente por su id, cuando quien avisa solo tiene el id (las comisiones, el pago
 * que pasa a Puntos ES, el sorteo). Nunca lanza: un correo que no sale no puede romper una venta ni un pago.
 */
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';
import type { Correo } from './pedidos';

export async function enviarAUsuario(
  userId: string,
  armar: (usuario: { name: string | null; email: string }) => Promise<Correo>,
): Promise<boolean> {
  try {
    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, profile: { select: { accountStatus: true } } },
    });
    // Cuentas desactivadas o por eliminar no reciben correos
    if (!usuario?.email || (usuario.profile?.accountStatus ?? 'ACTIVE') !== 'ACTIVE') return false;
    const { asunto, html } = await armar({ name: usuario.name, email: usuario.email });
    const r = await sendEmail({ to: usuario.email, subject: asunto, html });
    return r.success;
  } catch (error) {
    console.error('[CORREO] No se pudo enviar a un cliente:', error);
    return false;
  }
}
