'use client';

import { useState } from 'react';
import { formatRating } from '@/lib/currency';
import { IconoEstrellaLlena } from '@/components/iconos';

interface StarRatingProps {
    rating: number;
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showNumber?: boolean;
}

export default function StarRating({
    rating,
    onRatingChange,
    readonly = false,
    size = 'md',
    showNumber = false,
}: StarRatingProps) {
    const [hoverRating, setHoverRating] = useState(0);

    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
    };

    const handleClick = (value: number) => {
        if (!readonly && onRatingChange) {
            onRatingChange(value);
        }
    };

    const displayRating = hoverRating || rating;

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => handleClick(star)}
                    onMouseEnter={() => !readonly && setHoverRating(star)}
                    onMouseLeave={() => !readonly && setHoverRating(0)}
                    disabled={readonly}
                    className={`${readonly ? 'cursor-default' : 'cursor-pointer '} transition-transform`}
                >
                    <IconoEstrellaLlena className={`${sizes[size]} ${star <= displayRating
                                ? 'text-warning'
                                : 'text-line'
                            } transition-colors`} />
                </button>
            ))}
            {showNumber && (
                <span className="ml-2 text-sm font-semibold text-ink">
                    {formatRating(rating)}
                </span>
            )}
        </div>
    );
}
