import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';
import {
  createNotification,
  notifyOrderConfirmed,
  notifyOrderShipped,
  notifyOrderDelivered
} from '@/lib/notifications';
import { OrderStatus, PaymentStatus } from '@prisma/client';
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

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;

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

    const body = await request.json();

    // =============================================
    // SEGURIDAD: Verificar pago móvil en servidor
    // =============================================
    // NUNCA confiar en body.mobilePaymentData.verified del cliente
    // Debemos verificar en la base de datos que el pago realmente fue verificado
    let serverVerifiedMobilePayment = false;
    if (body.paymentMethod === 'MOBILE_PAYMENT' && body.mobilePaymentData?.referencia) {
      const verificacion = await prisma.pagoMovilVerificacion.findFirst({
        where: {
          userId,
          referencia: body.mobilePaymentData.referencia,
          verificado: true,
          contexto: 'ORDER',
          orderId: null,  // Solo verificaciones no usadas
        },
        orderBy: { createdAt: 'desc' },
      });

      if (verificacion) {
        serverVerifiedMobilePayment = true;
        console.log(`[ORDERS] Pago móvil verificado en servidor: ${verificacion.referencia}`);
      } else {
        console.warn(`[SECURITY] Intento de orden con pago móvil no verificado: ${body.mobilePaymentData.referencia} por usuario ${userId}`);
      }
    }

    // Validate required fields
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'La orden debe contener al menos un producto' },
        { status: 400 }
      );
    }

    if (!body.currency || !body.total || !body.deliveryMethod) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: currency, total, deliveryMethod' },
        { status: 400 }
      );
    }

    // Get company settings for validation
    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
    });

    // Validate min/max order amounts
    if (settings) {
      const orderTotal = parseFloat(body.total);

      if (settings.minOrderAmountUSD && orderTotal < parseFloat(settings.minOrderAmountUSD.toString())) {
        return NextResponse.json(
          { error: `El monto mínimo de compra es $${settings.minOrderAmountUSD}` },
          { status: 400 }
        );
      }

      if (settings.maxOrderAmountUSD && orderTotal > parseFloat(settings.maxOrderAmountUSD.toString())) {
        return NextResponse.json(
          { error: `El monto máximo de compra es $${settings.maxOrderAmountUSD}` },
          { status: 400 }
        );
      }
    }

    // Validate stock availability for all items BEFORE creating order
    // PERFORMANCE: Batch query instead of N+1 queries
    const productIds = body.items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true, name: true, status: true, productType: true },
    });

    // Create a map for O(1) lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    const stockErrors: string[] = [];
    for (const item of body.items) {
      const product = productMap.get(item.productId);

      if (!product) {
        stockErrors.push(`Producto no encontrado: ${item.productName}`);
        continue;
      }

      if (product.status !== 'PUBLISHED') {
        stockErrors.push(`El producto "${product.name}" no está disponible`);
        continue;
      }

      // Skip stock validation for digital products - they don't have physical inventory limits
      if (product.productType === 'DIGITAL') {
        continue;
      }

      if (product.stock < item.quantity) {
        stockErrors.push(
          `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${item.quantity}`
        );
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { error: 'Problemas con el stock', details: stockErrors },
        { status: 400 }
      );
    }

    // Generate order number
    const lastOrder = await prisma.order.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });

    let orderNumber = 'ORD-2025-0001';
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.orderNumber.split('-')[2]);
      orderNumber = `ORD-2025-${String(lastNumber + 1).padStart(4, '0')}`;
    }

    // Start transaction for order creation and balance deduction
    const result = await prisma.$transaction(async (tx) => {
      // Handle Wallet Payment
      if (body.paymentMethod === 'WALLET') {
        const userBalance = await tx.userBalance.findUnique({
          where: { userId: body.userId || session.user.id },
        });

        if (!userBalance || userBalance.balance.toNumber() < body.total) {
          throw new Error('Saldo insuficiente en billetera');
        }

        // Deduct balance
        await tx.userBalance.update({
          where: { id: userBalance.id },
          data: {
            balance: { decrement: body.total },
            totalSpent: { increment: body.total },
          },
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            balanceId: userBalance.id,
            type: 'PURCHASE',
            status: 'COMPLETED',
            amount: body.total,
            currency: body.currency,
            description: `Compra Orden #${orderNumber}`,
            reference: orderNumber,
            paymentMethod: 'WALLET',
          },
        });
      }

      // Create order with items
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: body.userId || session.user.id,
          shippingAddress: body.shippingAddress || '',
          subtotalUSD: body.subtotalUSD || body.subtotal || 0,
          taxUSD: body.taxUSD || body.tax || 0,
          shippingUSD: body.shippingUSD || body.shipping || 0,
          discountUSD: body.discountUSD || body.discount || 0,
          totalUSD: body.totalUSD || body.total,
          exchangeRate: body.exchangeRate || 1,
          totalVES: body.totalVES || 0,
          exchangeRateVES: body.exchangeRateVES,
          exchangeRateEUR: body.exchangeRateEUR,
          paymentMethod: body.paymentMethod,
          // MOBILE_PAYMENT verificado se trata como pagado (verificado con BDV)
          // SEGURIDAD: Usamos serverVerifiedMobilePayment que se verificó en la BD, no el valor del cliente
          status: (body.paymentMethod === 'WALLET' || (body.paymentMethod === 'MOBILE_PAYMENT' && serverVerifiedMobilePayment))
            ? OrderStatus.PROCESSING
            : OrderStatus.PENDING,
          paymentStatus: (body.paymentMethod === 'WALLET' || (body.paymentMethod === 'MOBILE_PAYMENT' && serverVerifiedMobilePayment))
            ? 'PAID'
            : 'PENDING',
          paidAt: (body.paymentMethod === 'WALLET' || (body.paymentMethod === 'MOBILE_PAYMENT' && serverVerifiedMobilePayment))
            ? new Date()
            : null,
          trackingNumber: body.trackingNumber,
          notes: body.notes,
          items: {
            create: body.items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              productSku: item.productSku || item.sku,
              productImage: item.productImage || item.image,
              priceUSD: item.priceUSD || item.pricePerUnit || item.price,
              quantity: item.quantity,
              totalUSD: item.totalUSD || item.subtotal || (item.quantity * (item.priceUSD || item.pricePerUnit || item.price)),
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

      // STOCK LOGIC BASED ON PAYMENT METHOD:
      // - WALLET: Deduct stock immediately (payment is confirmed)
      // - MOBILE_PAYMENT (verified): Deduct stock immediately (payment verified with BDV)
      // - DIRECT (not verified): Create reservation (payment pending verification, stock not deducted yet)

      // SEGURIDAD: Usar serverVerifiedMobilePayment que se verificó en BD, no el valor del cliente
      const isPaymentConfirmed = body.paymentMethod === 'WALLET' ||
        (body.paymentMethod === 'MOBILE_PAYMENT' && serverVerifiedMobilePayment);

      if (isPaymentConfirmed) {
        // CONFIRMED PAYMENT: Deduct stock immediately since payment is confirmed
        for (const item of body.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, productType: true }
          });

          if (product && product.productType !== 'DIGITAL') {
            const newStock = product.stock - item.quantity;
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: Math.max(0, newStock) },
            });
          }
        }
      } else {
        // UNCONFIRMED PAYMENT: Create stock reservation (5 minutes while admin verifies payment)
        // Stock is NOT deducted - it will be deducted when admin confirms payment
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutos de reservación

        for (const item of body.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { productType: true }
          });

          // Only reserve physical products
          if (product && product.productType !== 'DIGITAL') {
            await tx.stockReservation.create({
              data: {
                userId: body.userId || session.user.id,
                productId: item.productId,
                quantity: item.quantity,
                expiresAt,
              },
            });
          }
        }
      }

      // Mark discounts as used
      if (body.appliedDiscountIds && body.appliedDiscountIds.length > 0) {
        await tx.discountRequest.updateMany({
          where: {
            id: { in: body.appliedDiscountIds },
            userId: body.userId || session.user.id,
            status: 'APPROVED',
          },
          data: {
            status: 'USED',
            usedAt: new Date(),
          },
        });
      }

      // SEGURIDAD: Vincular la verificación de pago móvil con la orden para prevenir reutilización
      if (serverVerifiedMobilePayment && body.mobilePaymentData?.referencia) {
        await tx.pagoMovilVerificacion.updateMany({
          where: {
            userId,
            referencia: body.mobilePaymentData.referencia,
            verificado: true,
            contexto: 'ORDER',
            orderId: null,
          },
          data: {
            orderId: order.id,
          },
        });
      }

      return order;
    });

    // Note: For DIRECT payment, reservations are NOT deleted here - they expire after 15 mins
    // or are deleted when admin confirms payment and stock is actually deducted

    // Send notifications (outside transaction to avoid failures)
    if (result) {
      // Stock notifications would go here if we extracted them

      // Create notification for new order
      // Create notification for new order
      await notifyOrderConfirmed(
        body.userId || session.user.id,
        orderNumber,
        result.id
      );

      if (body.paymentMethod === 'WALLET') {
        await createNotification({
          userId: body.userId || session.user.id,
          type: 'ORDER_PAID',
          title: 'Pago Confirmado',
          message: `El pago de tu orden #${orderNumber} ha sido confirmado con Billetera Digital.`,
          link: `/customer/orders`,
          icon: 'payment'
        });
      }

      // Send order confirmation email
      try {
        const companySettings = await prisma.companySettings.findFirst();

        const emailHtml = generateOrderConfirmationEmail({
          companyName: companySettings?.companyName || 'Electro Shop',
          companyLogo: companySettings?.logo || undefined,
          orderNumber: result.orderNumber,
          customerName: result.user?.name || 'Cliente',
          orderDate: format(new Date(result.createdAt), "d 'de' MMMM, yyyy", { locale: es }),
          items: result.items.map(item => ({
            name: item.productName || 'Producto',
            quantity: item.quantity,
            price: item.priceUSD.toString(),
          })),
          subtotal: result.subtotalUSD.toString(),
          shipping: result.shippingUSD.toString(),
          tax: result.taxUSD.toString(),
          total: result.totalUSD.toString(),
          currency: 'USD',
          paymentMethod: result.paymentMethod || 'N/A',
          deliveryMethod: 'Delivery',
          deliveryAddress: result.shippingAddress || undefined,
        });

        await sendEmail({
          to: result.user?.email || '',
          subject: `Confirmación de Pedido - ${result.orderNumber}`,
          html: emailHtml,
        });

        // If payment method is DIRECT (not WALLET), also send pending payment email
        if (body.paymentMethod !== 'WALLET' && result.user?.email) {
          try {
            await sendOrderPendingPaymentEmail(result.user.email, {
              orderNumber: result.orderNumber,
              total: Number(result.totalUSD),
              customerName: result.user.name || 'Cliente',
            });
          } catch (pendingEmailError) {
            console.error('Error sending pending payment email:', pendingEmailError);
          }
        }
      } catch (emailError) {
        console.error('Error sending order confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message || 'Error al crear orden' }, { status: 500 });
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
        }
      }

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
            console.log('[ORDER] Cancellation email sent for order:', oldOrder.orderNumber);
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


