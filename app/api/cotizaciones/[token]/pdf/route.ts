import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { aCotizacionPublica, cotizacionPorToken } from '@/lib/cotizaciones';
import { empresaCotizacion, enlaceCotizacion } from '@/lib/cotizaciones/empresa';
import { presupuestoPdf } from '@/lib/cotizaciones/pdf';

// GET /api/cotizaciones/<token>/pdf (C-182): el presupuesto en PDF, con lo mismo que la página del enlace. Lo ve quien
// tenga el enlace, solo si ya se envió; un borrador, solo el equipo (como la vista previa). ?tinta=bn: en blanco y negro.

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIP(request);
  if (!checkRateLimit(ip, 'cotizacion:pdf', { maxRequests: 20, windowSeconds: 60 }).success) {
    return NextResponse.json({ error: 'Demasiadas descargas seguidas. Espera un momento.' }, { status: 429 });
  }
  const { token } = await params;
  let cotizacion = await cotizacionPorToken(token);
  if (!cotizacion && /^[A-Za-z0-9_-]{16,40}$/.test(token)) {
    const session = await getServerSession(authOptions);
    if (isAuthorized(session, 'MANAGE_ORDERS')) cotizacion = await prisma.quote.findUnique({ where: { token }, include: { items: { orderBy: { position: 'asc' } } } });
  }
  if (!cotizacion) return NextResponse.json({ error: 'Ese presupuesto no existe' }, { status: 404 });

  const publica = aCotizacionPublica(cotizacion);
  const pdf = await presupuestoPdf(publica, await empresaCotizacion(), {
    enlace: enlaceCotizacion(token),
    bn: request.nextUrl.searchParams.get('tinta') === 'bn',
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Presupuesto ${publica.number}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
