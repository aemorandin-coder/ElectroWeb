import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { marcarVista } from '@/lib/cotizaciones';

// POST /api/cotizaciones/<token>/vista (C-181): la página del cliente avisa que se abrió, para el estado "vista" del
// seguimiento. La llama el navegador después de cargar: la vista previa que arma WhatsApp o Facebook con el enlace no
// corre JavaScript y no cuenta. Tampoco cuenta el equipo cuando la revisa con su sesión.

const BOTS = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|headless/i;

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIP(request);
  if (!checkRateLimit(ip, 'cotizacion:vista', { maxRequests: 20, windowSeconds: 60 }).success) return new NextResponse(null, { status: 429 });
  if (BOTS.test(request.headers.get('user-agent') ?? '')) return new NextResponse(null, { status: 204 });
  const session = await getServerSession(authOptions);
  if (isAuthorized(session, 'MANAGE_ORDERS')) return new NextResponse(null, { status: 204 });
  const { token } = await params;
  const anotada = await marcarVista(token);
  return new NextResponse(null, { status: anotada ? 204 : 404 });
}
