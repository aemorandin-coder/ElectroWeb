import { prisma } from './prisma';

/**
 * Calculate average rating and total reviews for a product
 */
export async function getProductReviewStats(productId: string) {
    const reviews = await prisma.review.findMany({
        where: {
            productId,
            isPublished: true,
        },
        select: {
            rating: true,
        },
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 0;

    return {
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews,
    };
}

/**
 * Get rating distribution for a product
 */
export async function getProductRatingDistribution(productId: string) {
    const reviews = await prisma.review.findMany({
        where: {
            productId,
            isPublished: true,
        },
        select: {
            rating: true,
        },
    });

    const distribution = {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
    };

    reviews.forEach(review => {
        distribution[review.rating as keyof typeof distribution]++;
    });

    return distribution;
}

/**
 * Get products with their review stats
 */
export async function getProductsWithReviewStats(productIds?: string[]) {
    const where = productIds ? { id: { in: productIds } } : {};

    const products = await prisma.product.findMany({
        where,
        include: {
            category: true,
            reviews: {
                where: { isPublished: true },
                select: { rating: true },
            },
        },
    });

    return products.map(product => {
        const totalReviews = product.reviews.length;
        const averageRating = totalReviews > 0
            ? product.reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews
            : 0;

        const { reviews, ...productData } = product;

        return {
            ...productData,
            averageRating: Number(averageRating.toFixed(1)),
            totalReviews,
        };
    });
}

/**
 * Check if user can review a product
 */
export async function canUserReviewProduct(userId: string, productId: string) {
    // Check if user already reviewed
    const existingReview = await prisma.review.findFirst({
        where: {
            userId,
            productId,
        },
    });

    if (existingReview) {
        return {
            canReview: false,
            reason: 'Ya has enviado una reseña para este producto',
        };
    }

    // Check if user has a delivered order with this product
    const deliveredOrder = await prisma.orderItem.findFirst({
        where: {
            productId,
            order: {
                userId,
                status: 'DELIVERED',
            },
        },
        include: {
            order: {
                select: {
                    deliveredAt: true,
                },
            },
        },
    });

    if (!deliveredOrder) {
        return {
            canReview: false,
            reason: 'Solo puedes dejar reseñas de productos que hayas comprado y recibido',
        };
    }

    return {
        canReview: true,
        deliveredAt: deliveredOrder.order.deliveredAt,
    };
}

/**
 * Get review statistics for admin dashboard
 */
export async function getReviewStatistics() {
    const [total, pending, approved, rejected] = await Promise.all([
        prisma.review.count(),
        prisma.review.count({ where: { isApproved: false, isPublished: false } }),
        prisma.review.count({ where: { isApproved: true, isPublished: true } }),
        prisma.review.count({ where: { isApproved: false, isPublished: false } }),
    ]);

    const recentReviews = await prisma.review.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
            product: {
                select: {
                    name: true,
                    slug: true,
                },
            },
        },
    });

    const averageRatingByProduct = await prisma.review.groupBy({
        by: ['productId'],
        where: { isPublished: true },
        _avg: {
            rating: true,
        },
        _count: {
            rating: true,
        },
    });

    return {
        total,
        pending,
        approved,
        rejected,
        recentReviews,
        averageRatingByProduct,
    };
}
