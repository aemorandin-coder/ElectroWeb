import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';
import {
  createNotification,
  notifyOrderConfirmed,
  notifyOrderShipped,
  notifyOrderDelivered,
  notifyAdminsNewOrder
} from '@/lib/notifications';
import { sendNewOrderAlert } from '@/lib/admin-alerts';
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

async function sendNewOrderNotifications(order: CreatedOrder, userId: string, paymentMethod: string) {
  await notifyOrderConfirmed(userId, order.orderNumber, order.id);

  notifyAdminsNewOrder(
    order.user?.name || 'Cliente',
    order.orderNumber,
    Number(order.totalUSD)
  ).catch(() => {});

  sendNewOrderAlert({
    orderNumber: order.orderNumber,
    customerName: order.user?.name || 'Cliente',
    customerEmail: order.user?.email || '',
    total: Number(order.totalUSD),
    paymentMethod,
    itemCount: order.items.length,
    baseUrl: process.env.NEXTAUTH_URL,
  }).catch(() => {});

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

// PATCH - Update order status
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

    const body = await request.json();
    const oldOrder = await prisma.order.findUnique({ where: { id } });

    if (!oldOrder) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const updateData: any = {
      ...body,
    };

    // Handle payment status updates
    if (body.paymentStatus === PaymentStatus.PAID && oldOrder.paymentStatus !== PaymentStatus.PAID) {
      updateData.paidAt = new Date();
    }

    // Handle order status-specific updates with timestamps
    if (body.status && body.status !== oldOrder.status) {
      // VALIDATION: Require cancellation note for CANCELLED status
      if (body.status === 'CANCELLED') {
        if (!body.notes || body.notes.trim().length < 10) {
          return NextResponse.json(
            { error: 'Se requiere una nota de cancelación con al menos 10 caracteres para informar al cliente del motivo.' },
            { status: 400 }
          );
        }
      }

      switch (body.status) {
        case 'CONFIRMED':
          updateData.confirmedAt = new Date();
          break;
        case 'PROCESSING':
          updateData.processingAt = new Date();
          break;
        case 'SHIPPED':
          updateData.shippedAt = new Date();
          // Validate shipping info is provided when marking as shipped
          if (!body.trackingNumber && !body.shippingCarrier) {
            // Allow shipping without tracking for store pickup
            if ((oldOrder as any).deliveryMethod !== 'STORE_PICKUP') {
              // We'll allow it but it's recommended
            }
          }
          break;
        case 'READY_FOR_PICKUP':
          updateData.shippedAt = new Date(); // Reuse shippedAt for pickup ready
          break;
        case 'DELIVERED':
          updateData.deliveredAt = new Date();
          break;
        case 'CANCELLED':
          updateData.cancelledAt = new Date();
          updateData.notes = body.notes; // Save cancellation reason
          break;
      }
    }

    // Handle shipping info updates
    if (body.shippingCarrier !== undefined) {
      updateData.shippingCarrier = body.shippingCarrier;
    }
    if (body.trackingNumber !== undefined) {
      updateData.trackingNumber = body.trackingNumber;
    }
    if (body.trackingUrl !== undefined) {
      updateData.trackingUrl = body.trackingUrl;
    }
    if (body.shippingNotes !== undefined) {
      updateData.shippingNotes = body.shippingNotes;
    }
    if (body.estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = body.estimatedDelivery ? new Date(body.estimatedDelivery) : null;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        user: { select: { name: true, email: true } }
      },
    });

    // Create notifications for status changes
    if (body.paymentStatus === PaymentStatus.PAID && oldOrder.paymentStatus !== PaymentStatus.PAID) {
      // PAYMENT CONFIRMED: Now deduct stock (for DIRECT payment orders that had reservations)
      // This happens when admin confirms the payment was received
      const stockChanges: { productId: string; quantity: number }[] = [];
      for (const item of order.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, productType: true }
        });

        // Only deduct stock for physical products
        if (product && product.productType !== 'DIGITAL') {
          const newStock = product.stock - item.quantity;
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: Math.max(0, newStock) },
          });
          stockChanges.push({ productId: item.productId, quantity: Math.min(item.quantity, product.stock) });
        }
      }
      notifyStockCrossings(stockChanges).catch((error) => console.error('Error enviando avisos de stock:', error));

      // Release the stock reservation since stock is now actually deducted
      if (oldOrder.userId) {
        await prisma.stockReservation.deleteMany({
          where: { userId: oldOrder.userId },
        });
      }

      await createNotification({
        userId: oldOrder.userId!,
        type: 'ORDER_PAID',
        title: 'Pago Confirmado',
        message: `El pago de tu orden #${oldOrder.orderNumber} ha sido confirmado.`,
        link: `/customer/orders`,
        icon: 'payment'
      });
    }

    if (body.status && body.status !== oldOrder.status && oldOrder.userId) {
      switch (body.status) {
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

        case 'SHIPPED':
          const carrierInfo = body.shippingCarrier ? ` vía ${body.shippingCarrier}` : '';
          const trackingInfo = body.trackingNumber ? ` - Guía: ${body.trackingNumber}` : '';
          await notifyOrderShipped(oldOrder.userId, oldOrder.orderNumber, order.id);
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_SHIPPED',
            title: 'Pedido Enviado',
            message: `Tu pedido #${oldOrder.orderNumber} ha sido enviado${carrierInfo}${trackingInfo}`,
            link: `/customer/orders`,
            icon: 'shipping'
          });
          // Send shipped email to customer
          if (order.user?.email) {
            try {
              await sendOrderShippedEmail(order.user.email, {
                orderNumber: oldOrder.orderNumber,
                customerName: order.user.name || 'Cliente',
                trackingNumber: body.trackingNumber || order.trackingNumber || undefined,
                shippingCarrier: body.shippingCarrier || order.shippingCarrier || undefined,
              });
            } catch (emailError) {
              console.error('Error sending shipped email:', emailError);
            }
          }
          break;

        case 'DELIVERED':
          await notifyOrderDelivered(oldOrder.userId, oldOrder.orderNumber, order.id);

          // Send delivered email to customer
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

          // Send review reminder email when order is delivered (optional, additional reminder)
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

        case 'CANCELLED':
          await createNotification({
            userId: oldOrder.userId,
            type: 'ORDER_CANCELLED',
            title: 'Orden Cancelada',
            message: `Tu orden #${oldOrder.orderNumber} ha sido cancelada. ${body.notes || ''}`,
            link: `/customer/orders`,
            icon: 'cancel'
          });

          // Send cancellation email to customer
          try {
            const companySettings = await prisma.companySettings.findFirst();
            const cancellationEmailContent = `
              <h2 style="margin:0 0 20px;color:#dc3545;font-size:24px;font-weight:600;">Orden Cancelada</h2>
              <p style="color:#6a6c6b;font-size:16px;line-height:1.6;">
                Hola <strong>${order.user?.name || 'Cliente'}</strong>,
              </p>
              <p style="color:#6a6c6b;font-size:16px;line-height:1.6;">
                Lamentamos informarte que tu orden <strong>#${oldOrder.orderNumber}</strong> ha sido cancelada.
              </p>
              
              <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px 20px;margin:20px 0;border-radius:0 8px 8px 0;">
                <p style="margin:0;color:#856404;font-size:14px;font-weight:600;">Motivo de la cancelación:</p>
                <p style="margin:8px 0 0;color:#856404;font-size:14px;">${body.notes}</p>
              </div>
              
              <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="margin:0;color:#6a6c6b;font-size:14px;">
                  <strong>Número de orden:</strong> ${oldOrder.orderNumber}<br>
                  <strong>Total:</strong> $${Number(oldOrder.totalUSD).toFixed(2)}<br>
                  <strong>Fecha de cancelación:</strong> ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              <p style="color:#6a6c6b;font-size:14px;line-height:1.6;">
                Si realizaste algún pago, el reembolso será procesado según nuestras políticas.
                Si tienes alguna pregunta, no dudes en contactarnos.
              </p>
              
              <div style="text-align:center;margin:30px 0;">
                <a href="${process.env.NEXTAUTH_URL || ''}/contacto" style="display:inline-block;background:linear-gradient(135deg,#2a63cd 0%,#1e4ba3 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">
                  Contactar Soporte
                </a>
              </div>
              
              <p style="color:#adb5bd;font-size:12px;margin:30px 0 0;border-top:1px solid #e9ecef;padding-top:20px;">
                Gracias por tu comprensión. Esperamos poder atenderte en otra oportunidad.
              </p>
            `;

            const { getBaseTemplate } = await import('@/lib/email-service');
            const emailHtml = await getBaseTemplate(cancellationEmailContent, 'Tu orden ha sido cancelada');

            await sendEmail({
              to: order.user?.email || '',
              subject: `Orden Cancelada - ${oldOrder.orderNumber}`,
              html: emailHtml,
            });
          } catch (emailError) {
            console.error('Error sending cancellation email:', emailError);
            // Don't fail the cancellation if email fails
          }

          // Restore stock if order is cancelled
          for (const item of order.items) {
            const product = await prisma.product.findUnique({ where: { id: item.productId } });
            if (product) {
              const newStock = product.stock + item.quantity;
              await prisma.product.update({
                where: { id: item.productId },
                data: {
                  stock: newStock,
                },
              });
            }
          }

          // Also release any stock reservations for this user
          if (oldOrder.userId) {
            await prisma.stockReservation.deleteMany({
              where: { userId: oldOrder.userId },
            });
          }

          // Mark discounts as used
          // TODO: Logic to restore discounts if needed
          break;
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Error al actualizar orden' }, { status: 500 });
  }
}


