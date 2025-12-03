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

        // Get user settings
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                profile: {
                    select: {
                        emailNotifications: true,
                        orderUpdates: true,
                        promotions: true,
                        newsletter: true,
                        twoFactorAuth: true,
                        language: true,
                        currency: true,
                        theme: true,
                    },
                },
            },
        });

        return NextResponse.json({
            emailNotifications: user?.profile?.emailNotifications ?? true,
            orderUpdates: user?.profile?.orderUpdates ?? true,
            promotions: user?.profile?.promotions ?? false,
            newsletter: user?.profile?.newsletter ?? true,
            twoFactorAuth: user?.profile?.twoFactorAuth ?? false,
            language: user?.profile?.language || 'es',
            currency: user?.profile?.currency || 'USD',
            theme: user?.profile?.theme || 'light',
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

        // Update user settings
        await prisma.user.update({
            where: { id: userId },
            data: {
                profile: {
                    upsert: {
                        create: {
                            emailNotifications: body.emailNotifications,
                            orderUpdates: body.orderUpdates,
                            promotions: body.promotions,
                            newsletter: body.newsletter,
                            twoFactorAuth: body.twoFactorAuth,
                            language: body.language,
                            currency: body.currency,
                            theme: body.theme,
                        },
                        update: {
                            emailNotifications: body.emailNotifications,
                            orderUpdates: body.orderUpdates,
                            promotions: body.promotions,
                            newsletter: body.newsletter,
                            twoFactorAuth: body.twoFactorAuth,
                            language: body.language,
                            currency: body.currency,
                            theme: body.theme,
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
