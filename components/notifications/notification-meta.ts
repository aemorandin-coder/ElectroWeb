// Ícono y tono de cada notificación (C-73). Avisos del equipo por categoría del catálogo; las del cliente por tipo.
import {
  IconoActualizar, IconoAdvertencia, IconoBillete, IconoBolsa, IconoClientes, IconoConfirmado, IconoCorreo, IconoCursos,
  IconoDocumento, IconoEntrar, IconoEntregado, IconoEnviar, IconoEnvio, IconoEstrella, IconoFavoritos, IconoGarantia,
  IconoGiftCard, IconoMaletin, IconoNotificaciones, IconoOferta, IconoPaquete, IconoPorcentaje, IconoRechazado,
  IconoRegistrarse, IconoServicioTecnico, IconoTarjeta,
} from '@/components/iconos';
import type { IconType } from '@/components/iconos';
import type { AdminTone } from '@/lib/admin-ui';
import { ADMIN_EVENTS, isAdminEventType, type AdminEventCategory } from '@/lib/admin-events/catalog';

interface Meta {
  Icon: IconType;
  tone: AdminTone;
}

const CATEGORY_META: Record<AdminEventCategory, Meta> = {
  ventas: { Icon: IconoBolsa, tone: 'brand' },
  pagos: { Icon: IconoTarjeta, tone: 'success' },
  clientes: { Icon: IconoClientes, tone: 'neutral' },
  solicitudes: { Icon: IconoCorreo, tone: 'brand' },
  cursos: { Icon: IconoCursos, tone: 'brand' },
  promotores: { Icon: IconoRegistrarse, tone: 'success' },
  marketing: { Icon: IconoEnviar, tone: 'brand' },
  giftcards: { Icon: IconoGiftCard, tone: 'brand' },
  inventario: { Icon: IconoPaquete, tone: 'warning' },
  sistema: { Icon: IconoServicioTecnico, tone: 'neutral' },
};

// Eventos que merecen su propio ícono o un tono de alerta
const EVENT_META: Partial<Record<string, Meta>> = {
  ORDER_CANCELLED: { Icon: IconoRechazado, tone: 'danger' },
  PAYMENT_REFERENCE_DUPLICATE: { Icon: IconoAdvertencia, tone: 'danger' },
  GIFT_CARD_PIN_LOCKED: { Icon: IconoAdvertencia, tone: 'danger' },
  STOCK_OUT: { Icon: IconoPaquete, tone: 'danger' },
  CUSTOMER_REGISTERED: { Icon: IconoRegistrarse, tone: 'neutral' },
  ACCOUNT_DELETION_REQUESTED: { Icon: IconoAdvertencia, tone: 'warning' },
  REVIEW_SUBMITTED: { Icon: IconoEstrella, tone: 'warning' },
  DISCOUNT_REQUESTED: { Icon: IconoPorcentaje, tone: 'brand' },
  EXCHANGE_RATE_UPDATED: { Icon: IconoActualizar, tone: 'neutral' },
  EXCHANGE_RATE_FAILED: { Icon: IconoAdvertencia, tone: 'warning' },
  ADMIN_LOGIN: { Icon: IconoEntrar, tone: 'neutral' },
  QUOTE_REQUESTED: { Icon: IconoDocumento, tone: 'warning' },
  QUOTE_APPROVED: { Icon: IconoConfirmado, tone: 'success' },
  ADMIN_SESSION_REPORTED: { Icon: IconoAdvertencia, tone: 'danger' },
  ADMIN_TEAM_CHANGED: { Icon: IconoGarantia, tone: 'warning' },
  // Notificaciones del cliente
  ORDER_CONFIRMED: { Icon: IconoConfirmado, tone: 'brand' },
  ORDER_PAID: { Icon: IconoBillete, tone: 'success' },
  ORDER_SHIPPED: { Icon: IconoEnvio, tone: 'brand' },
  ORDER_DELIVERED: { Icon: IconoEntregado, tone: 'success' },
  REVIEW_APPROVED: { Icon: IconoEstrella, tone: 'success' },
  PROMOTION: { Icon: IconoOferta, tone: 'brand' },
  RECHARGE_APPROVED: { Icon: IconoBillete, tone: 'success' },
  RECHARGE_REJECTED: { Icon: IconoRechazado, tone: 'danger' },
  BALANCE_PENDING: { Icon: IconoTarjeta, tone: 'brand' },
  DISCOUNT_REQUEST: { Icon: IconoPorcentaje, tone: 'brand' },
  FAVORITE_PRICE_DROP: { Icon: IconoOferta, tone: 'brand' },
  FAVORITE_BACK_IN_STOCK: { Icon: IconoFavoritos, tone: 'success' },
  BUSINESS_VERIFIED: { Icon: IconoMaletin, tone: 'brand' },
};

export function notificationMeta(type: string): Meta {
  const specific = EVENT_META[type];
  if (specific) return specific;
  if (isAdminEventType(type)) return CATEGORY_META[ADMIN_EVENTS[type].category];
  return { Icon: IconoNotificaciones, tone: 'neutral' };
}

const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** "hace 5 minutos", "ayer", "12 sept" */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'hace un momento';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 7 * 86400) return relative.format(Math.round(seconds / 86400), 'day');
  return new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
}
