import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendDigitalCodeEmail } from '@/lib/email-service';
import { DIGITAL_PROVIDERS } from '@/lib/digital-catalog';
import { roundMoney } from '@/lib/pricing';

// Entrega de un código (C-60b). El proveedor, su referencia y el costo son opcionales y quedan en el artículo.
const texto = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);
const entregaSchema = z.object({
    orderId: z.string().min(1).max(60),
    orderItemId: z.string().min(1).max(60),
    code: z.string({ error: 'Ingresa un código válido' }).trim().min(1, 'Ingresa un código válido').max(500, 'El código es demasiado largo'),
    notes: texto(500),
    supplier: z.enum(DIGITAL_PROVIDERS.map((p) => p.value) as [string, ...string[]], { error: 'Proveedor inválido' }).nullish(),
    supplierOrderRef: texto(120),
    supplierCostUSD: z.number({ error: 'Costo inválido' }).finite().min(0, 'Costo inválido').max(100_000, 'Costo inválido').nullish(),
});

// GET - Get digital codes for a specific order
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 });
        }

        // Verify user owns this order or is admin
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                productType: true,
                                digitalPlatform: true,
                                digitalRegion: true,
                                mainImage: true,
                                redemptionInstructions: true,
                                deliveryMethod: true,
                            }
                        }
                    }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
        const isOwner = order.userId === session.user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Get digital codes for this order
        const digitalCodes = await prisma.digitalCode.findMany({
            where: { orderId },
            select: {
                id: true,
                code: true,
                status: true,
                productId: true,
                orderItemId: true, // Added to filter by order item
                deliveredAt: true,
                soldAt: true,
                notes: true,
                product: {
                    select: {
                        name: true,
                        digitalPlatform: true,
                        digitalRegion: true,
                        mainImage: true,
                    }
                }
            }
        });

        // Filter sensitive data based on permissions
        const filteredCodes = digitalCodes.map(dc => ({
            ...dc,
            code: (isOwner || isAdmin) ? dc.code : '****',
            notes: isAdmin ? dc.notes : null,
        }));

        // Map digital items from order
        type DigitalOrderItem = { id: string; productId: string; productName?: string | null; productImage?: string | null; quantity: number; supplier: string | null; supplierOrderRef: string | null; supplierCostUSD: { toString(): string } | null; product: { id: string; name: string; productType: string; digitalPlatform: string | null; digitalRegion: string | null; mainImage: string | null; redemptionInstructions: string | null; deliveryMethod: string | null } };
        const digitalItems = (order.items as DigitalOrderItem[]).filter((item) => item.product.productType === 'DIGITAL').map((item) => ({
            orderItemId: item.id,
            productId: item.productId,
            productName: item.productName || item.product.name,
            platform: item.product.digitalPlatform,
            region: item.product.digitalRegion,
            image: item.productImage || item.product.mainImage,
            quantity: item.quantity,
            deliveryMethod: item.product.deliveryMethod || 'INSTANT',
            // Filter codes by orderItemId to ensure each order item has independent codes
            codes: filteredCodes.filter(dc => dc.orderItemId === item.id),
            redemptionInstructions: item.product.redemptionInstructions || null,
            // Compra al proveedor: solo el equipo (el cliente nunca ve el costo)
            ...(isAdmin ? {
                supplier: item.supplier,
                supplierOrderRef: item.supplierOrderRef,
                supplierCostUSD: item.supplierCostUSD === null ? null : Number(item.supplierCostUSD.toString()),
            } : {}),
        }));

        return NextResponse.json({
            orderId,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            paymentStatus: order.paymentStatus,
            digitalItems,
            // Todo entregado = cada artículo digital tiene sus códigos (antes: every() sobre la lista de códigos,
            // que con 0 códigos da true y el panel decía "Todos los códigos entregados" sin haber enviado nada)
            isDelivered: digitalItems.length > 0 && digitalItems.every((item) => item.codes.filter((dc) => dc.status === 'DELIVERED').length >= item.quantity),
        });
    } catch (error) {
        console.error('Error fetching digital codes:', error);
        return NextResponse.json({ error: 'Error al obtener códigos' }, { status: 500 });
    }
}

