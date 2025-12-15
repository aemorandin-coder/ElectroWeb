import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get digital codes for a product (admin only)
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');
        const status = searchParams.get('status');

        const where: any = {};
        if (productId) where.productId = productId;
        if (status) where.status = status;

        const codes = await prisma.digitalCode.findMany({
            where,
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        digitalPlatform: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Stats
        const stats = {
            total: codes.length,
            available: codes.filter(c => c.status === 'AVAILABLE').length,
            reserved: codes.filter(c => c.status === 'RESERVED').length,
            sold: codes.filter(c => c.status === 'SOLD').length,
            delivered: codes.filter(c => c.status === 'DELIVERED').length
        };

        return NextResponse.json({ codes, stats });

    } catch (error) {
        console.error('Error fetching digital codes:', error);
        return NextResponse.json({ error: 'Error al obtener códigos' }, { status: 500 });
    }
}

// POST - Add digital codes to a product (admin only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { productId, codes, notes } = body;

        if (!productId) {
            return NextResponse.json({ error: 'Producto requerido' }, { status: 400 });
        }

        if (!codes || !Array.isArray(codes) || codes.length === 0) {
            return NextResponse.json({ error: 'Debes proporcionar al menos un código' }, { status: 400 });
        }

        // Verify product exists and is digital
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, productType: true }
        });

        if (!product) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        if (product.productType !== 'DIGITAL') {
            return NextResponse.json({ error: 'El producto no es de tipo digital' }, { status: 400 });
        }

        // Check for duplicates in existing codes
        const existingCodes = await prisma.digitalCode.findMany({
            where: {
                productId,
                code: { in: codes }
            },
            select: { code: true }
        });

        const existingCodeSet = new Set(existingCodes.map(c => c.code));
        const uniqueCodes = codes.filter((code: string) => !existingCodeSet.has(code.trim()));

        if (uniqueCodes.length === 0) {
            return NextResponse.json({
                error: 'Todos los códigos ya existen para este producto',
                duplicates: codes.length
            }, { status: 400 });
        }

        // Create the codes
        const createdCodes = await prisma.digitalCode.createMany({
            data: uniqueCodes.map((code: string) => ({
                productId,
                code: code.trim(),
                status: 'AVAILABLE',
                addedBy: session.user.id,
                notes: notes || null
            }))
        });

        // Update product stock
        await prisma.product.update({
            where: { id: productId },
            data: {
                stock: { increment: uniqueCodes.length }
            }
        });

        return NextResponse.json({
            success: true,
            message: `Se agregaron ${createdCodes.count} códigos`,
            added: createdCodes.count,
            duplicates: codes.length - uniqueCodes.length
        });

    } catch (error) {
        console.error('Error adding digital codes:', error);
        return NextResponse.json({ error: 'Error al agregar códigos' }, { status: 500 });
    }
}

// DELETE - Remove a digital code (admin only)
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const codeId = searchParams.get('id');

        if (!codeId) {
            return NextResponse.json({ error: 'ID de código requerido' }, { status: 400 });
        }

        const code = await prisma.digitalCode.findUnique({
            where: { id: codeId }
        });

        if (!code) {
            return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 });
        }

        if (code.status !== 'AVAILABLE') {
            return NextResponse.json({ error: 'Solo se pueden eliminar códigos disponibles' }, { status: 400 });
        }

        // Delete the code
        await prisma.digitalCode.delete({
            where: { id: codeId }
        });

        // Update product stock
        await prisma.product.update({
            where: { id: code.productId },
            data: {
                stock: { decrement: 1 }
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Código eliminado'
        });

    } catch (error) {
        console.error('Error deleting digital code:', error);
        return NextResponse.json({ error: 'Error al eliminar código' }, { status: 500 });
    }
}
