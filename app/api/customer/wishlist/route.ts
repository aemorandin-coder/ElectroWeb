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

    // Get or create wishlist
    let wishlist = await prisma.wishlist.findUnique({
      where: { userId },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: {
          userId,
          productIds: [],
        },
      });
    }

    // Fetch product details
    const products = await prisma.product.findMany({
      where: {
        id: { in: wishlist.productIds },
        isActive: true,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      wishlist,
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
          productIds: [],
        },
      });
    }

    let productIds = [...wishlist.productIds];

    if (action === 'add') {
      // Add product if not already in wishlist
      if (!productIds.includes(productId)) {
        productIds.push(productId);
      }
    } else if (action === 'remove') {
      // Remove product
      productIds = productIds.filter(id => id !== productId);
    }

    // Update wishlist
    const updatedWishlist = await prisma.wishlist.update({
      where: { id: wishlist.id },
      data: { productIds },
    });

    return NextResponse.json({
      success: true,
      wishlist: updatedWishlist,
      inWishlist: productIds.includes(productId),
    });
  } catch (error) {
    console.error('Error updating wishlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
