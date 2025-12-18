import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';
import nodemailer from 'nodemailer';

// Provider presets for quick configuration
const PROVIDER_PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
    godaddy: {
        host: 'smtpout.secureserver.net',
        port: 465,
        secure: true,
    },
    godaddy_alt: {
        host: 'smtp.secureserver.net',
        port: 587,
        secure: false,
    },
    gmail: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
    },
    outlook: {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
    },
    yahoo: {
        host: 'smtp.mail.yahoo.com',
        port: 465,
        secure: true,
    },
    zoho: {
        host: 'smtp.zoho.com',
        port: 465,
        secure: true,
    },
    custom: {
        host: '',
        port: 587,
        secure: false,
    },
};

// GET - Get email settings
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        let settings = await prisma.emailSettings.findFirst({
            where: { id: 'default' },
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await prisma.emailSettings.create({
                data: {
                    id: 'default',
                    provider: 'godaddy',
                    smtpHost: PROVIDER_PRESETS.godaddy.host,
                    smtpPort: PROVIDER_PRESETS.godaddy.port,
                    smtpSecure: PROVIDER_PRESETS.godaddy.secure,
                },
            });
        }

        // Never send the actual password to the client
        return NextResponse.json({
            settings: {
                ...settings,
                smtpPassword: settings.smtpPassword ? '••••••••' : null,
                hasPassword: !!settings.smtpPassword,
            },
            presets: PROVIDER_PRESETS,
        });
    } catch (error) {
        console.error('Error fetching email settings:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

// PUT - Update email settings
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const {
            provider,
            smtpHost,
            smtpPort,
            smtpSecure,
            smtpUser,
            smtpPassword,
            fromName,
            fromEmail,
            replyTo,
            notificationsEnabled,
            marketingEnabled,
            transactionalEnabled,
            dailyLimit,
        } = body;

        // Build update data
        const updateData: any = {};

        if (provider !== undefined) {
            updateData.provider = provider;
            // Auto-apply preset if changing provider
            if (PROVIDER_PRESETS[provider]) {
                if (!smtpHost && PROVIDER_PRESETS[provider].host) {
                    updateData.smtpHost = PROVIDER_PRESETS[provider].host;
                }
                if (!smtpPort) {
                    updateData.smtpPort = PROVIDER_PRESETS[provider].port;
                }
                if (smtpSecure === undefined) {
                    updateData.smtpSecure = PROVIDER_PRESETS[provider].secure;
                }
            }
        }

        if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
        if (smtpPort !== undefined) updateData.smtpPort = parseInt(smtpPort);
        if (smtpSecure !== undefined) updateData.smtpSecure = smtpSecure;
        if (smtpUser !== undefined) updateData.smtpUser = smtpUser;

        // Only update password if a new one is provided (not the masked version)
        if (smtpPassword && smtpPassword !== '••••••••') {
            updateData.smtpPassword = smtpPassword; // In production, encrypt this!
        }

        if (fromName !== undefined) updateData.fromName = fromName;
        if (fromEmail !== undefined) updateData.fromEmail = fromEmail;
        if (replyTo !== undefined) updateData.replyTo = replyTo;
        if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
        if (marketingEnabled !== undefined) updateData.marketingEnabled = marketingEnabled;
        if (transactionalEnabled !== undefined) updateData.transactionalEnabled = transactionalEnabled;
        if (dailyLimit !== undefined) updateData.dailyLimit = parseInt(dailyLimit);

        // Check if configuration is complete
        updateData.isConfigured = !!(
            (updateData.smtpHost || body.smtpHost) &&
            (updateData.smtpUser || body.smtpUser) &&
            (smtpPassword === '••••••••' || smtpPassword) // Either new password or existing
        );

        const settings = await prisma.emailSettings.upsert({
            where: { id: 'default' },
            update: updateData,
            create: {
                id: 'default',
                ...updateData,
            },
        });

        return NextResponse.json({
            success: true,
            settings: {
                ...settings,
                smtpPassword: settings.smtpPassword ? '••••••••' : null,
                hasPassword: !!settings.smtpPassword,
            },
        });
    } catch (error) {
        console.error('Error updating email settings:', error);
        return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
    }
}

// POST - Test email connection
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_SETTINGS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { action, testEmail } = body;

        if (action !== 'test') {
            return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
        }

        // Get current settings
        const settings = await prisma.emailSettings.findFirst({
            where: { id: 'default' },
        });

        if (!settings || !settings.smtpHost || !settings.smtpUser) {
            return NextResponse.json({
                success: false,
                error: 'La configuración de email está incompleta',
            }, { status: 400 });
        }

        if (!settings.smtpPassword) {
            return NextResponse.json({
                success: false,
                error: 'No se ha configurado la contraseña del email',
            }, { status: 400 });
        }

        // Create transporter with settings
        const transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort,
            secure: settings.smtpSecure,
            auth: {
                user: settings.smtpUser,
                pass: settings.smtpPassword,
            },
            tls: {
                rejectUnauthorized: false, // For self-signed certificates
            },
        });

        try {
            // Verify connection
            await transporter.verify();

            // Send test email
            const targetEmail = testEmail || settings.smtpUser;
            await transporter.sendMail({
                from: `"${settings.fromName || 'Test'}" <${settings.fromEmail || settings.smtpUser}>`,
                to: targetEmail,
                subject: '✅ Prueba de Email - Electro Shop',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #2a63cd 0%, #1e4ba3 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px;">✅ Configuración Exitosa</h1>
                        </div>
                        <div style="background: #ffffff; padding: 30px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 16px 16px;">
                            <p style="font-size: 16px; color: #212529;">
                                ¡Tu configuración de email funciona correctamente!
                            </p>
                            <p style="font-size: 14px; color: #6a6c6b;">
                                Proveedor: <strong>${settings.provider.toUpperCase()}</strong><br>
                                Host: <strong>${settings.smtpHost}</strong><br>
                                Puerto: <strong>${settings.smtpPort}</strong>
                            </p>
                            <p style="font-size: 12px; color: #adb5bd; margin-top: 20px;">
                                Este email fue enviado automáticamente como prueba de configuración.
                            </p>
                        </div>
                    </div>
                `,
            });

            // Update test status
            await prisma.emailSettings.update({
                where: { id: 'default' },
                data: {
                    lastTestAt: new Date(),
                    lastTestStatus: 'success',
                    lastTestError: null,
                    isConfigured: true,
                },
            });

            return NextResponse.json({
                success: true,
                message: `Email de prueba enviado exitosamente a ${targetEmail}`,
            });
        } catch (emailError: any) {
            console.error('Email test failed:', emailError);

            // Update test status with error
            await prisma.emailSettings.update({
                where: { id: 'default' },
                data: {
                    lastTestAt: new Date(),
                    lastTestStatus: 'failed',
                    lastTestError: emailError.message,
                },
            });

            return NextResponse.json({
                success: false,
                error: `Error de conexión: ${emailError.message}`,
                details: emailError.code || 'UNKNOWN_ERROR',
            }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Error testing email:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error interno del servidor',
        }, { status: 500 });
    }
}
