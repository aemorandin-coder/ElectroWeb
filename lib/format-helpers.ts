/**
 * Formatea nombres de métodos de pago para mostrar al usuario
 * Convierte códigos como MOBILE_PAYMENT, BANK_TRANSFER a nombres legibles en español
 */

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    MOBILE_PAYMENT: 'Pago Móvil',
    BANK_TRANSFER: 'Transferencia Bancaria',
    ZELLE: 'Zelle',
    ZINLI: 'Zinli',
    PAYPAL: 'PayPal',
    CRYPTO: 'Criptomonedas',
    CASH: 'Efectivo',
    CREDIT_CARD: 'Tarjeta de Crédito',
    BALANCE: 'Saldo de Cuenta',
    WALLET: 'Saldo de Cuenta',
    MERCANTIL_PANAMA: 'Mercantil Panamá',
    OTHER: 'Otro',
};

/**
 * Formatea un método de pago a un nombre legible
 */
export function formatPaymentMethod(method: string | null | undefined): string {
    if (!method) return 'No especificado';
    return PAYMENT_METHOD_LABELS[method] || method.replace(/_/g, ' ');
}

/**
 * Formatea estados de transacción
 */
export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
    COMPLETED: 'Completado',
    PENDING: 'Pendiente',
    REJECTED: 'Rechazado',
    CANCELLED: 'Cancelado',
    FAILED: 'Fallido',
};

export function formatTransactionStatus(status: string | null | undefined): string {
    if (!status) return 'Desconocido';
    return TRANSACTION_STATUS_LABELS[status] || status;
}

/**
 * Formatea tipos de transacción
 */
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
    RECHARGE: 'Recarga',
    // Abonos que no son recargas: canje de gift card y comisiones de influencer (C-52)
    DEPOSIT: 'Abono',
    PURCHASE: 'Compra',
    REFUND: 'Reembolso',
    TRANSFER: 'Transferencia',
    GIFT_CARD: 'Tarjeta de Regalo',
};

/** Tipos que suman saldo. DEPOSIT (gift card canjeada, comisión) también suma aunque no sea una recarga. */
export const CREDIT_TRANSACTION_TYPES = ['RECHARGE', 'DEPOSIT', 'BONUS', 'REFUND'];

export function isCreditTransaction(type: string | null | undefined): boolean {
    return CREDIT_TRANSACTION_TYPES.includes(type || '');
}

export function formatTransactionType(type: string | null | undefined): string {
    if (!type) return 'Desconocido';
    return TRANSACTION_TYPE_LABELS[type] || type;
}
