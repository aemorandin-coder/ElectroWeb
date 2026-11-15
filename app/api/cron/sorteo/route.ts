import { NextRequest, NextResponse, after } from 'next/server';
import { enviarRecordatorio, reclamarRecordatorio } from '@/lib/sorteo/correos';
import { cronAutorizado, cronConfigurado } from '@/lib/cron-auth';

// C-219: el cron del servidor la llama una vez al día. En los últimos 3 días antes del cierre del sorteo, una sola vez,
// manda el recordatorio a quien tiene boletos. El envío sigue después de responder (con pausa entre correos).
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/sorteo

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!cronConfigurado()) {
    return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 503 });
  }
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const r = await reclamarRecordatorio();
    if ('motivo' in r) return NextResponse.json({ recordatorio: 0, motivo: r.motivo });
    after(() => enviarRecordatorio(r.sorteo, r.participantes).catch((error) => console.error('Error mandando el recordatorio del sorteo:', error)));
    return NextResponse.json({ recordatorio: r.participantes.length });
  } catch (error) {
    console.error('Error revisando el recordatorio del sorteo:', error);
    return NextResponse.json({ error: 'Error revisando el recordatorio del sorteo' }, { status: 500 });
  }
}
