import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';
import {
  createNotification,
  notifyOrderConfirmed,
  notifyOrderDelivered,
} from '@/lib/notifications';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD, formatVES } from '@/lib/currency';
import { formatPaymentMethod } from '@/lib/format-helpers';
import { notifyStockCrossings } from '@/lib/stock-alerts';
import { OrderStatus, PaymentStatus, PaymentMethodType, Prisma } from '@prisma/client';
import {
  sendEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderPendingPaymentEmail
} from '@/lib/email-service';
import { generateOrderConfirmationEmail } from '@/lib/email-templates/OrderConfirmation';
import { generateReviewReminderEmail } from '@/lib/email-templates/ReviewReminder';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { parseDeliveryMethod, parseOrderItems, quoteOrder, OrderInputError, type QuotedLine } from '@/lib/order-quote';
import { roundMoney, type OrderGroupTotals } from '@/lib/pricing';
import {
  orderPatchSchema,
  transicionPermitida,
  estadosSiguientes,
  ETIQUETA_ESTADO,
  pideConfirmarPago,
  stockYaDescontado,
  devolverStock,
  liberarReservas,
  escaparHtml,
  MOTIVO_CANCELACION_MINIMO,
} from '@/lib/order-admin';


// GET - Get all orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const userRole = (session.user as any)?.role;

    // PERFORMANCE: Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const all = searchParams.get('all') === 'true'; // For exports
    const skip = (page - 1) * limit;

    const where: any = {};

    // If user is a customer (not admin), only show their orders
    if (userRole === 'USER') {
      where.userId = session.user.id;
    } else if (userId) {
      // Admin can filter by userId
      where.userId = userId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    // Count total for pagination
    const total = await prisma.order.count({ where });

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                customerType: true,
                companyName: true,
                taxId: true,
              }
            }
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                mainImage: true,
                productType: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(all ? {} : { take: limit, skip }),
    });

    // Return with pagination metadata
    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Error al obtener órdenes' }, { status: 500 });
  }
}

// Margen para diferencias de redondeo o de tasa entre el pago móvil y la orden
const MOBILE_PAYMENT_TOLERANCE = 0.01;
const ORDER_NUMBER_RETRIES = 5;
const ACCEPTED_PAYMENT_METHODS: string[] = ['WALLET', ...Object.values(PaymentMethodType)];

type CreatedOrder = Prisma.OrderGetPayload<{
  include: { items: true; user: { select: { name: true; email: true } } };
}>;

interface OrderGroup {
  totals: OrderGroupTotals;
  lines: QuotedLine[];
  deliveryMethod: string;
  shippingAddress: string;
  tag: string;
}

