import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { FallaIA } from '@/lib/ia/claude';
import { revisarUrgencia } from '@/lib/ia/urgencia';
import { checkRateLimit } from '@/lib/rate-limit';

// C-215: "Ordenar por urgencia": Claude revisa los mensajes y las solicitudes pendientes que todavía no revisó (hasta 20
// de cada uno por vuelta) y guarda la urgencia. Lo nuevo ya se revisa solo al llegar; esto es para lo que falte.
// Mensajes usa MANAGE_CONTENT y Solicitudes MANAGE_PRODUCTS: cualquiera de los dos.

export async function POST() {
  const session = await getServerSession(authOptions);
  if ((!isAuthorized(session, 'MANAGE_CONTENT') && !isAuthorized(session, 'MANAGE_PRODUCTS')) || !session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const limite = checkRateLimit(session.user.id, 'admin:consultas:urgencia', { maxRequests: 6, windowSeconds: 60 });
  if (!limite.success) {
    return NextResponse.json({ error: `Espera ${limite.resetIn} s para volver a ordenar.` }, { status: 429 });
  }
  try {
    return NextResponse.json(await revisarUrgencia());
  } catch (error) {
    if (error instanceof FallaIA) {
      return NextResponse.json({ error: error.message }, { status: error.motivo === 'sin-clave' ? 503 : 502 });
    }
    console.error('[urgencia]', error instanceof Error ? error.name : 'desconocido');
    return NextResponse.json({ error: 'No se pudo ordenar por urgencia.' }, { status: 500 });
  }
}
