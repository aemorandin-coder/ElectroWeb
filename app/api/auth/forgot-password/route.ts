import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email-service';
import { checkRateLimit, getClientIP, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting - strict for password reset (prevents email enumeration abuse)
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(clientIP, 'auth:forgot-password', RATE_LIMITS.AUTH);

        if (!rateLimit.success) {
            return NextResponse.json(
                { message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.AUTH)
                }
            );
        }

        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { message: 'El correo electrónico es requerido' },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Always return success to prevent email enumeration
        if (!user || !user.email) {
            return NextResponse.json(
                { message: 'Si el correo existe, recibirás un enlace de recuperación' },
                { status: 200 }
            );
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

        // Delete any existing tokens for this user
        await prisma.passwordResetToken.deleteMany({
            where: { userId: user.id },
        });

        // Create new reset token
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: resetToken,
                expiresAt,
            },
        });

        // Send email with reset link
        try {
            await sendPasswordResetEmail(user.email, resetToken);
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            // We still return success to the user to avoid leaking email existence
            // but we log the error for admin investigation
        }

        return NextResponse.json(
            { message: 'Si el correo existe, recibirás un enlace de recuperación' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error in forgot-password:', error);
        return NextResponse.json(
            { message: 'Error al procesar la solicitud' },
            { status: 500 }
        );
    }
}
