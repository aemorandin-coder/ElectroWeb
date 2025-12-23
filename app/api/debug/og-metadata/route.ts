import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteSettings } from '@/lib/site-settings';

// Debug endpoint to check OG metadata for a product
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');

    if (!slug) {
        return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'NOT_SET';
    const settings = await getSiteSettings();

    try {
        const product = await prisma.product.findFirst({
            where: {
                OR: [
                    { slug: slug },
                    { id: slug }
                ],
                status: 'PUBLISHED'
            },
            select: {
                id: true,
                name: true,
                slug: true,
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
            return NextResponse.json({ error: 'Product not found', slug }, { status: 404 });
        }

        // Parse images
        let parsedImages: string[] = [];
        try {
            parsedImages = JSON.parse(product.images || '[]');
        } catch {
            parsedImages = [];
        }

        // Check image sources
        const mainImageAnalysis = {
            raw: product.mainImage,
            isBase64: product.mainImage?.startsWith('data:') || false,
            isRelative: product.mainImage && !product.mainImage.startsWith('http') && !product.mainImage.startsWith('data:'),
            startsWithSlash: product.mainImage?.startsWith('/') || false,
        };

        const firstImageFromArray = parsedImages[0] || null;
        const arrayImageAnalysis = firstImageFromArray ? {
            raw: firstImageFromArray,
            isBase64: firstImageFromArray.startsWith('data:'),
            isRelative: !firstImageFromArray.startsWith('http') && !firstImageFromArray.startsWith('data:'),
            startsWithSlash: firstImageFromArray.startsWith('/'),
        } : null;

        // Determine final OG image
        let ogImage = null;
        if (product.mainImage && !product.mainImage.startsWith('data:')) {
            ogImage = product.mainImage;
        } else if (firstImageFromArray && !firstImageFromArray.startsWith('data:')) {
            ogImage = firstImageFromArray;
        }

        // Make absolute
        if (ogImage && !ogImage.startsWith('http')) {
            const cleanUrl = ogImage.startsWith('/') ? ogImage : `/${ogImage}`;
            ogImage = `${baseUrl}${cleanUrl}`;
        }

        // Fallback
        if (!ogImage) {
            ogImage = settings.logo ? `${baseUrl}${settings.logo.startsWith('/') ? settings.logo : '/' + settings.logo}` : `${baseUrl}/og-image.png`;
        }

        return NextResponse.json({
            environment: {
                NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'NOT_SET',
                NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT_SET',
                computedBaseUrl: baseUrl,
            },
            product: {
                id: product.id,
                name: product.name,
                slug: product.slug,
            },
            images: {
                mainImage: mainImageAnalysis,
                imagesArray: {
                    count: parsedImages.length,
                    firstImage: arrayImageAnalysis,
                },
            },
            openGraph: {
                finalImage: ogImage,
                isAbsolute: ogImage?.startsWith('http'),
                productUrl: `${baseUrl}/productos/${product.slug}`,
            },
            recommendation: ogImage?.startsWith('http')
                ? '✅ Image URL looks correct. Try clearing WhatsApp cache or use Facebook Debug Tool.'
                : '❌ Image URL is not absolute. Check NEXT_PUBLIC_BASE_URL.',
        });

    } catch (error: any) {
        return NextResponse.json({
            error: 'Server error',
            message: error.message
        }, { status: 500 });
    }
}
