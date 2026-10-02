import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hoyCaracas } from '@/lib/pago-movil/monto';
import { DIAS_PARA_ACREDITAR, fechaDeAcreditacion, motivoEfectivo } from '@/lib/influencer-commission';
import { asegurarCupones } from '@/lib/influencer-cupon';

// El programa de promotores visto por el cliente (C-167). Si no es promotor, el estado de su solicitud.
// Solo cuentan las COMPRAS (un registro no paga comisión) y los montos son Puntos ES, nunca dinero.
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = session.user.id;

        let influencer = await prisma.influencer.findUnique({
            where: { userId },
            include: { coupon: { select: { isActive: true } } },
        });

        if (!influencer) {
            const [solicitud, cuenta] = await Promise.all([
                prisma.influencerApplication.findFirst({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    select: { status: true, createdAt: true, reviewedAt: true, reviewNote: true },
                }),
                prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true, role: true } }),
            ]);
            return NextResponse.json({
                enrolled: false,
                puedePedir: cuenta?.role === 'USER',
                correoVerificado: Boolean(cuenta?.emailVerified),
                reglas: { diasParaAcreditar: DIAS_PARA_ACREDITAR },
                solicitud: solicitud
                    ? {
                        status: solicitud.status,
                        createdAt: solicitud.createdAt.toISOString(),
                        reviewedAt: solicitud.reviewedAt?.toISOString() ?? null,
                        reviewNote: solicitud.reviewNote,
                    }
                    : null,
            });
        }

        // Un promotor de antes de C-167 recibe su cupón la primera vez que abre su panel
        if (!influencer.coupon) {
            await asegurarCupones();
            influencer = await prisma.influencer.findUnique({ where: { userId }, include: { coupon: { select: { isActive: true } } } });
            if (!influencer) return NextResponse.json({ enrolled: false });
        }

        // El mes, en hora de Venezuela (antes era el del servidor, en UTC)
        const inicioMes = new Date(`${hoyCaracas().slice(0, 7)}-01T00:00:00-04:00`);
        const compras = { influencerId: influencer.id, type: 'PURCHASE' };

        const [pendientes, aprobadas, delMes, recientes] = await Promise.all([
            prisma.referralConversion.aggregate({ where: { ...compras, status: 'PENDING' }, _sum: { commission: true }, _count: { id: true } }),
            prisma.referralConversion.aggregate({ where: { ...compras, status: 'APPROVED' }, _sum: { commission: true }, _count: { id: true } }),
            prisma.referralConversion.aggregate({ where: { ...compras, status: 'APPROVED', approvedAt: { gte: inicioMes } }, _sum: { commission: true } }),
            prisma.referralConversion.findMany({
                where: { influencerId: influencer.id },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { id: true, type: true, baseAmount: true, grossAmount: true, commission: true, status: true, source: true, heldReason: true, orderId: true, createdAt: true },
            }),
        ]);

        const ordenes = await prisma.order.findMany({
            where: { id: { in: recientes.map((c) => c.orderId).filter((v): v is string => Boolean(v)) } },
            select: { id: true, status: true, deliveredAt: true },
        });
        const ordenPorId = new Map(ordenes.map((o) => [o.id, o]));

        // Posiciones: por ventas aprobadas. Sin montos: lo que gana cada promotor es asunto suyo
        const posiciones = await prisma.referralConversion.groupBy({
            by: ['influencerId'],
            where: { status: 'APPROVED', type: 'PURCHASE' },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        });
        const nombres = await prisma.influencer.findMany({ where: { id: { in: posiciones.map((l) => l.influencerId) } }, select: { id: true, name: true } });
        const nombrePorId = Object.fromEntries(nombres.map((i) => [i.id, i.name]));
        const idPropio = influencer.id;
        const miPosicion = posiciones.findIndex((l) => l.influencerId === idPropio);
        const leaderboard = posiciones.map((entry, idx) => {
            const name = nombrePorId[entry.influencerId] || 'Promotor';
            const esYo = entry.influencerId === idPropio;
            return {
                rank: idx + 1,
                name: esYo ? name : `${name.substring(0, name.length > 3 ? 3 : 1)}***`,
                conversionsCount: entry._count.id,
                isCurrentUser: esYo,
            };
        });

        const pendingEarnings = Number(pendientes._sum.commission || 0);
        const approvedEarnings = Number(aprobadas._sum.commission || 0);

        return NextResponse.json({
            enrolled: true,
            influencer: {
                id: influencer.id,
                code: influencer.code,
                name: influencer.name,
                commissionRate: Number(influencer.commissionRate),
                customerDiscountPercent: influencer.customerDiscountPercent,
                // Sin cupón activo el código no se puede escribir en el carrito (pausado, o el código chocó con un cupón)
                codeWorks: Boolean(influencer.coupon?.isActive),
                status: influencer.status,
                createdAt: influencer.createdAt,
            },
            reglas: { diasParaAcreditar: DIAS_PARA_ACREDITAR },
            stats: {
                // Ventas: compras pagadas con su código o su enlace (pendientes y acreditadas)
                totalConversions: pendientes._count.id + aprobadas._count.id,
                approvedConversions: aprobadas._count.id,
                pendingEarnings,
                approvedEarnings,
                totalEarnings: pendingEarnings + approvedEarnings,
                thisMonthEarnings: Number(delMes._sum.commission || 0),
            },
            conversions: recientes.map((c) => {
                const orden = c.orderId ? ordenPorId.get(c.orderId) ?? null : null;
                return {
                    id: c.id,
                    type: c.type,
                    source: c.source,
                    // Lo que el cliente compró en productos, sin IVA ni envío (las de antes de C-167 guardaron el total)
                    baseAmount: Number(c.baseAmount ?? c.grossAmount),
                    commission: Number(c.commission),
                    status: c.status,
                    // Al promotor no se le dice el motivo de la revisión (puede ser una sospecha), solo que está en revisión
                    enRevision: Boolean(motivoEfectivo(c)),
                    creditsAt: fechaDeAcreditacion(c, orden)?.toISOString() ?? null,
                    createdAt: c.createdAt,
                };
            }),
            currentUserRank: miPosicion >= 0 ? miPosicion + 1 : null,
            leaderboard,
        });
    } catch (error) {
        console.error('Error fetching referral data:', error);
        return NextResponse.json(
            { error: 'Error al obtener datos de referidos' },
            { status: 500 }
        );
    }
}
