import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { redactarCampana } from '@/lib/ia/campana';
import { FallaIA } from '@/lib/ia/claude';
import { checkRateLimit } from '@/lib/rate-limit';

// C-217: arma el borrador de una campaña de correo para un objetivo, con productos reales. No guarda ni envía: el
// editor lo muestra y una persona lo revisa. Las campañas se manejan con MANAGE_CONTENT.

const pedido = z.object({
  objetivo: z.string().trim().min(8, 'Escribe el objetivo de la campaña (por ejemplo, "gift cards para Navidad")').max(600),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT') || !session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const limite = checkRateLimit(session.user.id, 'admin:campanas:redactar', { maxRequests: 6, windowSeconds: 60 });
  if (!limite.success) {
    return NextResponse.json({ error: `Demasiados borradores seguidos. Espera ${limite.resetIn} s.` }, { status: 429 });
  }
  const datos = pedido.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message || 'Datos inválidos' }, { status: 400 });
  }
  try {
    const borrador = await redactarCampana(datos.data.objetivo);
    if (!borrador) return NextResponse.json({ error: 'No hay productos publicados para armar la campaña.' }, { status: 409 });
    return NextResponse.json(borrador);
  } catch (error) {
    if (error instanceof FallaIA) {
      return NextResponse.json({ error: error.message }, { status: error.motivo === 'sin-clave' ? 503 : 502 });
    }
    console.error('[campaña con Claude]', error instanceof Error ? error.name : 'desconocido');
    return NextResponse.json({ error: 'No se pudo armar el borrador.' }, { status: 500 });
  }
}
