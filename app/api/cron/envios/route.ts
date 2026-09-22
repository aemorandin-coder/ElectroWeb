import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { actualizarRastreoZoom } from '@/lib/envios/seguimiento';

// C-100: el cron del servidor la llama cada 2 horas para traer el rastreo de las guías ZOOM en camino.
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/envios
// Sin CRON_SECRET configurado responde 503: nadie la puede disparar.

export const dynamic = 'force-dynamic';

function autorizado(request: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || secreto.length < 16) return false;
  const recibido = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(recibido);
  const b = Buffer.from(secreto);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 503 });
  }
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const resultado = await actualizarRastreoZoom();
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error actualizando el rastreo de envíos:', error);
    return NextResponse.json({ error: 'Error actualizando el rastreo' }, { status: 500 });
  }
}
