import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { publicar } from '@/lib/realtime/bus';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { montoDecimal } from '@/lib/pricing';
import { verificarPagoMovil, interpretarErrorBDV } from '@/lib/pago-movil/verificar-pago';
import {
    normalizarCedulaVE,
    normalizarTelefonoVE,
    validarCedulaVenezolana,
    validarTelefonoVenezolano,
} from '@/lib/pago-movil/bancos-venezuela';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-log';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatPuntos, formatUSD, formatVES } from '@/lib/currency';
import { aCentimos, hoyCaracas, leerMontoBs, montoBs, montoParaCopiar } from '@/lib/pago-movil/monto';
import { leerCotizacion } from '@/lib/pago-movil/cotizacion';
import { unaALaVez } from '@/lib/pago-movil/candado';
import { bancoCanonico, claveDeCandado, referenciaCanonica } from '@/lib/pago-movil/referencia';
import { buscarMismoPago } from '@/lib/pago-movil/mismo-pago';
import { decidirRecarga, leerMetadata, tasaDeLaRecarga } from '@/lib/pago-movil/recarga';

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

        const userId = (session.user as { id: string }).id;

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
            telefonoPagador: telefonoRecibido,
            bancoOrigen: bancoRecibido,
            referencia: referenciaRecibida,
            fechaPago,
            importe,           // Monto en Bs para verificar con BDV
            cedulaPagador: cedulaRecibida,
            reqCed = true,      // Validar cédula por defecto para mayor seguridad
            // Contexto de la verificación
            contexto = 'GENERAL', // RECHARGE, ORDER, GENERAL
            transactionId,        // ID de transacción de recarga (si aplica)
            // orderId del navegador: se ignora desde C-129 (lo pone POST /api/orders)
            cotizacion: cotizacionToken, // C-125: monto y tasa firmados por /api/orders/quote
        } = body;

        // S-01: la referencia y el banco, en una sola forma desde aquí (lib/pago-movil/referencia.ts). Es la que se busca,
        // se bloquea, se manda al banco y se guarda: lo recibido no se vuelve a usar
        const referencia = referenciaCanonica(referenciaRecibida);
        const bancoOrigen = bancoCanonico(bancoRecibido);
        if (!referencia) {
            return NextResponse.json(
                { error: 'La referencia debe tener entre 4 y 8 dígitos' },
                { status: 400 }
            );
        }
        if (!bancoOrigen) {
            return NextResponse.json(
                { error: 'Banco inválido' },
                { status: 400 }
            );
        }

        // C-130: teléfono y cédula en el formato del BDV, vengan como vengan ("+58 0412…", "v-19.855.597").
        // Antes el checkout mandaba el teléfono del perfil como "584121234567" y el banco lo rechazaba.
        const telefonoPagador = typeof telefonoRecibido === 'string' ? normalizarTelefonoVE(telefonoRecibido) : '';
        const cedulaPagador = typeof cedulaRecibida === 'string' ? normalizarCedulaVE(cedulaRecibida) : '';

        // C-125: compra con cotización firmada. Si falta o venció, se usa la tasa del momento (como antes)
        const cotizacion = contexto === 'ORDER' ? leerCotizacion(cotizacionToken, userId) : null;

        // Validaciones básicas (el importe de una compra puede venir de la cotización: es el monto exacto que se mostró)
        if (!telefonoPagador || !fechaPago || !(importe || cotizacion)) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios: teléfono, banco, referencia, fecha e importe son requeridos' },
                { status: 400 }
            );
        }

        // SEGURIDAD: cédula V o E con 6 a 9 dígitos
        if (!validarCedulaVenezolana(cedulaPagador)) {
            return NextResponse.json(
                { error: 'Revisa la cédula del titular: V o E y el número, por ejemplo V12345678.' },
                { status: 400 }
            );
        }

        if (!validarTelefonoVenezolano(telefonoPagador)) {
            return NextResponse.json(
                { error: 'Revisa el teléfono que pagó: un celular venezolano de 11 dígitos, por ejemplo 04121234567.' },
                { status: 400 }
            );
        }

        // Monto positivo con céntimos exactos. Acepta "1.115,25" o 1115.25: antes parseFloat("1.115,25") daba 1,115
        const montoLeido = importe === undefined || importe === null || importe === ''
            ? cotizacion?.montoBs ?? null
            : typeof importe === 'number'
                // Número (formularios de recarga y pestañas de antes de C-125): 1115.2935 → 1115.29, no "miles"
                ? (Number.isFinite(importe) && importe > 0 ? aCentimos(importe) / 100 : null)
                : leerMontoBs(String(importe));
        const montoNumerico = montoLeido ?? NaN;
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

        // SEGURIDAD: Validar fecha de pago. C-125: es un día de Venezuela ("2026-09-29"), sin hora: antes se
        // pasaba por Date y el formulario proponía la fecha de UTC, que después de las 8 p. m. ya es la de mañana.
        const fechaTexto = typeof fechaPago === 'string' ? fechaPago.slice(0, 10) : '';
        const fechaPagoDate = new Date(`${fechaTexto}T12:00:00-04:00`);
        const hace30Dias = hoyCaracas(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto) || isNaN(fechaPagoDate.getTime())) {
            return NextResponse.json(
                { error: 'Fecha de pago inválida' },
                { status: 400 }
            );
        }

        if (fechaTexto > hoyCaracas()) {
            return NextResponse.json(
                { error: 'La fecha de pago no puede ser futura' },
                { status: 400 }
            );
        }

        if (fechaTexto < hace30Dias) {
            return NextResponse.json(
                { error: 'Solo se pueden verificar pagos de los últimos 30 días' },
                { status: 400 }
            );
        }

        // C-129: la recarga es del cliente y sigue pendiente, ANTES de consultar al banco. Antes se consultaba primero y
        // se guardaba la verificación con el transactionId ajeno, y recién después se detectaba el intento
        if (contexto === 'RECHARGE' && transactionId) {
            const recarga = await prisma.transaction.findUnique({ where: { id: String(transactionId) }, select: { status: true, balance: { select: { userId: true } } } });
            if (!recarga || recarga.balance.userId !== userId) {
                await createAuditLog({
                    action: 'SECURITY_SUSPICIOUS_ACTIVITY',
                    userId,
                    userEmail: session.user.email || undefined,
                    targetType: 'TRANSACTION',
                    targetId: String(transactionId),
                    details: { alertType: 'IDOR_ATTEMPT', message: 'Verificación de Pago Móvil con una recarga ajena o inexistente', referencia },
                    ...getRequestMetadata(req),
                    severity: 'CRITICAL',
                });
                return NextResponse.json({ success: false, verified: false, error: 'Recarga no encontrada' }, { status: 404 });
            }
            // S-07: la recarga ya no espera un pago (se canceló, la reemplazó una nueva o ya se acreditó). Se dice antes de
            // consultar al banco, para que el pago no quede pegado a una recarga que ya no lo va a acreditar
            if (recarga.status !== 'PENDING') {
                return NextResponse.json(
                    { success: false, verified: false, error: 'Esta recarga ya no está por confirmar. Pide una recarga nueva y verifica tu pago con la misma referencia.' },
                    { status: 409 }
                );
            }
        }

        // C-129: una verificación a la vez por pago: el banco y los últimos dígitos (ver lib/pago-movil/candado.ts)
        const tramo = await unaALaVez(claveDeCandado(bancoOrigen, referencia), async () => {
            // Verificar que el pago no haya sido usado anteriormente (VERIFICADO con éxito).
            // C-129: referencia y banco. La referencia la pone el banco que envía: dos bancos pueden repetirla, y antes el
            // segundo cliente recibía "referencia ya utilizada" y una alerta de seguridad sin haber hecho nada.
            // S-01: el mismo pago escrito de otra forma ("5678" y "12345678", con o sin espacios) también cuenta
            // (lib/pago-movil/mismo-pago.ts)
            const referenciaExistente = await buscarMismoPago(prisma, { banco: bancoOrigen, referencia, importeBs: montoNumerico });

            // C-125: el mismo cliente vuelve a escribir la referencia de un pago de compra suyo que sigue libre (recargó
            // la página o volvió al checkout): se le devuelve ese pago como verificado. Antes era "referencia ya utilizada",
            // una alerta de seguridad, y el cliente se quedaba sin poder usar su propio pago
            if (
                referenciaExistente && contexto === 'ORDER' && referenciaExistente.userId === userId &&
                referenciaExistente.contexto === 'ORDER' && !referenciaExistente.orderId && !referenciaExistente.transactionId && !referenciaExistente.archivadoEn
            ) {
                return NextResponse.json({
                    success: true,
                    verified: true,
                    reutilizado: true,
                    message: 'Este pago ya estaba verificado y sigue disponible para tu compra.',
                    // S-01: la referencia con la que quedó guardado (puede ser más larga que la que escribió ahora)
                    referencia: referenciaExistente.referencia,
                    amount: referenciaExistente.importeVerificado?.toString(),
                    pagadoBs: Number(referenciaExistente.importeVerificado ?? 0),
                    tasa: Number(referenciaExistente.tasaVES ?? 0) || null,
                });
            }

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

                emitAdminEvent({
                    type: 'PAYMENT_REFERENCE_DUPLICATE',
                    title: `Referencia de pago repetida · ${String(referencia).slice(0, 30)}`,
                    summary: `${session.user.name || session.user.email || 'Un cliente'} intentó usar una referencia de Pago Móvil que ya se usó`,
                    fields: [
                        ['Monto declarado', formatVES(montoNumerico)],
                        ['Banco', String(bancoOrigen).slice(0, 40)],
                        ['Para', contexto === 'ORDER' ? 'una orden' : contexto === 'RECHARGE' ? 'una recarga' : String(contexto)],
                        ['IP', requestMetadata.ipAddress],
                    ],
                    link: '/admin/transactions',
                    throttleKey: `${userId}:${referencia}`,
                });


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
                fechaPago: fechaTexto,
                importe: montoNumerico,
                cedulaPagador,
                // C-129: el BDV solo valida la cédula en pagos BDV a BDV; se decide aquí y no en el navegador
                reqCed: bancoOrigen === '0102' && reqCed !== false,
            });

            // Lo que confirmó el banco. Como busca por monto exacto, si no devuelve el importe es el que se pidió.
            // Antes era parseFloat(amount || '0'): sin `amount` la compra quedaba con Bs. 0 pagados y sin confirmar
            const montoBanco = resultado.verified ? leerMontoBs(String(resultado.amount ?? '')) ?? montoNumerico : null;
            // Tasa congelada del pago: la de la cotización que vio el cliente o, sin ella, la del momento
            const tasaPago = cotizacion?.tasa ?? Number((await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true } }))?.exchangeRateVES ?? 0);

            // Registrar la verificación en la base de datos (con `prisma` o con el cliente de una transacción)
            const guardar = (db: Prisma.TransactionClient) => db.pagoMovilVerificacion.create({
                data: {
                    userId,
                    telefonoPagador,
                    bancoOrigen,
                    referencia,
                    fechaPago: fechaPagoDate,
                    importeSolicitado: montoNumerico,
                    importeVerificado: montoBanco,
                    tasaVES: tasaPago > 0 ? tasaPago : null,
                    codigoRespuesta: resultado.code,
                    mensajeRespuesta: resultado.message,
                    verificado: resultado.verified,
                    contexto,
                    transactionId: contexto === 'RECHARGE' ? transactionId : null,
                    // C-129: el orderId nunca viene del navegador (antes se guardaba cualquiera y el pago quedaba
                    // pegado a una orden ajena). Lo pone POST /api/orders al crear la orden con este pago
                    orderId: null,
                    rawResponse: resultado.rawResponse ? JSON.stringify(resultado.rawResponse) : null,
                },
            });
            // Otra solicitud (otra pestaña u otro proceso) ya registró este pago
            const yaProcesado = () => {
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
            };
            // SEGURIDAD: Try-catch para manejar constraint único (race condition protection)
            try {
                if (!resultado.verified) {
                    // El banco no lo confirmó: el intento se guarda como siempre, sin candado
                    await guardar(prisma);
                } else {
                    // S-01: un pago aprobado se guarda dentro de una transacción que empieza con un candado de la base
                    // (consultivo, por banco y últimos dígitos, y se suelta solo al terminar). Con el candado tomado se
                    // vuelve a buscar con el monto que confirmó el banco: si otro proceso lo guardó mientras tanto, no
                    // se crea otra fila con el mismo dinero
                    const yaRegistrado = await prisma.$transaction(async (tx) => {
                        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`pago-movil:${claveDeCandado(bancoOrigen, referencia)}`}))::text AS locked`;
                        if (await buscarMismoPago(tx, { banco: bancoOrigen, referencia, importeBs: montoBanco ?? montoNumerico })) return true;
                        await guardar(tx);
                        return false;
                    });
                    if (yaRegistrado) return yaProcesado();
                }
            } catch (dbError: unknown) {
                const dbErr = dbError as { code?: string };
                // Si es error de constraint único, significa que otra solicitud procesó esta referencia
                if (dbErr?.code === 'P2002') return yaProcesado();
                throw dbError; // Re-lanzar otros errores
            }

            return { resultado, montoBanco, tasaPago };
        });
        if (tramo instanceof Response) return tramo;
        const { resultado, montoBanco, tasaPago } = tramo;

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
                const montoVerificadoBs = montoBanco ?? 0;
                // El monto en USD de la transacción para actualizar el balance
                const montoUsd = Number(transaction.amount);

                // SEGURIDAD (C-72): lo que se exige en Bs sale de la recarga guardada y de la tasa del servidor.
                // Antes se comparaba con el importe que escribe el cliente: una recarga de $500 se aprobaba
                // con un Pago Móvil real de Bs. 1 enviando importe=1.
                const settings = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true } });
                const tasaMomento = settings?.exchangeRateVES ? Number(settings.exchangeRateVES) : 0;
                // S-06: se compara con la tasa de la solicitud (la que vio el cliente al pedir la recarga) mientras sea
                // reciente, y si no con la del momento. Solo se perdona lo del redondeo (TOLERANCIA_BS): antes se aprobaba
                // hasta 1,5 % menos y se acreditaba el monto completo
                const metadataRecarga = leerMetadata(transaction.metadata);
                const tasa = tasaDeLaRecarga(metadataRecarga, tasaMomento);
                const montoSolicitadoBs = montoBs(montoUsd, tasa);
                const decision = decidirRecarga(montoVerificadoBs, montoUsd, tasa);
                if (decision.aprobar) {
                    // Lo que se acredita: lo pedido y, si pagó de más, la diferencia (igual que en las compras)
                    const acreditadoUSD = decision.acreditarUSD;
                    const sobrepagoUSD = decision.sobrepagoUSD;
                    // Aprobación condicional: dos verificaciones simultáneas de la misma recarga no acreditan dos veces
                    const aprobada = await prisma.$transaction(async (tx) => {
                        const claimed = await tx.transaction.updateMany({
                            where: { id: transactionId, status: 'PENDING' },
                            data: {
                                status: 'COMPLETED',
                                // Pagó de más: la recarga queda por lo acreditado, y lo pedido en la metadata
                                ...(sobrepagoUSD > 0 ? { amount: montoDecimal(acreditadoUSD) } : {}),
                                metadata: JSON.stringify({
                                    ...metadataRecarga,
                                    verificadoPorAPI: true,
                                    fechaVerificacion: new Date().toISOString(),
                                    codigoBDV: resultado.code,
                                    referencia,
                                    tasaAplicada: tasa,
                                    montoVerificadoBs,
                                    ...(sobrepagoUSD > 0
                                        ? { montoSolicitadoUSD: montoUsd, sobrepagoBs: decision.conciliacion.diferenciaBs, sobrepagoUSD }
                                        : {}),
                                }),
                            },
                        });
                        if (claimed.count !== 1) return false;
                        // Actualizar balance del usuario (en USD)
                        await tx.userBalance.update({
                            where: { id: transaction.balanceId },
                            // Texto exacto (C-96): con number, una recarga de $9,45 quedaba en 9.449999999999999
                            data: {
                                balance: { increment: montoDecimal(acreditadoUSD) },
                                totalRecharges: { increment: montoDecimal(acreditadoUSD) },
                            },
                        });
                        return true;
                    });

                    if (!aprobada) {
                        return NextResponse.json({
                            success: true,
                            verified: true,
                            autoApproved: false,
                            message: 'Esta recarga ya fue procesada.',
                            amount: resultado.amount,
                        });
                    }

                    // Notificar al usuario (notificación interna)
                    await prisma.notification.create({
                        data: {
                            userId,
                            type: 'RECHARGE_APPROVED',
                            title: 'Recarga Aprobada Automaticamente',
                            message: `Tu recarga de ${formatPuntos(acreditadoUSD)} se verificó y se aprobó sola: ya está disponible.${sobrepagoUSD > 0 ? ` Incluye ${formatPuntos(sobrepagoUSD)} por lo que pagaste de más.` : ''}`,
                            link: '/customer/balance',
                            icon: 'check-circle',
                        },
                    });

                    // Email de confirmación al usuario
                    try {
                        // C-219: la plantilla está en lib/email-templates/puntos. La referencia y el banco los escribe el cliente: se escapan ahí
                        const { sendEmail } = await import('@/lib/email-service');
                        const { correoRecargaAprobada } = await import('@/lib/email-templates/puntos');
                        const { asunto, html } = await correoRecargaAprobada({
                            nombre: session.user.name ?? null,
                            monto: acreditadoUSD,
                            automatica: true,
                            referencia: String(referencia),
                            banco: String(bancoOrigen),
                        });
                        await sendEmail({ to: session.user.email!, subject: asunto, html });
                    } catch (emailErr) {
                        console.error('[API] Error enviando email de confirmación de recarga:', emailErr);
                        // No bloquear la respuesta si el email falla
                    }

                    publicar({ tipo: 'payment:verified', userId, contexto: 'RECHARGE', referencia, aprobado: true, transactionId }); // C-127
                    emitAdminEvent({
                        type: 'RECHARGE_AUTO_APPROVED',
                        title: `Recarga aprobada por Pago Móvil · ${formatUSD(acreditadoUSD)}`,
                        summary: `El banco confirmó el pago de ${session.user.name || session.user.email || 'un cliente'} y los Puntos ES se acreditaron solos`,
                        fields: [['Pagado', formatVES(montoVerificadoBs)], ['Tasa aplicada', formatVES(tasa)], ['Referencia', String(referencia).slice(0, 30)]],
                        link: '/admin/transactions',
                    });

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
                            montoUsd: acreditadoUSD,
                            ...(sobrepagoUSD > 0 ? { montoSolicitadoUSD: montoUsd, sobrepagoUSD } : {}),
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
                        amountUsd: acreditadoUSD,
                    });
                } else {
                    // Monto no coincide
                    return NextResponse.json({
                        success: true,
                        verified: true,
                        autoApproved: false,
                        message: `El monto verificado (${formatVES(montoVerificadoBs)}) no coincide con el esperado (${formatVES(montoSolicitadoBs)}). El pago será revisado manualmente.`,
                        amount: resultado.amount,
                    });
                }
            }
        }

        // Respuesta normal (sin auto-aprobación)
        if (resultado.verified) {
            // C-127: Transacciones → "Pagos sin orden" lo muestra sin recargar mientras el cliente termina su compra
            publicar({ tipo: 'payment:verified', userId, contexto: contexto === 'RECHARGE' ? 'RECHARGE' : 'ORDER', referencia, aprobado: true, transactionId: contexto === 'RECHARGE' ? transactionId ?? null : null });
            return NextResponse.json({
                success: true,
                verified: true,
                message: 'Pago verificado exitosamente',
                amount: resultado.amount,
                // C-125: el checkout concilia con esto (pagado de más, de menos o por redondeo)
                pagadoBs: montoBanco,
                tasa: tasaPago > 0 ? tasaPago : null,
            });
        } else {
            const mensajeError = interpretarErrorBDV(resultado.code, resultado.message);
            // C-125: si el banco dice que el monto no coincide, el cliente pudo transferir otra cantidad: se le pide
            // que la escriba tal cual la ve en su comprobante (el banco busca por monto exacto)
            const montoNoCoincide = /monto|importe|amount/i.test(mensajeError);
            return NextResponse.json({
                success: true,
                verified: false,
                code: resultado.code,
                // Ambos campos para compatibilidad con frontend existente
                message: mensajeError,
                error: mensajeError,
                montoConsultadoBs: montoParaCopiar(montoNumerico),
                montoNoCoincide,
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
