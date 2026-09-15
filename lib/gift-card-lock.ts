import { prisma } from '@/lib/prisma';

/**
 * Bloqueo por tarjeta tras PIN fallidos (C-71).
 * Se cuenta en audit_logs (persistente): el límite en memoria de lib/rate-limit se reinicia en cada despliegue
 * y es por usuario + IP, así que se esquivaba cambiando de cuenta.
 */
export const GIFT_CARD_MAX_PIN_FAILURES = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
export const GIFT_CARD_PIN_FAILURE_ACTION = 'SECURITY_SUSPICIOUS_ACTIVITY';

export async function countPinFailures(giftCardId: string): Promise<number> {
  return prisma.auditLog.count({
    where: {
      action: GIFT_CARD_PIN_FAILURE_ACTION,
      targetType: 'GIFT_CARD_PIN',
      targetId: giftCardId,
      createdAt: { gte: new Date(Date.now() - WINDOW_MS) },
    },
  });
}
