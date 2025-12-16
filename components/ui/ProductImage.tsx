'use client';

import { useState } from 'react';
import Image from 'next/image';

// Default placeholder image path
export const PRODUCT_PLACEHOLDER = '/images/no-image.png';

interface ProductImageProps {
    src: string | null | undefined;
    alt: string;
    fill?: boolean;
    width?: number;
    height?: number;
    className?: string;
    sizes?: string;
    priority?: boolean;
    quality?: number;
}

/**
 * ProductImage component with automatic fallback to placeholder
 * Use this instead of next/image for product images to handle missing/corrupt images
 */
export default function ProductImage({
    src,
    alt,
    fill = false,
    width,
    height,
    className = '',
    sizes,
    priority = false,
    quality = 75,
}: ProductImageProps) {
    const [imgSrc, setImgSrc] = useState<string>(src || PRODUCT_PLACEHOLDER);
    const [hasError, setHasError] = useState(false);

    const handleError = () => {
        if (!hasError) {
            setHasError(true);
            setImgSrc(PRODUCT_PLACEHOLDER);
        }
    };

    // If src is empty, null, or undefined, use placeholder immediately
    const effectiveSrc = src && src.trim() !== '' ? imgSrc : PRODUCT_PLACEHOLDER;

    if (fill) {
        return (
            <Image
                src={effectiveSrc}
                alt={alt}
                fill
                className={className}
                sizes={sizes}
                priority={priority}
                quality={quality}
                onError={handleError}
                unoptimized
            />
        );
    }

    return (
        <Image
            src={effectiveSrc}
            alt={alt}
            width={width || 300}
            height={height || 300}
            className={className}
            sizes={sizes}
            priority={priority}
            quality={quality}
            onError={handleError}
            unoptimized
        />
    );
}

/**
 * Helper function to get product image with fallback
 * Use this when you need just the URL string
 */
export function getProductImageUrl(src: string | null | undefined): string {
    if (!src || src.trim() === '') {
        return PRODUCT_PLACEHOLDER;
    }
    return src;
}
