import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { BOT_UA } from '@/lib/analytics-bots';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { dispositivoDeUA, nombreDeCuenta, origenLegible, quitarSesion, registrarLatido } from '@/lib/visitantes';

export const dynamic = 'force-dynamic';

// C-173: "sigo aquí". Cada pestaña de la tienda lo manda al abrir una página, al cambiar lo que tiene en el carrito y cada 30 s mientras
// está a la vista. No toca la base (solo la memoria del servidor, lib/visitantes.ts) y no guarda nada de quien visita: sin IP, sin
// correo. Es lo que permite a Reportes decir cuántas personas están conectadas ahora, con cuenta y sin ella.
//   POST { sesion, pagina: '/productos/x', carrito: 2, origen: 'instagram.com', salir?: true }

const LIMITE = { maxRequests: 20, windowSeconds: 60 };

export async function POST(request: NextRequest) {
  if (!checkRateLimit(getClientIP(request), 'analytics:presencia', LIMITE).success) {
    return new NextResponse(null, { status: 429 });
  }
  const userAgent = request.headers.get('user-agent') ?? '';
  // Buscadores y monitores no son personas
  if (!userAgent || BOT_UA.test(userAgent)) return new NextResponse(null, { status: 204 });

  const body = (await request.json().catch(() => null)) as { sesion?: unknown; pagina?: unknown; carrito?: unknown; origen?: unknown; salir?: unknown } | null;
  const sesion = typeof body?.sesion === 'string' && /^[A-Za-z0-9_.-]{6,80}$/.test(body.sesion) ? body.sesion : null;
  if (!sesion) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  if (body?.salir === true) {
    quitarSesion(sesion);
    return new NextResponse(null, { status: 204 });
  }
  const pagina = typeof body?.pagina === 'string' && body.pagina.startsWith('/') ? body.pagina.slice(0, 300) : null;
  if (!pagina) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  // El panel no se mide: ni su gente ni sus pantallas son visitantes
  if (pagina.startsWith('/admin')) return new NextResponse(null, { status: 204 });

  // Quién es sale del token de sesión, nunca del cuerpo (igual que /api/analytics)
  const token = await getToken({ req: request }).catch(() => null);
  const userId = typeof token?.id === 'string' ? token.id : null;
  const rol = typeof token?.role === 'string' ? token.role : '';
  const esEquipo = token?.userType === 'admin' || rol === 'ADMIN' || rol === 'SUPER_ADMIN' || rol === 'SUPPORT';
  const nombre = userId && !esEquipo
    ? await nombreDeCuenta(userId, async (id) => (await prisma.user.findUnique({ where: { id }, select: { name: true } }))?.name ?? null).catch(() => null)
    : null;

  const carrito = typeof body?.carrito === 'number' && Number.isFinite(body.carrito) ? Math.min(99, Math.max(0, Math.trunc(body.carrito))) : 0;
  const hostOrigen = typeof body?.origen === 'string' ? body.origen.slice(0, 80) : null;
  registrarLatido({
    sesion, pagina, carrito, userId, nombre, esEquipo,
    dispositivo: dispositivoDeUA(userAgent),
    origen: origenLegible(hostOrigen, request.headers.get('host') ?? ''),
  });
  return new NextResponse(null, { status: 204 });
}
