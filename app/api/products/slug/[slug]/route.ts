import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const product = await prisma.product.findFirst({
      where: {
        slug,
        status: 'PUBLISHED'
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Convert Decimal fields to Number for proper JSON serialization
    const formattedProduct = {
      ...product,
      priceUSD: Number(product.priceUSD),
      priceVES: product.priceVES ? Number(product.priceVES) : null,
      weightKg: product.weightKg ? Number(product.weightKg) : null,
      shippingCost: product.shippingCost ? Number(product.shippingCost) : null,
    };

    return NextResponse.json(formattedProduct);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Error al obtener el producto' },
      { status: 500 }
    );
  }
}
