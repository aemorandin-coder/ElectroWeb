import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { notifyAdminsNewCustomer } from '@/lib/notifications';
import { sendVerificationEmail } from '@/lib/email-service';
import { checkRateLimit, getClientIP, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log';

// Validation schema for registration
const registerSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo')
    .transform(val => val.trim().replace(/<[^>]*>/g, '')), // Strip HTML
  email: z.string()
    .email('Correo electrónico inválido')
    .max(255, 'El correo es demasiado largo')
    .transform(val => val.toLowerCase().trim()),
  phone: z.string()
    .min(10, 'Teléfono inválido')
    .max(20, 'Teléfono demasiado largo')
    .regex(/^[\d+\-\s()]+$/, 'Formato de teléfono inválido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña es demasiado larga')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  idNumber: z.string()
    .min(5, 'Cédula inválida')
    .max(20, 'Cédula demasiado larga')
    .regex(/^[VvEeJjGg]?-?\d{5,12}$/, 'Formato de cédula inválido'),
});

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

    const body = await request.json();

    // Validate with Zod
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message, field: firstError.path[0] },
        { status: 400 }
      );
    }

    const { name, email, phone, password, idNumber } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este correo electrónico ya está registrado' },
        { status: 400 }
      );
    }

    // Hash password with strong work factor
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with profile (emailVerified = null means not verified)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: null, // Not verified until email confirmation
        profile: {
          create: {
            phone: phone,
            idNumber: idNumber,
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            phone: true,
          }
        }
      },
    });

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
          message: `Hola ${name}, tu cuenta ha sido creada exitosamente. Para poder realizar compras, verifica tu correo electronico haciendo clic en el enlace que te enviamos.`,
          link: '/customer/settings',
          icon: 'FiMail',
        },
      });

      // Notification about wishlist discount feature
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'PROMOTION',
          title: '¡Descubre los descuentos exclusivos!',
          message: 'Guarda productos en tu Lista de Deseos y solicita descuentos especiales. Nuestro equipo revisará tu solicitud y te notificará cuando sea aprobada.',
          link: '/customer/wishlist',
          icon: 'FiPercent',
        },
      });
    } catch (notifError) {
      console.error('Error creating welcome notification:', notifError);
    }

    // Notify admins about new customer
    try {
      await notifyAdminsNewCustomer(name, email);
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }

    return NextResponse.json(
      {
        message: 'Usuario registrado exitosamente. Revisa tu correo para verificar tu cuenta.',
        user,
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Este correo electronico ya esta registrado' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al registrar usuario' },
      { status: 500 }
    );
  }
}
