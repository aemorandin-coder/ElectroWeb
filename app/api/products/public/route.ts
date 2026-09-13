import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publicProductInclude, toPublicProduct } from '@/lib/dto/product';

// GET /api/products/public - Get all active products (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = searchParams.get('limit');
    const featured = searchParams.get('featured');

    const where: any = {
      status: 'PUBLISHED', // Only show published products
    };

    if (category && category !== 'all') {
      where.categoryId = category;
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    const take = limit ? Math.min(100, Math.max(1, parseInt(limit) || 1)) : undefined;

    const products = await prisma.product.findMany({
      where,
      include: publicProductInclude,
      orderBy: { createdAt: 'desc' },
      take,
    });

    // SEGURIDAD: solo campos públicos del DTO (sin costos internos)
    return NextResponse.json(products.map(toPublicProduct));
  } catch (error) {
    console.error('Error fetching public products:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}
