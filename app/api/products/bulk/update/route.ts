import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { montoDecimal } from '@/lib/pricing';

// C-97: valores de la edición rápida y de los masivos. Antes "abc" daba 500 y se aceptaban negativos.
const ESTADOS = ['PUBLISHED', 'DRAFT', 'ARCHIVED'];
function precioValido(valor: unknown): number | null {
    const n = typeof valor === 'number' ? valor : Number.parseFloat(String(valor).replace(',', '.'));
    return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : null;
}
function stockValido(valor: unknown): number | null {
    const n = typeof valor === 'number' ? valor : Number.parseInt(String(valor), 10);
    return Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? n : null;
}
// El precio de un digital es el "desde" de sus montos (C-60): cambiarlo aquí lo separaba de lo que se cobra
const avisoDigitales = (n: number) => n > 0 ? ` ${n} ${n === 1 ? 'digital no cambió de precio' : 'digitales no cambiaron de precio'}: su precio sale de sus montos.` : '';

// POST /api/products/bulk/update - Bulk update products
export async function POST(request: NextRequest) {
    try {
        // SEGURIDAD (C-70): antes bastaba cualquier sesión (un cliente podía cambiar precios y stock)
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { productIds, field, value, updates } = body;

        // MODE 1: Individual Updates (Excel Mode)
        if (updates && Array.isArray(updates)) {
            try {
                if (updates.length > 1000) {
                    return NextResponse.json({ error: 'Máximo 1.000 productos por vez' }, { status: 400 });
                }
                type Fila = { id: string; priceUSD?: number | string; stock?: number | string; categoryId?: string; status?: string; isActive?: boolean };
                const filas = updates as Fila[];
                const tipos = new Map((await prisma.product.findMany({
                    where: { id: { in: filas.map((u) => String(u.id)) } },
                    select: { id: true, productType: true },
                })).map((p) => [p.id, p.productType]));

                let digitalesSinPrecio = 0;
                const cambios: { id: string; data: Record<string, unknown> }[] = [];
                for (const [i, update] of filas.entries()) {
                    const tipo = tipos.get(String(update.id));
                    if (!tipo) return NextResponse.json({ error: `Fila ${i + 1}: el producto no existe` }, { status: 400 });
                    const data: Record<string, unknown> = {};
                    if (update.priceUSD !== undefined) {
                        const precio = precioValido(update.priceUSD);
                        if (precio === null) return NextResponse.json({ error: `Fila ${i + 1}: precio inválido` }, { status: 400 });
                        if (tipo === 'DIGITAL') digitalesSinPrecio++;
                        else data.priceUSD = montoDecimal(precio);
                    }
                    if (update.stock !== undefined) {
                        const stock = stockValido(update.stock);
                        if (stock === null) return NextResponse.json({ error: `Fila ${i + 1}: stock inválido` }, { status: 400 });
                        data.stock = stock;
                    }
                    if (update.categoryId !== undefined) data.categoryId = update.categoryId;
                    if (update.status !== undefined) {
                        if (!ESTADOS.includes(String(update.status))) return NextResponse.json({ error: `Fila ${i + 1}: estado inválido` }, { status: 400 });
                        data.status = update.status;
                    }
                    if (Object.keys(data).length > 0) cambios.push({ id: String(update.id), data });
                }

                const results = await prisma.$transaction(
                    cambios.map(({ id, data }) => prisma.product.update({ where: { id }, data }))
                );

                if (results.length > 0) revalidateStorefront();
                return NextResponse.json({
                    message: `${results.length} productos actualizados exitosamente.${avisoDigitales(digitalesSinPrecio)}`,
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
        const validFields = ['price', 'pricePercent', 'stock', 'category', 'status'];
        if (!validFields.includes(field)) {
            return NextResponse.json({ error: 'Campo inválido' }, { status: 400 });
        }

        // pricePercent requires per-row fetch+update (can't do updateMany with relative math)
        if (field === 'pricePercent') {
            const pct = parseFloat(value);
            if (isNaN(pct) || pct <= -100 || pct > 1000) return NextResponse.json({ error: 'Porcentaje inválido' }, { status: 400 });

            // Solo físicos: el precio de un digital sale de sus montos (C-97)
            const products = await prisma.product.findMany({ where: { id: { in: productIds }, productType: 'PHYSICAL' }, select: { id: true, priceUSD: true } });
            const digitales = await prisma.product.count({ where: { id: { in: productIds }, productType: 'DIGITAL' } });
            await prisma.$transaction(
                products.map(p => prisma.product.update({
                    where: { id: p.id },
                    data: { priceUSD: montoDecimal(Math.max(0, Number(p.priceUSD) * (1 + pct / 100))) }
                }))
            );
            if (products.length > 0) revalidateStorefront();
            return NextResponse.json({ message: `${products.length} productos actualizados con ${pct > 0 ? '+' : ''}${pct}%.${avisoDigitales(digitales)}`, count: products.length });
        }

        // Build update data for uniform field operations
        const updateData: Record<string, unknown> = {};

        if (field === 'price') {
            const priceValue = precioValido(value);
            if (priceValue === null) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
            updateData.priceUSD = montoDecimal(priceValue);
        } else if (field === 'stock') {
            const stockValue = parseInt(value);
            if (isNaN(stockValue) || stockValue < 0) return NextResponse.json({ error: 'Stock inválido' }, { status: 400 });
            updateData.stock = stockValue;
        } else if (field === 'category') {
            const category = await prisma.category.findUnique({ where: { id: value } });
            if (!category) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
            updateData.categoryId = value;
        } else if (field === 'status') {
            if (!['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(value)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
            updateData.status = value;
        }

        // El precio fijo tampoco toca a los digitales (C-97)
        const soloFisicos = field === 'price';
        const result = await prisma.product.updateMany({
            where: { id: { in: productIds }, ...(soloFisicos ? { productType: 'PHYSICAL' as const } : {}) },
            data: updateData,
        });
        const digitales = soloFisicos ? await prisma.product.count({ where: { id: { in: productIds }, productType: 'DIGITAL' } }) : 0;

        if (result.count > 0) revalidateStorefront();
        return NextResponse.json({
            message: `${result.count} productos actualizados exitosamente.${avisoDigitales(digitales)}`,
            count: result.count,
        });
    } catch (error: unknown) {
        console.error('Error bulk updating products:', error);
        return NextResponse.json(
            { error: 'Error al actualizar productos' },
            { status: 500 }
        );
    }
}
