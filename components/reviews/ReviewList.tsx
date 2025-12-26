'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import StarRating from './StarRating';

interface Review {
    id: string;
    rating: number;
    title?: string;
    comment: string;
    userName?: string;
    userImage?: string;
    user?: {
        name: string | null;
        email: string;
    };
    isVerifiedPurchase: boolean;
    createdAt: string;
}

interface ReviewListProps {
    reviews: Review[];
    showLoginPrompt?: boolean;
}

export default function ReviewList({ reviews, showLoginPrompt = false }: ReviewListProps) {
    if (reviews.length === 0) {
        return (
            <div className="relative">
                {/* Floating Login Prompt */}
                {showLoginPrompt && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                        {/* Arrow/Rombo - behind the badge */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1e4ba3] transform rotate-45 -mt-1.5 -z-10"></div>
                        {/* Badge - in front */}
                        <div className="relative bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <a href="/login" className="hover:underline">Inicia sesión para dejar una reseña</a>
                        </div>
                    </div>
                )}
                <div className="text-center py-12 mt-8">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <p className="text-gray-600">Aún no hay reseñas para este producto</p>
                    <p className="text-sm text-gray-500 mt-1">Sé el primero en compartir tu opinión</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start gap-4">
                        {/* User Avatar */}
                        <div className="flex-shrink-0">
                            {review.userImage ? (
                                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                                    <Image src={review.userImage} alt={review.user?.name || review.userName || 'Usuario'} fill className="object-cover" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2a63cd] to-[#1e4ba3] flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">
                                        {(review.user?.name || review.userName || 'U').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Review Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-gray-900">{review.user?.name || review.userName || 'Usuario'}</h4>
                                        {review.isVerifiedPurchase && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                Compra verificada
                                            </span>
                                        )}
                                    </div>
                                    <StarRating rating={review.rating} readonly size="sm" />
                                </div>
                                <span className="text-sm text-gray-500 flex-shrink-0">
                                    {format(new Date(review.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
                                </span>
                            </div>

                            {review.title && (
                                <h5 className="font-semibold text-gray-900 mb-2">{review.title}</h5>
                            )}

                            <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
