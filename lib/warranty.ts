// Solicitudes de garantía (C-122). Módulo puro: lo usan el panel del cliente, el del equipo y la API.
// Flujo de los términos 3.0 (§6): la tienda revisa; repara, y si no puede, cambia; y si tampoco, devuelve al saldo.

export const CLAIM_STATUSES = ['RECEIVED', 'IN_REVIEW', 'WAITING_CUSTOMER', 'APPROVED', 'RESOLVED', 'REJECTED'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const RESOLUTIONS = ['REPAIR', 'REPLACEMENT', 'BALANCE_REFUND'] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export type ClaimTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

/** Cómo lo ve el equipo */
export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  RECEIVED: 'Recibida',
  IN_REVIEW: 'En revisión',
  WAITING_CUSTOMER: 'Esperando al cliente',
  APPROVED: 'Aprobada',
  RESOLVED: 'Resuelta',
  REJECTED: 'No cubierta',
};

/** Cómo lo ve el cliente */
export const CLAIM_STATUS_CUSTOMER: Record<ClaimStatus, string> = {
  RECEIVED: 'Recibida',
  IN_REVIEW: 'En revisión',
  WAITING_CUSTOMER: 'Esperamos tu respuesta',
  APPROVED: 'Aprobada',
  RESOLVED: 'Resuelta',
  REJECTED: 'No cubierta',
};

/** Qué significa cada estado, dicho al cliente */
export const CLAIM_STATUS_HELP: Record<ClaimStatus, string> = {
  RECEIVED: 'La recibimos. Te respondemos en 1 a 2 días hábiles.',
  IN_REVIEW: 'La estamos revisando.',
  WAITING_CUSTOMER: 'Necesitamos algo de ti: lee el último mensaje y responde aquí.',
  APPROVED: 'La garantía aplica. En el último mensaje están los pasos para llevar o enviar el equipo.',
  RESOLVED: 'Listo: la solicitud quedó resuelta.',
  REJECTED: 'La garantía no cubre este caso. El motivo está en el último mensaje.',
};

export const CLAIM_STATUS_TONE: Record<ClaimStatus, ClaimTone> = {
  RECEIVED: 'warning',
  IN_REVIEW: 'brand',
  WAITING_CUSTOMER: 'warning',
  APPROVED: 'brand',
  RESOLVED: 'success',
  REJECTED: 'neutral',
};

export const RESOLUTION_LABEL: Record<Resolution, string> = {
  REPAIR: 'Reparado',
  REPLACEMENT: 'Cambiado por otro',
  BALANCE_REFUND: 'Devuelto al saldo',
};

export const isClosedStatus = (s: ClaimStatus): boolean => s === 'RESOLVED' || s === 'REJECTED';

/** "G-0012": el número para hablar con el cliente */
export const claimCode = (n: number): string => `G-${String(n).padStart(4, '0')}`;

/** Fotos por mensaje (las da el cliente: la falla, el daño, la etiqueta) */
export const WARRANTY_MAX_PHOTOS = 4;
export const WARRANTY_MESSAGE_MAX = 2000;
