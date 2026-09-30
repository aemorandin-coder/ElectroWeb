import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { isAuthorized } from '@/lib/auth-helpers';
import { digitalVariantsInputSchema, minActivePrice, syncDigitalVariants, type DigitalVariantInput } from '@/lib/digital-variants';
import { generateShortCode } from '@/lib/short-code';
import { parseDigitalMargin, specsForUpdate } from '@/lib/product-specs';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { conditionInputSchema, pickConditionInput } from '@/lib/product-condition';
import { precioValido } from '@/lib/pricing';

/** specs de un producto nuevo: especificaciones del formulario y, en digitales, el margen del wizard (C-95). */
function createSpecs(specifications: unknown, digitalMarginPercent: number | undefined): string | null {
  const specs = specsForUpdate(null, { specifications, digitalMarginPercent });
  return Object.keys(specs).length > 0 ? JSON.stringify(specs) : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // SEGURIDAD: listado interno (borradores y costo). La tienda usa /api/products/public.
    const canManageProducts = isAuthorized(session, 'MANAGE_PRODUCTS');
    if (!canManageProducts && !isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // PERFORMANCE: Pagination support
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const all = searchParams.get('all') === 'true'; // For admin panel that needs all products
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
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
        // C-51: la lista marca "desde" y no deja editar el precio de los digitales con montos
        _count: { select: { digitalVariants: { where: { isActive: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      // Only apply pagination if not requesting all
      ...(all ? {} : { take: limit, skip }),
    });

    const safeNum = (v: unknown) => v != null ? Number(v) : null;
    const formattedProducts = products.map(p => ({
      ...p,
      priceUSD: safeNum(p.priceUSD) ?? 0,
      priceVES: safeNum(p.priceVES),
      compareAtPriceUSD: safeNum(p.compareAtPriceUSD),
      // Marketing (MANAGE_CONTENT) no necesita el costo interno
      costPerItem: canManageProducts ? safeNum(p.costPerItem) : null,
      weightKg: safeNum(p.weightKg),
      shippingCost: safeNum(p.shippingCost),
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
    // En digitales el precio sale de las variantes (C-60)
    if (!body.name || !body.sku || !body.categoryId || (body.productType !== 'DIGITAL' && body.priceUSD === undefined)) {
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
    const existingSlug = await prisma.product.findUnique({
      where: { slug: finalSlug },
    });

    if (existingSlug) {
      finalSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    // Código del enlace corto /p/<código> (C-27)
    const shortCode = await generateShortCode(prisma);

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 });
    }

    // Variantes digitales (C-60): se validan antes de crear nada
    let variants: DigitalVariantInput[] = [];
    if (body.productType === 'DIGITAL') {
      const parsed = digitalVariantsInputSchema.safeParse(body.digitalVariants ?? []);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Montos digitales inválidos' }, { status: 400 });
      }
      variants = parsed.data;
    }

    // C-119: condición (nuevo, caja abierta, reacondicionado o usado). Los digitales siempre son nuevos
    const conditionParsed = conditionInputSchema.safeParse(body.productType === 'DIGITAL' ? {} : pickConditionInput(body) ?? {});
    if (!conditionParsed.success) {
      return NextResponse.json({ error: conditionParsed.error.issues[0]?.message || 'Condición inválida' }, { status: 400 });
    }

    // C-134: las mismas reglas que al editar (PATCH). Antes el alta aceptaba precio negativo, "abc" como stock
    // (quedaba 0), cualquier estado (500 de Prisma) y más de 8 fotos
    const stockLeido = body.stock === undefined || body.stock === '' ? 0 : Number(body.stock);
    if (!Number.isInteger(stockLeido) || stockLeido < 0 || stockLeido > 1_000_000) {
      return NextResponse.json({ error: 'Stock inválido: un número entero de 0 a 1.000.000' }, { status: 400 });
    }
    const stock = stockLeido;
    const precioFisico = body.productType === 'DIGITAL' ? null : precioValido(body.priceUSD);
    if (body.productType !== 'DIGITAL' && !(precioFisico !== null && precioFisico > 0)) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
    }
    const priceUSD = body.productType === 'DIGITAL' ? minActivePrice(variants) : (precioFisico as number);
    const tachado = body.compareAtPriceUSD ? precioValido(body.compareAtPriceUSD) : null;
    if (body.compareAtPriceUSD && tachado === null) {
      return NextResponse.json({ error: 'Precio anterior inválido' }, { status: 400 });
    }
    if (body.status !== undefined && !['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

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

    if (imageArray.length > 8) {
      return NextResponse.json({ error: 'Máximo 8 imágenes permitidas por producto' }, { status: 400 });
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
      data: {
        name: body.name,
        sku: body.sku,
        slug: finalSlug,
        shortCode,
        description: body.description || '',
        priceUSD,
        compareAtPriceUSD: tachado,
        costPerItem: body.costPerItem ? parseFloat(body.costPerItem) : null,
        stock,
        minStock: parseInt(body.minStock) || 0,
        barcode: body.barcode || null,
        tags: body.tags && Array.isArray(body.tags) ? JSON.stringify(body.tags) : null,
        categoryId: body.categoryId,
        brandId: body.brandId || null,
        images: JSON.stringify(imageArray),
        mainImage: imageArray.length > 0 ? imageArray[0] : null,
        specs: createSpecs(body.specifications, body.productType === 'DIGITAL' ? parseDigitalMargin(body.digitalMarginPercent) : undefined),
        features: body.features ? JSON.stringify(body.features) : null,
        status: body.status || (body.isActive ? 'PUBLISHED' : 'DRAFT'),
        isFeatured: body.isFeatured || false,
        // SEO Fields
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        seoImage: body.seoImage || null,
        // Digital Product Fields
        productType: body.productType || 'PHYSICAL',
        digitalPlatform: body.productType === 'DIGITAL' ? body.digitalPlatform : null,
        digitalRegion: body.productType === 'DIGITAL' ? body.digitalRegion : null,
        deliveryMethod: body.productType === 'DIGITAL' ? (body.deliveryMethod || 'MANUAL') : null,
        redemptionInstructions: body.productType === 'DIGITAL' ? (body.redemptionInstructions || null) : null,
        accountFieldLabel: body.productType === 'DIGITAL' && body.accountFieldLabel ? String(body.accountFieldLabel).slice(0, 80) : null,
        accountFieldHint: body.productType === 'DIGITAL' && body.accountFieldHint ? String(body.accountFieldHint).slice(0, 160) : null,
        // Shipping Fields (only for PHYSICAL products)
        weightKg: body.productType === 'PHYSICAL' ? (body.weightKg || 0) : null,
        dimensions: body.productType === 'PHYSICAL' ? (body.dimensions || null) : null,
        isConsolidable: body.productType === 'PHYSICAL' ? (body.isConsolidable !== false) : false,
        shippingCost: body.productType === 'PHYSICAL' && !body.isConsolidable ? (body.shippingCost || 0) : 0,
        // C-100: la tienda paga el envío de este producto (solo físicos)
        freeShipping: body.productType === 'PHYSICAL' && body.freeShipping === true,
        ...conditionParsed.data,
      },
      });
      if (variants.length > 0) await syncDigitalVariants(tx, created.id, variants);
      return created;
    });

    revalidateStorefront();

    // Notifications logic removed as NotificationTemplates is not defined
    // TODO: Implement proper admin notifications

    return NextResponse.json(product, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
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

// PATCH ?id= se quitó en C-51: solo lo usaba el botón de estado de la lista, que no funcionaba (mandaba isActive,
// que no estaba en su lista blanca). La lista usa PATCH /api/products/[id], que valida y registra los precios.
