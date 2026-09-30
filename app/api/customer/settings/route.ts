import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { contrasenaSchema } from '@/lib/validations/registro';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log';
import { describirDispositivo } from '@/lib/dispositivo';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatPuntos } from '@/lib/currency';
import { getToken } from 'next-auth/jwt';
import { cerrarLasDemas } from '@/lib/sesiones';

// Seguridad, notificaciones y estado de la cuenta del cliente (Mi perfil, C-138).
// C-138 quitó lo que se guardaba sin efecto: encuestas, datos anónimos, sonidos, avisos de pedidos en la tienda y
// por correo (salen siempre) y "comprar como empresa por defecto" (la facturación a empresa es C-120).

const ACCIONES_ACTIVIDAD = ['AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAILED', 'AUTH_LOGIN_BLOCKED', 'AUTH_PASSWORD_CHANGED', 'AUTH_PASSWORD_RESET'];

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = session.user.id;

        const [user, google, actividad] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    password: true,
                    emailVerified: true,
                    createdAt: true,
                    profile: { select: { lastLoginAt: true, lastLoginDevice: true, accountStatus: true, deletionRequestedAt: true } },
                    notificationPreferences: { select: { emailPromotions: true, inAppFavoritos: true, emailFavoritos: true } },
                },
            }),
            prisma.account.count({ where: { userId, provider: 'google' } }),
            // Los últimos accesos y cambios de contraseña de la bitácora (C-104), sin la IP
            prisma.auditLog.findMany({
                where: { userId, action: { in: ACCIONES_ACTIVIDAD } },
                orderBy: { createdAt: 'desc' },
                take: 8,
                select: { id: true, action: true, userAgent: true, details: true, createdAt: true },
            }),
        ]);

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        return NextResponse.json({
            cuenta: {
                estado: user.profile?.accountStatus || 'ACTIVE',
                eliminacionPedidaEl: user.profile?.deletionRequestedAt ?? null,
                correoVerificado: Boolean(user.emailVerified),
                creadaEl: user.createdAt,
            },
            seguridad: {
                tieneContrasena: Boolean(user.password),
                conGoogle: google > 0,
                ultimoAcceso: user.profile?.lastLoginAt ?? null,
                ultimoDispositivo: user.profile?.lastLoginDevice ?? null,
                actividad: actividad.map((a) => ({
                    id: a.id,
                    accion: a.action,
                    fecha: a.createdAt,
                    dispositivo: describirDispositivo(a.userAgent),
                    metodo: leerMetodo(a.details),
                })),
            },
            notificaciones: {
                emailPromotions: user.notificationPreferences?.emailPromotions ?? false,
                inAppFavoritos: user.notificationPreferences?.inAppFavoritos ?? true,
                emailFavoritos: user.notificationPreferences?.emailFavoritos ?? true,
            },
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json(
            { error: 'Error al obtener configuración' },
            { status: 500 }
        );
    }
}

function leerMetodo(details: string | null): 'google' | 'contraseña' | null {
    try {
        const metodo = details ? (JSON.parse(details) as { metodo?: unknown }).metodo : null;
        return metodo === 'google' || metodo === 'contraseña' ? metodo : null;
    } catch {
        return null;
    }
}

const patchSchema = z.union([
    z.object({ action: z.literal('deactivate') }),
    z.object({ action: z.literal('request_deletion'), reason: z.string().trim().max(500, 'Máximo 500 caracteres').optional() }),
    z.object({ action: z.literal('cancel_deletion') }),
    z.object({
        notificaciones: z.object({
            emailPromotions: z.boolean().optional(),
            inAppFavoritos: z.boolean().optional(),
            emailFavoritos: z.boolean().optional(),
        }).strict(),
    }),
]);

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = session.user.id;
        const parsed = patchSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
        }
        const body = parsed.data;

        if ('notificaciones' in body) {
            await prisma.notificationPreference.upsert({
                where: { userId },
                create: { userId, ...body.notificaciones },
                update: body.notificaciones,
            });
            return NextResponse.json({ message: 'Preferencia guardada' });
        }

        // Al volver a entrar, el login la reactiva (lib/auth.ts). Cierra también las sesiones de otros dispositivos:
        // antes la cuenta "desactivada" seguía abierta en ellos.
        if (body.action === 'deactivate') {
            await prisma.$transaction([
                prisma.profile.upsert({
                    where: { userId },
                    create: { userId, accountStatus: 'DEACTIVATED', deactivatedAt: new Date() },
                    update: { accountStatus: 'DEACTIVATED', deactivatedAt: new Date() },
                }),
                prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } }),
            ]);
            return NextResponse.json({ message: 'Cuenta desactivada' });
        }

        if (body.action === 'request_deletion') {
            return pedirEliminacion(userId, body.reason || null);
        }

        // cancel_deletion: solo si estaba pedida (no reactiva una cuenta suspendida por la tienda)
        const cancelada = await prisma.profile.updateMany({
            where: { userId, accountStatus: 'PENDING_DELETION' },
            data: { accountStatus: 'ACTIVE', deletionRequestedAt: null, deletionReason: null },
        });
        if (cancelada.count > 0) {
            const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
            await prisma.contactMessage.create({
                data: {
                    name: u?.name || 'Cliente',
                    email: u?.email || '',
                    phone: '',
                    subject: 'Canceló el pedido de eliminar su cuenta',
                    // Pendiente a propósito: si el equipo ya estaba cerrando la cuenta, tiene que verlo
                    message: 'El cliente canceló desde Mi perfil el pedido de eliminar su cuenta: no la cierren.',
                },
            });
        }
        return NextResponse.json({ message: 'Pedido cancelado: tu cuenta sigue activa' });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json(
            { error: 'Error al actualizar configuración' },
            { status: 500 }
        );
    }
}

