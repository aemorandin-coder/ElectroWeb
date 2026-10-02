'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { FiLock } from 'react-icons/fi';
import StarRating from './StarRating';
import { Button } from '@/components/ui/Button';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';

interface ReviewFormProps {
    productId: string;
    onReviewSubmitted?: () => void;
}

export default function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
    const { data: session } = useSession();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    // C-160: el formulario solo existe para quien puede reseñar. Los demás ven una línea que dice por qué, sin
    // formulario, sin ventana de "verificando" y sin nada que dependa del hover.
    const [estado, setEstado] = useState<'cargando' | 'puede' | 'ya_reseno' | 'no_compro'>('cargando');

    async function checkEligibility() {
        try {
            const response = await fetch(`/api/reviews/check-eligibility?productId=${encodeURIComponent(productId)}`);
            const data = await response.json();
            setEstado(data.canReview ? 'puede' : data.reason === 'already_reviewed' ? 'ya_reseno' : 'no_compro');
        } catch {
            // Sin respuesta no se sabe: no se muestra el formulario (el servidor igual lo rechazaría)
            setEstado('no_compro');
        }
    }

    useCargarAlMontar(() => {
        if (session && productId) void checkEligibility();
    }, [session, productId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session || estado !== 'puede') return;

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
                body: JSON.stringify({ productId, rating, comment: comment.trim() }),
            });

            if (response.ok) {
                toast.success('¡Reseña enviada! Será publicada después de su aprobación.');
                setRating(0);
                setComment('');
                // Ya la envió: el formulario deja su lugar al aviso
                setEstado('ya_reseno');
                onReviewSubmitted?.();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Error al enviar reseña');
            }
        } catch {
            toast.error('Error al enviar reseña');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!session || estado === 'cargando') {
        return null; // Sin sesión, la invitación a entrar la muestra ReviewList
    }

    if (estado === 'ya_reseno') {
        return (
            <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-soft">
                Ya enviaste tu reseña de este producto. Gracias por opinar.
            </p>
        );
    }

    if (estado === 'no_compro') {
        return (
            <p className="flex items-start gap-2 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
                <FiLock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Opiniones verificadas: solo quienes compraron y recibieron este producto pueden opinar.</span>
            </p>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-line p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-success/15 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-success-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-ink">Escribe una reseña</h3>
            </div>

            <p className="text-xs text-success-strong font-semibold">Compra verificada: tu opinión cuenta.</p>

            <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                    Calificación *
                </label>
                <StarRating rating={rating} onRatingChange={setRating} size="lg" />
            </div>

            <div>
                <label htmlFor="resena-comentario" className="block text-xs font-bold text-ink mb-1.5">
                    Comentario *
                </label>
                <textarea
                    id="resena-comentario"
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
