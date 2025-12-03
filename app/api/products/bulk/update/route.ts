import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// POST /api/products/bulk/update - Bulk update products
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { productIds, field, value, updates } = body;

        // MODE 1: Individual Updates (Excel Mode)
        if (updates && Array.isArray(updates)) {
            try {
                const results = await prisma.$transaction(
                    updates.map((update: any) => {
                        const data: any = {};
                        if (update.priceUSD !== undefined) data.priceUSD = parseFloat(update.priceUSD);
                        if (update.stock !== undefined) data.stock = parseInt(update.stock);
                        if (update.categoryId !== undefined) data.categoryId = update.categoryId;
                        if (update.status !== undefined) data.status = update.status;

                        return prisma.product.update({
                            where: { id: update.id },
                            data: data
                        });
                    })
                );

                return NextResponse.json({
                    message: `${results.length} productos actualizados exitosamente`,
                    count: results.length,
                });
            } catch (error) {
                console.error('Transaction error:', error);
                throw error;
            }
        }

        // MODE 2: Uniform Update (Original functionality)
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json(
                { error: 'Se requiere al menos un producto' },
                { status: 400 }
            );
        }

        if (!field || value === undefined || value === null || value === '') {
            return NextResponse.json(
                { error: 'Campo y valor son requeridos' },
                { status: 400 }
            );
        }

        // Validate field
        const validFields = ['price', 'stock', 'category', 'status'];
        if (!validFields.includes(field)) {
            return NextResponse.json(
                { error: 'Campo inválido' },
                { status: 400 }
            );
        }

        // Build update data based on field
        let updateData: any = {};

        if (field === 'price') {
            const priceValue = parseFloat(value);
            if (isNaN(priceValue) || priceValue < 0) {
                return NextResponse.json(
                    { error: 'Precio inválido' },
                    { status: 400 }
                );
            }
            updateData.priceUSD = priceValue;
        } else if (field === 'stock') {
            const stockValue = parseInt(value);
            if (isNaN(stockValue) || stockValue < 0) {
                return NextResponse.json(
                    { error: 'Stock inválido' },
                    { status: 400 }
                );
            }
            updateData.stock = stockValue;
        } else if (field === 'category') {
            // Validate category exists
            const category = await prisma.category.findUnique({
                where: { id: value },
            });
            if (!category) {
                return NextResponse.json(
                    { error: 'Categoría no encontrada' },
                    { status: 404 }
                );
            }
            updateData.categoryId = value;
        } else if (field === 'status') {
            updateData.status = value; // PUBLISHED or DRAFT
        }

        // Perform bulk update
        const result = await prisma.product.updateMany({
            where: {
                id: {
                    in: productIds,
                },
            },
            data: updateData,
        });

        return NextResponse.json({
            message: `${result.count} productos actualizados exitosamente`,
            count: result.count,
        });
    } catch (error: any) {
        console.error('Error bulk updating products:', error);
        return NextResponse.json(
            { error: 'Error al actualizar productos' },
            { status: 500 }
        );
    }
}
