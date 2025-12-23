import { prisma } from '@/lib/prisma';

/**
 * Tipos de acciones que se registran en el audit log
 */
export type AuditAction =
    // Auth actions
    | 'AUTH_LOGIN_SUCCESS'
    | 'AUTH_LOGIN_FAILED'
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
    // Order management
    | 'ORDER_CREATED'
    | 'ORDER_STATUS_CHANGED'
    | 'ORDER_PAYMENT_UPDATED'
    | 'ORDER_CANCELLED'
    | 'ORDER_REFUNDED'
    // Gift Cards
    | 'GIFT_CARD_CREATED'
    | 'GIFT_CARD_REDEEMED'
    | 'GIFT_CARD_CANCELLED'
    // Settings
    | 'SETTINGS_UPDATED'
    | 'PAYMENT_METHOD_CHANGED'
    // Security
    | 'SECURITY_RATE_LIMIT_HIT'
    | 'SECURITY_SUSPICIOUS_ACTIVITY'
    | 'SECURITY_ADMIN_ACTION'
    | 'SECURITY_ACCESS_DENIED';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

interface AuditLogParams {
    action: AuditAction;
    userId?: string;
    userEmail?: string;
    targetType?: string; // 'USER', 'PRODUCT', 'ORDER', 'SETTINGS', etc.
    targetId?: string;
    details?: Record<string, any>;
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
                userEmail,
                targetType,
                targetId,
                details: details ? JSON.stringify(details) : null,
                ipAddress,
                userAgent,
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
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');

    return {
        ipAddress: forwardedFor?.split(',')[0].trim() || realIp || 'unknown',
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
    details: Record<string, any>,
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
 * Determine severity based on action type
 */
function getSeverityForAction(action: AuditAction): AuditSeverity {
    const criticalActions: AuditAction[] = [
        'USER_DELETED',
        'USER_ROLE_CHANGED',
        'USER_BALANCE_MODIFIED',
        'ORDER_REFUNDED',
        'SETTINGS_UPDATED',
        'SECURITY_SUSPICIOUS_ACTIVITY',
    ];

    const warningActions: AuditAction[] = [
        'AUTH_LOGIN_FAILED',
        'AUTH_PASSWORD_RESET',
        'ORDER_CANCELLED',
        'PRODUCT_DELETED',
        'SECURITY_RATE_LIMIT_HIT',
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
    const where: any = {};

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