// POST - Admin sends digital code to customer
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const parsed = entregaSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }, { status: 400 });
        }
        const { orderId, orderItemId, code, notes, supplier, supplierOrderRef, supplierCostUSD } = parsed.data;
        if (orderId !== (await params).id) {
            return NextResponse.json({ error: 'La orden no coincide con la dirección' }, { status: 400 });
        }

        // Verify order exists and is paid
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                items: {
                    where: { id: orderItemId }, // Find by orderItemId
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                productType: true,
                            }
                        }
                    }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        if (order.paymentStatus !== 'PAID') {
            return NextResponse.json({
                error: 'La orden no está pagada'
            }, { status: 400 });
        }
        if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
            return NextResponse.json({ error: 'La orden está cancelada: no se entregan códigos' }, { status: 400 });
        }

        const orderItem = order.items[0];
        if (!orderItem || orderItem.product.productType !== 'DIGITAL') {
            return NextResponse.json({
                error: 'Item de orden no encontrado o no es digital'
            }, { status: 400 });
        }

        // Un código por unidad comprada (C-60b). El artículo queda bloqueado mientras se cuenta y se crea:
        // un doble clic o dos pestañas no entregan (ni cobran al proveedor) dos veces.
        const digitalCode = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM order_items WHERE id = ${orderItemId} FOR UPDATE`;
            const entregados = await tx.digitalCode.count({ where: { orderItemId } });
            if (entregados >= orderItem.quantity) return null;

            const creado = await tx.digitalCode.create({
                data: {
                    productId: orderItem.product.id, // Get productId from the order item
                    code,
                    status: 'DELIVERED',
                    orderId,
                    orderItemId, // Use the specific order item ID
                    soldAt: new Date(),
                    deliveredAt: new Date(),
                    addedBy: session.user.email || session.user.id,
                    notes,
                }
            });
            // Compra al proveedor (campos de C-60), por artículo: con 2 o más unidades el costo se suma
            // (se compara con el total vendido del artículo) y las referencias se juntan. Lo vacío no borra.
            if (supplier || supplierOrderRef || supplierCostUSD != null) {
                const fila = await tx.orderItem.findUniqueOrThrow({ where: { id: orderItemId }, select: { supplierOrderRef: true, supplierCostUSD: true } });
                await tx.orderItem.update({
                    where: { id: orderItemId },
                    data: {
                        ...(supplier ? { supplier } : {}),
                        ...(supplierOrderRef ? { supplierOrderRef: fila.supplierOrderRef ? `${fila.supplierOrderRef}, ${supplierOrderRef}` : supplierOrderRef } : {}),
                        // Como texto: un number de JS llega a la base con arrastre binario (9.45 → 9.449999999999999)
                        ...(supplierCostUSD != null ? { supplierCostUSD: roundMoney(Number(fila.supplierCostUSD ?? 0) + supplierCostUSD).toFixed(2) } : {}),
                    },
                });
            }
            // C-100 (E13): con el último código del pedido, la orden queda Entregada (antes seguía "En preparación")
            const articulos = await tx.orderItem.findMany({
                where: { orderId },
                select: { id: true, quantity: true, product: { select: { productType: true } } },
            });
            const soloDigital = articulos.every((a) => a.product.productType === 'DIGITAL');
            if (soloDigital) {
                const conteo = await tx.digitalCode.groupBy({
                    by: ['orderItemId'],
                    where: { orderId, status: 'DELIVERED' },
                    _count: { _all: true },
                });
                const entregadosPorArticulo = new Map(conteo.map((c) => [c.orderItemId, c._count._all]));
                const completo = articulos.every((a) => (entregadosPorArticulo.get(a.id) ?? 0) >= a.quantity);
                if (completo) {
                    await tx.order.updateMany({
                        where: { id: orderId, status: { in: ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING'] } },
                        data: { status: 'DELIVERED', deliveredAt: new Date() },
                    });
                }
            }
            return creado;
        });

        if (!digitalCode) {
            return NextResponse.json({ error: 'Ya se enviaron todos los códigos de este producto' }, { status: 409 });
        }

        // Create notification for customer
        if (order.userId) {
            await prisma.notification.create({
                data: {
                    userId: order.userId,
                    type: 'ORDER',
                    title: '¡Tu código digital está listo!',
                    message: `El código de ${orderItem.product.name} ya está disponible en tu cuenta.`,
                    link: `/customer/orders/${orderId}/digital`,
                }
            });
        }

        // Send email notification to customer
        if (order.user?.email) {
            try {
                // Get product details for email (we already have them from orderItem)
                const productDetails = await prisma.product.findUnique({
                    where: { id: orderItem.product.id },
                    select: {
                        name: true,
                        digitalPlatform: true,
                        redemptionInstructions: true,
                    }
                });

                await sendDigitalCodeEmail(order.user.email, {
                    orderNumber: order.orderNumber,
                    customerName: order.user.name || 'Cliente',
                    productName: productDetails?.name || orderItem.product.name,
                    code: code,
                    platform: productDetails?.digitalPlatform || undefined,
                    redemptionInstructions: productDetails?.redemptionInstructions || undefined,
                });
            } catch (emailError) {
                console.error('Error sending digital code email:', emailError);
                // Don't fail the operation if email fails
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Código digital enviado exitosamente',
            digitalCode: {
                id: digitalCode.id,
                status: digitalCode.status,
                deliveredAt: digitalCode.deliveredAt,
            }
        });
    } catch (error) {
        console.error('Error sending digital code:', error);
        return NextResponse.json({ error: 'Error al enviar código' }, { status: 500 });
    }
}
