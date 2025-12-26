'use client';

import { useState, useEffect } from 'react';
import { FiStar, FiTrendingUp, FiClock } from 'react-icons/fi';
import Link from 'next/link';

interface RecentReview {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    isApproved: boolean;
    userName?: string;
    user?: {
        name: string | null;
        email: string;
    };
    product?: {
        name: string;
        slug: string;
    };
}

interface ReviewStats {
    total: number;
    pending: number;
    approved: number;
    averageRating: number;
}

export default function ReviewsWidget() {
    const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
    const [stats, setStats] = useState<ReviewStats>({
        total: 0,
        pending: 0,
        approved: 0,
        averageRating: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReviewsData();
    }, []);

    const fetchReviewsData = async () => {
        try {
            // Fetch recent reviews
            const reviewsResponse = await fetch('/api/reviews?limit=5');
            if (reviewsResponse.ok) {
                const reviewsData = await reviewsResponse.json();
                setRecentReviews(Array.isArray(reviewsData) ? reviewsData.slice(0, 5) : []);
            }

            // Calculate stats (you can create a dedicated endpoint for this)
            const allReviewsResponse = await fetch('/api/reviews');
            if (allReviewsResponse.ok) {
                const allReviews = await allReviewsResponse.json();
                const reviewsArray = Array.isArray(allReviews) ? allReviews : [];

                const total = reviewsArray.length;
                const pending = reviewsArray.filter((r: any) => !r.isApproved).length;
                const approved = reviewsArray.filter((r: any) => r.isApproved && r.isPublished).length;
                const avgRating = total > 0
                    ? reviewsArray.reduce((sum: number, r: any) => sum + r.rating, 0) / total
                    : 0;

                setStats({
                    total,
                    pending,
                    approved,
                    averageRating: Number(avgRating.toFixed(1)),
                });
            }
        } catch (error) {
            console.error('Error fetching reviews data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FiStar className="w-5 h-5 text-[#2a63cd]" />
                    Reseñas Recientes
                </h3>
                <Link
                    href="/admin/reviews"
                    className="text-sm text-[#2a63cd] hover:underline font-medium"
                >
                    Ver todas
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                    <p className="text-xs text-gray-600">Total</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                    <p className="text-xs text-gray-600">Pendientes</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats.averageRating}</p>
                    <p className="text-xs text-gray-600">Promedio</p>
                </div>
            </div>

            {/* Recent Reviews */}
            <div className="space-y-3">
                {recentReviews.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No hay reseñas recientes</p>
                ) : (
                    recentReviews.filter((review) => review.product?.name).map((review) => (
                        <div
                            key={review.id}
                            className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                                        {review.product?.name || 'Producto eliminado'}
                                    </p>
                                    <p className="text-xs text-gray-500">{review.user?.name || review.userName || 'Usuario'}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <FiStar
                                            key={i}
                                            className={`w-3 h-3 ${i < review.rating
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{review.comment}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <FiClock className="w-3 h-3" />
                                    {new Date(review.createdAt).toLocaleDateString('es-ES')}
                                </span>
                                {!review.isApproved && (
                                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                        Pendiente
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
