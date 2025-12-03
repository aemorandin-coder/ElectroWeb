'use client';

import { useState, useEffect } from 'react';
import { FiStar, FiUser, FiPackage, FiClock, FiCheck, FiX } from 'react-icons/fi';
import Link from 'next/link';

interface Review {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    isApproved: boolean;
    isPublished: boolean;
    userName: string;
    product: {
        name: string;
        slug: string;
    };
}

export default function MyReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

    useEffect(() => {
        fetchMyReviews();
    }, []);

    const fetchMyReviews = async () => {
        try {
            const response = await fetch('/api/reviews');
            if (response.ok) {
                const data = await response.json();
                setReviews(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredReviews = reviews.filter(review => {
        if (filter === 'approved') return review.isApproved && review.isPublished;
        if (filter === 'pending') return !review.isApproved;
        return true;
    });

    const getStatusBadge = (review: Review) => {
        if (review.isApproved && review.isPublished) {
            return (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    <FiCheck className="w-3 h-3" />
                    Publicada
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                <FiClock className="w-3 h-3" />
                Pendiente
            </span>
        );
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Mis Reseñas</h1>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                            ? 'bg-[#2a63cd] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Todas
                </button>
                <button
                    onClick={() => setFilter('approved')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'approved'
                            ? 'bg-[#2a63cd] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Publicadas
                </button>
                <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'pending'
                            ? 'bg-[#2a63cd] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Pendientes
                </button>
            </div>

            {/* Reviews List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2a63cd]"></div>
                </div>
            ) : filteredReviews.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiStar className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No hay reseñas</h3>
                    <p className="text-gray-600 mb-6">
                        {filter === 'pending'
                            ? 'No tienes reseñas pendientes'
                            : filter === 'approved'
                                ? 'No tienes reseñas publicadas'
                                : 'Aún no has dejado ninguna reseña'}
                    </p>
                    <Link
                        href="/productos"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#2a63cd] text-white rounded-xl font-semibold hover:bg-[#1e4ba3] transition-colors"
                    >
                        <FiPackage className="w-5 h-5" />
                        Ver Productos
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredReviews.map((review) => (
                        <div
                            key={review.id}
                            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <Link
                                        href={`/productos/${review.product.slug}`}
                                        className="text-lg font-bold text-gray-900 hover:text-[#2a63cd] transition-colors"
                                    >
                                        {review.product.name}
                                    </Link>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex items-center">
                                            {[...Array(5)].map((_, i) => (
                                                <FiStar
                                                    key={i}
                                                    className={`w-4 h-4 ${i < review.rating
                                                            ? 'fill-yellow-400 text-yellow-400'
                                                            : 'text-gray-300'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {new Date(review.createdAt).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                </div>
                                {getStatusBadge(review)}
                            </div>

                            <p className="text-gray-700 leading-relaxed">{review.comment}</p>

                            {!review.isApproved && (
                                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm text-amber-800 flex items-center gap-2">
                                        <FiClock className="w-4 h-4" />
                                        Tu reseña está siendo revisada por nuestro equipo. Será publicada pronto.
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
