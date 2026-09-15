import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'VIEW_DASHBOARD')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const count = await prisma.profile.count({
            where: {
                businessVerificationStatus: 'PENDING',
            },
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error('Error fetching pending verifications count:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
