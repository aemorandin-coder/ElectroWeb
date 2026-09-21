'use client';

import { useState, useEffect } from 'react';
import { FiStar, FiPackage, FiClock, FiCheck } from 'react-icons/fi';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  adminCard,
  adminPrimaryButton,
  adminTab,
  adminBadge,
} from '@/lib/admin-ui';

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

  async function fetchMyReviews() {
    try {
      const response = await fetch('/api/reviews');
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

  const filteredReviews = reviews.filter(review => {
    if (filter === 'approved') return review.isApproved && review.isPublished;
    if (filter === 'pending') return !review.isApproved;
    return true;
  });

  const getStatusBadge = (review: Review) => {
    if (review.isApproved && review.isPublished) {
      return (
        <span className={adminBadge('success')}>
          <FiCheck className="w-3 h-3" />
          Publicada
        </span>
      );
    }
    return (
      <span className={adminBadge('warning')}>
        <FiClock className="w-3 h-3" />
        Pendiente
      </span>
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-bold text-ink">Mis Reseñas</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={adminTab(filter === 'all')}
        >
          Todas
        </button>
        <button
          type="button"
          onClick={() => setFilter('approved')}
          className={adminTab(filter === 'approved')}
        >
          Publicadas
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={adminTab(filter === 'pending')}
        >
          Pendientes
        </button>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className={`${adminCard} text-center py-16`}>
          <div className="w-16 h-16 bg-surface border border-line rounded-full flex items-center justify-center mx-auto mb-4">
            <FiStar className="w-8 h-8 text-subtle" />
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
            <FiPackage className="w-5 h-5" />
            Ver Productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`${adminCard} p-5 lg:p-6 transition-colors hover:border-brand-500/40`}
            >
              <div className="flex items-start justify-between mb-4 gap-4">
                <div className="flex-1">
                  <Link
                    href={`/productos/${review.product.slug}`}
                    className="text-base lg:text-lg font-bold text-ink hover:text-brand-500 transition-colors"
                  >
                    {review.product.name}
                  </Link>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <FiStar
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'fill-warning-strong text-warning-strong'
                              : 'text-line-strong'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted">
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

              <p className="text-sm text-ink-soft leading-relaxed">{review.comment}</p>

              {!review.isApproved && (
                <div className="mt-4 p-3 bg-surface border border-line rounded-xl">
                  <p className="text-xs text-ink-soft flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-warning-strong flex-shrink-0" />
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
