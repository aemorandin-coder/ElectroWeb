import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email-service';
import { buscarUsuarioPorCorreo, normalizarCorreo } from '@/lib/correo';
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/lib/rate-limit';
import { tokenParaGuardar } from '@/lib/token-huella';

// Rate limiting configuration
const MAX_RESEND_ATTEMPTS = 3; // Maximum resends per time window
const RESEND_WINDOW_MINUTES = 60; // Time window in minutes
const MIN_RESEND_INTERVAL_SECONDS = 60; // Minimum seconds between resends
// C-285: por IP, antes de mirar el correo
const LIMITE_POR_IP = { maxRequests: 5, windowSeconds: 15 * 60 };

// C-285: la misma respuesta (y el mismo estado) para cualquier correo: con cuenta o sin ella, activada o no, con el tope
// de envíos o sin él. La ruta no dice si un correo tiene cuenta.
const RESPUESTA = { message: 'Si ese correo tiene una cuenta sin activar, te enviamos el enlace de nuevo.' };

export async function POST(request: NextRequest) {
    try {
        const rateLimit = checkRateLimit(getClientIP(request), 'auth:resend-verification', LIMITE_POR_IP);
        if (!rateLimit.success) {
            return NextResponse.json(
                { error: 'Demasiados intentos. Espera unos minutos antes de intentar nuevamente.' },
                { status: 429, headers: getRateLimitHeaders(rateLimit, LIMITE_POR_IP) }
            );
        }

        // Try to get email from request body first, then from session
        let email: string | null = null;

        try {
            const body = await request.json();
            email = normalizarCorreo(body.email) || null;
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
        const user = await buscarUsuarioPorCorreo(email);

        // Sin cuenta o ya activada: la misma respuesta de siempre, sin enviar nada
        if (!user || user.emailVerified) {
            return NextResponse.json(RESPUESTA);
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
            return NextResponse.json(RESPUESTA);
        }

        // Check minimum interval between resends
        const lastToken = await prisma.emailVerificationToken.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });

        if (lastToken) {
            const secondsSinceLastToken = (Date.now() - lastToken.createdAt.getTime()) / 1000;
            if (secondsSinceLastToken < MIN_RESEND_INTERVAL_SECONDS) {
                return NextResponse.json(RESPUESTA);
            }
        }

        // Create new verification token (24 hours expiry)
        // Note: We don't delete old tokens to track rate limiting
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.emailVerificationToken.create({
            data: {
                userId: user.id,
                token: tokenParaGuardar(token),
                expiresAt,
            },
        });

        // Send verification email. Sale sin esperarlo, para que la respuesta no tarde distinto con cuenta que sin ella; un
        // fallo solo se anota
        void sendVerificationEmail(email, token, user.name || undefined)
            .catch((emailError) => console.error('Error enviando el enlace de activación:', emailError));

        return NextResponse.json(RESPUESTA);
    } catch (error) {
        console.error('Error resending verification:', error);
        return NextResponse.json(
            { error: 'Error al enviar email de verificación' },
            { status: 500 }
        );
    }
}

