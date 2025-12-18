import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = session.user.id;

        // Get user profile and notification preferences
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                profile: {
                    select: {
                        isBusinessAccount: true,
                        businessVerified: true,
                        businessVerificationStatus: true,
                        // Session info
                        lastLoginAt: true,
                        lastLoginDevice: true,
                        lastLoginIp: true,
                        // Privacy
                        allowSurveys: true,
                        shareAnonymousData: true,
                        // Account status
                        accountStatus: true,
                        deactivatedAt: true,
                        deletionRequestedAt: true,
                    },
                },
                notificationPreferences: {
                    select: {
                        emailOrders: true,
                        emailReviews: true,
                        emailPromotions: true,
                        inAppOrders: true,
                        inAppReviews: true,
                        inAppPromotions: true,
                        soundEnabled: true,
                    },
                },
            },
        });

        return NextResponse.json({
            // Business fields
            isBusinessAccount: user?.profile?.isBusinessAccount || false,
            businessVerified: user?.profile?.businessVerified || false,
            businessVerificationStatus: user?.profile?.businessVerificationStatus || 'NONE',
            purchaseAsBusinessDefault: user?.profile?.isBusinessAccount || false,

            // Session info
            session: {
                lastLoginAt: user?.profile?.lastLoginAt || null,
                lastLoginDevice: user?.profile?.lastLoginDevice || 'Desconocido',
                lastLoginIp: user?.profile?.lastLoginIp || null,
            },

            // Privacy preferences
            privacy: {
                allowSurveys: user?.profile?.allowSurveys ?? true,
                shareAnonymousData: user?.profile?.shareAnonymousData ?? false,
            },

            // Account status
            accountStatus: user?.profile?.accountStatus || 'ACTIVE',
            deactivatedAt: user?.profile?.deactivatedAt || null,
            deletionRequestedAt: user?.profile?.deletionRequestedAt || null,

            // Notification preferences
            notifications: {
                emailOrders: user?.notificationPreferences?.emailOrders ?? true,
                emailReviews: user?.notificationPreferences?.emailReviews ?? true,
                emailPromotions: user?.notificationPreferences?.emailPromotions ?? false,
                inAppOrders: user?.notificationPreferences?.inAppOrders ?? true,
                inAppReviews: user?.notificationPreferences?.inAppReviews ?? true,
                inAppPromotions: user?.notificationPreferences?.inAppPromotions ?? true,
                soundEnabled: user?.notificationPreferences?.soundEnabled ?? false,
            },
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

        // Handle account actions
        if (body.action === 'deactivate') {
            await prisma.profile.upsert({
                where: { userId },
                create: {
                    userId,
                    accountStatus: 'DEACTIVATED',
                    deactivatedAt: new Date(),
                },
                update: {
                    accountStatus: 'DEACTIVATED',
                    deactivatedAt: new Date(),
                },
            });
            return NextResponse.json({ message: 'Cuenta desactivada' });
        }

        if (body.action === 'reactivate') {
            await prisma.profile.update({
                where: { userId },
                data: {
                    accountStatus: 'ACTIVE',
                    deactivatedAt: null,
                },
            });
            return NextResponse.json({ message: 'Cuenta reactivada' });
        }

        if (body.action === 'request_deletion') {
            await prisma.profile.upsert({
                where: { userId },
                create: {
                    userId,
                    accountStatus: 'PENDING_DELETION',
                    deletionRequestedAt: new Date(),
                    deletionReason: body.reason || null,
                },
                update: {
                    accountStatus: 'PENDING_DELETION',
                    deletionRequestedAt: new Date(),
                    deletionReason: body.reason || null,
                },
            });
            return NextResponse.json({ message: 'Solicitud de eliminación registrada. Procesaremos tu solicitud en 30 días.' });
        }

        if (body.action === 'cancel_deletion') {
            await prisma.profile.update({
                where: { userId },
                data: {
                    accountStatus: 'ACTIVE',
                    deletionRequestedAt: null,
                    deletionReason: null,
                },
            });
            return NextResponse.json({ message: 'Solicitud de eliminación cancelada' });
        }

        // Update profile settings
        const profileData: any = {};

        if (body.purchaseAsBusinessDefault !== undefined) {
            profileData.isBusinessAccount = body.purchaseAsBusinessDefault;
        }

        if (body.privacy) {
            if (body.privacy.allowSurveys !== undefined) {
                profileData.allowSurveys = body.privacy.allowSurveys;
            }
            if (body.privacy.shareAnonymousData !== undefined) {
                profileData.shareAnonymousData = body.privacy.shareAnonymousData;
            }
        }

        // Update profile if there are changes
        if (Object.keys(profileData).length > 0) {
            await prisma.profile.upsert({
                where: { userId },
                create: {
                    userId,
                    ...profileData,
                },
                update: profileData,
            });
        }

        // Update notification preferences if provided
        if (body.notifications) {
            await prisma.notificationPreference.upsert({
                where: { userId },
                create: {
                    userId,
                    emailOrders: body.notifications.emailOrders ?? true,
                    emailReviews: body.notifications.emailReviews ?? true,
                    emailPromotions: body.notifications.emailPromotions ?? false,
                    inAppOrders: body.notifications.inAppOrders ?? true,
                    inAppReviews: body.notifications.inAppReviews ?? true,
                    inAppPromotions: body.notifications.inAppPromotions ?? true,
                    soundEnabled: body.notifications.soundEnabled ?? false,
                },
                update: {
                    emailOrders: body.notifications.emailOrders,
                    emailReviews: body.notifications.emailReviews,
                    emailPromotions: body.notifications.emailPromotions,
                    inAppOrders: body.notifications.inAppOrders,
                    inAppReviews: body.notifications.inAppReviews,
                    inAppPromotions: body.notifications.inAppPromotions,
                    soundEnabled: body.notifications.soundEnabled,
                },
            });
        }

        return NextResponse.json({ message: 'Configuración actualizada exitosamente' });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json(
            { error: 'Error al actualizar configuración' },
            { status: 500 }
        );
    }
}

// POST for password change
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Se requiere contraseña actual y nueva' },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 8 caracteres' },
                { status: 400 }
            );
        }

        // Get current user password
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true },
        });

        if (!user?.password) {
            return NextResponse.json(
                { error: 'No se puede cambiar la contraseña de esta cuenta' },
                { status: 400 }
            );
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json(
                { error: 'La contraseña actual es incorrecta' },
                { status: 401 }
            );
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        return NextResponse.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json(
            { error: 'Error al cambiar la contraseña' },
            { status: 500 }
        );
    }
}
