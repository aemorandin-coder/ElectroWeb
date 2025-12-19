'use server';

import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getSiteSettings } from '@/lib/site-settings';

interface ProductPageProps {
    params: { id: string };
}

// Helper to clean image URL
function cleanImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith('data:')) return null; // Skip base64 for OG
    return url;
}

export async function generateProductMetadata({ params }: ProductPageProps): Promise<Metadata> {
    const settings = await getSiteSettings();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshop.com';

    try {
        // Find product by slug or ID
        const product = await prisma.product.findFirst({
            where: {
                OR: [
                    { slug: params.id },
                    { id: params.id }
                ],
                status: 'PUBLISHED'
            },
            select: {
                name: true,
                description: true,
                priceUSD: true,
                mainImage: true,
                images: true,
                category: {
                    select: { name: true }
                }
            }
        });

        if (!product) {
            return {
                title: 'Producto no encontrado',
                description: 'El producto que buscas no existe o no está disponible.',
            };
        }

        // Get product image for Open Graph
        let productImage: string | null = cleanImageUrl(product.mainImage);

        if (!productImage) {
            try {
                const imagesArray = JSON.parse(product.images || '[]');
                if (Array.isArray(imagesArray) && imagesArray.length > 0) {
                    productImage = cleanImageUrl(imagesArray[0]);
                }
            } catch {
                productImage = null;
            }
        }

        // Make sure image URL is absolute
        if (productImage && !productImage.startsWith('http')) {
            productImage = `${baseUrl}${productImage.startsWith('/') ? '' : '/'}${productImage}`;
        }

        // Fallback to company logo or default
        const ogImage = productImage || settings.logo || `${baseUrl}/og-image.png`;

        const price = Number(product.priceUSD);
        const title = product.name;
        const description = product.description
            ? product.description.substring(0, 155) + (product.description.length > 155 ? '...' : '')
            : `${product.name} - Disponible en ${settings.companyName}`;

        return {
            title: title,
            description: description,
            openGraph: {
                title: `${title} - $${price.toFixed(2)} USD`,
                description: description,
                url: `${baseUrl}/productos/${params.id}`,
                siteName: settings.companyName || 'Electro Shop',
                images: [
                    {
                        url: ogImage,
                        width: 1200,
                        height: 630,
                        alt: title,
                    },
                ],
                locale: 'es_VE',
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: `${title} - $${price.toFixed(2)} USD`,
                description: description,
                images: [ogImage],
            },
        };
    } catch (error) {
        console.error('Error generating product metadata:', error);
        return {
            title: 'Producto',
            description: 'Ver detalles del producto',
        };
    }
}
