import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verificarPagoMovil, interpretarErrorBDV, BDV_RESPONSE_CODES } from '@/lib/pago-movil/verificar-pago';
import {
    validarTelefonoVenezolano,
    validarReferencia,
} from '@/lib/pago-movil/bancos-venezuela';

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
        const body = await req.json();

        const {
            telefonoPagador,
            bancoOrigen,
            referencia,
            fechaPago,
            importe,
            cedulaPagador,
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

        // Verificar que la referencia no haya sido usada anteriormente (VERIFICADA con éxito)
        const referenciaExistente = await prisma.pagoMovilVerificacion.findFirst({
            where: {
                referencia: referencia.trim(),
                verificado: true,
            },
        });

        if (referenciaExistente) {
            return NextResponse.json({
                success: false,
                verified: false,
                code: 4001,
                message: 'Esta referencia de pago ya fue utilizada anteriormente. Por favor, verifica que ingresaste la referencia correcta o usa un pago diferente.',
                duplicateReference: true,
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
        });

        // Registrar la verificación en la base de datos
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

        // Si la verificación fue exitosa y es una recarga, actualizar la transacción
        if (resultado.verified && contexto === 'RECHARGE' && transactionId) {
            // Verificar que el monto coincida
            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId },
                include: { balance: true },
            });

            if (transaction && transaction.status === 'PENDING') {
                // Validar que el monto verificado sea igual o mayor al solicitado
                const montoVerificado = parseFloat(resultado.amount || '0');
                const montoSolicitado = Number(transaction.amount);

                if (montoVerificado >= montoSolicitado) {
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
                        // Actualizar balance del usuario
                        prisma.userBalance.update({
                            where: { id: transaction.balanceId },
                            data: {
                                balance: { increment: montoSolicitado },
                                totalRecharges: { increment: montoSolicitado },
                            },
                        }),
                    ]);

                    // Notificar al usuario
                    await prisma.notification.create({
                        data: {
                            userId,
                            type: 'RECHARGE_APPROVED',
                            title: 'Recarga Aprobada Automaticamente',
                            message: `Tu recarga de $${montoSolicitado.toFixed(2)} ha sido verificada y aprobada automaticamente. El saldo ya esta disponible.`,
                            link: '/customer/balance',
                            icon: 'check-circle',
                        },
                    });

                    return NextResponse.json({
                        success: true,
                        verified: true,
                        autoApproved: true,
                        message: 'Pago verificado exitosamente. Tu recarga ha sido aprobada automaticamente.',
                        amount: resultado.amount,
                    });
                } else {
                    // Monto no coincide
                    return NextResponse.json({
                        success: true,
                        verified: true,
                        autoApproved: false,
                        message: `El monto verificado ($${montoVerificado.toFixed(2)}) no coincide con el monto de la recarga ($${montoSolicitado.toFixed(2)}). El pago sera revisado manualmente.`,
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
            return NextResponse.json({
                success: true,
                verified: false,
                code: resultado.code,
                message: interpretarErrorBDV(resultado.code, resultado.message),
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
