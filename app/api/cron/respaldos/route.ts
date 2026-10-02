import { NextRequest, NextResponse, after } from 'next/server';
import { cronAutorizado, cronConfigurado } from '@/lib/cron-auth';
import { decidirRespaldoDelDia, ejecutarRespaldo } from '@/lib/respaldos/servicio';

// C-165: el cron del servidor la llama cada hora. Ella decide si toca respaldar (encendido, hora elegida en el panel y
// que no se haya hecho ya hoy) y responde enseguida: el respaldo sigue en segundo plano.
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/respaldos

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!cronConfigurado()) {
    return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 503 });
  }
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const decision = await decidirRespaldoDelDia();
    if (decision.correr) after(() => ejecutarRespaldo('CRON').catch((error) => console.error('[RESPALDOS] Cron:', error)));
    return NextResponse.json({ respaldo: decision.correr ? 'iniciado' : 'no', motivo: decision.motivo });
  } catch (error) {
    console.error('Error en el cron de respaldos:', error);
    return NextResponse.json({ error: 'Error en el cron de respaldos' }, { status: 500 });
  }
}
