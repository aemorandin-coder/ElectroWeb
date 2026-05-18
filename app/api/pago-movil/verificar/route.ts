import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verificarPagoMovil, interpretarErrorBDV, BDV_RESPONSE_CODES } from '@/lib/pago-movil/verificar-pago';
import {
    validarTelefonoVenezolano,
    validarReferencia,
} from '@/lib/pago-movil/bancos-venezuela';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log';

/**
 * POST /api/pago-movil/verificar
 * Verifica un pago móvil con la API del Banco de Venezuela
 */
export async function POST(req: NextRequest) {
    try {
        // Obtener sesión del usuario
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            );
        }

        const userId = (session.user as any).id;

        // Rate limiting por usuario - SENSITIVO para verificaciones de pago
        const rateLimit = checkRateLimit(userId, 'pago-movil:verificar', RATE_LIMITS.SENSITIVE);

        if (!rateLimit.success) {
            return NextResponse.json(
                {
                    error: 'Has realizado demasiadas verificaciones. Espera unos minutos antes de intentar nuevamente.',
                    retryAfter: rateLimit.resetIn
                },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.SENSITIVE)
                }
            );
        }

        const body = await req.json();

        const {
            telefonoPagador,
            bancoOrigen,
            referencia,
            fechaPago,
            importe,           // Monto en Bs para verificar con BDV
            importeUsd,        // Monto en USD para la transacción (opcional, fallback a importe)
            cedulaPagador,
            reqCed = true,      // Validar cédula por defecto para mayor seguridad
            // Contexto de la verificación
            contexto = 'GENERAL', // RECHARGE, ORDER, GENERAL
            transactionId,        // ID de transacción de recarga (si aplica)
            orderId,              // ID de orden (si aplica)
        } = body;

        // Validaciones básicas
        if (!telefonoPagador || !bancoOrigen || !referencia || !fechaPago || !importe) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios: teléfono, banco, referencia, fecha e importe son requeridos' },
                { status: 400 }
            );
        }

        // SEGURIDAD: Validar cédula con formato correcto (V/E + 6-9 dígitos)
        const cedulaRegex = /^[VvEe]?\d{6,9}$/;
        const cedulaLimpia = cedulaPagador?.trim().replace(/[.-]/g, '') || '';
        if (!cedulaLimpia || !cedulaRegex.test(cedulaLimpia)) {
            return NextResponse.json(
                { error: 'Formato de cédula inválido. Debe ser V o E seguido de 6-9 dígitos. Ejemplo: V12345678' },
                { status: 400 }
            );
        }

        // Validar formato de teléfono
        if (!validarTelefonoVenezolano(telefonoPagador)) {
            return NextResponse.json(
                { error: 'Formato de teléfono inválido. Ejemplo: 04121234567' },
                { status: 400 }
            );
        }

        // Validar formato de referencia
        if (!validarReferencia(referencia)) {
            return NextResponse.json(
                { error: 'La referencia debe tener entre 4 y 8 dígitos' },
                { status: 400 }
            );
        }

        // Validar monto positivo
        const montoNumerico = parseFloat(importe);
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            return NextResponse.json(
                { error: 'El monto debe ser un número positivo' },
                { status: 400 }
            );
        }

        // SEGURIDAD: Validar monto máximo (prevenir fraude a gran escala)
        const MONTO_MAXIMO_BS = 3000000; // ~$10,000 USD aproximadamente
        if (montoNumerico > MONTO_MAXIMO_BS) {
            return NextResponse.json(
                { error: 'El monto excede el límite permitido para verificación automática' },
                { status: 400 }
            );
        }

        // SEGURIDAD: Validar fecha de pago
        const fechaPagoDate = new Date(fechaPago);
        const ahora = new Date();
        const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

        if (isNaN(fechaPagoDate.getTime())) {
            return NextResponse.json(
                { error: 'Fecha de pago inválida' },
                { status: 400 }
            );
        }

        if (fechaPagoDate > ahora) {
            return NextResponse.json(
                { error: 'La fecha de pago no puede ser futura' },
                { status: 400 }
            );
        }

        if (fechaPagoDate < hace30Dias) {
            return NextResponse.json(
                { error: 'Solo se pueden verificar pagos de los últimos 30 días' },
                { status: 400 }
            );
        }

        // Verificar que la referencia no haya sido usada anteriormente (VERIFICADA con éxito)
        const referenciaExistente = await prisma.pagoMovilVerificacion.findFirst({
            where: {
                referencia: referencia.trim(),
                verificado: true,
            },
        });

        if (referenciaExistente) {
            // ALERTA DE SEGURIDAD: Referencia duplicada
            const requestMetadata = getRequestMetadata(req);

            // Registrar en audit log
            await createAuditLog({
                action: 'SECURITY_DUPLICATE_PAYMENT_REFERENCE',
                userId,
                userEmail: session.user.email || undefined,
                targetType: 'PAYMENT_VERIFICATION',
                targetId: referencia,
                details: {
                    referencia,
                    telefonoPagador,
                    bancoOrigen,
                    importeIntentado: montoNumerico,
                    referenciaOriginalId: referenciaExistente.id,
                    referenciaOriginalUserId: referenciaExistente.userId,
                    fechaPagoIntentada: fechaPago,
                    contexto,
                    transactionId,
                    alertType: 'DUPLICATE_REFERENCE_ATTEMPT',
                    message: 'Intento de uso de referencia de pago duplicada detectado',
                },
                ...requestMetadata,
                severity: 'CRITICAL',
            });

            // Nota: La alerta de seguridad ya está registrada en el AuditLog
            // Los administradores pueden ver estos eventos críticos en el dashboard de logs


            return NextResponse.json({
                success: false,
                verified: false,
                code: 4001,
                errorType: 'DUPLICATE_REFERENCE',
                message: 'Esta referencia de pago ya fue utilizada anteriormente. Si crees que esto es un error, contacta a soporte con los datos de tu pago.',
                duplicateReference: true,
                requiresContact: true,
            }, { status: 400 });
        }

        // Verificar con la API del BDV
        const resultado = await verificarPagoMovil({
            telefonoPagador,
            bancoOrigen,
            referencia,
            fechaPago,
            importe: montoNumerico,
            cedulaPagador,
            reqCed, // Pasar flag de validación de cédula
        });

        // Registrar la verificación en la base de datos
        // SEGURIDAD: Try-catch para manejar constraint único (race condition protection)
        try {
            await prisma.pagoMovilVerificacion.create({
                data: {
                    userId,
                    telefonoPagador,
                    bancoOrigen,
                    referencia,
                    fechaPago: new Date(fechaPago),
                    importeSolicitado: montoNumerico,
                    importeVerificado: resultado.verified ? parseFloat(resultado.amount || '0') : null,
                    codigoRespuesta: resultado.code,
                    mensajeRespuesta: resultado.message,
                    verificado: resultado.verified,
                    contexto,
                    transactionId: contexto === 'RECHARGE' ? transactionId : null,
                    orderId: contexto === 'ORDER' ? orderId : null,
                    rawResponse: resultado.rawResponse ? JSON.stringify(resultado.rawResponse) : null,
                },
            });
        } catch (dbError: any) {
            // Si es error de constraint único, significa que otra solicitud procesó esta referencia
            if (dbError?.code === 'P2002') {
                console.error('[SECURITY] Race condition detectada - referencia duplicada:', referencia);
                return NextResponse.json({
                    success: false,
                    verified: false,
                    code: 4001,
                    errorType: 'DUPLICATE_REFERENCE',
                    message: 'Esta referencia ya fue procesada. Por favor, intenta nuevamente o contacta a soporte.',
                    duplicateReference: true,
                    requiresContact: true,
                }, { status: 400 });
            }
            throw dbError; // Re-lanzar otros errores
        }

        // Si la verificación fue exitosa y es una recarga, actualizar la transacción
        if (resultado.verified && contexto === 'RECHARGE' && transactionId) {
            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId },
                include: { balance: true },
            });

            // SEGURIDAD: Validar que la transacción existe y pertenece al usuario actual
            if (!transaction) {
                console.error(`[SECURITY] Intento de verificar transacción inexistente: ${transactionId} por usuario ${userId}`);
                return NextResponse.json({
                    success: false,
                    verified: true,
                    message: 'Transacción no encontrada',
                }, { status: 404 });
            }

            // SEGURIDAD CRÍTICA: Verificar propiedad de la transacción (prevenir IDOR)
            if (transaction.balance.userId !== userId) {
                const requestMetadata = getRequestMetadata(req);
                await createAuditLog({
                    action: 'SECURITY_SUSPICIOUS_ACTIVITY',
                    userId,
                    userEmail: session.user.email || undefined,
                    targetType: 'TRANSACTION',
                    targetId: transactionId,
                    details: {
                        alertType: 'IDOR_ATTEMPT',
                        message: 'Intento de aprobar transacción de otro usuario',
                        transactionOwnerId: transaction.balance.userId,
                        attemptedByUserId: userId,
                        referencia,
                    },
                    ...requestMetadata,
                    severity: 'CRITICAL',
                });
                return NextResponse.json({
                    success: false,
                    verified: true,
                    message: 'No autorizado para esta transacción',
                }, { status: 403 });
            }

            if (transaction.status === 'PENDING') {
                // El monto verificado del BDV está en Bolívares
                const montoVerificadoBs = parseFloat(resultado.amount || '0');
                // montoNumerico es el monto en Bs que enviamos para verificar
                const montoSolicitadoBs = montoNumerico;
                // El monto en USD de la transacción para actualizar el balance
                const montoUsd = Number(transaction.amount);

                // Comparar montos en Bs (tolerancia del 0.5% para variaciones de redondeo)
                const tolerancia = montoSolicitadoBs * 0.005;
                if (montoVerificadoBs >= (montoSolicitadoBs - tolerancia)) {
                    // Aprobar la transacción automáticamente
                    await prisma.$transaction([
                        // Actualizar transacción a COMPLETED
                        prisma.transaction.update({
                            where: { id: transactionId },
                            data: {
                                status: 'COMPLETED',
                                metadata: JSON.stringify({
                                    ...JSON.parse(transaction.metadata || '{}'),
                                    verificadoPorAPI: true,
                                    fechaVerificacion: new Date().toISOString(),
                                    codigoBDV: resultado.code,
                                }),
                            },
                        }),
                        // Actualizar balance del usuario (en USD)
                        prisma.userBalance.update({
                            where: { id: transaction.balanceId },
                            data: {
                                balance: { increment: montoUsd },
                                totalRecharges: { increment: montoUsd },
                            },
                        }),
                    ]);

                    // Notificar al usuario (notificación interna)
                    await prisma.notification.create({
                        data: {
                            userId,
                            type: 'RECHARGE_APPROVED',
                            title: 'Recarga Aprobada Automaticamente',
                            message: `Tu recarga de $${montoUsd.toFixed(2)} ha sido verificada y aprobada automaticamente. El saldo ya esta disponible.`,
                            link: '/customer/balance',
                            icon: 'check-circle',
                        },
                    });

                    // Email de confirmación al usuario
                    try {
                        const { sendEmail, getBaseTemplate } = await import('@/lib/email-service');
                        await sendEmail({
                            to: session.user.email!,
                            subject: `✅ Recarga de $${montoUsd.toFixed(2)} aprobada — Electro Shop`,
                            html: await getBaseTemplate(
                                `<div style="text-align:center;margin-bottom:20px;">
                                    <div style="width:64px;height:64px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                                        <span style="color:white;font-size:28px;">&#10003;</span>
                                    </div>
                                    <h2 style="margin:0 0 8px;color:#212529;font-size:22px;font-weight:700;">¡Recarga Aprobada! 💰</h2>
                                    <p style="color:#6a6c6b;font-size:15px;line-height:1.7;">
                                        Tu recarga de <strong style="color:#10b981;">$${montoUsd.toFixed(2)} USD</strong>
                                        fue verificada automáticamente con el Banco de Venezuela y ya está disponible en tu saldo.
                                    </p>
                                </div>
                                <div style="background:#ecfdf5;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #10b981;">
                                    <p style="margin:0 0 6px;color:#065f46;font-size:13px;">Referencia BDV: <strong>${referencia}</strong></p>
                                    <p style="margin:0;color:#065f46;font-size:13px;">Banco: <strong>${bancoOrigen}</strong></p>
                                </div>
                                <div style="text-align:center;margin:24px 0;">
                                    <a href="${process.env.NEXTAUTH_URL}/customer/balance"
                                       style="background:linear-gradient(135deg,#10b981,#059669);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
                                        Ver Mi Saldo
                                    </a>
                                </div>`,
                                'Tu recarga fue procesada automáticamente'
                            ),
                        });
                    } catch (emailErr) {
                        console.error('[API] Error enviando email de confirmación de recarga:', emailErr);
                        // No bloquear la respuesta si el email falla
                    }

                    // AUDIT: Registrar auto-aprobación exitosa
                    const requestMetadata = getRequestMetadata(req);
                    await createAuditLog({
                        action: 'BALANCE_RECHARGE_APPROVED',
                        userId,
                        userEmail: session.user.email || undefined,
                        targetType: 'TRANSACTION',
                        targetId: transactionId,
                        details: {
                            autoApproved: true,
                            montoUsd,
                            montoVerificadoBs,
                            montoSolicitadoBs,
                            referencia,
                            bancoOrigen,
                            codigoBDV: resultado.code,
                        },
                        ...requestMetadata,
                        severity: 'INFO',
                    });

                    return NextResponse.json({
                        success: true,
                        verified: true,
                        autoApproved: true,
                        message: 'Pago verificado exitosamente. Tu recarga ha sido aprobada automaticamente.',
                        amount: resultado.amount,
                        amountUsd: montoUsd,
                    });
                } else {
                    // Monto no coincide
                    return NextResponse.json({
                        success: true,
                        verified: true,
                        autoApproved: false,
                        message: `El monto verificado (Bs. ${montoVerificadoBs.toFixed(2)}) no coincide con el esperado (Bs. ${montoSolicitadoBs.toFixed(2)}). El pago sera revisado manualmente.`,
                        amount: resultado.amount,
                    });
                }
            }
        }

        // Respuesta normal (sin auto-aprobación)
        if (resultado.verified) {
            return NextResponse.json({
                success: true,
                verified: true,
                message: 'Pago verificado exitosamente',
                amount: resultado.amount,
            });
        } else {
            const mensajeError = interpretarErrorBDV(resultado.code, resultado.message);
            return NextResponse.json({
                success: true,
                verified: false,
                code: resultado.code,
                // Ambos campos para compatibilidad con frontend existente
                message: mensajeError,
                error: mensajeError,
            });
        }
    } catch (error) {
        console.error('[API] Error en verificación de pago móvil:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
