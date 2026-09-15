// Catálogo de avisos al equipo (C-73). Sin imports de servidor: lo usa también la página del panel.
// Cada evento llega por los canales activos: panel (campana y bandeja), correo (lista de alertas) y Telegram.

export type AdminEventCategory =
  | 'ventas'
  | 'pagos'
  | 'clientes'
  | 'solicitudes'
  | 'cursos'
  | 'promotores'
  | 'giftcards'
  | 'inventario'
  | 'sistema';

export type AdminChannel = 'panel' | 'email' | 'telegram';
export type ChannelSet = Record<AdminChannel, boolean>;

export interface AdminEventDefinition {
  label: string;
  description: string;
  category: AdminEventCategory;
  defaults: ChannelSet;
  /** Telegram sin sonido: eventos informativos que no piden acción */
  silent?: boolean;
}

export const CATEGORY_LABELS: Record<AdminEventCategory, string> = {
  ventas: 'Ventas',
  pagos: 'Saldo y pagos',
  clientes: 'Clientes',
  solicitudes: 'Solicitudes',
  cursos: 'Cursos y creadores',
  promotores: 'Promotores',
  giftcards: 'Gift cards',
  inventario: 'Inventario',
  sistema: 'Tasa y sistema',
};

const on = (panel: boolean, email: boolean, telegram: boolean): ChannelSet => ({ panel, email, telegram });

export const ADMIN_EVENTS = {
  ORDER_CREATED: { category: 'ventas', label: 'Nueva venta', description: 'Un cliente hizo una orden, con total, pago y entrega.', defaults: on(true, true, true) },
  ORDER_PAID: { category: 'ventas', label: 'Pago de orden confirmado', description: 'Un administrador marcó una orden como pagada.', defaults: on(true, false, true) },
  ORDER_CANCELLED: { category: 'ventas', label: 'Orden cancelada', description: 'Una orden pasó a cancelada, con el motivo.', defaults: on(true, false, true) },

  RECHARGE_REQUESTED: { category: 'pagos', label: 'Recarga por aprobar', description: 'Un cliente pidió recargar saldo y espera aprobación.', defaults: on(true, true, true) },
  RECHARGE_AUTO_APPROVED: { category: 'pagos', label: 'Recarga aprobada por Pago Móvil', description: 'El banco confirmó el pago y el saldo se acreditó solo.', defaults: on(true, false, true) },
  PAYMENT_REFERENCE_DUPLICATE: { category: 'pagos', label: 'Referencia de pago repetida', description: 'Alguien intentó usar una referencia de Pago Móvil que ya se usó.', defaults: on(true, true, true) },

  CUSTOMER_REGISTERED: { category: 'clientes', label: 'Cliente nuevo', description: 'Alguien creó una cuenta en la tienda.', defaults: on(true, false, true), silent: true },
  BUSINESS_VERIFICATION: { category: 'clientes', label: 'Verificación de empresa', description: 'Un cliente subió acta y RIF para cuenta de empresa.', defaults: on(true, false, true) },
  CONTACT_MESSAGE: { category: 'clientes', label: 'Mensaje de contacto', description: 'Llegó un mensaje desde el formulario de Contacto.', defaults: on(true, false, true) },
  REVIEW_SUBMITTED: { category: 'clientes', label: 'Reseña por aprobar', description: 'Un cliente dejó una reseña de producto.', defaults: on(true, false, false), silent: true },

  PRODUCT_REQUESTED: { category: 'solicitudes', label: 'Solicitud de producto', description: 'Un cliente pidió un producto que no está en el catálogo.', defaults: on(true, false, true) },
  DISCOUNT_REQUESTED: { category: 'solicitudes', label: 'Solicitud de descuento', description: 'Un cliente pidió descuento en un producto de su lista de deseos.', defaults: on(true, false, true) },

  CREATOR_APPLIED: { category: 'cursos', label: 'Solicitud de creador', description: 'Alguien quiere publicar cursos en la plataforma.', defaults: on(true, true, true) },
  COURSE_SUBMITTED: { category: 'cursos', label: 'Curso por revisar', description: 'Un creador subió un curso nuevo que espera aprobación.', defaults: on(true, false, true) },
  COURSE_ENROLLED: { category: 'cursos', label: 'Inscripción a curso', description: 'Un cliente se inscribió en un curso.', defaults: on(true, false, true), silent: true },

  REFERRAL_CONVERSION: { category: 'promotores', label: 'Venta o registro de un promotor', description: 'Un cliente referido por un promotor se registró, compró o recargó.', defaults: on(true, false, true), silent: true },

  GIFT_CARD_PURCHASED: { category: 'giftcards', label: 'Gift card comprada', description: 'Un cliente compró una gift card digital.', defaults: on(true, false, true) },
  GIFT_CARD_REDEEMED: { category: 'giftcards', label: 'Gift card canjeada', description: 'Una gift card se canjeó a saldo.', defaults: on(true, false, false), silent: true },
  GIFT_CARD_SOLD_IN_STORE: { category: 'giftcards', label: 'Gift card vendida en tienda', description: 'Un administrador activó una gift card impresa al venderla.', defaults: on(false, false, true), silent: true },
  GIFT_CARD_PIN_LOCKED: { category: 'giftcards', label: 'Gift card bloqueada por PIN', description: 'Una tarjeta llegó al límite de PIN equivocados.', defaults: on(true, true, true) },

  STOCK_LOW: { category: 'inventario', label: 'Stock bajo', description: 'Una venta dejó un producto en el umbral de stock bajo.', defaults: on(true, true, true) },
  STOCK_OUT: { category: 'inventario', label: 'Producto agotado', description: 'Una venta dejó un producto sin stock.', defaults: on(true, true, true) },

  EXCHANGE_RATE_UPDATED: { category: 'sistema', label: 'Tasa BCV actualizada', description: 'La tasa automática cambió.', defaults: on(false, false, true), silent: true },
  EXCHANGE_RATE_FAILED: { category: 'sistema', label: 'Tasa BCV sin actualizar', description: 'La fuente no respondió o mandó una tasa que no cuadra.', defaults: on(true, false, true) },
  MAINTENANCE_CHANGED: { category: 'sistema', label: 'Modo mantenimiento', description: 'Alguien activó o apagó el modo mantenimiento.', defaults: on(true, false, true) },
  ADMIN_LOGIN: { category: 'sistema', label: 'Inicio de sesión en el panel', description: 'Un administrador entró al panel, con dispositivo e IP.', defaults: on(false, false, true), silent: true },
} satisfies Record<string, AdminEventDefinition>;

