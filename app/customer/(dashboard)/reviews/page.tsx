'use client';

import { useState } from 'react';
import Image from 'next/image';
import { IconoCerrar, IconoCheck, IconoEstrella, IconoLista, IconoPaquete, IconoReloj } from '@/components/iconos';
import Filtros from '@/components/admin/Filtros';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  adminCard,
  adminPrimaryButton,
  adminBadge,
} from '@/lib/admin-ui';
import { useCargarAlMontar } from '@/lib/hooks/useCargarAlMontar';
import { reviewStatus } from '@/lib/review-status';

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  isApproved: boolean;
  // C-124: antes leía `isPublished`, que la API nunca manda, y ninguna reseña salía como publicada
  rejectedAt: string | null;
  rejectionReason: string | null;
  product: {
    name: string;
    slug: string;
    /** C-265: la foto, en la tarjeta */
    mainImage?: string | null;
  };
}

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

  async function fetchMyReviews() {
    try {
      const response = await fetch('/api/reviews?mine=1');
      if (response.ok) {
        const data = await response.json();
        setReviews(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('No se pudieron cargar las reseñas');
    } finally {
      setLoading(false);
    }
  }

  useCargarAlMontar(fetchMyReviews);

  const filteredReviews = reviews.filter(review => {
    if (filter === 'approved') return reviewStatus(review) === 'APPROVED';
    if (filter === 'pending') return reviewStatus(review) === 'PENDING';
    return true;
  });

  const getStatusBadge = (review: Review) => {
    const estado = reviewStatus(review);
    if (estado === 'APPROVED') {
      return (
        <span className={adminBadge('success')}>
          <IconoCheck className="w-3 h-3" />
          Publicada
        </span>
      );
    }
    if (estado === 'REJECTED') {
      return (
        <span className={adminBadge('danger')}>
          <IconoCerrar className="w-3 h-3" />
          No publicada
        </span>
      );
    }
    return (
      <span className={adminBadge('brand')}>
        <IconoReloj className="w-3 h-3" />
        Pendiente
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-bold text-ink">Mis reseñas</h1>
      </div>

      {/* C-251b: los filtros en píldoras con su ícono, su cuenta y lo que juntan (PLAN.md §1.7) */}
      <Filtros
        tamano="chica"
        etiqueta="Filtrar reseñas"
        valor={filter}
        onCambiar={setFilter}
        filtros={[
          { valor: 'all', etiqueta: 'Todas', ayuda: 'Las que dejaste', Icono: IconoLista, cuenta: reviews.length },
          { valor: 'approved', etiqueta: 'Publicadas', ayuda: 'Se ven en la ficha', Icono: IconoCheck, cuenta: reviews.filter((r) => reviewStatus(r) === 'APPROVED').length },
          { valor: 'pending', etiqueta: 'Pendientes', ayuda: 'El equipo las revisa', Icono: IconoReloj, cuenta: reviews.filter((r) => reviewStatus(r) === 'PENDING').length },
        ]}
      />

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className={`${adminCard} text-center py-16`}>
          <div className="w-16 h-16 bg-surface border border-line rounded-full flex items-center justify-center mx-auto mb-4">
            <IconoEstrella className="w-8 h-8 text-subtle" />
          </div>
          <h3 className="text-lg font-bold text-ink mb-2">No hay reseñas</h3>
          <p className="text-sm text-muted mb-6">
            {filter === 'pending'
              ? 'No tienes reseñas pendientes'
              : filter === 'approved'
                ? 'No tienes reseñas publicadas'
                : 'Aún no has dejado ninguna reseña'}
          </p>
          <Link
            href="/productos"
            className={`${adminPrimaryButton} inline-flex items-center gap-2`}
          >
            <IconoPaquete className="w-5 h-5" />
            Ver productos
          </Link>
        </div>
      ) : (
        // C-265: en dos columnas desde 1280 px, con la foto del producto (antes, tarjetas de 1.086 px para una línea)
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`${adminCard} p-4 transition-colors hover:border-brand-500/40`}
            >
              <div className="flex items-start justify-between mb-3 gap-3">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-white">
                  {review.product.mainImage
                    ? <Image src={review.product.mainImage} alt="" fill sizes="56px" className="object-contain" />
                    : <span className="flex h-full items-center justify-center text-subtle"><IconoPaquete className="h-5 w-5" aria-hidden="true" /></span>}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/productos/${review.product.slug}`}
                    className="text-base font-bold text-ink hover:text-brand-500 transition-colors"
                  >
                    {review.product.name}
                  </Link>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <IconoEstrella
                          key={i}
                          lleno={i < review.rating}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'text-warning-strong'
                              : 'text-line-strong'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted">
                      {new Date(review.createdAt).toLocaleDateString('es-VE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                {getStatusBadge(review)}
              </div>

              <p className="text-sm text-ink-soft leading-relaxed">{review.comment}</p>

              {reviewStatus(review) === 'REJECTED' && (
                <div className="mt-4 p-3 bg-surface border border-line rounded-xl">
                  <p className="text-xs text-ink-soft">
                    Nuestro equipo no la publicó{review.rejectionReason ? `: ${review.rejectionReason}` : '.'}
                  </p>
                </div>
              )}
              {reviewStatus(review) === 'PENDING' && (
                <div className="mt-4 p-3 bg-surface border border-line rounded-xl">
                  <p className="text-xs text-ink-soft flex items-center gap-2">
                    {/* C-251b: esperar va en azul (PLAN.md §1.1); el ámbar queda solo en las estrellas */}
                    <IconoReloj className="w-4 h-4 text-brand-600 flex-shrink-0" aria-hidden="true" />
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