// ORD-{año}-{secuencia}. Se llama dentro de la transacción. El advisory lock serializa la creación
// de órdenes hasta el commit, así dos compras simultáneas no leen la misma secuencia; si aun así
// chocan (p. ej. una orden creada por otra vía), el @unique falla y el POST reintenta.
async function getNextOrderSequence(tx: Prisma.TransactionClient, year: number): Promise<number> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(7426001)::text AS locked`;
  const rows = await tx.$queryRaw<Array<{ max: number | null }>>`
    SELECT MAX(CAST(split_part("orderNumber", '-', 3) AS INTEGER)) AS max
    FROM "orders"
    WHERE "orderNumber" LIKE ${`ORD-${year}-%`}
      AND split_part("orderNumber", '-', 3) ~ '^[0-9]{1,9}$'
  `;
  return Number(rows[0]?.max ?? 0) + 1;
}

function isOrderNumberConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002'
    && String(error.meta?.target ?? '').includes('orderNumber');
}

const DELIVERY_LABELS: Record<string, string> = {
  HOME_DELIVERY: 'Envío a domicilio',
  SHIPPING: 'Oficina de courier',
  PICKUP: 'Retiro en tienda',
  STORE_PICKUP: 'Retiro en tienda',
  DIGITAL: 'Digital',
};

async function sendNewOrderNotifications(order: CreatedOrder, userId: string, paymentMethod: string) {
  await notifyOrderConfirmed(userId, order.orderNumber, order.id);

  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const products = order.items.slice(0, 4).map((item) => `${item.productName || 'Producto'} x${item.quantity}`).join(', ')
    + (order.items.length > 4 ? ` y ${order.items.length - 4} más` : '');
  emitAdminEvent({
    type: 'ORDER_CREATED',
    title: `Nueva venta · ${order.orderNumber}`,
    summary: `${order.user?.name || order.user?.email || 'Un cliente'} compró ${units} ${units === 1 ? 'producto' : 'productos'}`,
    fields: [
      ['Total', `${formatUSD(Number(order.totalUSD))} (${formatVES(Number(order.totalVES))})`],
      ['Pago', `${formatPaymentMethod(paymentMethod)} · ${order.paymentStatus === 'PAID' || paymentMethod === 'WALLET' ? 'confirmado' : 'por verificar'}`],
      ['Entrega', DELIVERY_LABELS[order.deliveryMethod || ''] || order.deliveryMethod],
      ['Productos', products],
      ['Cliente', order.user?.email],
    ],
    link: '/admin/orders',
  });

  if (paymentMethod === 'WALLET') {
    await createNotification({
      userId,
      type: 'ORDER_PAID',
      title: 'Pago Confirmado',
      message: `El pago de tu orden #${order.orderNumber} ha sido confirmado con Billetera Digital.`,
      link: `/customer/orders`,
      icon: 'payment'
    });
  }

  try {
    const companySettings = await prisma.companySettings.findFirst();

    const emailHtml = generateOrderConfirmationEmail({
      companyName: companySettings?.companyName || 'Electro Shop',
      companyLogo: companySettings?.logo || undefined,
      orderNumber: order.orderNumber,
      customerName: order.user?.name || 'Cliente',
      orderDate: format(new Date(order.createdAt), "d 'de' MMMM, yyyy", { locale: es }),
      items: order.items.map(item => ({
        name: item.productName || 'Producto',
        quantity: item.quantity,
        price: item.priceUSD.toString(),
      })),
      subtotal: order.subtotalUSD.toString(),
      shipping: order.shippingUSD.toString(),
      tax: order.taxUSD.toString(),
      total: order.totalUSD.toString(),
      currency: 'USD',
      paymentMethod: order.paymentMethod || 'N/A',
      deliveryMethod: 'Delivery',
      deliveryAddress: order.shippingAddress || undefined,
    });

    await sendEmail({
      to: order.user?.email || '',
      subject: `Confirmación de Pedido - ${order.orderNumber}`,
      html: emailHtml,
    });

    // Si el pago no es con billetera, también se envía el correo de pago pendiente
    if (paymentMethod !== 'WALLET' && order.user?.email) {
      try {
        await sendOrderPendingPaymentEmail(order.user.email, {
          orderNumber: order.orderNumber,
          total: Number(order.totalUSD),
          customerName: order.user.name || 'Cliente',
        });
      } catch (pendingEmailError) {
        console.error('Error sending pending payment email:', pendingEmailError);
      }
    }
  } catch (emailError) {
    console.error('Error sending order confirmation email:', emailError);
    // No se falla la creación de la orden si el correo falla
  }
}

