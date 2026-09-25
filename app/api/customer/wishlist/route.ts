import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct } from '@/lib/dto/product';
import { conOfertas } from '@/lib/promotions';
import { montoDecimal } from '@/lib/pricing';

// Get user wishlist
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    // SEGURIDAD (C-102): antes devolvía el producto crudo de Prisma, con costPerItem. Ahora el DTO público con ofertas.
    const wishlist = await prisma.wishlist.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
          include: { product: { include: publicProductInclude } },
        },
      },
    });

    const visibles = wishlist.items.filter((item) => item.product.status === 'PUBLISHED');
    const conOferta = await conOfertas(visibles.map((item) => toPublicProduct(item.product)));
    const products = conOferta.map((product, i) => ({
      ...product,
      savedPriceUSD: visibles[i].priceAtSaveUSD === null ? null : Number(visibles[i].priceAtSaveUSD),
      savedAt: visibles[i].createdAt.toISOString(),
    }));

    return NextResponse.json({
      wishlist: {
        id: wishlist.id,
        userId: wishlist.userId,
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt,
      },
      products,
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add/Remove product from wishlist
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { productId, action } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Get or create wishlist
    let wishlist = await prisma.wishlist.findUnique({
      where: { userId },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: {
          userId,
        },
      });
    }

    if (action === 'add') {
      // Check if product already in wishlist
      const existingItem = await prisma.wishlistItem.findUnique({
        where: {
          wishlistId_productId: {
            wishlistId: wishlist.id,
            productId: productId,
          },
        },
      });

      if (!existingItem) {
        // Solo productos publicados (antes un id inventado daba 500 y se podían guardar borradores)
        const row = typeof productId === 'string'
          ? await prisma.product.findFirst({ where: { id: productId, status: 'PUBLISHED' }, include: publicProductInclude })
          : null;
        if (!row) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        const [actual] = await conOfertas([toPublicProduct(row)]);
        await prisma.wishlistItem.create({
          data: {
            wishlistId: wishlist.id,
            productId,
            priceAtSaveUSD: montoDecimal(actual.priceUSD),
          },
        });
      }
    } else if (action === 'remove') {
      // Remove product from wishlist
      await prisma.wishlistItem.deleteMany({
        where: {
          wishlistId: wishlist.id,
          productId: productId,
        },
      });
    }

    // Get updated wishlist with items
    const updatedWishlist = await prisma.wishlist.findUnique({
      where: { id: wishlist.id },
      include: {
        items: true,
      },
    });

    const inWishlist = updatedWishlist?.items.some(item => item.productId === productId) || false;

    return NextResponse.json({
      success: true,
      wishlist: {
        id: updatedWishlist?.id,
        userId: updatedWishlist?.userId,
        itemCount: updatedWishlist?.items.length || 0,
      },
      inWishlist,
    });
  } catch (error) {
    console.error('Error updating wishlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
