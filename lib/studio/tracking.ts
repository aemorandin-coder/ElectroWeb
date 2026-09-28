// Compras que llegaron por una historia de ElectroStudio (C-113). Solo servidor.
import { prisma } from '@/lib/prisma';
import { isFlyerCode } from './code';

/**
 * Anota que estas órdenes vinieron de la historia `code`. Se llama después de crear la orden y no la frena:
 * si falla, la compra sigue igual. El evento lo escribe solo el servidor (la API pública de analítica lo rechaza).
 */
export async function recordStudioOrder(code: string | undefined, orderIds: string[], userId: string | null): Promise<void> {
  if (!isFlyerCode(code) || !orderIds.length) return;
  try {
    const flyer = await prisma.studioFlyer.findUnique({ where: { code }, select: { id: true } });
    if (!flyer) return;
    await prisma.analyticsEvent.create({
      data: {
        eventType: 'studio_order',
        eventCategory: 'conversion',
        eventAction: 'order',
        eventLabel: code,
        userId,
        metadata: { orderIds, flyerId: flyer.id },
      },
    });
  } catch (error) {
    console.error('[ElectroStudio] No se pudo anotar la compra de la historia:', error);
  }
}
