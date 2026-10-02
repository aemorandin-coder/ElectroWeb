import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { Session } from 'next-auth';
import { ipParaRegistro } from '@/lib/ip';

/**
 * Tipos de acciones que se registran en el audit log
 */
export type AuditAction =
    // Auth actions
    | 'AUTH_LOGIN_SUCCESS'
    | 'AUTH_LOGIN_FAILED'
    | 'AUTH_LOGIN_BLOCKED'
    | 'AUTH_LOGOUT'
    | 'AUTH_PASSWORD_RESET'
    | 'AUTH_PASSWORD_CHANGED'
    // User management
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_DELETED'
    | 'USER_ROLE_CHANGED'
    | 'USER_BALANCE_MODIFIED'
    // Product management
    | 'PRODUCT_CREATED'
    | 'PRODUCT_UPDATED'
    | 'PRODUCT_DELETED'
    | 'PRODUCT_STOCK_CHANGED'
    | 'PRODUCT_PRICE_CHANGED'
    // Order management
    | 'ORDER_CREATED'
    | 'ORDER_STATUS_CHANGED'
    | 'ORDER_PAYMENT_UPDATED'
    // C-147: el equipo anotó (o corrigió) el número de la factura de una orden
    | 'ORDER_INVOICE_NOTED'
    | 'ORDER_CANCELLED'
    | 'ORDER_REFUNDED'
    // Gift Cards
    | 'GIFT_CARD_CREATED'
    | 'GIFT_CARD_REDEEMED'
    | 'GIFT_CARD_ACTIVATED'
    | 'GIFT_CARD_CANCELLED'
    // Settings
    | 'SETTINGS_UPDATED'
    | 'PAYMENT_METHOD_CHANGED'
    // Aprobaciones del panel (C-104)
    | 'DISCOUNT_REQUEST_APPROVED'
    | 'DISCOUNT_REQUEST_REJECTED'
    | 'DISCOUNT_CHANGED'
    | 'CREATOR_STATUS_CHANGED'
    | 'VERIFICATION_REVIEWED'
    // Security
    | 'SECURITY_RATE_LIMIT_HIT'
    | 'SECURITY_SUSPICIOUS_ACTIVITY'
    | 'SECURITY_ADMIN_ACTION'
    | 'SECURITY_ACCESS_DENIED'
    | 'SECURITY_DUPLICATE_PAYMENT_REFERENCE'
    // Balance
    | 'BALANCE_RECHARGE_APPROVED'
    | 'BALANCE_RECHARGE_REJECTED'
    // C-123: Pagos Móvil de compra sin orden
    | 'ORPHAN_PAYMENT_LINKED'
    | 'ORPHAN_PAYMENT_ARCHIVED'
    // C-129: el equipo consultó un Pago Móvil al BDV desde Transacciones (solo consulta)
    | 'PAGO_MOVIL_CONSULTADO'
    // C-165: respaldos a Google Drive
    | 'BACKUP_SETTINGS_CHANGED'
    | 'BACKUP_KEY_CREATED'
    | 'BACKUP_DRIVE_CONNECTED'
    | 'BACKUP_DRIVE_DISCONNECTED'
    | 'BACKUP_RUN_REQUESTED';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

interface AuditLogParams {
    action: AuditAction;
    userId?: string;
    userEmail?: string;
    targetType?: string; // 'USER', 'PRODUCT', 'ORDER', 'SETTINGS', etc.
    targetId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    severity?: AuditSeverity;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
    const {
        action,
        userId,
        userEmail,
        targetType,
        targetId,
        details,
        ipAddress,
        userAgent,
        severity = 'INFO',
    } = params;

    try {
        await prisma.auditLog.create({
            data: {
                action,
                userId,
                // Topes de largo: estos campos pueden venir de quien ataca (correo tecleado, navegador)
                userEmail: userEmail?.slice(0, 255),
                targetType,
                targetId,
                details: details ? JSON.stringify(details).slice(0, 4000) : null,
                ipAddress,
                userAgent: userAgent?.slice(0, 300),
                severity,
                createdAt: new Date(),
            },
        });
    } catch (error) {
        // Don't throw - audit logging should never break the main flow
        console.error('[AUDIT] Failed to create audit log:', error);
    }
}

/**
 * Helper to extract request metadata for audit logs
 */
export function getRequestMetadata(request: Request) {
    return {
        ipAddress: ipParaRegistro(request.headers),
        userAgent: request.headers.get('user-agent') || 'unknown',
    };
}

/**
 * Log admin action with full context
 */
export async function logAdminAction(
    adminId: string,
    adminEmail: string,
    action: AuditAction,
    target: { type: string; id?: string },
    details: Record<string, unknown>,
    request?: Request
) {
    const metadata = request ? getRequestMetadata(request) : {};

    await createAuditLog({
        action,
        userId: adminId,
        userEmail: adminEmail,
        targetType: target.type,
        targetId: target.id,
        details: {
            ...details,
            timestamp: new Date().toISOString(),
        },
        ...metadata,
        severity: getSeverityForAction(action),
    });
}

/**
 * Acción hecha desde el panel (C-104): quién la hizo sale de la sesión, nunca del body.
 * No lanza: la bitácora nunca rompe la acción que registra.
 */
export async function registrarAccionAdmin(
    session: Session | null,
    action: AuditAction,
    target: { type: string; id?: string },
    details: Record<string, unknown> = {},
    request?: Request
): Promise<void> {
    const user = session?.user as { id?: string; email?: string | null } | undefined;
    await createAuditLog({
        action,
        userId: user?.id,
        userEmail: user?.email ?? undefined,
        targetType: target.type,
        targetId: target.id,
        details,
        ...(request ? getRequestMetadata(request) : {}),
        severity: getSeverityForAction(action),
    });
}

/**
 * Determine severity based on action type
 */
export function getSeverityForAction(action: AuditAction): AuditSeverity {
    // "Crítica" es lo que alguien debe mirar hoy. Guardar la configuración o cargar saldo a mano es trabajo
    // normal del panel: queda en la bitácora sin encender la alarma (C-104).
    const criticalActions: AuditAction[] = [
        'USER_DELETED',
        'USER_ROLE_CHANGED',
        'ORDER_REFUNDED',
        'SECURITY_SUSPICIOUS_ACTIVITY',
        'SECURITY_DUPLICATE_PAYMENT_REFERENCE',
    ];

    const warningActions: AuditAction[] = [
        'AUTH_LOGIN_FAILED',
        'AUTH_LOGIN_BLOCKED',
        'AUTH_PASSWORD_RESET',
        'USER_BALANCE_MODIFIED',
        'ORDER_CANCELLED',
        'PRODUCT_DELETED',
        'SECURITY_RATE_LIMIT_HIT',
        'SECURITY_ACCESS_DENIED',
        // C-123: un pago que entró y se cierra sin acreditar ni orden en el sistema
        'ORPHAN_PAYMENT_ARCHIVED',
    ];

    if (criticalActions.includes(action)) return 'CRITICAL';
    if (warningActions.includes(action)) return 'WARNING';
    return 'INFO';
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: {
    userId?: string;
    action?: AuditAction;
    targetType?: string;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.targetType) where.targetType = filters.targetType;
    if (filters.severity) where.severity = filters.severity;

    if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
    });
}
