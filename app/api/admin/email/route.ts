import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendTestEmail, sendMarketingEmail, sendNotificationEmail } from '@/lib/email-service';
import { prisma } from '@/lib/prisma';

// POST - Enviar email de prueba o campaña
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        // Solo admins pueden enviar emails
        if (!session?.user || (session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { type, email, emails, campaign } = body;

        switch (type) {
            case 'test': {
                // Enviar email de prueba
                if (!email) {
                    return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
                }

                const result = await sendTestEmail(email);

                if (result.success) {
                    return NextResponse.json({
                        success: true,
                        message: `Email de prueba enviado a ${email}`,
                        messageId: result.messageId
                    });
                } else {
                    return NextResponse.json({
                        error: result.error || 'Error al enviar email'
                    }, { status: 500 });
                }
            }

            case 'marketing': {
                // Enviar campaña de marketing
                if (!campaign?.title || !campaign?.htmlContent) {
                    return NextResponse.json({ error: 'Faltan datos de la campaña' }, { status: 400 });
                }

                // Obtener emails de usuarios si no se especifican
                let targetEmails = emails;
                if (!targetEmails || targetEmails.length === 0) {
                    const users = await prisma.user.findMany({
                        where: {
                            email: { not: null },
                        },
                        select: { email: true }
                    });
                    targetEmails = users.map((u: { email: string | null }) => u.email).filter(Boolean);
                }

                if (targetEmails.length === 0) {
                    return NextResponse.json({ error: 'No hay destinatarios' }, { status: 400 });
                }

                const result = await sendMarketingEmail(targetEmails, campaign);

                return NextResponse.json({
                    success: result.success,
                    message: `Campaña enviada a ${targetEmails.length} usuarios`,
                    recipients: targetEmails.length
                });
            }

            case 'notification': {
                // Enviar notificación a un usuario
                if (!email || !body.notification) {
                    return NextResponse.json({ error: 'Email y notificación requeridos' }, { status: 400 });
                }

                const result = await sendNotificationEmail(email, body.notification);

                return NextResponse.json({
                    success: result.success,
                    message: `Notificación enviada a ${email}`
                });
            }

            default:
                return NextResponse.json({ error: 'Tipo de email no válido' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error en API de email:', error);
        return NextResponse.json({
            error: error.message || 'Error interno del servidor'
        }, { status: 500 });
    }
}

// GET - Verificar configuración de email
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const config = {
            provider: process.env.EMAIL_PROVIDER || 'custom',
            host: process.env.SMTP_HOST ? 'Configurado' : 'No configurado',
            user: process.env.SMTP_USER ? 'Configurado' : 'No configurado',
            fromName: process.env.SMTP_FROM_NAME || 'No configurado',
            fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'No configurado',
            notificationsEnabled: process.env.SEND_EMAIL_NOTIFICATIONS === 'true',
            marketingEnabled: process.env.ENABLE_MARKETING_EMAILS === 'true',
        };

        return NextResponse.json({ config });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
