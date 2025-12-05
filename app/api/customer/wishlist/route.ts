import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get user wishlist
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get or create wishlist with items
    let wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: {
          userId,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });
    }

    // Extract products from wishlist items
    const products = wishlist.items.map(item => item.product);

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

    const userId = (session.user as any).id;
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
        await prisma.wishlistItem.create({
          data: {
            wishlistId: wishlist.id,
            productId: productId,
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
