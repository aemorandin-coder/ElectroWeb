'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import ReviewForm from '@/components/reviews/ReviewForm';
import ReviewList from '@/components/reviews/ReviewList';
import ReviewStats from '@/components/reviews/ReviewStats';
import type { PublicReview, ReviewSummary } from '@/lib/queries/product';

interface ProductReviewsProps {
  productId: string;
  initialReviews: PublicReview[];
  initialSummary: ReviewSummary;
}

/** Reseñas del detalle: llegan renderizadas desde el servidor y se recargan al enviar una nueva. */
export default function ProductReviews({ productId, initialReviews, initialSummary }: ProductReviewsProps) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);

  const reload = async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews ?? []);
      setSummary({ average: data.stats?.averageRating ?? 0, count: data.stats?.totalReviews ?? 0 });
    } catch {
      // Si falla, la reseña quedó enviada igual; se verá al recargar la página
    }
  };

  const distribution = reviews.reduce(
    (acc, review) => {
      const stars = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
      acc[stars] += 1;
      return acc;
    },
    { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div>
        <ReviewStats averageRating={summary.average} totalReviews={summary.count} ratingDistribution={distribution} />
      </div>
      <div className="space-y-6 lg:col-span-2">
        <ReviewList reviews={reviews} showLoginPrompt={!session} />
        <ReviewForm productId={productId} onReviewSubmitted={reload} />
      </div>
    </div>
  );
}