/**
 * C-138: antes marcaba la cuenta "por eliminar" y prometía borrar todo en 30 días, pero nada lo hacía y el equipo no
 * se enteraba. Ahora el pedido llega a Mensajes y Solicitudes y como aviso al equipo, con lo que hay que revisar
 * (pedidos en curso y Puntos ES). Quien tiene pedidos se desactiva en vez de borrarse (regla de C-92).
 */
async function pedirEliminacion(userId: string, motivo: string | null) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            email: true,
            profile: { select: { accountStatus: true, phone: true } },
            balance: { select: { balance: true } },
            _count: { select: { orders: true } },
        },
    });
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    if (user.profile?.accountStatus === 'PENDING_DELETION') {
        return NextResponse.json({ message: 'Ya recibimos tu pedido' });
    }
    if (user.profile?.accountStatus === 'SUSPENDED') {
        return NextResponse.json({ error: 'Tu cuenta está suspendida. Escríbenos para resolverlo.' }, { status: 400 });
    }

    const enCurso = await prisma.order.count({
        where: { userId, status: { notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED'] } },
    });
    const puntos = Number(user.balance?.balance ?? 0);

    await prisma.profile.upsert({
        where: { userId },
        create: { userId, accountStatus: 'PENDING_DELETION', deletionRequestedAt: new Date(), deletionReason: motivo },
        update: { accountStatus: 'PENDING_DELETION', deletionRequestedAt: new Date(), deletionReason: motivo },
    });

    const datos: [string, string][] = [
        ['Pedidos', String(user._count.orders)],
        ['Pedidos en curso', String(enCurso)],
        ['Puntos ES', formatPuntos(puntos)],
    ];
    await prisma.contactMessage.create({
        data: {
            name: user.name || 'Cliente',
            email: user.email || '',
            phone: user.profile?.phone || '',
            subject: 'Quiere eliminar su cuenta',
            message: [
                'El cliente pidió eliminar su cuenta desde Mi perfil.',
                `Motivo: ${motivo || 'no lo indicó'}`,
                ...datos.map(([k, v]) => `${k}: ${v}`),
                'Escríbele para confirmar. Si tiene pedidos, la cuenta se desactiva en vez de borrarse (Clientes).',
            ].join('\n'),
        },
    });
    emitAdminEvent({
        type: 'ACCOUNT_DELETION_REQUESTED',
        title: `Quiere eliminar su cuenta · ${user.name || user.email || 'Cliente'}`,
        summary: motivo ? `Motivo: ${motivo}` : 'No indicó el motivo',
        fields: [['Correo', user.email], ...datos],
        link: '/admin/inquiries',
    });

    return NextResponse.json({ message: 'Recibimos tu pedido. Te escribiremos a tu correo para confirmarlo.' });
}

// POST for password change
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await request.json().catch(() => ({}));
        const { currentPassword, newPassword, cerrarOtras } = body as { currentPassword?: unknown; newPassword?: unknown; cerrarOtras?: unknown };

        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Se requiere contraseña actual y nueva' },
                { status: 400 }
            );
        }

        // C-88: la misma regla que el registro (antes solo 8 caracteres)
        const regla = contrasenaSchema.safeParse(newPassword);
        if (!regla.success) {
            return NextResponse.json(
                { error: regla.error.issues[0]?.message ?? 'Contraseña inválida' },
                { status: 400 }
            );
        }

        // Get current user password
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true },
        });

        if (!user?.password) {
            return NextResponse.json(
                // Cuenta creada con Google (C-85): la contraseña se crea con "¿La olvidaste?" en el login
                { error: 'Tu cuenta entra con Google y no tiene contraseña. Para crear una, usa "¿La olvidaste?" en el inicio de sesión.' },
                { status: 400 }
            );
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json(
                { error: 'La contraseña actual es incorrecta' },
                { status: 401 }
            );
        }
        if (await bcrypt.compare(newPassword, user.password)) {
            return NextResponse.json({ error: 'La contraseña nueva es igual a la actual' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
        // C-140: si el cliente lo pide, cierra las demás sesiones y conserva esta (antes, C-138, cerraba también esta)
        let sesionCerrada = false;
        if (cerrarOtras === true) {
            const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
            const sid = typeof token?.sid === 'string' ? token.sid : undefined;
            await cerrarLasDemas(userId, sid);
            sesionCerrada = !sid;
        }
        await createAuditLog({
            action: 'AUTH_PASSWORD_CHANGED',
            userId,
            userEmail: session.user.email ?? undefined,
            targetType: 'USER',
            targetId: userId,
            ...getRequestMetadata(request),
        });

        return NextResponse.json({ message: 'Contraseña actualizada exitosamente', sesionCerrada });
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json(
            { error: 'Error al cambiar la contraseña' },
            { status: 500 }
        );
    }
}

// DELETE for revoking all sessions
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = session.user.id;

        // Increment the user's sessionVersion to invalidate all other JWT tokens
        await prisma.user.update({
            where: { id: userId },
            data: {
                sessionVersion: {
                    increment: 1
                }
            }
        });

        return NextResponse.json({ message: 'Todas las sesiones cerradas exitosamente' });
    } catch (error) {
        console.error('Error invalidating sessions:', error);
        return NextResponse.json(
            { error: 'Error al cerrar las sesiones' },
            { status: 500 }
        );
    }
}
