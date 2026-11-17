import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DIAS_PAGO_VIEJO, pagoSinOrdenWhere } from '@/lib/pago-movil-sin-orden';

/** Los mismos que deja sumar POST /api/orders en una compra */
const MAX_PAGOS = 3;

/**
 * GET /api/pago-movil/libres
 * C-281 (F-02): los Pagos Móvil de compra del cliente que el banco ya confirmó y que todavía no tienen orden ni pasaron a
 * sus Puntos ES. Si recargó el checkout o se le cerró la pestaña después de verificar, la pantalla los recupera en vez de
 * pedirle que pague otra vez. Solo lectura: la orden los vuelve a buscar por su cuenta (userId y pagoSinOrdenWhere).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Más viejos que esto, el panel los atiende por otro camino (C-123): el checkout no los ofrece
  const desde = new Date(Date.now() - DIAS_PAGO_VIEJO * 24 * 60 * 60 * 1000);
  const filas = await prisma.pagoMovilVerificacion.findMany({
    where: { userId, ...pagoSinOrdenWhere, createdAt: { gte: desde } },
    orderBy: { createdAt: 'asc' },
    take: MAX_PAGOS,
    select: { referencia: true, importeVerificado: true, tasaVES: true, bancoOrigen: true, telefonoPagador: true, fechaPago: true, createdAt: true },
  });

  // Lista blanca: solo lo que el checkout necesita para sumar el pago, y del propio cliente
  const pagos = filas
    .filter((p) => Number(p.importeVerificado ?? 0) > 0)
    .map((p) => ({
      referencia: p.referencia.trim(),
      pagadoBs: Number(p.importeVerificado),
      tasa: Number(p.tasaVES ?? 0) > 0 ? Number(p.tasaVES) : null,
      bancoOrigen: p.bancoOrigen,
      telefonoPagador: p.telefonoPagador,
      fechaPago: p.fechaPago.toISOString().slice(0, 10),
      verificadoEn: p.createdAt.toISOString(),
    }));

  return NextResponse.json({ pagos }, { headers: { 'Cache-Control': 'no-store' } });
}
