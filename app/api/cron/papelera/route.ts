import { NextRequest, NextResponse } from 'next/server';
import { cronAutorizado, cronConfigurado } from '@/lib/cron-auth';
import { vaciarPapeleraVencida } from '@/lib/papelera';

// C-169: una vez al día borra para siempre lo que lleva más de 30 días en la papelera de productos.
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/papelera

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!cronConfigurado()) {
    return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 503 });
  }
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    return NextResponse.json(await vaciarPapeleraVencida());
  } catch (error) {
    console.error('Error vaciando la papelera de productos:', error);
    return NextResponse.json({ error: 'Error vaciando la papelera' }, { status: 500 });
  }
}
