// C-249d: lo que leen del servidor las páginas del asistente de campañas (nueva y cambiar). Solo servidor.
import { prisma } from '@/lib/prisma';
import { resumenAudiencia } from '@/lib/email-campaigns';
import type { Envio } from './AsistenteCampana';

/** A quiénes llega hoy, si se puede enviar, el límite por día y el nombre con que sale (lo mismo que la lista) */
export async function datosDeEnvio(): Promise<Envio> {
  const [audiencia, ajustes] = await Promise.all([
    resumenAudiencia(),
    prisma.emailSettings.findUnique({ where: { id: 'default' }, select: { marketingEnabled: true, dailyLimit: true, fromName: true } }),
  ]);
  return {
    audiencia,
    marketingActivo: ajustes?.marketingEnabled ?? false,
    limiteDiario: ajustes?.dailyLimit ?? 500,
    remitente: ajustes?.fromName || process.env.SMTP_FROM_NAME || 'Electro Shop',
  };
}
