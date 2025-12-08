import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { notifyAdminsNewCustomer } from '@/lib/notifications';
import { sendVerificationEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;

    // Validation
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contrasena debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este correo electronico ya esta registrado' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

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
