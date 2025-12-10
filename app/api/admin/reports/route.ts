import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get analytics reports (admin only)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = session?.user?.role;

        if (!session || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d, 1y
        const type = searchParams.get('type') || 'overview';

        // Calculate date range
        const now = new Date();
        let startDate = new Date();
        switch (period) {
            case '24h':
                startDate.setHours(startDate.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(startDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7);
        }

        if (type === 'overview') {
            // Get overview statistics
            const [
                totalUsers,
                newUsers,
                totalOrders,
                recentOrders,
                totalProducts,
                totalProductRequests,
                pendingProductRequests,
                totalPageViews,
                totalClicks,
                securityAlerts,
                criticalAlerts,
            ] = await Promise.all([
                // Total users
                prisma.user.count(),
                // New users in period
                prisma.user.count({
                    where: { createdAt: { gte: startDate } },
                }),
                // Total orders
                prisma.order.count(),
                // Recent orders in period
                prisma.order.count({
                    where: { createdAt: { gte: startDate } },
                }),
                // Total products
                prisma.product.count(),
                // Total product requests
                prisma.productRequest.count(),
                // Pending product requests
                prisma.productRequest.count({
                    where: { status: 'PENDING' },
                }),
                // Page views in period
                prisma.analyticsEvent.count({
                    where: {
                        eventType: 'page_view',
                        createdAt: { gte: startDate },
                    },
                }),
                // Clicks in period
                prisma.analyticsEvent.count({
                    where: {
                        eventType: 'click',
                        createdAt: { gte: startDate },
                    },
                }),
                // Security alerts in period
                prisma.securityLog.count({
                    where: { createdAt: { gte: startDate } },
                }),
                // Critical security alerts
                prisma.securityLog.count({
                    where: {
                        severity: 'critical',
                        createdAt: { gte: startDate },
                    },
                }),
            ]);

            // Get revenue data
            const orderRevenue = await prisma.order.aggregate({
                _sum: { totalUSD: true },
                where: { createdAt: { gte: startDate } },
            });

            return NextResponse.json({
                overview: {
                    users: { total: totalUsers, new: newUsers },
                    orders: { total: totalOrders, recent: recentOrders },
                    products: { total: totalProducts },
                    productRequests: { total: totalProductRequests, pending: pendingProductRequests },
                    interactions: { pageViews: totalPageViews, clicks: totalClicks },
                    security: { total: securityAlerts, critical: criticalAlerts },
                    revenue: { total: orderRevenue._sum?.totalUSD || 0 },
                },
                period,
            });
        }

        if (type === 'products') {
            // Product metrics
            const productStats = await prisma.product.findMany({
                select: {
                    id: true,
                    name: true,
                    _count: {
                        select: {
                            orderItems: true,
                            reviews: true,
                        },
                    },
                },
                orderBy: {
                    orderItems: { _count: 'desc' },
                },
                take: 10,
            });

            const productRequests = await prisma.productRequest.groupBy({
                by: ['status'],
                _count: true,
            });

            return NextResponse.json({
                products: {
                    topSelling: productStats,
                    requests: productRequests,
                },
                period,
            });
        }

        if (type === 'interactions') {
            // Event type breakdown
            const eventsByType = await prisma.analyticsEvent.groupBy({
                by: ['eventType'],
                _count: true,
                where: { createdAt: { gte: startDate } },
                orderBy: { _count: { eventType: 'desc' } },
            });

            // Device breakdown
            const eventsByDevice = await prisma.analyticsEvent.groupBy({
                by: ['deviceType'],
                _count: true,
                where: { createdAt: { gte: startDate } },
            });

            // Browser breakdown
            const eventsByBrowser = await prisma.analyticsEvent.groupBy({
                by: ['browser'],
                _count: true,
                where: { createdAt: { gte: startDate } },
            });

            // Top pages
            const topPages = await prisma.analyticsEvent.groupBy({
                by: ['page'],
                _count: true,
                where: {
                    eventType: 'page_view',
                    createdAt: { gte: startDate },
                    page: { not: null },
                },
                orderBy: { _count: { page: 'desc' } },
                take: 10,
            });

            // Daily events for chart
            const dailyEvents = await prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM analytics_events
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

            return NextResponse.json({
                interactions: {
                    byType: eventsByType,
                    byDevice: eventsByDevice,
                    byBrowser: eventsByBrowser,
                    topPages,
                    daily: dailyEvents,
                },
                period,
            });
        }

        if (type === 'security') {
            // Security events
            const securityByType = await prisma.securityLog.groupBy({
                by: ['eventType'],
                _count: true,
                where: { createdAt: { gte: startDate } },
                orderBy: { _count: { eventType: 'desc' } },
            });

            const securityBySeverity = await prisma.securityLog.groupBy({
                by: ['severity'],
                _count: true,
                where: { createdAt: { gte: startDate } },
            });

            // Recent security logs
            const recentSecurityLogs = await prisma.securityLog.findMany({
                where: { createdAt: { gte: startDate } },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });

            // Top suspicious IPs
            const suspiciousIPs = await prisma.securityLog.groupBy({
                by: ['ipAddress'],
                _count: true,
                where: {
                    createdAt: { gte: startDate },
                    severity: { in: ['warning', 'critical'] },
                },
                orderBy: { _count: { ipAddress: 'desc' } },
                take: 10,
            });

            return NextResponse.json({
                security: {
                    byType: securityByType,
                    bySeverity: securityBySeverity,
                    recentLogs: recentSecurityLogs,
                    suspiciousIPs,
                },
                period,
            });
        }

        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reports' },
            { status: 500 }
        );
    }
}
