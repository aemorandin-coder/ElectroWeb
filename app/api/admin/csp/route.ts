import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// C-166: lo que la Content-Security-Policy ha avisado (Reportes → Seguridad). Solo lectura.
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'VIEW_REPORTS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  try {
    const [filas, resumen] = await Promise.all([
      prisma.cspViolation.findMany({ orderBy: { lastSeen: 'desc' }, take: 100 }),
      prisma.cspViolation.aggregate({ _sum: { count: true }, _count: true, _min: { firstSeen: true } }),
    ]);
    return NextResponse.json({
      // El modo lo decide el .env del servidor al compilar (next.config.js)
      bloquea: process.env.CSP_ENFORCE === 'true',
      distintos: resumen._count,
      avisos: resumen._sum.count ?? 0,
      desde: resumen._min.firstSeen?.toISOString() ?? null,
      filas: filas.map((f) => ({
        id: f.id, directive: f.directive, blocked: f.blocked, pagePath: f.pagePath, disposition: f.disposition,
        count: f.count, firstSeen: f.firstSeen.toISOString(), lastSeen: f.lastSeen.toISOString(), sample: f.sample,
      })),
    });
  } catch (error) {
    console.error('Error leyendo los avisos de CSP:', error);
    return NextResponse.json({ error: 'No se pudieron leer los avisos' }, { status: 500 });
  }
}
