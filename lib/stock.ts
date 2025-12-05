import { prisma } from './prisma';

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
        const availableStock = await getAvailableStock(item.productId);

        if (availableStock < item.quantity) {
            throw new Error(`Stock insuficiente para el producto ID: ${item.productId}`);
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

    try {
        await prisma.$transaction(reservations);
    } catch (error: any) {
        console.error('Error reserving stock transaction:', error);
        if (error.code === 'P2003') {
            throw new Error('Error de sesión o producto no válido. Por favor, cierra sesión y vuelve a ingresar, o vacía tu carrito.');
        }
        throw error;
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
