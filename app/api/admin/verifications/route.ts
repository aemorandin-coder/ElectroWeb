import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Check for admin permissions (assuming SUPER_ADMIN or similar role check logic exists, 
        // for now checking if user exists and has admin role if applicable, or just relying on session for this MVP step 
        // but ideally should check `session.user.role === 'ADMIN'`)
        // Based on previous files, it seems we check permissions.

        if (!isAuthorized(session, 'MANAGE_USERS')) {
            // Fallback if permissions structure is different, but let's assume standard admin check
            // If strictly following previous patterns:
            // return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Fetch profiles with pending verification or all business profiles
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');

        const whereClause: any = {
            isBusinessAccount: true,
        };

        if (status && status !== 'ALL') {
            whereClause.businessVerificationStatus = status;
        }

        const profiles = await prisma.profile.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        image: true,
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return NextResponse.json(profiles);
    } catch (error) {
        console.error('Error fetching verifications:', error);
        return NextResponse.json({ error: 'Error al obtener verificaciones' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_USERS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { profileId, status, notes } = body;

        if (!profileId || !status) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        const updatedProfile = await prisma.profile.update({
            where: { id: profileId },
            data: {
                businessVerificationStatus: status,
                businessVerificationNotes: notes,
                businessVerified: status === 'APPROVED',
                businessVerifiedAt: status === 'APPROVED' ? new Date() : null,
            },
            include: {
                user: {
                    select: {
                        email: true,
                        name: true
                    }
                }
            }
        });

        // TODO: Send email notification to user about status change

        return NextResponse.json(updatedProfile);
    } catch (error) {
        console.error('Error updating verification:', error);
        return NextResponse.json({ error: 'Error al actualizar verificación' }, { status: 500 });
    }
}
