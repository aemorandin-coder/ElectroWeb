import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { resumenVisitantes } from '@/lib/visitantes';

export const dynamic = 'force-dynamic';

// C-173: quién está conectado a la tienda ahora (con cuenta y sin ella). Para Reportes → En vivo. Sale de la memoria del servidor.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'VIEW_REPORTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  return NextResponse.json(resumenVisitantes(), { headers: { 'Cache-Control': 'no-store' } });
}
