import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { contrasenaSchema } from '@/lib/validations/registro';

export async function POST(request: NextRequest) {
    try {
        const { token, password } = (await request.json().catch(() => ({}))) as { token?: unknown; password?: unknown };

        if (typeof token !== 'string' || !token || typeof password !== 'string' || !password) {
            return NextResponse.json(
                { message: 'Token y contraseña son requeridos' },
                { status: 400 }
            );
        }

        // C-88: la misma regla que el registro. Antes aquí bastaban 6 caracteres
        const regla = contrasenaSchema.safeParse(password);
        if (!regla.success) {
            return NextResponse.json(
                { message: regla.error.issues[0]?.message ?? 'Contraseña inválida' },
                { status: 400 }
            );
        }

        // Find valid token
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!resetToken) {
            return NextResponse.json(
                { message: 'Token inválido o expirado' },
                { status: 400 }
            );
        }

        // Check if token is expired
        if (resetToken.expiresAt < new Date()) {
            // Delete expired token
            await prisma.passwordResetToken.delete({
                where: { id: resetToken.id },
            });

            return NextResponse.json(
                { message: 'El token ha expirado. Por favor solicita uno nuevo.' },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // C-88: el enlace sirve una sola vez aunque se envíe dos veces a la vez (se borra antes de cambiar la clave),
        // y cambiar la contraseña cierra las sesiones abiertas: si alguien más había entrado a la cuenta, sale.
        const usado = await prisma.$transaction(async (tx) => {
            const borrado = await tx.passwordResetToken.deleteMany({ where: { id: resetToken.id } });
            if (borrado.count === 0) return false;
            await tx.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword, sessionVersion: { increment: 1 } },
            });
            await tx.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } });
            return true;
        });

        if (!usado) {
            return NextResponse.json(
                { message: 'Este enlace ya se usó. Solicita uno nuevo si lo necesitas.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: 'Contraseña actualizada exitosamente' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error in reset-password:', error);
        return NextResponse.json(
            { message: 'Error al restablecer la contraseña' },
            { status: 500 }
        );
    }
}
