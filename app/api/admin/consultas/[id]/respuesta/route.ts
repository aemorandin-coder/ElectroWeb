import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { FallaIA } from '@/lib/ia/claude';
import { redactarRespuesta } from '@/lib/ia/respuesta-consulta';
import { checkRateLimit } from '@/lib/rate-limit';

// C-214: el borrador de respuesta a un mensaje de contacto, con sus órdenes, los productos que nombra y el flete de
// ZOOM a su ciudad. No guarda ni envía nada: lo revisa y lo manda una persona. Los mensajes se ven con MANAGE_CONTENT.

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT') || !session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const limite = checkRateLimit(session.user.id, 'admin:consultas:respuesta', { maxRequests: 10, windowSeconds: 60 });
  if (!limite.success) {
    return NextResponse.json({ error: `Demasiados borradores seguidos. Espera ${limite.resetIn} s.` }, { status: 429 });
  }
  const { id } = await params;
  try {
    const borrador = await redactarRespuesta(id);
    if (!borrador) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    return NextResponse.json(borrador);
  } catch (error) {
    if (error instanceof FallaIA) {
      return NextResponse.json({ error: error.message }, { status: error.motivo === 'sin-clave' ? 503 : 502 });
    }
    console.error('[respuesta a una consulta]', error instanceof Error ? error.name : 'desconocido');
    return NextResponse.json({ error: 'No se pudo redactar el borrador.' }, { status: 500 });
  }
}
