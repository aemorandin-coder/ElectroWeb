import { NextRequest, NextResponse } from 'next/server';
import { firmaPendientePara } from '@/lib/legal-docs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { montoDecimal } from '@/lib/pricing';
import { montoBs } from '@/lib/pago-movil/monto';
import { claveReferencia, esPagoManual } from '@/lib/checkout-pago';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { notifyRechargeRequested } from '@/lib/notifications';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD } from '@/lib/currency';

// S-07: cada solicitud avisa al equipo. Hasta 10 por hora por cuenta y 3 por confirmar a la vez
const LIMITE_RECARGAS = { maxRequests: 10, windowSeconds: 3600 };
const MAX_RECARGAS_POR_CONFIRMAR = 3;

// Crear solicitud de recarga de saldo (requiere aprobación del admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    // S-07: límite por cuenta antes de tocar la base
    const limite = checkRateLimit(userId, 'recarga:solicitar', LIMITE_RECARGAS);
    if (!limite.success) {
      return NextResponse.json(
        { error: 'Pediste muchas recargas en poco tiempo (hasta 10 por hora). Espera un rato antes de pedir otra.', retryAfter: limite.resetIn },
        { status: 429, headers: getRateLimitHeaders(limite, LIMITE_RECARGAS) }
      );
    }

    const userName = session.user.name || session.user.email || 'Usuario';
    const body = await req.json().catch(() => null);
    const amount = Number(body?.amount);
    const companyPaymentMethodId = typeof body?.companyPaymentMethodId === 'string' && body.companyPaymentMethodId.trim()
      ? body.companyPaymentMethodId.trim()
      : null;
    const reference = typeof body?.reference === 'string' ? body.reference.trim().slice(0, 60) : null;
    const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 200) : null;

    // C-103: los términos del saldo se exigen aquí. Antes solo el modal desactivaba el botón:
    // llamando a la API directo se recargaba sin haber firmado.
    const pendiente = await firmaPendientePara(userId, 'RECHARGE');
    if (pendiente) {
      return NextResponse.json(
        { error: `Antes de recargar, firma "${pendiente.title}".`, code: 'FIRMA_REQUERIDA', slug: pendiente.slug },
        { status: 403 }
      );
    }

    // Validate amount (C-73: antes "abc" o 1e9 llegaban a la base de datos)
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return NextResponse.json({ error: 'Monto inválido (entre $1 y $10.000)' }, { status: 400 });
    }

    // El método se elige por id y tiene que estar activo (C-101): antes se aceptaba cualquier texto
    // y el mínimo y el máximo del método no se aplicaban.
    if (!companyPaymentMethodId) {
      return NextResponse.json({ error: 'Método de pago requerido' }, { status: 400 });
    }

    const companyMethod = await prisma.companyPaymentMethod.findUnique({
      where: { id: companyPaymentMethodId },
    });
    if (!companyMethod || !companyMethod.isActive) {
      return NextResponse.json({ error: 'El método de pago seleccionado no está disponible' }, { status: 400 });
    }
    if (companyMethod.minAmount !== null && amount < Number(companyMethod.minAmount)) {
      return NextResponse.json({
        error: `El monto mínimo para este método es ${formatUSD(Number(companyMethod.minAmount))}`,
      }, { status: 400 });
    }
    if (companyMethod.maxAmount !== null && amount > Number(companyMethod.maxAmount)) {
      return NextResponse.json({
        error: `El monto máximo para este método es ${formatUSD(Number(companyMethod.maxAmount))}`,
      }, { status: 400 });
    }

    const resolvedMethodName = companyMethod.name;

    // Get or create user balance
    let userBalance = await prisma.userBalance.findUnique({
      where: { userId },
    });

    if (!userBalance) {
      userBalance = await prisma.userBalance.create({
        data: {
          userId,
          balance: 0,
          currency: 'USD',
          totalRecharges: 0,
          totalSpent: 0,
        },
      });
    }

    // S-07: una recarga por Pago Móvil que quedó sin terminar (se cerró la pestaña, se recargó la página o se volvió
    // atrás en la ventana) no se queda por confirmar para siempre: la nueva la reemplaza. Las que ya tienen un pago
    // verificado no se tocan (esperan la revisión del equipo), ni las de los métodos manuales.
    if (companyMethod.type === 'MOBILE_PAYMENT') {
      const sinTerminar = await prisma.transaction.findMany({
        where: { balanceId: userBalance.id, type: 'RECHARGE', status: 'PENDING', paymentMethod: 'MOBILE_PAYMENT' },
        select: { id: true },
      });
      if (sinTerminar.length > 0) {
        const ids = sinTerminar.map((t) => t.id);
        const conPago = new Set(
          (await prisma.pagoMovilVerificacion.findMany({ where: { transactionId: { in: ids }, verificado: true }, select: { transactionId: true } }))
            .map((p) => p.transactionId)
        );
        const reemplazadas = ids.filter((id) => !conPago.has(id));
        if (reemplazadas.length > 0) {
          await prisma.transaction.updateMany({
            where: { id: { in: reemplazadas }, status: 'PENDING' },
            data: { status: 'CANCELLED', rejectionReason: 'Reemplazada por una recarga nueva' },
          });
        }
      }
    }

    // S-07: hasta 3 recargas por confirmar a la vez (las que esperan al equipo: un pago manual o un Pago Móvil por revisar)
    const porConfirmar = await prisma.transaction.count({
      where: { balanceId: userBalance.id, type: 'RECHARGE', status: 'PENDING' },
    });
    if (porConfirmar >= MAX_RECARGAS_POR_CONFIRMAR) {
      return NextResponse.json(
        { error: `Tienes ${MAX_RECARGAS_POR_CONFIRMAR} recargas por confirmar. Las estamos revisando: cuando quede lista una, puedes pedir otra.` },
        { status: 409 }
      );
    }
    // S-07: la referencia de un pago manual no sirve para dos recargas del mismo método. Mismo criterio que las compras
    // (checkout-pago: sin espacios y en mayúsculas). El Pago Móvil no entra: su referencia es una provisional única y
    // la real la revisa la verificación con el banco.
    if (reference && esPagoManual(companyMethod.type)) {
      const repetida = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "transactions"
        WHERE "type" = 'RECHARGE' AND "status" IN ('PENDING', 'COMPLETED')
          AND "companyPaymentMethodId" = ${companyMethod.id}
          AND upper(regexp_replace("reference", '[[:space:]]+', '', 'g')) = ${claveReferencia(reference)}
        LIMIT 1`;
      if (repetida.length > 0) {
        return NextResponse.json({ error: 'Esa referencia ya está en otra recarga. Si es otro pago, revisa el número.' }, { status: 409 });
      }
    }

    // S-06: la tasa de la tienda al pedir la recarga y el monto en Bs. que se le muestra al cliente quedan con ella.
    // El Pago Móvil se compara con esa tasa (mientras sea reciente), no con la que haya cuando verifique.
    const settings = await prisma.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true } });
    const tasa = settings?.exchangeRateVES ? Number(settings.exchangeRateVES) : 0;
    // Con los mismos céntimos que se guardan en la recarga (montoDecimal), que son los que se comparan al verificar
    const montoBsSolicitud = tasa > 0 ? montoBs(Number(montoDecimal(amount)), tasa) : 0;

    // Create transaction as PENDING (requiere aprobación del admin)
    const transaction = await prisma.transaction.create({
      data: {
        balanceId: userBalance.id,
        type: 'RECHARGE',
        status: 'PENDING',
        amount: montoDecimal(amount), // texto exacto (C-96)
        currency: 'USD',
        description: description || `Recarga de Puntos ES - ${resolvedMethodName}`,
        reference: reference || null,
        paymentMethod: companyMethod.type,
        companyPaymentMethodId: companyMethod.id,
        metadata: JSON.stringify({
          paymentMethod: companyMethod.type,
          companyPaymentMethodId: companyMethod.id,
          companyPaymentMethodName: resolvedMethodName,
          reference,
          requestedAt: new Date().toISOString(),
          ...(tasa > 0 ? { tasaSolicitud: tasa, montoBsSolicitud } : {}),
        }),
      },
    });

    // Send notifications
    try {
      // Notify customer
      await notifyRechargeRequested(userId, amount);
      // Aviso al equipo (C-73)
      emitAdminEvent({
        type: 'RECHARGE_REQUESTED',
        title: `Recarga por aprobar · ${formatUSD(amount)}`,
        summary: `${userName} pidió recargar Puntos ES`,
        fields: [
          ['Monto', formatUSD(amount)],
          ['Método', resolvedMethodName],
          ['Referencia', reference || 'Sin referencia'],
          ['Correo', session.user.email || ''],
        ],
        link: '/admin/transactions',
      });
    } catch (notifError) {
      console.error('Error sending notifications:', notifError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud de recarga creada exitosamente. Pendiente de aprobación del administrador.',
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        reference: transaction.reference,
        createdAt: transaction.createdAt,
        // S-06: lo que se le pide pagar en Bs. y la tasa con la que se calculó (la ventana de verificación los usa)
        tasa: tasa > 0 ? tasa : null,
        montoBs: tasa > 0 ? montoBsSolicitud : null,
      },
    });
  } catch (error) {
    console.error('Error creating recharge request:', error);
    return NextResponse.json({ error: 'Error al crear la solicitud de recarga' }, { status: 500 });
  }
}
