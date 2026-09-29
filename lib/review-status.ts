// Estado de una reseña (C-124). Módulo puro: lo usan la API, el panel de moderación y "Mis reseñas".
// La base guarda `isApproved` y `rejectedAt`; el estado se deriva aquí para que nadie lo calcule distinto.

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Publicada',
  REJECTED: 'Rechazada',
};

export function reviewStatus(review: { isApproved: boolean; rejectedAt?: string | Date | null }): ReviewStatus {
  if (review.isApproved) return 'APPROVED';
  return review.rejectedAt ? 'REJECTED' : 'PENDING';
}

/** Motivo de rechazo opcional: texto de 3 a 300 caracteres, o null si no se escribió. */
export function motivoRechazo(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text === '') return null;
  return text.length >= 3 && text.length <= 300 ? text : undefined;
}
