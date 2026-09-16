import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { sendTestEmail } from '@/lib/email-service';
import { prisma } from '@/lib/prisma';

/**
 * Estado del correo y envío de prueba (C-75).
 * Antes esta ruta también aceptaba `type: 'marketing'`, que mandaba un solo correo con todos los clientes
 * en "Para" (cada uno veía el correo de los demás) y sin mirar si aceptaron publicidad, y `type: 'notification'`
 * a cualquier dirección. Las campañas viven ahora en /api/admin/campaigns.
 */

const pruebaSchema = z.object({
    type: z.literal('test', { error: 'Tipo de correo no válido: las campañas se envían desde Marketing → Campañas' }),
    email: z.string().trim().email('Correo inválido').max(200),
});

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_CONTENT')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const parsed = pruebaSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
        }

        const result = await sendTestEmail(parsed.data.email);
        if (!result.success) {
            return NextResponse.json({ error: result.error || 'No se pudo enviar el correo' }, { status: 502 });
        }
        return NextResponse.json({ success: true, message: `Correo de prueba enviado a ${parsed.data.email}` });
    } catch (error) {
        console.error('Error en API de email:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

// GET - Estado real del servicio: la configuración de la base de datos es la que usa el envío (lib/email-service)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_CONTENT')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const db = await prisma.emailSettings.findUnique({
            where: { id: 'default' },
            select: { provider: true, isConfigured: true, smtpHost: true, fromName: true, fromEmail: true, smtpUser: true, lastTestAt: true, lastTestStatus: true },
        });

        const viaResend = Boolean(process.env.RESEND_API_KEY);
        const viaSmtpBd = Boolean(db?.isConfigured && db.smtpHost);
        const viaSmtpEntorno = Boolean(process.env.SMTP_HOST || process.env.EMAIL_PROVIDER);

        return NextResponse.json({
            config: {
                listo: viaResend || viaSmtpBd || viaSmtpEntorno,
                via: viaResend ? 'Resend' : viaSmtpBd ? `SMTP (${db?.provider ?? 'personalizado'})` : viaSmtpEntorno ? 'SMTP (variables del servidor)' : 'Sin configurar',
                remitente: db?.fromEmail || db?.smtpUser || process.env.SMTP_FROM_EMAIL || null,
                nombreRemitente: db?.fromName || process.env.SMTP_FROM_NAME || null,
                ultimaPrueba: db?.lastTestAt ?? null,
                ultimaPruebaOk: db?.lastTestStatus ? db.lastTestStatus === 'success' : null,
            },
        });
    } catch (error) {
        console.error('Error leyendo estado del correo:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
