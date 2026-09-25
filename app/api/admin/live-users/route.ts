import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

// GET - Get count of users currently active on the site (last 5 minutes)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'VIEW_REPORTS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
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

        // Dispositivos por visitante (C-104): antes contaba eventos, y quien hacía 20 clics pesaba 20 veces
        const deviceBreakdown = await prisma.analyticsEvent.groupBy({
            by: ['deviceType', 'sessionId'],
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
                acc[d.deviceType || 'unknown'] = (acc[d.deviceType || 'unknown'] ?? 0) + 1;
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
