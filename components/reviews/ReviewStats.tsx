'use client';

import StarRating from './StarRating';
import { FaStar } from 'react-icons/fa';

interface ReviewStatsProps {
    averageRating: number;
    totalReviews: number;
    ratingDistribution?: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
}

export default function ReviewStats({
    averageRating,
    totalReviews,
    ratingDistribution,
}: ReviewStatsProps) {
    const distribution = ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    const getPercentage = (count: number) => {
        if (totalReviews === 0) return 0;
        return (count / totalReviews) * 100;
    };

    return (
        <div className="bg-white rounded-xl border border-line p-6">
            <h3 className="text-xl font-bold text-ink mb-6">Calificaciones</h3>

            <div className="flex items-center gap-8 mb-6">
                {/* Average Rating */}
                <div className="text-center">
                    <div className="text-5xl font-bold text-ink mb-2">
                        {averageRating.toFixed(1)}
                    </div>
                    <StarRating rating={averageRating} readonly size="md" />
                    <p className="text-sm text-muted mt-2">
                        {totalReviews} {totalReviews === 1 ? 'reseña' : 'reseñas'}
                    </p>
                </div>

                {/* Rating Distribution */}
                <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-ink w-8 inline-flex items-center gap-0.5">
                                {star} <FaStar className="inline h-3 w-3 text-warning" aria-hidden="true" />
                            </span>
                            <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-warning transition-all duration-300"
                                    style={{ width: `${getPercentage(distribution[star as keyof typeof distribution])}%` }}
                                />
                            </div>
                            <span className="text-sm text-muted w-12 text-right">
                                {distribution[star as keyof typeof distribution]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
