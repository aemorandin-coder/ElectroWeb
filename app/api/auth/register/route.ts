import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { emitAdminEvent } from '@/lib/admin-events';
import { sendVerificationEmail } from '@/lib/email-service';
import { buscarUsuarioPorCorreo } from '@/lib/correo';
import { checkRateLimit, getClientIP, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { verifyCaptcha } from '@/lib/captcha';
import { registroSchema } from '@/lib/validations/registro';

// Las reglas viven en lib/validations/registro.ts y son las mismas que usa la pantalla (C-84)

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for registration
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP, 'auth:register', RATE_LIMITS.AUTH);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espera unos minutos antes de intentar nuevamente.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.AUTH)
        }
      );
    }

    const body = await request.json().catch(() => null);

    // SEGURIDAD: el captcha se verifica en el servidor, no solo en el navegador
    const captcha = await verifyCaptcha(body?.captchaToken, clientIP);
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error, field: 'captcha' }, { status: captcha.status });
    }

    const validationResult = registroSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message, field: firstError.path[0] },
        { status: 400 }
      );
    }

    const { name, email, phone, password, idNumber } = validationResult.data;

    // Read referral code from httpOnly cookie (set by middleware when ?ref= is present)
    const rawRef = request.cookies.get('electroshop_ref')?.value ?? '';
    const refCode = rawRef && /^[A-Z0-9_-]{3,20}$/.test(rawRef) ? rawRef : null;

    // Sin distinguir mayúsculas: una cuenta vieja "Ana@…" y una nueva "ana@…" serían la misma persona (C-83)
    const existingUser = await buscarUsuarioPorCorreo(email);

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.', field: 'email' },
        { status: 400 }
      );
    }

    // Hash password with strong work factor
    const hashedPassword = await bcrypt.hash(password, 12);

    // Validate refCode against DB (must belong to an ACTIVE influencer and not self)
    let validatedRefCode: string | null = null;
    if (refCode) {
      const inf = await prisma.influencer.findUnique({
        where: { code: refCode, status: 'ACTIVE' },
        select: { id: true },
      });
      if (inf) validatedRefCode = refCode;
    }

    // Create user with profile (emailVerified = null means not verified)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: null, // Not verified until email confirmation
        referredByCode: validatedRefCode,
        profile: {
          create: {
            phone,
            idNumber,
          }
        }
      },
      select: { id: true },
    });

    // Record referral conversion (fire-and-forget — registration itself must succeed)
    if (validatedRefCode) {
      const { recordRegistration } = await import('@/lib/influencer-commission');
      recordRegistration(user.id).catch(() => {});
    }

    // Create verification token (24 hours expiry)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: tokenExpiry,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, name);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue with registration even if email fails
    }

    // Create welcome notification for the user
    try {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Bienvenido a Electro Shop',
          message: `Hola ${name}, tu cuenta está lista. Para comprar, confirma tu correo con el enlace que te enviamos.`,
          link: '/customer/settings',
          icon: 'FiMail',
        },
      });

      // Notification about wishlist discount feature
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'PROMOTION',
          title: 'Descubre los descuentos exclusivos',
          message: 'Guarda productos en tu Lista de Deseos y solicita descuentos especiales. Nuestro equipo revisará tu solicitud y te notificará cuando sea aprobada.',
          link: '/customer/wishlist',
          icon: 'FiPercent',
        },
      });
    } catch (notifError) {
      console.error('Error creating welcome notification:', notifError);
    }

    // Aviso al equipo (C-73)
    emitAdminEvent({
      type: 'CUSTOMER_REGISTERED',
      title: `Cliente nuevo · ${name}`,
      summary: `${name} creó una cuenta en la tienda`,
      fields: [['Correo', email], ['Llegó por', validatedRefCode ? `promotor ${validatedRefCode}` : null]],
      link: '/admin/customers',
    });

    // El correo va normalizado: la pantalla inicia sesión con este y no con lo que escribió el cliente
    return NextResponse.json(
      {
        message: 'Tu cuenta está lista. Revisa tu correo para confirmarlo.',
        email,
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.', field: 'email' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'No pudimos crear tu cuenta. Intenta de nuevo en unos minutos.' },
      { status: 500 }
    );
  }
}
