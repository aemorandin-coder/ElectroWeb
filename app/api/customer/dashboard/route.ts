import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseSavedAddresses } from '@/lib/saved-addresses';
import { warrantyDaysFor } from '@/lib/product-condition';
import { eventoEsEnOficina } from '@/lib/envios/zoom';

// C-128: pedidos en curso (el stepper del inicio) y garantías vigentes
const ACTIVOS = ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED'] as const;
const DIA_MS = 24 * 60 * 60 * 1000;

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = session.user.id;

        // Get user balance (include id for transaction lookup)
        const userBalance = await prisma.userBalance.findUnique({
            where: { userId },
            select: {
                id: true,
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
        } catch {
            // Wishlist table might not exist yet
        }

        // Misiones del panel (C-89): dirección guardada y teléfono + cédula (se piden en la primera compra desde C-85)
        const perfil = await prisma.profile.findUnique({
            where: { userId },
            select: { phone: true, idNumber: true, savedAddresses: true },
        });

        // Calculate total spent this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyOrders = await prisma.order.findMany({
            where: {
                userId,
                createdAt: { gte: startOfMonth },
                paymentStatus: 'PAID',
                // C-128: una orden pagada y después cancelada no es gasto del mes
                status: { notIn: ['CANCELLED', 'REFUNDED'] },
            },
            select: {
                totalUSD: true,
            },
        });

        const totalSpentThisMonth = monthlyOrders.reduce(
            (sum, order) => sum + Number(order.totalUSD),
            0
        );

        // Get recent transactions - use balanceId directly if userBalance exists
        type RecentTx = {
            id: string;
            type: string;
            amount: unknown;
            description: string | null;
            createdAt: Date;
            status: string;
        };
        let recentTransactions: RecentTx[] = [];
        if (userBalance) {
            recentTransactions = await prisma.transaction.findMany({
                where: {
                    balanceId: userBalance.id,
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
        }


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
        type ActivityItem = {
            id: string;
            type: string;
            description: string | null;
            createdAt: Date;
            amount?: unknown;
            status?: string;
        };
        const recentActivity: ActivityItem[] = [];

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

        // C-128: pedidos en curso con lo que necesita el stepper (ZOOM avisa cuándo llegó a la oficina)
        const [pedidosEnCurso, enCursoTotal, entregadas, reclamosAbiertos, comprado] = await Promise.all([
            prisma.order.findMany({
                where: { userId, status: { in: [...ACTIVOS] } },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true, orderNumber: true, status: true, paymentStatus: true, deliveryMethod: true, shippingCarrier: true,
                    shippingMode: true, courierOfficeName: true, trackingNumber: true, totalUSD: true, createdAt: true,
                    items: { select: { productName: true, quantity: true } },
                    shipmentEvents: { where: { source: 'ZOOM' }, select: { description: true } },
                },
            }),
            prisma.order.count({ where: { userId, status: { in: [...ACTIVOS] } } }),
            // La garantía más larga es de 90 días (C-119): con 400 días de margen alcanza aunque cambie
            prisma.order.findMany({
                where: { userId, status: 'DELIVERED', deliveredAt: { gte: new Date(Date.now() - 400 * DIA_MS) } },
                select: { deliveredAt: true, items: { select: { productCondition: true, warrantyDays: true, quantity: true, product: { select: { productType: true } } } } },
            }),
            prisma.warrantyClaim.count({ where: { userId, status: { notIn: ['RESOLVED', 'REJECTED'] } } }),
            prisma.order.aggregate({ where: { userId, paymentStatus: 'PAID', status: { notIn: ['CANCELLED', 'REFUNDED'] } }, _sum: { totalUSD: true } }),
        ]);

        // Productos físicos entregados que siguen en garantía, y cuándo vence la primera
        const ahora = Date.now();
        let garantiasVigentes = 0;
        let proximoVencimiento: number | null = null;
        for (const orden of entregadas) {
            if (!orden.deliveredAt) continue;
            for (const item of orden.items) {
                if (item.product?.productType === 'DIGITAL') continue;
                const vence = orden.deliveredAt.getTime() + warrantyDaysFor(item.productCondition, item.warrantyDays) * DIA_MS;
                if (vence <= ahora) continue;
                garantiasVigentes += item.quantity;
                proximoVencimiento = proximoVencimiento === null ? vence : Math.min(proximoVencimiento, vence);
            }
        }

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
            tieneDireccion: parseSavedAddresses(perfil?.savedAddresses).length > 0,
            datosCompletos: Boolean(perfil?.phone?.trim() && perfil?.idNumber?.trim()),
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
            // C-128
            activeCount: enCursoTotal,
            activeOrders: pedidosEnCurso.map((o) => ({
                id: o.id,
                orderNumber: o.orderNumber,
                status: o.status,
                paymentStatus: o.paymentStatus,
                deliveryMethod: o.deliveryMethod,
                shippingCarrier: o.shippingCarrier,
                shippingMode: o.shippingMode,
                courierOfficeName: o.courierOfficeName,
                trackingNumber: o.trackingNumber,
                total: Number(o.totalUSD),
                createdAt: o.createdAt,
                itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
                firstItem: o.items[0]?.productName ?? null,
                enOficina: o.shipmentEvents.some((e) => eventoEsEnOficina(e.description)),
            })),
            warranties: {
                active: garantiasVigentes,
                nextExpiry: proximoVencimiento ? new Date(proximoVencimiento).toISOString() : null,
                openClaims: reclamosAbiertos,
            },
            totalPurchased: Number(comprado._sum.totalUSD ?? 0),
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json(
            { error: 'Error al obtener datos del dashboard' },
            { status: 500 }
        );
    }
}
