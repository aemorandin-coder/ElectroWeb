// Ícono y tono de cada notificación (C-73). Avisos del equipo por categoría del catálogo; las del cliente por tipo.
import type { IconType } from 'react-icons';
import {
  FiAlertTriangle, FiBell, FiBookOpen, FiBox, FiCheckCircle, FiCreditCard, FiDollarSign, FiGift, FiLogIn,
  FiMail, FiPackage, FiPercent, FiRefreshCw, FiShoppingBag, FiStar, FiTag, FiTool, FiTruck, FiUserPlus, FiUsers, FiXCircle,
} from 'react-icons/fi';
import type { AdminTone } from '@/lib/admin-ui';
import { ADMIN_EVENTS, isAdminEventType, type AdminEventCategory } from '@/lib/admin-events/catalog';

interface Meta {
  Icon: IconType;
  tone: AdminTone;
}

const CATEGORY_META: Record<AdminEventCategory, Meta> = {
  ventas: { Icon: FiShoppingBag, tone: 'brand' },
  pagos: { Icon: FiCreditCard, tone: 'success' },
  clientes: { Icon: FiUsers, tone: 'neutral' },
  solicitudes: { Icon: FiMail, tone: 'brand' },
  cursos: { Icon: FiBookOpen, tone: 'brand' },
  promotores: { Icon: FiUserPlus, tone: 'success' },
  giftcards: { Icon: FiGift, tone: 'brand' },
  inventario: { Icon: FiPackage, tone: 'warning' },
  sistema: { Icon: FiTool, tone: 'neutral' },
};

// Eventos que merecen su propio ícono o un tono de alerta
const EVENT_META: Partial<Record<string, Meta>> = {
  ORDER_CANCELLED: { Icon: FiXCircle, tone: 'danger' },
  PAYMENT_REFERENCE_DUPLICATE: { Icon: FiAlertTriangle, tone: 'danger' },
  GIFT_CARD_PIN_LOCKED: { Icon: FiAlertTriangle, tone: 'danger' },
  STOCK_OUT: { Icon: FiPackage, tone: 'danger' },
  CUSTOMER_REGISTERED: { Icon: FiUserPlus, tone: 'neutral' },
  REVIEW_SUBMITTED: { Icon: FiStar, tone: 'warning' },
  DISCOUNT_REQUESTED: { Icon: FiPercent, tone: 'brand' },
  EXCHANGE_RATE_UPDATED: { Icon: FiRefreshCw, tone: 'neutral' },
  EXCHANGE_RATE_FAILED: { Icon: FiAlertTriangle, tone: 'warning' },
  ADMIN_LOGIN: { Icon: FiLogIn, tone: 'neutral' },
  // Notificaciones del cliente
  ORDER_CONFIRMED: { Icon: FiCheckCircle, tone: 'brand' },
  ORDER_PAID: { Icon: FiDollarSign, tone: 'success' },
  ORDER_SHIPPED: { Icon: FiTruck, tone: 'brand' },
  ORDER_DELIVERED: { Icon: FiBox, tone: 'success' },
  REVIEW_APPROVED: { Icon: FiStar, tone: 'warning' },
  PROMOTION: { Icon: FiTag, tone: 'brand' },
  RECHARGE_APPROVED: { Icon: FiDollarSign, tone: 'success' },
  RECHARGE_REJECTED: { Icon: FiXCircle, tone: 'danger' },
  BALANCE_PENDING: { Icon: FiCreditCard, tone: 'warning' },
  DISCOUNT_REQUEST: { Icon: FiPercent, tone: 'brand' },
};

export function notificationMeta(type: string): Meta {
  const specific = EVENT_META[type];
  if (specific) return specific;
  if (isAdminEventType(type)) return CATEGORY_META[ADMIN_EVENTS[type].category];
  return { Icon: FiBell, tone: 'neutral' };
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
