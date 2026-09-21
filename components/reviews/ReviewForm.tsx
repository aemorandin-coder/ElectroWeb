'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { FiLock } from 'react-icons/fi';
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

    async function checkEligibility() {
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
    }

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
        return null; // Login prompt is shown in ReviewList component
    }

    if (checkingEligibility) {
        return (
            <div className="bg-white rounded-xl border border-line p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto"></div>
                <p className="text-sm text-muted mt-4">Verificando elegibilidad...</p>
            </div>
        );
    }

    if (!canReview) {
        return (
            <div
                className="bg-surface rounded-xl border border-line p-4 flex items-center gap-4 cursor-help group transition-colors hover:bg-surface/80"
                onClick={() => toast('Debes haber comprado y recibido el producto para opinar', {
                    icon: <FiLock className="h-5 w-5 text-brand-600" />,
                    style: {
                        borderRadius: '10px',
                        background: '#212529',
                        color: '#ffffff',
                    },
                })}
            >
                <div className="w-10 h-10 bg-white border border-line rounded-full flex items-center justify-center text-muted group-hover:text-ink transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-bold text-ink">Opiniones verificadas</h4>
                    <p className="text-xs text-muted">Solo los usuarios que han comprado este producto pueden dejar una reseña.</p>
                </div>
                <div className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity px-3 py-1 bg-white border border-line rounded-full text-xs font-semibold text-muted shadow-sm">
                    Ver requisitos
                </div>
            </div>
        );
    }

    return (

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-line p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-success/15 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-success-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-ink">Escribe una reseña</h3>
            </div>

            {canReview && (
                <p className="text-xs text-success-strong font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Compra verificada - Tu opinión cuenta
                </p>
            )}

            <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                    Calificación *
                </label>
                <StarRating rating={rating} onRatingChange={setRating} size="lg" />
            </div>

            <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                    Título (opcional)
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Resume tu experiencia"
                    maxLength={100}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 border border-line rounded-xl focus:outline-none focus:border-brand-500 bg-white text-ink text-sm"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
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
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 border border-line rounded-xl focus:outline-none focus:border-brand-500 bg-white text-ink text-sm resize-none"
                />
                <p className="text-xs text-muted mt-1">
                    {comment.length}/1000 caracteres
                </p>
            </div>

            <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="w-full"
            >
                Enviar Reseña
            </Button>
        </form>
    );
}
