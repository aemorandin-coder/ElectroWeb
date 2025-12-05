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

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Error al obtener el producto' },
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
      } else {
        updateData.images = body.images;
      }
    }

    // Handle specs: map specifications -> specs and stringify
    if (body.specifications !== undefined) {
      updateData.specs = JSON.stringify(body.specifications);
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

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    return NextResponse.json(product);
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

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Error al eliminar el producto' }, { status: 500 });
  }
}
