import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';
import { createNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // GET is public, but we might use session for user-specific logic later

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // PERFORMANCE: Pagination support
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const all = searchParams.get('all') === 'true'; // For admin panel that needs all products
    const skip = (page - 1) * limit;

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

    // Count total for pagination metadata
    const total = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
      // Only apply pagination if not requesting all
      ...(all ? {} : { take: limit, skip }),
    });

    // Convert Decimal fields to Number for proper JSON serialization
    const formattedProducts = products.map(p => ({
      ...p,
      priceUSD: Number(p.priceUSD),
      priceVES: p.priceVES ? Number(p.priceVES) : null,
      weightKg: p.weightKg ? Number(p.weightKg) : null,
      shippingCost: p.shippingCost ? Number(p.shippingCost) : null,
    }));

    // BACKWARD COMPATIBILITY: Return array directly when all=true (for admin panel)
    // New paginated format otherwise
    if (all) {
      return NextResponse.json(formattedProducts);
    }

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
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
    let imageArray: string[] = [];
    if (body.images) {
      if (typeof body.images === 'string') {
        try {
          imageArray = JSON.parse(body.images);
        } catch {
          imageArray = [];
        }
      } else if (Array.isArray(body.images)) {
        imageArray = body.images;
      }
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        sku: body.sku,
        slug: finalSlug,
        description: body.description || '',
        priceUSD,
        stock,
        minStock: parseInt(body.minStock) || 0,
        categoryId: body.categoryId,
        brandId: body.brandId || null,
        images: JSON.stringify(imageArray),
        mainImage: imageArray.length > 0 ? imageArray[0] : null,
        specs: body.specifications ? JSON.stringify(body.specifications) : null,
        features: body.features ? JSON.stringify(body.features) : null,
        status: body.status || (body.isActive ? 'PUBLISHED' : 'DRAFT'),
        isFeatured: body.isFeatured || false,
        // Digital Product Fields
        productType: body.productType || 'PHYSICAL',
        digitalPlatform: body.productType === 'DIGITAL' ? body.digitalPlatform : null,
        digitalRegion: body.productType === 'DIGITAL' ? body.digitalRegion : null,
        deliveryMethod: body.productType === 'DIGITAL' ? (body.deliveryMethod || 'MANUAL') : null,
        // Shipping Fields (only for PHYSICAL products)
        weightKg: body.productType === 'PHYSICAL' ? (body.weightKg || 0) : null,
        dimensions: body.productType === 'PHYSICAL' ? (body.dimensions || null) : null,
        isConsolidable: body.productType === 'PHYSICAL' ? (body.isConsolidable !== false) : false,
        shippingCost: body.productType === 'PHYSICAL' && !body.isConsolidable ? (body.shippingCost || 0) : 0,
      },
    });

    // Si es producto digital con precios por denominación, guardarlos en specs
    if (body.productType === 'DIGITAL' && body.digitalPricing && Array.isArray(body.digitalPricing)) {
      // Guardamos la configuración de precios digitales en el campo specs
      const digitalSpecs = {
        digitalPricing: body.digitalPricing,
        ...body.specifications
      };
      await prisma.product.update({
        where: { id: product.id },
        data: {
          specs: JSON.stringify(digitalSpecs)
        }
      });
    }

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
    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
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

    // SECURITY: Whitelist of allowed fields to prevent mass assignment
    const allowedFields = [
      'name', 'description', 'sku', 'slug', 'priceUSD', 'priceVES',
      'stock', 'minStock', 'categoryId', 'brandId', 'images', 'mainImage',
      'specs', 'features', 'status', 'isFeatured', 'productType',
      'digitalPlatform', 'digitalRegion', 'deliveryMethod',
      'weightKg', 'dimensions', 'isConsolidable', 'shippingCost', 'tags'
    ];

    // Filter body to only include allowed fields
    const filteredData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        filteredData[field] = body[field];
      }
    }

    // Parse numeric fields safely
    if (filteredData.priceUSD !== undefined) {
      filteredData.priceUSD = parseFloat(filteredData.priceUSD);
      if (isNaN(filteredData.priceUSD) || filteredData.priceUSD < 0) {
        return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
      }
    }

    if (filteredData.stock !== undefined) {
      filteredData.stock = parseInt(filteredData.stock);
      if (isNaN(filteredData.stock) || filteredData.stock < 0) {
        return NextResponse.json({ error: 'Stock inválido' }, { status: 400 });
      }
    }

    if (filteredData.minStock !== undefined) {
      filteredData.minStock = parseInt(filteredData.minStock);
      if (isNaN(filteredData.minStock) || filteredData.minStock < 0) {
        filteredData.minStock = 0;
      }
    }

    // Validate status if provided
    if (filteredData.status && !['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(filteredData.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: filteredData,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

