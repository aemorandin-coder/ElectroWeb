'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import StarRating from './StarRating';
import { Button } from '@/components/ui/Button';

interface ReviewFormProps {
    productId: string;
    onReviewSubmitted?: () => void;
}

export default function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
    const { data: session } = useSession();
    const [rating, setRating] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [canReview, setCanReview] = useState(false);
    const [eligibilityMessage, setEligibilityMessage] = useState('');
    const [checkingEligibility, setCheckingEligibility] = useState(true);

    useEffect(() => {
        if (session && productId) {
            checkEligibility();
        } else {
            setCheckingEligibility(false);
        }
    }, [session, productId]);

    const checkEligibility = async () => {
        try {
            const response = await fetch(`/api/reviews/check-eligibility?productId=${productId}`);
            const data = await response.json();
            setCanReview(data.canReview);
            setEligibilityMessage(data.message);
        } catch (error) {
            console.error('Error checking eligibility:', error);
            setCanReview(false);
            setEligibilityMessage('Error al verificar elegibilidad');
        } finally {
            setCheckingEligibility(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session) {
            toast.error('Debes iniciar sesión para dejar una reseña');
            return;
        }

        if (!canReview) {
            toast.error(eligibilityMessage);
            return;
        }

        if (rating === 0) {
            toast.error('Por favor selecciona una calificación');
            return;
        }

        if (comment.trim().length < 10) {
            toast.error('El comentario debe tener al menos 10 caracteres');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    rating,
                    title: title.trim() || null,
                    comment: comment.trim(),
                }),
            });

            if (response.ok) {
                toast.success('¡Reseña enviada! Será publicada después de su aprobación.');
                setRating(0);
                setTitle('');
                setComment('');
                onReviewSubmitted?.();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al enviar reseña');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            toast.error('Error al enviar reseña');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!session) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center border border-blue-100">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <p className="text-gray-700 font-medium mb-4">Inicia sesión para dejar una reseña</p>
                <a
                    href="/login"
                    className="inline-block px-6 py-2 bg-gradient-to-r from-[#2a63cd] to-[#1e4ba3] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                    Iniciar Sesión
                </a>
            </div>
        );
    }

    if (checkingEligibility) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2a63cd] mx-auto"></div>
                <p className="text-gray-600 mt-4">Verificando elegibilidad...</p>
            </div>
        );
    }

    if (!canReview) {
        return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-2">No puedes dejar una reseña aún</h4>
                        <p className="text-gray-700 text-sm mb-3">{eligibilityMessage}</p>
                        <div className="bg-white/60 rounded-lg p-3 text-sm text-gray-600">
                            <p className="font-medium mb-1 flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Para dejar una reseña necesitas:
                            </p>
                            <ul className="space-y-1 ml-4">
                                <li className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Haber comprado este producto
                                </li>
                                <li className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Que tu pedido haya sido entregado
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Escribe una reseña</h3>
            </div>
            <p className="text-sm text-green-600 font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Compra verificada - Puedes dejar tu opinión
            </p>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calificación *
                </label>
                <StarRating rating={rating} onRatingChange={setRating} size="lg" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título (opcional)
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Resume tu experiencia"
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentario *
                </label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Cuéntanos sobre tu experiencia con este producto..."
                    rows={4}
                    required
                    minLength={10}
                    maxLength={1000}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a63cd] focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                    {comment.length}/1000 caracteres
                </p>
            </div>

            <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="w-full"
            >
                Enviar Reseña
            </Button>
        </form>
    );
}
