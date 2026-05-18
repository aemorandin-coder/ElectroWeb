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

        const influencer = await prisma.influencer.findUnique({
            where: { userId },
        });

        if (!influencer) {
            return NextResponse.json({ enrolled: false });
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [pendingStats, approvedStats, thisMonthStats, totalCount, recentConversions] =
            await Promise.all([
                prisma.referralConversion.aggregate({
                    where: { influencerId: influencer.id, status: 'PENDING' },
                    _sum: { commission: true },
                    _count: { id: true },
                }),
                prisma.referralConversion.aggregate({
                    where: { influencerId: influencer.id, status: 'APPROVED' },
                    _sum: { commission: true },
                    _count: { id: true },
                }),
                prisma.referralConversion.aggregate({
                    where: {
                        influencerId: influencer.id,
                        status: 'APPROVED',
                        createdAt: { gte: startOfMonth },
                    },
                    _sum: { commission: true },
                }),
                prisma.referralConversion.count({
                    where: { influencerId: influencer.id },
                }),
                prisma.referralConversion.findMany({
                    where: { influencerId: influencer.id },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    select: {
                        id: true,
                        type: true,
                        grossAmount: true,
                        commission: true,
                        status: true,
                        createdAt: true,
                    },
                }),
            ]);

        // Leaderboard: top 10 influencers by total approved commission
        const leaderboardRaw = await prisma.referralConversion.groupBy({
            by: ['influencerId'],
            where: { status: 'APPROVED' },
            _sum: { commission: true },
            _count: { id: true },
            orderBy: { _sum: { commission: 'desc' } },
            take: 10,
        });

        const influencerIds = leaderboardRaw.map((l) => l.influencerId);
        const influencerNames = await prisma.influencer.findMany({
            where: { id: { in: influencerIds } },
            select: { id: true, name: true },
        });
        const nameMap = Object.fromEntries(influencerNames.map((i) => [i.id, i.name]));

        const userInLeaderboard = leaderboardRaw.findIndex(
            (l) => l.influencerId === influencer.id
        );
        const currentUserRank = userInLeaderboard >= 0 ? userInLeaderboard + 1 : null;

        const leaderboard = leaderboardRaw.map((entry, idx) => {
            const name = nameMap[entry.influencerId] || 'Usuario';
            const isCurrentUser = entry.influencerId === influencer.id;
            const anonymizedName = isCurrentUser
                ? name
                : name.length > 3
                  ? name.substring(0, 3) + '***'
                  : name.substring(0, 1) + '***';
            return {
                rank: idx + 1,
                name: anonymizedName,
                totalEarnings: Number(entry._sum.commission || 0),
                conversionsCount: entry._count.id,
                isCurrentUser,
            };
        });

        const pendingEarnings = Number(pendingStats._sum.commission || 0);
        const approvedEarnings = Number(approvedStats._sum.commission || 0);
        const approvedConversions = approvedStats._count.id;

        return NextResponse.json({
            enrolled: true,
            influencer: {
                id: influencer.id,
                code: influencer.code,
                name: influencer.name,
                commissionRate: Number(influencer.commissionRate),
                status: influencer.status,
                createdAt: influencer.createdAt,
            },
            stats: {
                totalConversions: totalCount,
                approvedConversions,
                pendingEarnings,
                approvedEarnings,
                totalEarnings: pendingEarnings + approvedEarnings,
                thisMonthEarnings: Number(thisMonthStats._sum.commission || 0),
            },
            conversions: recentConversions.map((c) => ({
                id: c.id,
                type: c.type,
                grossAmount: Number(c.grossAmount),
                commission: Number(c.commission),
                status: c.status,
                createdAt: c.createdAt,
            })),
            currentUserRank,
            leaderboard,
        });
    } catch (error) {
        console.error('Error fetching referral data:', error);
        return NextResponse.json(
            { error: 'Error al obtener datos de referidos' },
            { status: 500 }
        );
    }
}
