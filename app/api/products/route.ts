import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // GET is public, but we might use session for user-specific logic later
    // if (!session) {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: any = {
      OR: search ? [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ] : undefined,
    };

    if (category && category !== 'all') {
      where.categoryId = category;
    }

    if (status === 'published') {
      where.status = 'PUBLISHED';
    } else if (status === 'draft') {
      where.status = 'DRAFT';
    } else if (status === 'out-of-stock') {
      where.stock = 0;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any).permissions?.includes('MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.sku || !body.categoryId || body.priceUSD === undefined) {
      return NextResponse.json({
        error: 'Campos requeridos: name, sku, categoryId, priceUSD'
      }, { status: 400 });
    }

    // Generate slug from name if not provided
    const slug = body.slug || body.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if SKU already exists
    const existingSku = await prisma.product.findUnique({
      where: { sku: body.sku },
    });

    if (existingSku) {
      return NextResponse.json({ error: 'El SKU ya existe' }, { status: 400 });
    }

    // Check if slug already exists and append random string if so
    let finalSlug = slug;
    let existingSlug = await prisma.product.findUnique({
      where: { slug: finalSlug },
    });

    if (existingSlug) {
      finalSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 });
    }

    const stock = parseInt(body.stock) || 0;
    const priceUSD = parseFloat(body.priceUSD);

    // Validar y procesar imágenes
    let imagesToSave = '[]';
    if (body.images) {
      if (typeof body.images === 'string') {
        imagesToSave = body.images;
      } else if (Array.isArray(body.images)) {
        imagesToSave = JSON.stringify(body.images);
      }
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        sku: body.sku,
        slug,
        description: body.description || '',
        priceUSD,
        stock,
        categoryId: body.categoryId,
        brandId: body.brandId || null,
        images: imagesToSave,
        specs: body.specifications ? JSON.stringify(body.specifications) : null,
        status: body.isActive ? 'PUBLISHED' : 'DRAFT',
        isFeatured: body.isFeatured || false,
      },
    });

    // Notifications logic removed as NotificationTemplates is not defined
    // TODO: Implement proper admin notifications

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);

    // Handle Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json({
        error: 'Ya existe un producto con este SKU o slug'
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Error al crear producto',
      details: error.message
    }, { status: 500 });
  }
}

// PATCH - Update product
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any).permissions?.includes('MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const body = await request.json();
    const oldProduct = await prisma.product.findUnique({ where: { id } });

    if (!oldProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Validar imágenes si se están actualizando
    if (body.images && Array.isArray(body.images) && body.images.length > 4) {
      return NextResponse.json({
        error: 'Máximo 4 imágenes permitidas por producto'
      }, { status: 400 });
    }

    const newStock = body.stock !== undefined ? parseInt(body.stock) : oldProduct.stock;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...body,
        priceUSD: body.priceUSD ? parseFloat(body.priceUSD) : undefined,
        stock: body.stock !== undefined ? newStock : undefined,
      },
    });

    // Notifications logic removed as NotificationTemplates is not defined
    // TODO: Implement proper admin notifications

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

