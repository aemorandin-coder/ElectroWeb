'use client';

import StarRating from './StarRating';

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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Calificaciones</h3>

            <div className="flex items-center gap-8 mb-6">
                {/* Average Rating */}
                <div className="text-center">
                    <div className="text-5xl font-black text-gray-900 mb-2">
                        {averageRating.toFixed(1)}
                    </div>
                    <StarRating rating={averageRating} readonly size="md" />
                    <p className="text-sm text-gray-600 mt-2">
                        {totalReviews} {totalReviews === 1 ? 'reseña' : 'reseñas'}
                    </p>
                </div>

                {/* Rating Distribution */}
                <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 w-8">
                                {star} ★
                            </span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-yellow-400 transition-all duration-300"
                                    style={{ width: `${getPercentage(distribution[star as keyof typeof distribution])}%` }}
                                />
                            </div>
                            <span className="text-sm text-gray-600 w-12 text-right">
                                {distribution[star as keyof typeof distribution]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