// POST - Create new order
// Contrato: { items: [{ productId, quantity, digitalVariantId?, digitalAmount?, digitalUsername? }], deliveryMethod,
//   shippingAddress, paymentMethod, mobilePaymentData?, notes?, expectedTotalUSD? }
// Precios, envío, descuentos, total y dueño de la orden se calculan aquí; el resto del body se ignora.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // SEGURIDAD: el dueño de la orden y el saldo que se descuenta salen siempre de la sesión
    const userId = session.user.id;

    // Rate limiting - sensitive for order creation
    const rateLimit = checkRateLimit(userId, 'orders:create', RATE_LIMITS.SENSITIVE);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Has realizado demasiadas operaciones. Espera unos minutos.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.SENSITIVE)
        }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    }

    const items = parseOrderItems(body.items);
    const deliveryMethod = parseDeliveryMethod(body.deliveryMethod);

    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : '';
    if (!ACCEPTED_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 });
    }

    const shippingAddress = typeof body.shippingAddress === 'string' ? body.shippingAddress.trim().slice(0, 500) : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : '';

    const quote = await quoteOrder(userId, items, deliveryMethod);
    const { calculation, settings } = quote;

    if (quote.errors.length > 0) {
      return NextResponse.json(
        { error: 'Hay problemas con los productos de tu carrito', details: quote.errors },
        { status: 400 }
      );
    }

    if (deliveryMethod === 'PICKUP' && calculation.physical && !settings?.pickupEnabled) {
      return NextResponse.json({ error: 'El retiro en tienda no está disponible' }, { status: 400 });
    }

    // Envío a domicilio o por courier apagado en Configuración (C-50b): los productos físicos solo se retiran
    if (deliveryMethod !== 'PICKUP' && calculation.physical && settings?.deliveryEnabled === false) {
      return NextResponse.json({ error: 'Por ahora no hacemos envíos: elige retiro en tienda' }, { status: 400 });
    }

    // Min/max de compra con el total calculado en el servidor
    if (settings?.minOrderAmountUSD && calculation.totalUSD < Number(settings.minOrderAmountUSD)) {
      return NextResponse.json(
        { error: `El monto mínimo de compra es $${settings.minOrderAmountUSD}` },
        { status: 400 }
      );
    }

    if (settings?.maxOrderAmountUSD && calculation.totalUSD > Number(settings.maxOrderAmountUSD)) {
      return NextResponse.json(
        { error: `El monto máximo de compra es $${settings.maxOrderAmountUSD}` },
        { status: 400 }
      );
    }

    // Si el total que vio el cliente no coincide (precio o envío cambiaron), no se cobra nada:
    // se devuelve el cálculo actualizado para que lo revise y confirme de nuevo.
    if (typeof body.expectedTotalUSD === 'number' && Math.abs(body.expectedTotalUSD - calculation.totalUSD) > 0.01) {
      return NextResponse.json(
        {
          error: 'El total de tu compra cambió. Revisa el resumen actualizado y confirma de nuevo.',
          calculation,
        },
        { status: 409 }
      );
    }

    // =============================================
    // SEGURIDAD: Verificar pago móvil en servidor
    // =============================================
    // NUNCA confiar en body.mobilePaymentData.verified del cliente: la verificación debe existir
    // en la base de datos, no estar usada y cubrir el total calculado aquí.
    const exchangeRateVES = settings?.exchangeRateVES ? Number(settings.exchangeRateVES) : 0;
    const mobilePaymentData = (body.mobilePaymentData && typeof body.mobilePaymentData === 'object'
      ? body.mobilePaymentData
      : {}) as Record<string, unknown>;
    const referencia = typeof mobilePaymentData.referencia === 'string' ? mobilePaymentData.referencia.trim() : '';

    let mobilePaymentVerificationId: string | null = null;
    let isPaymentConfirmed = paymentMethod === 'WALLET';

    if (paymentMethod === 'MOBILE_PAYMENT' && referencia) {
      const verificacion = await prisma.pagoMovilVerificacion.findFirst({
        where: {
          userId,
          referencia,
          verificado: true,
          contexto: 'ORDER',
          orderId: null,  // Solo verificaciones no usadas
        },
        orderBy: { createdAt: 'desc' },
      });

      if (verificacion) {
        mobilePaymentVerificationId = verificacion.id;
        const paidVES = Number(verificacion.importeVerificado ?? 0);
        const requiredVES = calculation.totalUSD * exchangeRateVES;

        if (exchangeRateVES > 0 && paidVES >= requiredVES * (1 - MOBILE_PAYMENT_TOLERANCE)) {
          isPaymentConfirmed = true;
        } else {
          console.warn(`[SECURITY] Pago móvil ${referencia} no cubre el total de la orden (Bs. ${paidVES} de Bs. ${requiredVES}) - usuario ${userId}`);
        }
      } else {
        console.warn(`[SECURITY] Intento de orden con pago móvil no verificado: ${referencia} por usuario ${userId}`);
      }
    }

    // Unidades físicas por producto (para descontar stock o reservarlo)
    const physicalQuantities = new Map<string, number>();
    for (const line of quote.lines) {
      if (line.productType !== 'DIGITAL') {
        physicalQuantities.set(line.productId, (physicalQuantities.get(line.productId) ?? 0) + line.quantity);
      }
    }

    const discountRequestIds = [...new Set(
      quote.lines.map(line => line.discountRequestId).filter((id): id is string => id !== null)
    )];

    // La compra se divide en una orden física (con envío) y una digital, como hasta ahora
    const groups: OrderGroup[] = [];
    if (calculation.physical) {
      groups.push({
        totals: calculation.physical,
        lines: quote.lines.filter(line => line.productType !== 'DIGITAL'),
        deliveryMethod,
        shippingAddress,
        tag: '[Productos Físicos]',
      });
    }
    if (calculation.digital) {
      groups.push({
        totals: calculation.digital,
        lines: quote.lines.filter(line => line.productType === 'DIGITAL'),
        deliveryMethod: 'DIGITAL',
        shippingAddress: '',
        tag: '[Productos Digitales]',
      });
    }

    const createOrders = () => prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      let sequence = await getNextOrderSequence(tx, year);
      const orderNumbers = groups.map(() => `ORD-${year}-${String(sequence++).padStart(4, '0')}`);

      // Pago con billetera: se descuenta el total del servidor solo si el saldo alcanza (atómico)
      let balanceId: string | null = null;
      if (paymentMethod === 'WALLET') {
        const userBalance = await tx.userBalance.findUnique({
          where: { userId },
          select: { id: true },
        });

        const debited = userBalance
          ? await tx.userBalance.updateMany({
            where: { id: userBalance.id, balance: { gte: calculation.totalUSD } },
            data: {
              balance: { decrement: calculation.totalUSD },
              totalSpent: { increment: calculation.totalUSD },
            },
          })
          : { count: 0 };

        if (!userBalance || debited.count === 0) {
          throw new OrderInputError('Saldo insuficiente en billetera');
        }
        balanceId = userBalance.id;
      }

      const orders: CreatedOrder[] = [];

      for (const [index, group] of groups.entries()) {
        const orderNumber = orderNumbers[index];
        const { totals } = group;

        if (balanceId) {
          await tx.transaction.create({
            data: {
              balanceId,
              type: 'PURCHASE',
              status: 'COMPLETED',
              amount: totals.totalUSD,
              currency: 'USD',
              description: `Compra Orden #${orderNumber}`,
              reference: orderNumber,
              paymentMethod: 'WALLET',
            },
          });
        }

        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            shippingAddress: group.shippingAddress,
            deliveryMethod: group.deliveryMethod,
            subtotalUSD: totals.subtotalUSD,
            taxUSD: totals.taxUSD,
            shippingUSD: totals.shippingUSD,
            discountUSD: totals.discountUSD,
            totalUSD: totals.totalUSD,
            exchangeRate: 1,
            totalVES: exchangeRateVES > 0 ? roundMoney(totals.totalUSD * exchangeRateVES) : 0,
            exchangeRateVES: settings?.exchangeRateVES ?? null,
            exchangeRateEUR: settings?.exchangeRateEUR ?? null,
            paymentMethod,
            // WALLET y MOBILE_PAYMENT verificado (en BD y por monto) se tratan como pagados
            status: isPaymentConfirmed ? OrderStatus.PROCESSING : OrderStatus.PENDING,
            paymentStatus: isPaymentConfirmed ? PaymentStatus.PAID : PaymentStatus.PENDING,
            paidAt: isPaymentConfirmed ? new Date() : null,
            notes: notes ? `${notes} ${group.tag}` : group.tag,
            items: {
              create: group.lines.map(line => ({
                productId: line.productId,
                productName: line.name,
                productSku: line.productSku,
                productImage: line.productImage,
                priceUSD: line.unitPriceUSD,
                quantity: line.quantity,
                totalUSD: roundMoney(line.unitPriceUSD * line.quantity),
                digitalVariantId: line.digitalVariantId,
                digitalVariantLabel: line.digitalVariantLabel,
                digitalAccount: line.digitalAccount,
              })),
            },
          },
          include: {
            items: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        orders.push(order);
      }

      // STOCK SEGÚN EL PAGO:
      // - Confirmado (WALLET o pago móvil verificado): se descuenta ya, solo si alcanza
      // - Sin confirmar: reserva de 5 minutos mientras el admin verifica el pago
      if (isPaymentConfirmed) {
        for (const [productId, quantity] of physicalQuantities) {
          const updated = await tx.product.updateMany({
            where: { id: productId, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          });
          if (updated.count === 0) {
            throw new OrderInputError('Uno de los productos se agotó mientras procesábamos tu compra. Revisa tu carrito.');
          }
        }
      } else {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutos de reservación

        for (const [productId, quantity] of physicalQuantities) {
          await tx.stockReservation.create({
            data: { userId, productId, quantity, expiresAt },
          });
        }
      }

      // Descuentos aprobados que el servidor aplicó
      if (discountRequestIds.length > 0) {
        const used = await tx.discountRequest.updateMany({
          where: {
            id: { in: discountRequestIds },
            userId,
            status: 'APPROVED',
          },
          data: {
            status: 'USED',
            usedAt: new Date(),
          },
        });
        if (used.count !== discountRequestIds.length) {
          throw new OrderInputError('Uno de tus descuentos ya fue usado. Revisa el resumen y confirma de nuevo.');
        }
      }

      // SEGURIDAD: Vincular la verificación de pago móvil con la orden para prevenir reutilización
      if (mobilePaymentVerificationId) {
        const linked = await tx.pagoMovilVerificacion.updateMany({
          where: { id: mobilePaymentVerificationId, orderId: null },
          data: { orderId: orders[0].id },
        });
        if (linked.count === 0) {
          throw new OrderInputError('Este pago móvil ya fue usado en otra orden');
        }
      }

      return orders;
    }, { maxWait: 10000, timeout: 15000 });

    let orders: CreatedOrder[] = [];
    for (let attempt = 1; ; attempt++) {
      try {
        orders = await createOrders();
        break;
      } catch (error) {
        if (!isOrderNumberConflict(error) || attempt >= ORDER_NUMBER_RETRIES) throw error;
      }
    }

    // Comisión de referidos con el total del servidor (fire-and-forget)
    const { recordConversion } = await import('@/lib/influencer-commission');
    for (const order of orders) {
      recordConversion({
        referredUserId: userId,
        type: 'PURCHASE',
        grossAmount: Number(order.totalUSD),
        orderId: order.id,
      }).catch(() => {});
    }

    // Nota: las reservas de pagos sin confirmar no se borran aquí; expiran solas
    // o se eliminan cuando el admin confirma el pago y se descuenta el stock.

    // Notificaciones fuera de la transacción para que un fallo no afecte la compra
    for (const order of orders) {
      await sendNewOrderNotifications(order, userId, paymentMethod);
    }

    // Stock descontado ya (pago confirmado): aviso si algún producto quedó bajo o agotado
    if (isPaymentConfirmed) {
      notifyStockCrossings([...physicalQuantities].map(([productId, quantity]) => ({ productId, quantity })))
        .catch((error) => console.error('Error enviando avisos de stock:', error));
    }

    return NextResponse.json({ orders, totalUSD: calculation.totalUSD }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderInputError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
    }
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Error al crear la orden. Intenta de nuevo.' }, { status: 500 });
  }
}

