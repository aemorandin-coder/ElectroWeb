import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/email-service';
import { avisarBoletoPorInvitados } from '@/lib/sorteo/correos';

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
                { error: 'Token inválido o expirado' },
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

        // C-219: la bienvenida sale al activar la cuenta (antes existía y nadie la enviaba). Solo la primera vez.
        const { user } = verificationToken;
        if (!user.emailVerified && user.email) {
            void sendWelcomeEmail(user.email, user.name || '').catch((error) => console.error('Error enviando la bienvenida:', error));
            // C-219: si llegó con el enlace del sorteo de un amigo, quizá ese amigo completó un boleto
            void avisarBoletoPorInvitados(user.id);
        }

        return NextResponse.json({
            success: true,
            message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
        });
    } catch (error) {
        console.error('Error verifying email:', error);
        return NextResponse.json(
            { error: 'Error al verificar el email' },
            { status: 500 }
        );
    }
}
