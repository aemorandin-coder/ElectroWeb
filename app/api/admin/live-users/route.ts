import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { resumenVisitantes } from '@/lib/visitantes';

export const dynamic = 'force-dynamic';

// GET - Personas conectadas a la tienda ahora. C-173: sale de la presencia en memoria (lib/visitantes.ts), no de contar eventos de los
// últimos 5 minutos en la base: quien lee sin hacer clic ya no desaparece. Mismos campos de siempre; el detalle está en /api/admin/visitantes.
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'VIEW_REPORTS')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
    }
    const r = resumenVisitantes();
    return NextResponse.json({
        liveCount: r.total,
        authenticatedCount: r.conCuenta,
        devices: r.dispositivos,
        topPages: r.paginas.map((p) => ({ page: p.pagina, count: p.cantidad })),
        timestamp: r.ahora,
    });
}
