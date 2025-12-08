import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email es requerido' },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Don't reveal if user exists
            return NextResponse.json({
                message: 'Si el email existe, recibiras un enlace de verificacion',
            });
        }

        // Check if already verified
        if (user.emailVerified) {
            return NextResponse.json({
                message: 'Tu cuenta ya esta verificada. Puedes iniciar sesion.',
            });
        }

        // Delete any existing tokens
        await prisma.emailVerificationToken.deleteMany({
            where: { userId: user.id },
        });

        // Create new verification token (24 hours expiry)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.emailVerificationToken.create({
            data: {
                userId: user.id,
                token,
                expiresAt,
            },
        });

        // Send verification email
        await sendVerificationEmail(email, token, user.name || undefined);

        return NextResponse.json({
            message: 'Se ha enviado un nuevo enlace de verificacion a tu correo',
        });
    } catch (error) {
        console.error('Error resending verification:', error);
        return NextResponse.json(
            { error: 'Error al enviar email de verificacion' },
            { status: 500 }
        );
    }
}
