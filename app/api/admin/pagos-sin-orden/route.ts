import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { roundMoney } from '@/lib/pricing';
import { DIAS_PAGO_VIEJO, MINUTOS_ANTES_DE_ACREDITAR, ordenesCandidatas, pagoSinOrdenWhere } from '@/lib/pago-movil-sin-orden';

// GET — Pagos Móvil de compra verificados por el banco que no llegaron a ser orden (C-114)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_ORDERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const [rows, settings] = await Promise.all([
    prisma.pagoMovilVerificacion.findMany({
      where: pagoSinOrdenWhere,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, referencia: true, importeVerificado: true, tasaVES: true, fechaPago: true, createdAt: true, userId: true },
    }),
    prisma.companySettings.findUnique({ where: { id: 'default' }, select: { exchangeRateVES: true } }),
  ]);
  const users = rows.length
    ? await prisma.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.userId))] } }, select: { id: true, name: true, email: true } })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  const tasa = Number(settings?.exchangeRateVES ?? 0);
  const limite = Date.now() - MINUTOS_ANTES_DE_ACREDITAR * 60_000;
  // C-123: órdenes del mismo cliente cerca de la fecha del pago (la orden pudo hacerse o confirmarse a mano)
  const candidatas = await Promise.all(rows.map((r) => ordenesCandidatas(r)));
  return NextResponse.json({
    pagos: rows.map((r, i) => {
      const montoVES = Number(r.importeVerificado ?? 0);
      // C-125: a la tasa congelada del pago, como se acredita; sin ella (pagos viejos), a la de hoy
      const tasaPago = Number(r.tasaVES ?? 0) || tasa;
      return {
        id: r.id,
        referencia: r.referencia,
        montoVES,
        montoUSD: tasaPago > 0 ? roundMoney(montoVES / tasaPago) : 0,
        tasaCongelada: Number(r.tasaVES ?? 0) > 0,
        fechaPago: r.fechaPago.toISOString(),
        verificadoEn: r.createdAt.toISOString(),
        cliente: byId.get(r.userId) ?? null,
        // Recién verificado: el cliente puede estar terminando la compra con ese pago
        puedeAcreditar: r.createdAt.getTime() <= limite,
        diasDesdePago: Math.floor((Date.now() - r.createdAt.getTime()) / 86_400_000),
        candidatas: candidatas[i],
      };
    }),
    minutos: MINUTOS_ANTES_DE_ACREDITAR,
    diasViejo: DIAS_PAGO_VIEJO,
  });
}
