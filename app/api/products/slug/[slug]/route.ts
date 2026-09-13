import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct } from '@/lib/dto/product';

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
      include: publicProductInclude,
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // SEGURIDAD: solo campos públicos del DTO (sin costos internos)
    return NextResponse.json(toPublicProduct(product));
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Error al obtener el producto' },
      { status: 500 }
    );
  }
}