export type AdminEventType = keyof typeof ADMIN_EVENTS;
export const ADMIN_EVENT_TYPES = Object.keys(ADMIN_EVENTS) as AdminEventType[];

export function isAdminEventType(value: unknown): value is AdminEventType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ADMIN_EVENTS, value);
}

export type ChannelMatrix = Record<AdminEventType, ChannelSet>;

/** Configuración guardada (JSON parcial) + valores por defecto del catálogo. */
export function resolveChannels(saved: unknown): ChannelMatrix {
  const source = saved && typeof saved === 'object' ? (saved as Record<string, Partial<ChannelSet>>) : {};
  return Object.fromEntries(
    ADMIN_EVENT_TYPES.map((type) => {
      const defaults = ADMIN_EVENTS[type].defaults;
      const row = source[type] ?? {};
      return [type, {
        panel: typeof row.panel === 'boolean' ? row.panel : defaults.panel,
        email: typeof row.email === 'boolean' ? row.email : defaults.email,
        telegram: typeof row.telegram === 'boolean' ? row.telegram : defaults.telegram,
      }];
    })
  ) as ChannelMatrix;
}

/** Tipos de evento de una categoría (para filtrar la bandeja). */
export function eventTypesOf(category: AdminEventCategory): AdminEventType[] {
  return ADMIN_EVENT_TYPES.filter((type) => ADMIN_EVENTS[type].category === category);
}
