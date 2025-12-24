import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

// GET /api/products/[id] - Get a single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID de producto inválido' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
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

    // Safely convert Decimal fields to Number for proper JSON serialization
    const safeNumber = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const formattedProduct = {
      ...product,
      priceUSD: safeNumber(product.priceUSD) ?? 0,
      priceVES: safeNumber(product.priceVES),
      weightKg: safeNumber(product.weightKg),
      shippingCost: safeNumber(product.shippingCost),
    };

    return NextResponse.json(formattedProduct);
  } catch (error: any) {
    console.error('Error fetching product:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2023') {
      return NextResponse.json(
        { error: 'ID de producto inválido' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al obtener el producto', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/products/[id] - Update a product (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const oldProduct = await prisma.product.findUnique({ where: { id } });

    if (!oldProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Validar imágenes si se están actualizando
    if (body.images && Array.isArray(body.images) && body.images.length > 8) {
      return NextResponse.json({
        error: 'Máximo 8 imágenes permitidas por producto'
      }, { status: 400 });
    }

    const updateData: any = {};

    // Only update fields that are provided and exist in schema
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priceUSD !== undefined) updateData.priceUSD = parseFloat(body.priceUSD);
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock);
    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;

    // Handle images: convert array to JSON string
    if (body.images !== undefined) {
      if (Array.isArray(body.images)) {
        updateData.images = JSON.stringify(body.images);
        // Also update mainImage to the first image
        if (body.images.length > 0) {
          updateData.mainImage = body.images[0];
        }
      } else {
        updateData.images = body.images;
      }
    }

    // Handle specs: map specifications -> specs and stringify
    // For digital products, include digitalPricing in specs
    if (body.specifications !== undefined || body.digitalPricing !== undefined) {
      const specsToSave: Record<string, any> = {};

      // Add regular specifications
      if (body.specifications && typeof body.specifications === 'object') {
        Object.assign(specsToSave, body.specifications);
      }

      // Add digitalPricing for digital products
      if (body.digitalPricing && Array.isArray(body.digitalPricing)) {
        specsToSave.digitalPricing = body.digitalPricing;
      }

      updateData.specs = JSON.stringify(specsToSave);
    } else if (body.specs !== undefined) {
      // Fallback if sent as specs
      updateData.specs = typeof body.specs === 'string' ? body.specs : JSON.stringify(body.specs);
    }

    // Handle status: map isActive -> status
    if (body.isActive !== undefined) {
      updateData.status = body.isActive ? 'PUBLISHED' : 'DRAFT';
    } else if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;

    // Fields that might not exist in current schema or need specific handling
    if (body.brandId !== undefined) updateData.brandId = body.brandId;

    // Digital Product Fields
    if (body.productType !== undefined) updateData.productType = body.productType;
    if (body.digitalPlatform !== undefined) updateData.digitalPlatform = body.digitalPlatform;
    if (body.digitalRegion !== undefined) updateData.digitalRegion = body.digitalRegion;
    if (body.deliveryMethod !== undefined) updateData.deliveryMethod = body.deliveryMethod;
    if (body.redemptionInstructions !== undefined) updateData.redemptionInstructions = body.redemptionInstructions;

    // Shipping Fields (for PHYSICAL products)
    if (body.weightKg !== undefined) updateData.weightKg = body.weightKg !== null ? parseFloat(body.weightKg) : null;
    if (body.dimensions !== undefined) updateData.dimensions = body.dimensions;
    if (body.isConsolidable !== undefined) updateData.isConsolidable = body.isConsolidable;
    if (body.shippingCost !== undefined) updateData.shippingCost = body.shippingCost !== null ? parseFloat(body.shippingCost) : null;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    // Convert Decimal fields to Number for proper JSON serialization
    const formattedProduct = {
      ...product,
      priceUSD: Number(product.priceUSD),
      priceVES: product.priceVES ? Number(product.priceVES) : null,
      weightKg: product.weightKg ? Number(product.weightKg) : null,
      shippingCost: product.shippingCost ? Number(product.shippingCost) : null,
    };

    return NextResponse.json(formattedProduct);
  } catch (error: any) {
    console.error('Error updating product:', error);

    if (error.code === 'P2002') {
      return NextResponse.json({
        error: 'Ya existe un producto con este SKU'
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Error al actualizar producto',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete a product (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;

    // Check if product exists and get relations
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: { select: { id: true }, take: 1 },
        reviews: { select: { id: true } },
        reservations: { select: { id: true } },
        wishlistItems: { select: { id: true } },
        digitalCodes: { select: { id: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Check if product has orders - we can't delete if it has order history
    if (product.orderItems && product.orderItems.length > 0) {
      // Instead of deleting, archive the product
      await prisma.product.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });
      return NextResponse.json({
        message: 'El producto tiene órdenes asociadas. Ha sido archivado en lugar de eliminado.',
        archived: true
      });
    }

    // Delete related records that don't have critical data
    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete reviews
      if (product.reviews && product.reviews.length > 0) {
        await tx.review.deleteMany({ where: { productId: id } });
      }

      // Delete stock reservations
      if (product.reservations && product.reservations.length > 0) {
        await tx.stockReservation.deleteMany({ where: { productId: id } });
      }

      // Delete wishlist items
      if (product.wishlistItems && product.wishlistItems.length > 0) {
        await tx.wishlistItem.deleteMany({ where: { productId: id } });
      }

      // Delete digital codes (only if not sold/delivered)
      if (product.digitalCodes && product.digitalCodes.length > 0) {
        await tx.digitalCode.deleteMany({
          where: {
            productId: id,
            status: { in: ['AVAILABLE', 'RESERVED', 'EXPIRED', 'INVALID'] }
          }
        });
      }

      // Now delete the product
      await tx.product.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Producto eliminado correctamente' });
  } catch (error: any) {
    console.error('Error deleting product:', error);

    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return NextResponse.json({
        error: 'No se puede eliminar el producto porque tiene datos relacionados. Intenta archivarlo.',
        details: 'El producto tiene registros asociados que no pueden ser eliminados.'
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Error al eliminar el producto',
      details: error.message
    }, { status: 500 });
  }
}
