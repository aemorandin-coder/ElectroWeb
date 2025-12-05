import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/customer/orders - Get all orders for the authenticated customer
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get all orders for the user with their items
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          select: {
            id: true,
            quantity: true,
            priceUSD: true,
            productName: true,
            productImage: true,
            product: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format orders for the frontend
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.totalUSD),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map(item => {
        let imageUrl = item.productImage || null;

        // Safely parse images JSON
        if (!imageUrl && item.product.images) {
          try {
            const images = JSON.parse(item.product.images);
            imageUrl = Array.isArray(images) && images.length > 0 ? images[0] : null;
          } catch (e) {
            console.error('Error parsing product images:', e);
            imageUrl = null;
          }
        }

        return {
          id: item.id,
          productName: item.productName || item.product.name,
          quantity: item.quantity,
          price: Number(item.priceUSD),
          imageUrl,
        };
      }),
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Error al obtener los pedidos' }, { status: 500 });
  }
}
