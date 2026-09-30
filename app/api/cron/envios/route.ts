import { NextRequest, NextResponse } from 'next/server';
import { actualizarRastreoZoom } from '@/lib/envios/seguimiento';
import { cronAutorizado, cronConfigurado } from '@/lib/cron-auth';

// C-100: el cron del servidor la llama cada 2 horas para traer el rastreo de las guías ZOOM en camino.
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/envios
// Sin CRON_SECRET configurado responde 503: nadie la puede disparar.

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!cronConfigurado()) {
    return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 503 });
  }
  if (!cronAutorizado(request)) {
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
