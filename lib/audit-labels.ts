// Nombres en español de la bitácora (audit_logs) para Reportes → Seguridad (C-104).
// Sin imports del servidor: lo usan la API y la pantalla.

export const ETIQUETA_ACCION: Record<string, string> = {
    AUTH_LOGIN_SUCCESS: 'Inicio de sesión',
    AUTH_LOGIN_FAILED: 'Contraseña incorrecta',
    AUTH_LOGIN_BLOCKED: 'Inicio de sesión bloqueado',
    AUTH_LOGOUT: 'Cierre de sesión',
    AUTH_PASSWORD_RESET: 'Contraseña recuperada',
    AUTH_PASSWORD_CHANGED: 'Contraseña cambiada',
    USER_CREATED: 'Usuario creado',
    USER_UPDATED: 'Usuario modificado',
    USER_DELETED: 'Usuario eliminado',
    USER_ROLE_CHANGED: 'Rol cambiado',
    USER_BALANCE_MODIFIED: 'Saldo cargado a mano',
    PRODUCT_CREATED: 'Producto creado',
    PRODUCT_UPDATED: 'Producto modificado',
    PRODUCT_DELETED: 'Producto eliminado',
    PRODUCT_STOCK_CHANGED: 'Stock cambiado',
    PRODUCT_PRICE_CHANGED: 'Precio cambiado',
    ORDER_CREATED: 'Orden creada',
    ORDER_STATUS_CHANGED: 'Estado de orden cambiado',
    ORDER_PAYMENT_UPDATED: 'Pago de orden confirmado',
    ORDER_CANCELLED: 'Orden cancelada',
    ORDER_REFUNDED: 'Orden reembolsada',
    GIFT_CARD_CREATED: 'Gift card creada',
    GIFT_CARD_REDEEMED: 'Gift card canjeada',
    GIFT_CARD_ACTIVATED: 'Gift card activada',
    GIFT_CARD_CANCELLED: 'Gift card anulada',
    SETTINGS_UPDATED: 'Configuración guardada',
    PAYMENT_METHOD_CHANGED: 'Método de pago cambiado',
    DISCOUNT_REQUEST_APPROVED: 'Descuento aprobado',
    DISCOUNT_REQUEST_REJECTED: 'Descuento rechazado',
    DISCOUNT_CHANGED: 'Descuento de la tienda cambiado',
    CREATOR_STATUS_CHANGED: 'Creador revisado',
    VERIFICATION_REVIEWED: 'Verificación revisada',
    SECURITY_RATE_LIMIT_HIT: 'Límite de intentos alcanzado',
    SECURITY_SUSPICIOUS_ACTIVITY: 'Actividad sospechosa',
    SECURITY_ADMIN_ACTION: 'Acción de administrador',
    SECURITY_ACCESS_DENIED: 'Acceso denegado',
    SECURITY_DUPLICATE_PAYMENT_REFERENCE: 'Referencia de pago repetida',
    BALANCE_RECHARGE_APPROVED: 'Recarga aprobada',
    BALANCE_RECHARGE_REJECTED: 'Recarga rechazada',
    ORPHAN_PAYMENT_LINKED: 'Pago sin orden vinculado a su orden',
    ORPHAN_PAYMENT_ARCHIVED: 'Pago sin orden archivado (ya atendido)',
};

export function etiquetaAccion(accion: string): string {
    return ETIQUETA_ACCION[accion] ?? accion.replace(/_/g, ' ').toLowerCase();
}

export const ETIQUETA_GRAVEDAD: Record<string, string> = {
    INFO: 'Normal',
    WARNING: 'Atención',
    CRITICAL: 'Crítica',
};
