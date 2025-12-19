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

// Reservation duration in minutes
const RESERVATION_DURATION_MINUTES = 15;

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

/**
 * Reserves stock for a user
 */
export async function reserveStock(userId: string, items: { productId: string; quantity: number }[]) {
    // Clean up any existing reservations for this user to avoid duplicates/holding too much
    await prisma.stockReservation.deleteMany({
        where: { userId },
    });

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + RESERVATION_DURATION_MINUTES);

    const reservations = [];

    // Check availability and create reservations
    for (const item of items) {
        // Skip virtual products (Gift Cards, wallet recharges) by ID prefix
        if (item.productId.startsWith('gift-card-') ||
            item.productId.startsWith('wallet-recharge-')) {
            continue;
        }

        // Check if product exists and get its type
        const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: {
                id: true,
                stock: true,
                productType: true,
                name: true,
            },
        });

        // Skip if product doesn't exist
        if (!product) {
            console.warn(`[STOCK] Product not found: ${item.productId}, skipping reservation`);
            continue;
        }

        // Skip digital products (they don't have physical stock)
        // Digital products may have productType='DIGITAL' or their name may indicate it's digital
        if (product.productType === 'DIGITAL' ||
            product.name?.toLowerCase().includes('digital') ||
            product.name?.toLowerCase().includes('código') ||
            product.name?.toLowerCase().includes('codigo') ||
            product.name?.toLowerCase().includes('licencia') ||
            product.name?.toLowerCase().includes('key') ||
            product.name?.toLowerCase().includes('suscripción') ||
            product.name?.toLowerCase().includes('suscripcion')) {
            console.log(`[STOCK] Skipping digital product: ${product.name}`);
            continue;
        }

        const availableStock = await getAvailableStock(item.productId);

        if (availableStock < item.quantity) {
            throw new Error(`Stock insuficiente para "${product.name}". Disponible: ${availableStock}, Solicitado: ${item.quantity}`);
        }

        reservations.push(
            prisma.stockReservation.create({
                data: {
                    userId,
                    productId: item.productId,
                    quantity: item.quantity,
                    expiresAt,
                },
            })
        );
    }

    // Only run transaction if there are physical products to reserve
    if (reservations.length > 0) {
        try {
            await prisma.$transaction(reservations);
        } catch (error: any) {
            console.error('Error reserving stock transaction:', error);
            if (error.code === 'P2003') {
                throw new Error('Error de sesión o producto no válido. Por favor, cierra sesión y vuelve a ingresar, o vacía tu carrito.');
            }
            throw error;
        }
    }

    return expiresAt;
}

/**
 * Releases reservations for a user (e.g. after successful purchase or manual cancel)
 */
export async function releaseReservations(userId: string) {
    await prisma.stockReservation.deleteMany({
        where: { userId },
    });
}
