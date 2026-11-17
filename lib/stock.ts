import { prisma } from './prisma';

/**
 * STOCK RESERVATION LOGIC (Updated Dec 2024):
 * 
 * - WALLET Payment: Stock is deducted IMMEDIATELY upon order creation.
 *   No reservation needed since payment is confirmed instantly.
 * 
 * - DIRECT Payment: Stock is RESERVED for 15 minutes while admin verifies payment.
 *   Stock is NOT deducted until admin confirms payment (paymentStatus = PAID).
 *   When admin confirms: stock is deducted and reservation is deleted.
 *   If reservation expires: stock becomes available again.
 * 
 * Priority is given to WALLET users since they prepaid (the future business model).
 */

/**
 * Cleans up expired reservations
 */
export async function cleanupExpiredReservations() {
    try {
        await prisma.stockReservation.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
    } catch (error) {
        console.error('Error cleaning up expired reservations:', error);
    }
}

/**
 * Gets the available stock for a product, accounting for active reservations
 */
export async function getAvailableStock(productId: string): Promise<number> {
    // First clean up expired reservations
    await cleanupExpiredReservations();

    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true },
    });

    if (!product) return 0;

    const activeReservations = await prisma.stockReservation.aggregate({
        _sum: {
            quantity: true,
        },
        where: {
            productId,
            expiresAt: {
                gt: new Date(),
            },
        },
    });

    const reservedQuantity = activeReservations._sum.quantity || 0;
    return Math.max(0, product.stock - reservedQuantity);
}
