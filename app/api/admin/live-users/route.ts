import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get count of users currently active on the site (last 5 minutes)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userRole = session?.user?.role;

        if (!session || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get users active in the last 5 minutes (based on analytics events)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        // Count unique sessions/IPs that have events in the last 5 minutes
        const liveVisitors = await prisma.analyticsEvent.groupBy({
            by: ['sessionId'],
            where: {
                createdAt: { gte: fiveMinutesAgo },
                sessionId: { not: null },
            },
        });

        // Also get authenticated users active in the last 5 minutes
        const authenticatedUsers = await prisma.analyticsEvent.groupBy({
            by: ['userId'],
            where: {
                createdAt: { gte: fiveMinutesAgo },
                userId: { not: null },
            },
        });

        // Get device breakdown for live users
        const deviceBreakdown = await prisma.analyticsEvent.groupBy({
            by: ['deviceType'],
            _count: true,
            where: {
                createdAt: { gte: fiveMinutesAgo },
                sessionId: { not: null },
            },
        });

        // Get current page breakdown (what pages are users viewing now)
        const currentPages = await prisma.analyticsEvent.groupBy({
            by: ['page'],
            _count: true,
            where: {
                eventType: 'page_view',
                createdAt: { gte: fiveMinutesAgo },
                page: { not: null },
            },
            orderBy: { _count: { page: 'desc' } },
            take: 5,
        });

        return NextResponse.json({
            liveCount: liveVisitors.length,
            authenticatedCount: authenticatedUsers.length,
            devices: deviceBreakdown.reduce((acc, d) => {
                acc[d.deviceType || 'unknown'] = d._count;
                return acc;
            }, {} as Record<string, number>),
            topPages: currentPages.map(p => ({
                page: p.page,
                count: p._count,
            })),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error fetching live users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch live users', liveCount: 0 },
            { status: 500 }
        );
    }
}
