import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { sadesClient } from '@/lib/sades';
import { authOptions } from '@/lib/auth';

// Función auxiliar para esperar (Rate Limiting)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(req: NextRequest) {
    try {
        // 1. Seguridad: Verificar Admin
        // @ts-ignore
        const session = await getServerSession(authOptions);

        if (!session || ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Obtener cursor del body
        const body = await req.json();
        const cursor = body.cursor || 0;

        // REDUCCIÓN DE LÍMITE: Bajamos de 20 a 5 para evitar errores 429 (Too Many Requests)
        const limit = 5;

        // 3. Obtener lote de Sades
        const API_URL = process.env.SADES_API_URL;
        const API_KEY = process.env.SADES_API_KEY;

        if (!API_URL || !API_KEY) {
            return NextResponse.json({ error: 'Configuración de API incompleta en .env' }, { status: 500 });
        }

        const sadesRes = await fetch(`${API_URL}/sync-batch?cursor=${cursor}&limit=${limit}`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });

        if (sadesRes.status === 429) {
            return NextResponse.json({ error: 'El servidor remoto está saturado (429). Reintentando...' }, { status: 429 });
        }

        if (!sadesRes.ok) {
            throw new Error(`Error Sades API: ${sadesRes.statusText}`);
        }

        const sadesData = await sadesRes.json();

        if (!sadesData.success) {
            throw new Error('La API de Sades respondió con success: false');
        }

        const products = sadesData.data || [];
        let processedCount = 0;
        let createdCount = 0;
        let updatedCount = 0;

        // 4. Procesar productos
        for (const remoteProd of products) {
            // Ignorar si no tiene SKU
            if (!remoteProd.sku) continue;

            // PAUSA DE CORTESÍA: Esperar un poco antes de procesar cada producto para no saturar
            await sleep(200);

            // Buscar categoría local o crear 'General'
            let categoryId;
            const categoryName = remoteProd.categoria || 'Sin Categoría';

            // Intentar buscar categoría existente
            const existingCat = await prisma.category.findFirst({
                where: { name: { equals: categoryName, mode: 'insensitive' } }
            });

            if (existingCat) {
                categoryId = existingCat.id;
            } else {
                // Crear categoría si no existe 
                const newCat = await prisma.category.create({
                    data: {
                        name: categoryName,
                        slug: categoryName.toLowerCase().replace(/ /g, '-') + '-' + Date.now(),
                    }
                });
                categoryId = newCat.id;
            }

            // Descargar imagen con PAUSA ADICIONAL
            let localImagePath = null;
            if (remoteProd.sku) {
                await sleep(300); // 300ms extra antes de pedir la imagen
                const downloaded = await sadesClient.downloadImage(remoteProd.sku);
                if (downloaded) localImagePath = downloaded;
            }

            // Buscar producto existente
            const existingProd = await prisma.product.findUnique({
                where: { sku: remoteProd.sku }
            });

            const status = existingProd ? existingProd.status : 'DRAFT';

            const productData = {
                name: remoteProd.nombre,
                description: remoteProd.descripcion || '',
                priceUSD: remoteProd.precioUSD,
                stock: remoteProd.stockDisponible,
                // Asegurar valores por defecto para imágenes
                mainImage: localImagePath || null,
                images: localImagePath ? JSON.stringify([localImagePath]) : '[]',

                sku: remoteProd.sku,
                categoryId: categoryId,
                status: status,
            };

            if (existingProd) {
                await prisma.product.update({
                    where: { id: existingProd.id },
                    data: {
                        priceUSD: remoteProd.precioUSD,
                        stock: remoteProd.stockDisponible,
                        name: remoteProd.nombre,
                        description: remoteProd.descripcion || '',
                        // Solo actualizamos imagen si descargamos una nueva
                        ...(localImagePath && {
                            mainImage: localImagePath,
                            images: JSON.stringify([localImagePath])
                        }),
                    }
                });
                updatedCount++;
            } else {
                await prisma.product.create({
                    data: {
                        ...productData,
                        slug: `${remoteProd.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
                    }
                });
                createdCount++;
            }
            processedCount++;
        }

        return NextResponse.json({
            success: true,
            processed: processedCount,
            created: createdCount,
            updated: updatedCount,
            nextCursor: sadesData.pagination.nextCursor,
            hasMore: sadesData.pagination.hasMore
        });

    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
