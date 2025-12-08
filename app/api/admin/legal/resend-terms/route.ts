import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || !isAuthorized(session, 'MANAGE_CUSTOMERS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { userId, acceptanceId } = await request.json();

        if (!userId || !acceptanceId) {
            return NextResponse.json({ error: 'userId y acceptanceId son requeridos' }, { status: 400 });
        }

        // Get the user and acceptance record
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const acceptance = await prisma.balanceTermsAcceptance.findUnique({
            where: { id: acceptanceId }
        });

        if (!acceptance) {
            return NextResponse.json({ error: 'Documento de aceptación no encontrado' }, { status: 404 });
        }

        // Delete the acceptance to require re-signing
        await prisma.balanceTermsAcceptance.delete({
            where: { id: acceptanceId }
        });

        // Create notification for user
        await prisma.notification.create({
            data: {
                userId: userId,
                type: 'SYSTEM' as any,
                title: 'Actualización de Términos Requerida',
                message: 'Se ha solicitado que vuelvas a aceptar los términos y condiciones. Por favor, completa este proceso en tu próxima recarga de saldo.',
                icon: 'terms',
            }
        });

        // Log the action
        console.log(`[LEGAL] Admin ${session.user.email} solicitó reaceptación de términos para usuario ${user.email} (acceptance: ${acceptanceId})`);

        return NextResponse.json({
            success: true,
            message: `Se ha eliminado la aceptación anterior y se notificó a ${user.email} que debe volver a aceptar los términos.`
        });

    } catch (error) {
        console.error('Error resending terms:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
