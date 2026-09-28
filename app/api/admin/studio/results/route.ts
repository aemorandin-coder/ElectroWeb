import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { studioResults } from '@/lib/studio/store';

// GET ?days=30 — visitas y compras que llegaron por cada historia (C-113). Muestra montos de ventas: pide
// además ver reportes.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const days = [7, 30, 90].includes(Number(request.nextUrl.searchParams.get('days'))) ? Number(request.nextUrl.searchParams.get('days')) : 30;
  const results = await studioResults(days);
  // Sin permiso de reportes se ven visitas y compras, pero no cuánto dinero entró
  const money = isAuthorized(session, 'VIEW_REPORTS');
  return NextResponse.json({ days, money, results: money ? results : results.map((r) => ({ ...r, paidUSD: 0 })) });
}