// PATCH - El panel cambia el estado de una orden (C-74)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_ORDERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Lista blanca: el body ya no se copia entero a la orden (antes se podía cambiar totalUSD o userId)
    const parseado = orderPatchSchema.safeParse(await request.json());
    if (!parseado.success) {
      const problema = parseado.error.issues[0];
      const campo = problema?.path.join('.') || 'body';
      return NextResponse.json(
        { error: `No se puede cambiar "${campo}" desde el panel.`, detalle: problema?.message },
        { status: 400 }
      );
    }
    const patch = parseado.data;

    const resultado = await prisma.$transaction(async (tx) => {
      const orden = await tx.order.findUnique({
        where: { id },
        include: { items: true, user: { select: { name: true, email: true } } },
      });
      if (!orden) return { tipo: 'no-encontrada' as const };

      // Máquina de estados: ni saltos hacia atrás ni cancelar dos veces
      const esTerminal = orden.status === OrderStatus.CANCELLED || orden.status === OrderStatus.REFUNDED;
      if (patch.status && (!transicionPermitida(orden.status, patch.status) || (esTerminal && patch.status === orden.status))) {
        return {
          tipo: 'transicion-invalida' as const,
          repetida: esTerminal && patch.status === orden.status,
          desde: ETIQUETA_ESTADO[orden.status],
          hasta: ETIQUETA_ESTADO[patch.status],
          permitidos: estadosSiguientes(orden.status).map((e) => ETIQUETA_ESTADO[e]),
        };
      }

      const cancelando = patch.status === OrderStatus.CANCELLED && orden.status !== OrderStatus.CANCELLED;
      const motivo = patch.notes?.trim() ?? '';
      if (cancelando && motivo.length < MOTIVO_CANCELACION_MINIMO) {
        return { tipo: 'sin-motivo' as const };
      }

      const confirmandoPago = pideConfirmarPago(patch) && orden.paymentStatus !== PaymentStatus.PAID;

      const data: Prisma.OrderUncheckedUpdateInput = {};
      if (patch.shippingCarrier !== undefined) data.shippingCarrier = patch.shippingCarrier;
      if (patch.trackingNumber !== undefined) data.trackingNumber = patch.trackingNumber;
      if (patch.trackingUrl !== undefined) data.trackingUrl = patch.trackingUrl;
      if (patch.shippingNotes !== undefined) data.shippingNotes = patch.shippingNotes;
      if (patch.adminNotes !== undefined) data.adminNotes = patch.adminNotes;
      if (patch.estimatedDelivery !== undefined) {
        data.estimatedDelivery = patch.estimatedDelivery ? new Date(patch.estimatedDelivery) : null;
      }

      if (patch.status && patch.status !== orden.status) {
        data.status = patch.status;
        switch (patch.status) {
          case OrderStatus.CONFIRMED:
            data.confirmedAt = new Date();
            break;
          case OrderStatus.PROCESSING:
            data.processingAt = new Date();
            break;
          case OrderStatus.SHIPPED:
          case OrderStatus.READY_FOR_PICKUP:
            data.shippedAt = new Date();
            break;
          case OrderStatus.DELIVERED:
            data.deliveredAt = new Date();
            break;
          case OrderStatus.CANCELLED:
            data.cancelledAt = new Date();
            data.notes = motivo;
            break;
        }
      }

      // Confirmar el pago descuenta el stock una sola vez y llena paidAt,
      // venga del botón "Marcar pagado" o del estado de pago.
      const cambiosStock: { productId: string; quantity: number }[] = [];
      if (confirmandoPago) {
        data.paymentStatus = PaymentStatus.PAID;
        data.paidAt = new Date();

        for (const item of orden.items) {
          const producto = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, productType: true },
          });
          if (!producto || producto.productType === 'DIGITAL') continue;
          const descuento = Math.min(item.quantity, producto.stock); // nunca stock negativo
          if (descuento > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: descuento } },
            });
          }
          cambiosStock.push({ productId: item.productId, quantity: descuento });
        }
        await liberarReservas(tx, orden.userId, orden.items);
      }

      // Cancelar: devolver stock solo si se había descontado, y una sola vez
      let reintegro = 0;
      if (cancelando) {
        if (stockYaDescontado(orden.paymentStatus)) {
          await devolverStock(tx, orden.items);
        }
        await liberarReservas(tx, orden.userId, orden.items);

        // Pago con saldo: el total vuelve al saldo de la tienda (nunca sale dinero de la empresa).
        // Decisión de Andrés (2026-09-15): es crédito para comprar aquí, no un reembolso.
        const pagoConSaldo = orden.paymentMethod === 'WALLET' && orden.paymentStatus === PaymentStatus.PAID;
        if (pagoConSaldo && orden.userId) {
          const saldo = await tx.userBalance.findUnique({
            where: { userId: orden.userId },
            select: { id: true },
          });
          if (saldo) {
            const total = Number(orden.totalUSD);
            await tx.userBalance.update({
              where: { id: saldo.id },
              data: {
                balance: { increment: total },
                totalSpent: { decrement: total },
              },
            });
            await tx.transaction.create({
              data: {
                balanceId: saldo.id,
                type: 'REFUND',
                status: 'COMPLETED',
                amount: total,
                currency: 'USD',
                description: `Saldo devuelto por la cancelación de la orden #${orden.orderNumber}`,
                reference: orden.orderNumber,
                paymentMethod: 'WALLET',
              },
            });
            data.paymentStatus = PaymentStatus.REFUNDED;
            reintegro = total;
          }
        }
      }

      const actualizada = await tx.order.update({
        where: { id },
        data,
        include: { items: true, user: { select: { name: true, email: true } } },
      });

      return {
        tipo: 'ok' as const,
        ordenPrevia: orden,
        orden: actualizada,
        confirmandoPago,
        cancelando,
        motivo,
        reintegro,
        cambiosStock,
      };
    });

    if (resultado.tipo === 'no-encontrada') {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }
    if (resultado.tipo === 'transicion-invalida') {
      return NextResponse.json(
        {
          error: resultado.repetida
            ? `La orden ya está ${resultado.desde.toLowerCase()}.`
            : `Una orden ${resultado.desde.toLowerCase()} no puede pasar a ${resultado.hasta.toLowerCase()}.`,
          permitidos: resultado.permitidos,
        },
        { status: 409 }
      );
    }
    if (resultado.tipo === 'sin-motivo') {
      return NextResponse.json(
        { error: 'Se requiere una nota de cancelación con al menos 10 caracteres para informar al cliente del motivo.' },
        { status: 400 }
      );
    }

    const { ordenPrevia: oldOrder, orden: order, confirmandoPago, cancelando, motivo, reintegro, cambiosStock } = resultado;

    if (cambiosStock.length > 0) {
      notifyStockCrossings(cambiosStock).catch((error) => console.error('Error enviando avisos de stock:', error));
    }

    // Avisos al cliente (fuera de la transacción: correos y notificaciones no deben bloquear el cambio)
    if (confirmandoPago && oldOrder.userId) {
      await createNotification({
        userId: oldOrder.userId,
        type: 'ORDER_PAID',
        title: 'Pago Confirmado',
        message: `El pago de tu orden #${oldOrder.orderNumber} ha sido confirmado.`,
        link: `/customer/orders`,
        icon: 'payment'
      });
    }

    if (patch.status && patch.status !== oldOrder.status && oldOrder.userId) {
      switch (patch.status) {
        case 'CONFIRMED':
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_CONFIRMED',
            title: 'Pedido Confirmado',
            message: `Tu pedido #${oldOrder.orderNumber} ha sido confirmado y está siendo procesado.`,
            link: `/customer/orders`,
            icon: 'confirm'
          });
          break;

        case 'PROCESSING':
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_CONFIRMED',
            title: 'Preparando tu Pedido',
            message: `Tu pedido #${oldOrder.orderNumber} está siendo preparado.`,
            link: `/customer/orders`,
            icon: 'package'
          });
          break;

        case 'READY_FOR_PICKUP':
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_CONFIRMED',
            title: 'Listo para Recoger',
            message: `Tu pedido #${oldOrder.orderNumber} está listo para recoger en tienda.`,
            link: `/customer/orders`,
            icon: 'store'
          });
          break;

        case 'SHIPPED': {
          const carrierInfo = patch.shippingCarrier ? ` vía ${patch.shippingCarrier}` : '';
          const trackingInfo = patch.trackingNumber ? ` - Guía: ${patch.trackingNumber}` : '';
          // Una sola notificación (antes salían dos: la genérica y esta con guía y transportista)
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_SHIPPED',
            title: 'Pedido Enviado',
            message: `Tu pedido #${oldOrder.orderNumber} ha sido enviado${carrierInfo}${trackingInfo}`,
            link: `/customer/orders`,
            icon: 'shipping'
          });
          if (order.user?.email) {
            try {
              await sendOrderShippedEmail(order.user.email, {
                orderNumber: oldOrder.orderNumber,
                customerName: order.user.name || 'Cliente',
                trackingNumber: patch.trackingNumber || order.trackingNumber || undefined,
                shippingCarrier: patch.shippingCarrier || order.shippingCarrier || undefined,
              });
            } catch (emailError) {
              console.error('Error sending shipped email:', emailError);
            }
          }
          break;
        }

        case 'DELIVERED':
          await notifyOrderDelivered(oldOrder.userId, oldOrder.orderNumber, order.id);

          if (order.user?.email) {
            try {
              await sendOrderDeliveredEmail(order.user.email, {
                orderNumber: oldOrder.orderNumber,
                customerName: order.user.name || 'Cliente',
              });
            } catch (emailError) {
              console.error('Error sending delivered email:', emailError);
            }
          }

          // Recordatorio de reseña con el primer producto de la orden
          try {
            const orderWithUser = await prisma.order.findUnique({
              where: { id },
              include: {
                user: { select: { name: true, email: true } },
                items: {
                  include: {
                    product: { select: { name: true, mainImage: true, slug: true } }
                  }
                }
              },
            });

            if (orderWithUser && orderWithUser.items.length > 0 && orderWithUser.user) {
              const companySettings = await prisma.companySettings.findFirst();
              const firstProduct = orderWithUser.items[0].product;

              const emailHtml = generateReviewReminderEmail({
                companyName: companySettings?.companyName || 'Electro Shop',
                companyLogo: companySettings?.logo || undefined,
                customerName: orderWithUser.user?.name || 'Cliente',
                orderNumber: orderWithUser.orderNumber,
                productName: firstProduct.name,
                productImage: firstProduct.mainImage || undefined,
                reviewUrl: `${process.env.NEXTAUTH_URL}/productos/${firstProduct.slug}#reviews`,
              });

              await sendEmail({
                to: orderWithUser.user?.email || '',
                subject: `¿Qué te pareció tu compra? - ${orderWithUser.orderNumber}`,
                html: emailHtml,
              });
            }
          } catch (emailError) {
            console.error('Error sending review reminder email:', emailError);
          }
          break;

        case 'CANCELLED': {
          const avisoSaldo = reintegro > 0
            ? ` Devolvimos ${formatUSD(reintegro)} a tu saldo para tu próxima compra.`
            : '';
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_CANCELLED',
            title: 'Orden Cancelada',
            message: `Tu orden #${oldOrder.orderNumber} ha sido cancelada. ${motivo}${avisoSaldo}`,
            link: `/customer/orders`,
            icon: 'cancel'
          });

          try {
            const bloqueSaldo = reintegro > 0
              ? `
              <div style="background:#f0f7f4;border-left:4px solid #047857;padding:15px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
                <p style="margin:0;color:#047857;font-size:14px;font-weight:600;">Saldo devuelto</p>
                <p style="margin:8px 0 0;color:#047857;font-size:14px;">
                  Devolvimos ${escaparHtml(formatUSD(reintegro))} a tu saldo de la tienda para tu próxima compra.
                </p>
              </div>`
              : '';
            // Todo lo que escribe el admin o el cliente va escapado: antes entraba crudo en el HTML
            const cancellationEmailContent = `
              <h2 style="margin:0 0 20px;color:#dc3545;font-size:24px;font-weight:600;">Orden Cancelada</h2>
              <p style="color:#6a6c6b;font-size:16px;line-height:1.6;">
                Hola <strong>${escaparHtml(order.user?.name || 'Cliente')}</strong>,
              </p>
              <p style="color:#6a6c6b;font-size:16px;line-height:1.6;">
                Lamentamos informarte que tu orden <strong>#${escaparHtml(oldOrder.orderNumber)}</strong> ha sido cancelada.
              </p>

              <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
                <p style="margin:0;color:#856404;font-size:14px;font-weight:600;">Motivo de la cancelación:</p>
                <p style="margin:8px 0 0;color:#856404;font-size:14px;">${escaparHtml(motivo)}</p>
              </div>
              ${bloqueSaldo}
              <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="margin:0;color:#6a6c6b;font-size:14px;">
                  <strong>Número de orden:</strong> ${escaparHtml(oldOrder.orderNumber)}<br>
                  <strong>Total:</strong> ${escaparHtml(formatUSD(Number(oldOrder.totalUSD)))}<br>
                  <strong>Fecha de cancelación:</strong> ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <p style="color:#6a6c6b;font-size:14px;line-height:1.6;">
                Si tienes alguna pregunta, no dudes en contactarnos.
              </p>

              <div style="text-align:center;margin:30px 0;">
                <a href="${process.env.NEXTAUTH_URL || ''}/contacto" style="display:inline-block;background:#2a63cd;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
                  Contactar Soporte
                </a>
              </div>

              <p style="color:#adb5bd;font-size:12px;margin:30px 0 0;border-top:1px solid #e9ecef;padding-top:20px;">
                Gracias por tu comprensión. Esperamos poder atenderte en otra oportunidad.
              </p>
            `;

            const { getBaseTemplate } = await import('@/lib/email-service');
            const emailHtml = await getBaseTemplate(cancellationEmailContent, 'Tu orden ha sido cancelada');

            if (order.user?.email) {
              await sendEmail({
                to: order.user.email,
                subject: `Orden Cancelada - ${oldOrder.orderNumber}`,
                html: emailHtml,
              });
            }
          } catch (emailError) {
            console.error('Error sending cancellation email:', emailError);
            // Don't fail the cancellation if email fails
          }
          break;
        }
      }
    }

    // Avisos al equipo (C-73): quién confirmó el pago o canceló, para que el resto lo sepa
    const actor = session?.user?.name || session?.user?.email || 'Un administrador';
    if (confirmandoPago) {
      emitAdminEvent({
        type: 'ORDER_PAID',
        title: `Pago confirmado · ${oldOrder.orderNumber}`,
        summary: `${actor} marcó la orden como pagada`,
        fields: [
          ['Total', formatUSD(Number(oldOrder.totalUSD))],
          ['Pago', formatPaymentMethod(oldOrder.paymentMethod)],
          ['Cliente', order.user?.name || order.user?.email],
        ],
        link: '/admin/orders',
      });
    }
    if (cancelando) {
      emitAdminEvent({
        type: 'ORDER_CANCELLED',
        title: `Orden cancelada · ${oldOrder.orderNumber}`,
        summary: `${actor} canceló la orden`,
        fields: [
          ['Total', formatUSD(Number(oldOrder.totalUSD))],
          ['Motivo', motivo.slice(0, 300)],
          ['Cliente', order.user?.name || order.user?.email],
          ['Saldo devuelto', reintegro > 0 ? formatUSD(reintegro) : null],
        ],
        link: '/admin/orders',
      });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Error al actualizar orden' }, { status: 500 });
  }
}
