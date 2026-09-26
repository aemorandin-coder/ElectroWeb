import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { montoDecimal, precioValido } from '@/lib/pricing';
import { createAuditLog } from '@/lib/audit-log';
import { ipParaRegistro } from '@/lib/ip';

export async function POST(req: NextRequest) {
    try {
        // 1. Obtener Headers y Body
        const signature = req.headers.get('x-webhook-signature');
        const secret = process.env.SADES_WEBHOOK_SECRET;

        if (!secret) {
            console.error('Webhook Error: SADES_WEBHOOK_SECRET not configured');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
        }

        const payload = await req.json();

        // 2. Validar Firma HMAC SHA256
        // La firma debe ser "sha256=<hex_digest>"
        const expected = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        const expectedSignature = `sha256=${expected}`;

        // Comparación de tiempo constante para evitar ataques de timing
        // Nota: timingSafeEqual requiere buffers de la misma longitud.
        // Si las longitudes difieren, es inválido de inmediato.
        const sigBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        const valid = sigBuffer.length === expectedBuffer.length &&
            crypto.timingSafeEqual(sigBuffer, expectedBuffer);

        if (!valid) {
            console.warn('Webhook Error: Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // 3. Aviso reciente (C-40): un aviso firmado viejo no se puede reenviar después. Si SADES no manda la hora, pasa.
        if (payload?.timestamp) {
            const enviado = new Date(payload.timestamp).getTime();
            if (!Number.isFinite(enviado) || Math.abs(Date.now() - enviado) > 10 * 60 * 1000) {
                return NextResponse.json({ error: 'Aviso vencido' }, { status: 401 });
            }
        }

        // 4. Procesar eventos. Valores validados, y cada cambio de precio o stock queda en la bitácora (C-104):
        // quien tenga el secreto puede cambiar precios, así que tiene que verse quién y qué.
        const { evento, data } = payload ?? {};
        const sku = typeof data?.sku === 'string' ? data.sku.trim().slice(0, 100) : '';
        if (!sku) {
            return NextResponse.json({ error: 'Missing SKU in data' }, { status: 400 });
        }
        const producto = await prisma.product.findUnique({ where: { sku }, select: { id: true, name: true, priceUSD: true, stock: true, productType: true } });
        if (!producto) {
            return NextResponse.json({ error: 'SKU no encontrado' }, { status: 404 });
        }

        const cambios: { priceUSD?: string; stock?: number; status?: 'ARCHIVED' } = {};
        const precioNuevo = evento === 'PRICE_UPDATED' ? data.precioNuevo : evento === 'PRODUCT_UPDATED' ? data.precio : undefined;
        const stockNuevo = evento === 'STOCK_UPDATED' ? data.stockNuevo : evento === 'PRODUCT_UPDATED' ? data.stock : undefined;
        if (precioNuevo !== undefined && precioNuevo !== null) {
            const precio = precioValido(precioNuevo);
            if (precio === null || precio === 0) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
            // El precio de un digital sale de sus montos (C-60): no se toca desde aquí
            if (producto.productType !== 'DIGITAL') cambios.priceUSD = montoDecimal(precio);
        }
        if (stockNuevo !== undefined && stockNuevo !== null) {
            const stock = Number(stockNuevo);
            if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) return NextResponse.json({ error: 'Stock inválido' }, { status: 400 });
            cambios.stock = stock;
        }
        if (evento === 'PRODUCT_DELETED') cambios.status = 'ARCHIVED'; // No se borra: queda archivado
        if (!['STOCK_UPDATED', 'PRICE_UPDATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED'].includes(evento)) {
            console.warn(`Webhook: Evento no manejado: ${String(evento).slice(0, 40)}`);
            return NextResponse.json({ received: true, ignored: true });
        }
        if (Object.keys(cambios).length === 0) return NextResponse.json({ received: true, unchanged: true });

        await prisma.product.update({ where: { id: producto.id }, data: cambios });

        const meta = { ipAddress: ipParaRegistro(req.headers), userAgent: (req.headers.get('user-agent') || 'SADES').slice(0, 300) };
        if (cambios.priceUSD !== undefined && Number(cambios.priceUSD) !== Number(producto.priceUSD)) {
            await createAuditLog({
                action: 'PRODUCT_PRICE_CHANGED', targetType: 'PRODUCT', targetId: producto.id, ...meta,
                details: { origen: 'SADES (webhook)', producto: producto.name, antes: Number(producto.priceUSD), despues: Number(cambios.priceUSD) },
            });
        }
        if (cambios.stock !== undefined && cambios.stock !== producto.stock) {
            await createAuditLog({
                action: 'PRODUCT_STOCK_CHANGED', targetType: 'PRODUCT', targetId: producto.id, ...meta,
                details: { origen: 'SADES (webhook)', producto: producto.name, antes: producto.stock, despues: cambios.stock },
            });
        }

        revalidateStorefront();
        return NextResponse.json({ received: true });

    } catch (err: unknown) {
        // Sin error.message en la respuesta: podía traer detalles de la base
        console.error('Webhook Error:', err);
        return NextResponse.json({ error: 'Error al procesar el aviso' }, { status: 500 });
    }
}
