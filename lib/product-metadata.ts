'use server';

import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getSiteSettings } from '@/lib/site-settings';

interface ProductPageProps {
    params: Promise<{ id: string }>;
}

// Helper to clean image URL
function cleanImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (url.startsWith('data:')) return null; // Skip base64 for OG
    return url;
}

// Helper to ensure absolute URL
function ensureAbsoluteUrl(url: string | null, baseUrl: string): string | null {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // Handle relative URLs
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanUrl}`;
}

export async function generateProductMetadata({ params }: ProductPageProps): Promise<Metadata> {
    const { id } = await params; // Await params in Next.js 15+
    const settings = await getSiteSettings();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://electroshop.com';

    try {
        // Find product by slug or ID
        const product = await prisma.product.findFirst({
            where: {
                OR: [
                    { slug: id },
                    { id: id }
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

        // Ensure image URL is absolute (critical for WhatsApp)
        productImage = ensureAbsoluteUrl(productImage, baseUrl);

        // Get company logo as fallback
        const companyLogo = ensureAbsoluteUrl(settings.logo, baseUrl);

        // Final fallback to default OG image
        const ogImage = productImage || companyLogo || `${baseUrl}/og-image.png`;

        const price = Number(product.priceUSD);
        const title = product.name;
        const categoryName = product.category?.name || 'Productos';
        const description = product.description
            ? product.description.substring(0, 155) + (product.description.length > 155 ? '...' : '')
            : `${product.name} - Disponible en ${settings.companyName}`;

        const productUrl = `${baseUrl}/productos/${id}`;

        return {
            title: `${title} | ${settings.companyName || 'Electro Shop'}`,
            description: description,
            openGraph: {
                title: `${title} - $${price.toFixed(2)} USD`,
                description: description,
                url: productUrl,
                siteName: settings.companyName || 'Electro Shop',
                images: [
                    {
                        url: ogImage,
                        width: 1200,
                        height: 630,
                        alt: title,
                        type: 'image/jpeg',
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
                site: settings.companyName || '@ElectroShop',
            },
            // Additional metadata for better sharing
            other: {
                'og:price:amount': price.toFixed(2),
                'og:price:currency': 'USD',
                'product:price:amount': price.toFixed(2),
                'product:price:currency': 'USD',
                'product:category': categoryName,
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

