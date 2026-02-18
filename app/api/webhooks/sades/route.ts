import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Revalidate on stock update? 
// NextJS app router caches can be tricky. Direct database update is fine, 
// but we might need to purge cache tags if we use them. For now, DB update is priority.

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

        // 3. Procesar Eventos
        const { evento, data } = payload;
        console.log(`Webhook Received: ${evento}`, data);

        if (!data?.sku) {
            return NextResponse.json({ error: 'Missing SKU in data' }, { status: 400 });
        }

        switch (evento) {
            case 'STOCK_UPDATED':
                // data: { sku, stockNuevo, stockAnterior }
                await prisma.product.update({
                    where: { sku: data.sku },
                    data: { stock: data.stockNuevo }
                });
                break;

            case 'PRICE_UPDATED':
                // data: { sku, precioNuevo, precioAnterior }
                await prisma.product.update({
                    where: { sku: data.sku },
                    data: { priceUSD: data.precioNuevo }
                });
                break;

            case 'PRODUCT_UPDATED':
                // Evento genérico si cambia todo
                // data: { sku, stock, precio, nombre... }
                await prisma.product.update({
                    where: { sku: data.sku },
                    data: {
                        stock: data.stock,
                        priceUSD: data.precio
                    }
                });
                break;

            case 'PRODUCT_DELETED':
                // data: { sku }
                // No borramos físicamente, lo marcamos como inactivo/borrador o archivado
                await prisma.product.update({
                    where: { sku: data.sku },
                    data: { status: 'ARCHIVED' }
                });
                break;

            default:
                console.log(`Webhook: Evento no manejado: ${evento}`);
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
