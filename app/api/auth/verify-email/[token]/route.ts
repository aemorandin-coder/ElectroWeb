import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        if (!token) {
            return NextResponse.json(
                { error: 'Token no proporcionado' },
                { status: 400 }
            );
        }

        // Find verification token
        const verificationToken = await prisma.emailVerificationToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!verificationToken) {
            return NextResponse.json(
                { error: 'Token invalido o expirado' },
                { status: 400 }
            );
        }

        // Check if token is expired
        if (new Date() > verificationToken.expiresAt) {
            // Delete expired token
            await prisma.emailVerificationToken.delete({
                where: { id: verificationToken.id },
            });

            return NextResponse.json(
                { error: 'El enlace ha expirado. Por favor solicita uno nuevo.' },
                { status: 400 }
            );
        }

        // Update user's emailVerified field
        await prisma.user.update({
            where: { id: verificationToken.userId },
            data: { emailVerified: new Date() },
        });

        // Delete the token after successful verification
        await prisma.emailVerificationToken.delete({
            where: { id: verificationToken.id },
        });

        return NextResponse.json({
            success: true,
            message: 'Email verificado exitosamente. Ya puedes iniciar sesion.',
        });
    } catch (error) {
        console.error('Error verifying email:', error);
        return NextResponse.json(
            { error: 'Error al verificar el email' },
            { status: 500 }
        );
    }
}
