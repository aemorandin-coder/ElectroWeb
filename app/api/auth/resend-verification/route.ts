import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email-service';

// Rate limiting configuration
const MAX_RESEND_ATTEMPTS = 3; // Maximum resends per time window
const RESEND_WINDOW_MINUTES = 60; // Time window in minutes
const MIN_RESEND_INTERVAL_SECONDS = 60; // Minimum seconds between resends

export async function POST(request: NextRequest) {
    try {
        // Try to get email from request body first, then from session
        let email: string | null = null;

        try {
            const body = await request.json();
            email = body.email || null;
        } catch {
            // No body provided, try session
        }

        // If no email in body, try to get from session
        if (!email) {
            const session = await getServerSession(authOptions);
            if (session?.user?.email) {
                email = session.user.email;
            }
        }

        if (!email) {
            return NextResponse.json(
                { error: 'Email es requerido. Inicia sesión o proporciona un email.' },
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
                message: 'Si el email existe, recibirás un enlace de verificación',
            });
        }

        // Check if already verified
        if (user.emailVerified) {
            return NextResponse.json({
                message: 'Tu cuenta ya está verificada. Puedes iniciar sesión.',
            });
        }

        // Rate limiting: Check how many tokens were created in the last hour
        const oneHourAgo = new Date(Date.now() - RESEND_WINDOW_MINUTES * 60 * 1000);
        const recentTokens = await prisma.emailVerificationToken.count({
            where: {
                userId: user.id,
                createdAt: { gte: oneHourAgo },
            },
        });

        if (recentTokens >= MAX_RESEND_ATTEMPTS) {
            const waitMinutes = RESEND_WINDOW_MINUTES;
            return NextResponse.json(
                {
                    error: `Has excedido el límite de reenvíos. Puedes solicitar un nuevo correo en ${waitMinutes} minutos.`,
                    rateLimited: true,
                    waitMinutes
                },
                { status: 429 }
            );
        }

        // Check minimum interval between resends
        const lastToken = await prisma.emailVerificationToken.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });

        if (lastToken) {
            const secondsSinceLastToken = (Date.now() - lastToken.createdAt.getTime()) / 1000;
            if (secondsSinceLastToken < MIN_RESEND_INTERVAL_SECONDS) {
                const waitSeconds = Math.ceil(MIN_RESEND_INTERVAL_SECONDS - secondsSinceLastToken);
                return NextResponse.json(
                    {
                        error: `Por favor espera ${waitSeconds} segundos antes de solicitar otro correo.`,
                        rateLimited: true,
                        waitSeconds
                    },
                    { status: 429 }
                );
            }
        }

        // Create new verification token (24 hours expiry)
        // Note: We don't delete old tokens to track rate limiting
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

        const remainingAttempts = MAX_RESEND_ATTEMPTS - recentTokens - 1;
        return NextResponse.json({
            message: 'Se ha enviado un nuevo enlace de verificación a tu correo',
            remainingAttempts: remainingAttempts >= 0 ? remainingAttempts : 0,
        });
    } catch (error) {
        console.error('Error resending verification:', error);
        return NextResponse.json(
            { error: 'Error al enviar email de verificación' },
            { status: 500 }
        );
    }
}

