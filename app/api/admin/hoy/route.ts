import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { getVentasDeHoy } from '@/lib/queries/dashboard';

export const dynamic = 'force-dynamic';

// C-173: lo cobrado hoy y este mes, y los pagos por confirmar, para la franja "Hoy" de Reportes (se vuelve a pedir con cada orden nueva)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'VIEW_REPORTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  return NextResponse.json(await getVentasDeHoy(), { headers: { 'Cache-Control': 'no-store' } });
}
