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
        const recentTransactions = await prisma.transaction.findMany({
            where: {
                balance: {
                    userId,
                },
            },
            take: 5,
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

        // Get user profile for last login
        const profile = await prisma.profile.findUnique({
            where: { userId },
            select: {
                lastLoginAt: true,
            },
        });

        // Get last order
        const lastOrder = await prisma.order.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                orderNumber: true,
                createdAt: true,
                totalUSD: true,
            },
        });

        // Get account creation date
        const userAccount = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                createdAt: true,
            },
        });

        // Build activity array
        const recentActivity: any[] = [];

        // Add last login
        if (profile?.lastLoginAt) {
            recentActivity.push({
                id: 'login-' + profile.lastLoginAt.getTime(),
                type: 'LOGIN',
                description: 'Inicio de sesión',
                createdAt: profile.lastLoginAt,
            });
        }

        // Add last order
        if (lastOrder) {
            recentActivity.push({
                id: 'order-' + lastOrder.id,
                type: 'ORDER',
                description: `Pedido #${lastOrder.orderNumber}`,
                amount: Number(lastOrder.totalUSD),
                createdAt: lastOrder.createdAt,
            });
        }

        // Add account creation if recent (within last 30 days)
        if (userAccount?.createdAt) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if (userAccount.createdAt > thirtyDaysAgo) {
                recentActivity.push({
                    id: 'account-created',
                    type: 'ACCOUNT',
                    description: 'Cuenta creada',
                    createdAt: userAccount.createdAt,
                });
            }
        }

        // Add transactions (recharges and purchases)
        recentTransactions.forEach((tx) => {
            recentActivity.push({
                id: tx.id,
                type: tx.type,
                amount: Number(tx.amount),
                description: tx.description,
                createdAt: tx.createdAt,
                status: tx.status,
            });
        });

        // Sort by date and limit to 5
        recentActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const limitedActivity = recentActivity.slice(0, 5);

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
            recentActivity: limitedActivity,
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json(
            { error: 'Error al obtener datos del dashboard' },
            { status: 500 }
        );
    }
}
