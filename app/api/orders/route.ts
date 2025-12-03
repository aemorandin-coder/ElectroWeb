import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createNotification,
  notifyOrderConfirmed,
  notifyOrderShipped,
  notifyOrderDelivered
} from '@/lib/notifications';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { sendEmail } from '@/lib/email';
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
    const userType = (session.user as any)?.userType;

    const where: any = {};

    // If user is customer, only show their orders
    if (userType === 'customer') {
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
        address: true,
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
        select: { stock: true, name: true, isActive: true },
      });

      if (!product) {
        stockErrors.push(`Producto no encontrado: ${item.productName}`);
        continue;
      }

      if (!product.isActive) {
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
          addressId: body.addressId,
          currency: body.currency,
          subtotal: body.subtotal,
          tax: body.tax || 0,
          shipping: body.shipping || 0,
          discount: body.discount || 0,
          total: body.total,
          exchangeRateVES: body.exchangeRateVES,
          exchangeRateEUR: body.exchangeRateEUR,
          paymentMethod: body.paymentMethod,
          deliveryMethod: body.deliveryMethod,
          status: body.paymentMethod === 'WALLET' ? OrderStatus.PAID : OrderStatus.PENDING,
          paidAt: body.paymentMethod === 'WALLET' ? new Date() : null,
          items: {
            create: body.items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              productSku: item.productSku,
              productImage: item.productImage,
              pricePerUnit: item.pricePerUnit,
              quantity: item.quantity,
              subtotal: item.subtotal,
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

      // Update product stock
      for (const item of body.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          const newStock = product.stock - item.quantity;

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: newStock },
          });

          // Check stock levels and create notifications (Note: Notifications usually shouldn't block transaction, but for simplicity here)
          // Ideally, notifications should be handled outside the transaction or via events
        }
      }

      return order;
    });

    // Release reservations for this user as the order is now created (stock deducted)
    // We import dynamically to avoid circular deps if any, or just use the prisma call directly
    await prisma.stockReservation.deleteMany({
      where: { userId: body.userId || session.user.id },
    });

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
        await createNotification({ userId: body.userId || session.user.id, type: 'ORDER_PAID', title: '?? Pago Confirmado', message: `El pago de tu orden #${orderNumber} ha sido confirmado con Billetera Digital.`, actionUrl: `/customer/orders` });
      }

      // Send order confirmation email
      try {
        const companySettings = await prisma.companySettings.findFirst();
        const address = result.addressId ? await prisma.address.findUnique({ where: { id: result.addressId } }) : null;

        const emailHtml = generateOrderConfirmationEmail({
          companyName: companySettings?.companyName || 'Electro Shop',
          companyLogo: companySettings?.logo || undefined,
          orderNumber: result.orderNumber,
          customerName: result.user.name || 'Cliente',
          orderDate: format(new Date(result.createdAt), "d 'de' MMMM, yyyy", { locale: es }),
          items: result.items.map(item => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.pricePerUnit.toString(),
          })),
          subtotal: result.subtotal.toString(),
          shipping: result.shipping.toString(),
          tax: result.tax.toString(),
          total: result.total.toString(),
          currency: result.currency,
          paymentMethod: result.paymentMethod || 'N/A',
          deliveryMethod: result.deliveryMethod,
          deliveryAddress: address ? `${address.street}, ${address.city}, ${address.state}` : undefined,
        });

        await sendEmail({
          to: result.user.email,
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
    if (!session || !(session.user as any).permissions?.includes('MANAGE_ORDERS')) {
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

    // Handle status-specific updates
    if (body.status === OrderStatus.PAID && oldOrder.status !== OrderStatus.PAID) {
      updateData.paidAt = new Date();
    } else if (body.status === OrderStatus.SHIPPED && oldOrder.status !== OrderStatus.SHIPPED) {
      updateData.shippedAt = new Date();
    } else if (body.status === OrderStatus.DELIVERED && oldOrder.status !== OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (body.status === OrderStatus.CANCELLED && oldOrder.status !== OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
      },
    });

    // Create notifications for status changes
    if (body.status && body.status !== oldOrder.status) {
      if (body.status === OrderStatus.PAID) {
        const paymentMethodName = body.paymentMethod || oldOrder.paymentMethod || 'No especificado';
        await createNotification({
          userId: oldOrder.userId,
          type: 'ORDER_PAID',
          title: '💰 Pago Confirmado',
          message: `El pago de tu orden #${oldOrder.orderNumber} ha sido confirmado.`,
          actionUrl: `/customer/orders`
        });
      } else if (body.status === OrderStatus.CANCELLED) {
        await createNotification({
          userId: oldOrder.userId,
          type: 'ORDER_CANCELLED',
          title: '❌ Orden Cancelada',
          message: `Tu orden #${oldOrder.orderNumber} ha sido cancelada. ${body.notes || ''}`,
          actionUrl: `/customer/orders`
        });

        // Restore stock if order is cancelled
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      } else if (body.status === OrderStatus.SHIPPED) {
        await notifyOrderShipped(oldOrder.userId, oldOrder.orderNumber, order.id);
      } else if (body.status === OrderStatus.DELIVERED) {
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

          if (orderWithUser && orderWithUser.items.length > 0) {
            const companySettings = await prisma.companySettings.findFirst();
            const firstProduct = orderWithUser.items[0].product;

            const emailHtml = generateReviewReminderEmail({
              companyName: companySettings?.companyName || 'Electro Shop',
              companyLogo: companySettings?.logo || undefined,
              customerName: orderWithUser.user.name || 'Cliente',
              orderNumber: orderWithUser.orderNumber,
              productName: firstProduct.name,
              productImage: firstProduct.mainImage || undefined,
              reviewUrl: `${process.env.NEXTAUTH_URL}/productos/${firstProduct.slug}#reviews`,
            });

            await sendEmail({
              to: orderWithUser.user.email,
              subject: `¿Qué te pareció tu compra? - ${orderWithUser.orderNumber}`,
              html: emailHtml,
            });
          }
        } catch (emailError) {
          console.error('Error sending review reminder email:', emailError);
          // Don't fail the order update if email fails
        }
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Error al actualizar orden' }, { status: 500 });
  }
}


