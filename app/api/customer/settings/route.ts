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

        // Get user profile
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                profile: {
                    select: {
                        isBusinessAccount: true,
                        businessVerified: true,
                        businessVerificationStatus: true,
                    },
                },
            },
        });

        return NextResponse.json({
            // Business fields
            isBusinessAccount: user?.profile?.isBusinessAccount || false,
            businessVerified: user?.profile?.businessVerified || false,
            businessVerificationStatus: user?.profile?.businessVerificationStatus || 'NONE',
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json(
            { error: 'Error al obtener configuración' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json();

        // Update user profile
        await prisma.user.update({
            where: { id: userId },
            data: {
                profile: {
                    upsert: {
                        create: {
                            isBusinessAccount: body.isBusinessAccount,
                        },
                        update: {
                            isBusinessAccount: body.isBusinessAccount,
                        },
                    },
                },
            },
        });

        return NextResponse.json({ message: 'Configuración actualizada exitosamente' });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json(
            { error: 'Error al actualizar configuración' },
            { status: 500 }
        );
    }
}
