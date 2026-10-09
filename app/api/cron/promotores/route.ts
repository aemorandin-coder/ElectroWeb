import { NextRequest, NextResponse } from 'next/server';
import { cronAutorizado, cronConfigurado } from '@/lib/cron-auth';
import { acreditarComisionesListas } from '@/lib/influencer-commission';

// C-167: una vez al día acredita en Puntos ES las comisiones de promotores cuya orden lleva 7 días entregada
// (las que no tienen motivo de revisión). Las demás esperan al equipo en Marketing → Promotores.
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/promotores

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!cronConfigurado()) {
    return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 503 });
  }
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    return NextResponse.json(await acreditarComisionesListas());
  } catch (error) {
    console.error('Error acreditando comisiones de promotores:', error);
    return NextResponse.json({ error: 'Error acreditando comisiones' }, { status: 500 });
  }
}
