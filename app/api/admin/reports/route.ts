import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { etiquetaAccion } from '@/lib/audit-labels';

// Reportes del panel (C-104). Cada número sale de una consulta con el mismo criterio que explica la pantalla:
// - Ingresos: órdenes con el pago confirmado (paymentStatus PAID), sin canceladas ni reembolsadas,
//   por la fecha del pago. Antes sumaba todas las órdenes creadas, pagadas o no, canceladas incluidas.
// - Días en hora de Venezuela: antes se agrupaban en UTC y una venta de las 9 p. m. caía en el día siguiente.
// - Seguridad: la bitácora (audit_logs) que escriben el login, las aprobaciones y los cambios de precio.

const ZONA = 'America/Caracas';
const PERIODOS: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
const ORDEN_NO_VALIDA = ['CANCELLED', 'REFUNDED'] as const;

/** YYYY-MM-DD en hora de Venezuela */
function diaLocal(fecha: Date): string {
    return fecha.toLocaleDateString('en-CA', { timeZone: ZONA });
}

function listaDeDias(desde: Date): string[] {
    const dias: string[] = [];
    const cursor = new Date(desde);
    const hoy = diaLocal(new Date());
    for (let i = 0; i < 367; i++) {
        const dia = diaLocal(cursor);
        if (dias[dias.length - 1] !== dia) dias.push(dia);
        if (dia === hoy) break;
        cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
    return dias;
}

/** Órdenes pagadas en el período (por fecha del pago; las viejas sin paidAt, por fecha de creación) */
function pagadasDesde(desde: Date): Prisma.OrderWhereInput {
    return {
        paymentStatus: 'PAID',
        status: { notIn: [...ORDEN_NO_VALIDA] },
        OR: [{ paidAt: { gte: desde } }, { paidAt: null, createdAt: { gte: desde } }],
    };
}

// Grupos del filtro de la bitácora
const GRUPOS: Record<string, Prisma.AuditLogWhereInput> = {
    alertas: { severity: { in: ['WARNING', 'CRITICAL'] } },
    accesos: { action: { startsWith: 'AUTH_' } },
    precios: { action: { in: ['PRODUCT_PRICE_CHANGED', 'PRODUCT_DELETED', 'DISCOUNT_CHANGED'] } },
    aprobaciones: {
        action: {
            in: [
                'BALANCE_RECHARGE_APPROVED', 'BALANCE_RECHARGE_REJECTED', 'DISCOUNT_REQUEST_APPROVED', 'DISCOUNT_REQUEST_REJECTED',
                'ORDER_PAYMENT_UPDATED', 'ORDER_CANCELLED', 'ORDER_STATUS_CHANGED', 'CREATOR_STATUS_CHANGED', 'VERIFICATION_REVIEWED',
                'GIFT_CARD_ACTIVATED', 'USER_BALANCE_MODIFIED',
            ],
        },
    },
    configuracion: { action: { in: ['SETTINGS_UPDATED', 'PAYMENT_METHOD_CHANGED', 'USER_ROLE_CHANGED'] } },
};

/** Resumen legible de `details` (JSON) para la tabla, sin volcar el objeto entero */
function resumenDetalles(action: string, detalles: string | null): string {
    if (!detalles) return '';
    let d: Record<string, unknown>;
    try {
        d = JSON.parse(detalles);
    } catch {
        return '';
    }
    const usd = (v: unknown) => (typeof v === 'number' ? `$${v.toFixed(2)}` : '');
    switch (action) {
        case 'PRODUCT_PRICE_CHANGED':
        {
            const uno = Array.isArray(d.cambios) && d.cambios.length === 1 ? (d.cambios[0] as Record<string, unknown>) : null;
            if (typeof d.producto === 'string') return `${d.producto}: ${usd(d.antes)} → ${usd(d.despues)}`;
            if (uno && d.productos === 1) return `${d.origen}: ${uno.producto}: ${usd(uno.antes)} → ${usd(uno.despues)}`;
            const n = Number(d.productos ?? 0);
            return `${d.origen ?? 'Masivo'}: ${n} ${n === 1 ? 'producto' : 'productos'}${typeof d.porcentaje === 'number' ? ` (${d.porcentaje > 0 ? '+' : ''}${d.porcentaje}%)` : ''}`;
        }
        case 'AUTH_LOGIN_SUCCESS':
            return `${d.metodo === 'google' ? 'Con Google' : 'Con contraseña'}${d.panel ? ' · panel' : ''}`;
        case 'AUTH_LOGIN_FAILED':
            return d.cuentaExiste ? 'La cuenta existe' : 'Correo sin cuenta';
        case 'AUTH_LOGIN_BLOCKED':
            return typeof d.esperaSegundos === 'number' ? `Espera de ${Math.ceil(d.esperaSegundos / 60)} min` : '';
        case 'ORDER_PAYMENT_UPDATED':
        case 'ORDER_CANCELLED':
        case 'ORDER_STATUS_CHANGED':
            return [d.orden, usd(d.total), d.motivo].filter(Boolean).join(' · ');
        case 'BALANCE_RECHARGE_APPROVED':
        case 'BALANCE_RECHARGE_REJECTED':
            return [usd(d.monto ?? d.amount), d.motivo].filter(Boolean).join(' · ');
        case 'DISCOUNT_REQUEST_APPROVED':
        case 'DISCOUNT_REQUEST_REJECTED':
            return [d.producto, typeof d.descuento === 'number' ? `${d.descuento}%` : null].filter(Boolean).join(' · ');
        case 'SETTINGS_UPDATED':
            return Array.isArray(d.campos) ? `${d.campos.length} campo${d.campos.length === 1 ? '' : 's'}` : '';
        case 'PAYMENT_METHOD_CHANGED':
            return [d.cambio, d.metodo].filter(Boolean).join(' · ');
        default: {
            const texto = ['producto', 'creador', 'cliente', 'motivo', 'reason', 'error', 'nombre', 'codigo']
                .map((k) => d[k])
                .find((v) => typeof v === 'string');
            return typeof texto === 'string' ? texto.slice(0, 120) : '';
        }
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!isAuthorized(session, 'VIEW_REPORTS')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
        }

        const { searchParams } = new URL(request.url);
        const period = PERIODOS[searchParams.get('period') ?? ''] ? (searchParams.get('period') as string) : '7d';
        const type = searchParams.get('type') || 'overview';
        const startDate = new Date(Date.now() - PERIODOS[period] * 24 * 60 * 60 * 1000);
        const enPeriodo = { gte: startDate };

        if (type === 'overview') {
            const clientes = { role: { notIn: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] as ('ADMIN' | 'SUPER_ADMIN' | 'SUPPORT')[] } };
            const [
                totalUsers, newUsers, ordersCreated, ordersPending, paidAgg, totalProducts, publishedProducts,
                pendingProductRequests, pageViews, clicks, visitantes, eventos, alertas, criticas, loginsFallidos,
                paidOrders, usersInPeriod, createdInPeriod,
            ] = await Promise.all([
                prisma.user.count({ where: clientes }),
                prisma.user.count({ where: { ...clientes, createdAt: enPeriodo } }),
                prisma.order.count({ where: { createdAt: enPeriodo, status: { notIn: [...ORDEN_NO_VALIDA] } } }),
                prisma.order.count({ where: { createdAt: enPeriodo, paymentStatus: 'PENDING', status: { notIn: [...ORDEN_NO_VALIDA] } } }),
                prisma.order.aggregate({ _sum: { totalUSD: true }, _count: true, where: pagadasDesde(startDate) }),
                prisma.product.count(),
                prisma.product.count({ where: { status: 'PUBLISHED' } }),
                prisma.productRequest.count({ where: { status: 'PENDING' } }),
                prisma.analyticsEvent.count({ where: { eventType: 'page_view', createdAt: enPeriodo } }),
                prisma.analyticsEvent.count({ where: { eventType: 'click', createdAt: enPeriodo } }),
                prisma.analyticsEvent.groupBy({ by: ['sessionId'], where: { createdAt: enPeriodo, sessionId: { not: null } } }).then((g) => g.length),
                prisma.auditLog.count({ where: { createdAt: enPeriodo } }),
                prisma.auditLog.count({ where: { createdAt: enPeriodo, severity: { in: ['WARNING', 'CRITICAL'] } } }),
                prisma.auditLog.count({ where: { createdAt: enPeriodo, severity: 'CRITICAL' } }),
                prisma.auditLog.count({ where: { createdAt: enPeriodo, action: { in: ['AUTH_LOGIN_FAILED', 'AUTH_LOGIN_BLOCKED'] } } }),
                prisma.order.findMany({ where: pagadasDesde(startDate), select: { paidAt: true, createdAt: true, totalUSD: true } }),
                prisma.user.findMany({ where: { ...clientes, createdAt: enPeriodo }, select: { createdAt: true } }),
                prisma.order.findMany({ where: { createdAt: enPeriodo, status: { notIn: [...ORDEN_NO_VALIDA] } }, select: { createdAt: true } }),
            ]);

            const porDia = new Map(listaDeDias(startDate).map((d) => [d, { date: d, sales: 0, paid: 0, orders: 0, users: 0 }]));
            for (const o of paidOrders) {
                const fila = porDia.get(diaLocal(o.paidAt ?? o.createdAt));
                if (fila) { fila.sales += Number(o.totalUSD) || 0; fila.paid++; }
            }
            for (const o of createdInPeriod) {
                const fila = porDia.get(diaLocal(o.createdAt));
                if (fila) fila.orders++;
            }
            for (const u of usersInPeriod) {
                const fila = porDia.get(diaLocal(u.createdAt));
                if (fila) fila.users++;
            }
            const dailyData = [...porDia.values()].map((f) => ({ ...f, sales: Math.round(f.sales * 100) / 100 }));

            const revenue = Number(paidAgg._sum.totalUSD ?? 0);
            return NextResponse.json({
                overview: {
                    users: { total: totalUsers, new: newUsers },
                    orders: { created: ordersCreated, paid: paidAgg._count, pendingPayment: ordersPending },
                    products: { total: totalProducts, published: publishedProducts },
                    productRequests: { pending: pendingProductRequests },
                    interactions: { pageViews, clicks, visitors: visitantes },
                    security: { events: eventos, alerts: alertas, critical: criticas, failedLogins: loginsFallidos },
                    revenue: { total: revenue, averageTicket: paidAgg._count > 0 ? Math.round((revenue / paidAgg._count) * 100) / 100 : 0 },
                    dailyData,
                },
                period,
            });
        }

        if (type === 'products') {
            // Más vendidos: unidades de órdenes pagadas en el período (antes: cuántas órdenes lo incluían, desde siempre)
            const vendidos = await prisma.orderItem.groupBy({
                by: ['productId'],
                _sum: { quantity: true, totalUSD: true },
                where: { order: pagadasDesde(startDate) },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 10,
            });
            const nombres = new Map((await prisma.product.findMany({
                where: { id: { in: vendidos.map((v) => v.productId) } },
                select: { id: true, name: true },
            })).map((p) => [p.id, p.name]));
            const requests = await prisma.productRequest.groupBy({ by: ['status'], _count: true });

            return NextResponse.json({
                products: {
                    topSelling: vendidos.map((v) => ({
                        id: v.productId,
                        name: nombres.get(v.productId) ?? 'Producto eliminado',
                        units: v._sum.quantity ?? 0,
                        revenue: Number(v._sum.totalUSD ?? 0),
                    })),
                    requests: requests.map((r) => ({ status: r.status, count: r._count })),
                },
                period,
            });
        }

        if (type === 'interactions') {
            const donde = { createdAt: enPeriodo };
            const [byType, byDevice, topPages, sesiones, eventosDelPeriodo] = await Promise.all([
                prisma.analyticsEvent.groupBy({ by: ['eventType'], _count: true, where: donde, orderBy: { _count: { eventType: 'desc' } } }),
                // Dispositivos por visitante (sesión), no por evento: quien hace 50 clics no pesa 50 veces
                prisma.analyticsEvent.groupBy({ by: ['deviceType', 'sessionId'], where: { ...donde, sessionId: { not: null } } }),
                prisma.analyticsEvent.groupBy({
                    by: ['page'], _count: true,
                    where: { ...donde, eventType: 'page_view', page: { not: null } },
                    orderBy: { _count: { page: 'desc' } }, take: 10,
                }),
                prisma.analyticsEvent.groupBy({ by: ['sessionId'], where: { ...donde, sessionId: { not: null } } }),
                prisma.analyticsEvent.findMany({ where: donde, select: { createdAt: true }, take: 50000, orderBy: { createdAt: 'desc' } }),
            ]);

            const dispositivos = new Map<string, number>();
            for (const f of byDevice) dispositivos.set(f.deviceType || 'otro', (dispositivos.get(f.deviceType || 'otro') ?? 0) + 1);
            const porDia = new Map(listaDeDias(startDate).map((d) => [d, 0]));
            for (const e of eventosDelPeriodo) {
                const dia = diaLocal(e.createdAt);
                if (porDia.has(dia)) porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
            }

            return NextResponse.json({
                interactions: {
                    visitors: sesiones.length,
                    byType: byType.map((t) => ({ eventType: t.eventType, count: t._count })),
                    byDevice: [...dispositivos.entries()].map(([deviceType, count]) => ({ deviceType, count })).sort((a, b) => b.count - a.count),
                    topPages: topPages.map((p) => ({ page: p.page ?? '', count: p._count })),
                    daily: [...porDia.entries()].map(([date, count]) => ({ date, count })),
                },
                period,
            });
        }

        if (type === 'security') {
            const grupo = searchParams.get('grupo') ?? '';
            const filtro = GRUPOS[grupo] ?? {};
            const donde = { createdAt: enPeriodo };
            const [byAction, bySeverity, recientes, ipsConAlertas] = await Promise.all([
                prisma.auditLog.groupBy({ by: ['action'], _count: true, where: donde, orderBy: { _count: { action: 'desc' } } }),
                prisma.auditLog.groupBy({ by: ['severity'], _count: true, where: donde }),
                prisma.auditLog.findMany({
                    where: { ...donde, ...filtro },
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                    select: { id: true, action: true, severity: true, ipAddress: true, userEmail: true, targetType: true, details: true, createdAt: true },
                }),
                // IP sospechosa: la que acumula eventos de atención o críticos (contraseñas incorrectas, bloqueos,
                // accesos denegados). Con la IP real de C-105 cada fila es un dispositivo o una red, no el proxy.
                prisma.auditLog.groupBy({
                    by: ['ipAddress'], _count: true, _max: { createdAt: true },
                    where: { ...donde, severity: { in: ['WARNING', 'CRITICAL'] }, ipAddress: { notIn: ['desconocida', 'unknown'] }, NOT: { ipAddress: null } },
                    orderBy: { _count: { ipAddress: 'desc' } },
                    take: 10,
                }),
            ]);

            // Cuántas cuentas distintas probó cada IP: muchas cuentas desde una IP es un ataque, no un olvido
            const cuentasPorIp = await Promise.all(ipsConAlertas.map((ip) => prisma.auditLog.groupBy({
                by: ['userEmail'],
                where: { ...donde, ipAddress: ip.ipAddress, action: { in: ['AUTH_LOGIN_FAILED', 'AUTH_LOGIN_BLOCKED'] }, userEmail: { not: null } },
            }).then((g) => g.length)));

            return NextResponse.json({
                security: {
                    byAction: byAction.map((a) => ({ action: a.action, label: etiquetaAccion(a.action), count: a._count })),
                    bySeverity: bySeverity.map((s) => ({ severity: s.severity, count: s._count })),
                    recentLogs: recientes.map((l) => ({
                        id: l.id,
                        action: l.action,
                        label: etiquetaAccion(l.action),
                        severity: l.severity,
                        ipAddress: l.ipAddress,
                        userEmail: l.userEmail,
                        summary: resumenDetalles(l.action, l.details),
                        createdAt: l.createdAt,
                    })),
                    suspiciousIPs: ipsConAlertas.map((ip, i) => ({
                        ipAddress: ip.ipAddress ?? '',
                        count: ip._count,
                        accounts: cuentasPorIp[i],
                        lastSeen: ip._max.createdAt,
                    })),
                },
                grupo: GRUPOS[grupo] ? grupo : '',
                period,
            });
        }

        if (type === 'referrals') {
            const [totalInfluencers, activeInfluencers, conversionsByStatus, revenueStats] = await Promise.all([
                prisma.influencer.count(),
                prisma.influencer.count({ where: { status: 'ACTIVE' } }),
                prisma.referralConversion.groupBy({
                    by: ['status'],
                    _count: true,
                    _sum: { commission: true, grossAmount: true },
                    where: { createdAt: enPeriodo },
                }),
                prisma.referralConversion.aggregate({
                    _sum: { grossAmount: true, commission: true },
                    where: { status: 'APPROVED', createdAt: enPeriodo },
                }),
            ]);

            const topInfluencersRaw = await prisma.referralConversion.groupBy({
                by: ['influencerId'],
                _sum: { commission: true, grossAmount: true },
                _count: true,
                where: { status: 'APPROVED' },
                orderBy: { _sum: { commission: 'desc' } },
                take: 10,
            });

            const influencerDetails = await prisma.influencer.findMany({
                where: { id: { in: topInfluencersRaw.map((t) => t.influencerId) } },
                select: { id: true, name: true, code: true, status: true },
            });

            return NextResponse.json({
                referrals: {
                    totalInfluencers,
                    activeInfluencers,
                    pausedInfluencers: totalInfluencers - activeInfluencers,
                    conversionsByStatus: conversionsByStatus.map((c) => ({
                        status: c.status,
                        count: c._count,
                        commission: Number(c._sum.commission ?? 0),
                        gross: Number(c._sum.grossAmount ?? 0),
                    })),
                    approvedRevenue: {
                        gross: Number(revenueStats._sum.grossAmount || 0),
                        commission: Number(revenueStats._sum.commission || 0),
                    },
                    topInfluencers: topInfluencersRaw.map((t) => {
                        const details = influencerDetails.find((i) => i.id === t.influencerId);
                        return {
                            id: t.influencerId,
                            name: details?.name || 'Desconocido',
                            code: details?.code || '',
                            status: details?.status || 'ACTIVE',
                            totalCommission: Number(t._sum.commission || 0),
                            totalGross: Number(t._sum.grossAmount || 0),
                            conversionsCount: t._count,
                        };
                    }),
                },
                period,
            });
        }

        return NextResponse.json({ error: 'Tipo de reporte inválido' }, { status: 400 });
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ error: 'No se pudieron cargar los reportes' }, { status: 500 });
    }
}
