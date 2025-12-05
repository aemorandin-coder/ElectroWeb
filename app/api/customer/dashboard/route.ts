import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = session.user.id;

        // Get user balance
        const userBalance = await prisma.userBalance.findUnique({
            where: { userId },
            select: {
                balance: true,
                totalRecharges: true,
                totalSpent: true,
            },
        });

        // Get orders count and stats
        const [totalOrders, pendingOrders, recentOrders] = await Promise.all([
            prisma.order.count({
                where: { userId },
            }),
            prisma.order.count({
                where: { userId, status: 'PENDING' },
            }),
            prisma.order.findMany({
                where: { userId },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    items: {
                        select: {
                            productName: true,
                            productImage: true,
                            quantity: true,
                        },
                    },
                },
            }),
        ]);

        // Get wishlist count (if wishlist table exists)
        let wishlistCount = 0;
        try {
            wishlistCount = await prisma.wishlist.count({
                where: { userId },
            });
        } catch (error) {
            // Wishlist table might not exist yet
            console.log('Wishlist table not found');
        }

        // Calculate total spent this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyOrders = await prisma.order.findMany({
            where: {
                userId,
                createdAt: { gte: startOfMonth },
                paymentStatus: 'PAID',
            },
            select: {
                totalUSD: true,
            },
        });

        const totalSpentThisMonth = monthlyOrders.reduce(
            (sum, order) => sum + Number(order.totalUSD),
            0
        );

        // Get recent activity (last 10 transactions)
        const recentActivity = await prisma.transaction.findMany({
            where: {
                balance: {
                    userId,
                },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                type: true,
                amount: true,
                description: true,
                createdAt: true,
                status: true,
            },
        });

        return NextResponse.json({
            balance: Number(userBalance?.balance || 0),
            totalRecharges: Number(userBalance?.totalRecharges || 0),
            totalSpent: Number(userBalance?.totalSpent || 0),
            orders: totalOrders,
            pending: pendingOrders,
            wishlist: wishlistCount,
            totalSpentThisMonth,
            recentOrders: recentOrders.map(order => ({
                id: order.id,
                orderNumber: order.orderNumber,
                total: Number(order.totalUSD),
                status: order.status,
                createdAt: order.createdAt,
                itemCount: order.items.length,
                items: order.items.slice(0, 3),
            })),
            recentActivity: recentActivity.map(activity => ({
                id: activity.id,
                type: activity.type,
                amount: Number(activity.amount),
                description: activity.description,
                createdAt: activity.createdAt,
                status: activity.status,
            })),
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json(
            { error: 'Error al obtener datos del dashboard' },
            { status: 500 }
        );
    }
}
