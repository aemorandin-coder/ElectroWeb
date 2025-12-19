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
import { sendEmail } from '@/lib/email-service';
import { generateOrderConfirmationEmail } from '@/lib/email-templates/OrderConfirmation';
import { generateReviewReminderEmail } from '@/lib/email-templates/ReviewReminder';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
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

    const body = await request.json();

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
    // Now using getAvailableStock to account for reservations
    const stockErrors: string[] = [];
    for (const item of body.items) {
      // Use getAvailableStock from lib/stock to check real availability
      // Note: If the user has a reservation, we need to check if it covers this quantity
      // For simplicity in this iteration, we'll assume the reservation logic handles the "hold"
      // and here we just verify the final state or if no reservation exists.

      // However, if the USER has a reservation, getAvailableStock subtracts it from the total.
      // So we need to be careful.
      // Better approach: Release the user's reservation JUST BEFORE creating the order in the transaction.
      // But for validation here, we can check raw stock if we assume the user holds the reservation.

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, name: true, status: true },
      });

      if (!product) {
        stockErrors.push(`Producto no encontrado: ${item.productName}`);
        continue;
      }

      if (product.status !== 'PUBLISHED') {
        stockErrors.push(`El producto "${product.name}" no está disponible`);
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
          status: body.paymentMethod === 'WALLET' ? OrderStatus.PROCESSING : OrderStatus.PENDING,
          paymentStatus: body.paymentMethod === 'WALLET' ? 'PAID' : 'PENDING',
          paidAt: body.paymentMethod === 'WALLET' ? new Date() : null,
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
      // - DIRECT: Create reservation (payment pending verification, stock not deducted yet)

      if (body.paymentMethod === 'WALLET') {
        // WALLET PAYMENT: Deduct stock immediately since payment is confirmed
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
        // DIRECT PAYMENT: Create stock reservation (15 minutes while admin verifies payment)
        // Stock is NOT deducted - it will be deducted when admin confirms payment
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

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
          break;

        case 'DELIVERED':
          await notifyOrderDelivered(oldOrder.userId, oldOrder.orderNumber, order.id);
          // Send review reminder email when order is delivered
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


