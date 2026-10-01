import { NextRequest, NextResponse } from 'next/server';
import { pedirResenas } from '@/lib/resenas-avisos';
import { cronAutorizado, cronConfigurado } from '@/lib/cron-auth';

// C-157: el cron del servidor la llama una vez al día para pedir la reseña por correo a quien recibió su pedido
// hace unos días (5 si lleva algo físico, 2 si es solo digital).
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/resenas

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!cronConfigurado()) {
    return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 503 });
  }
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    return NextResponse.json(await pedirResenas());
  } catch (error) {
    console.error('Error pidiendo las reseñas:', error);
    return NextResponse.json({ error: 'Error pidiendo las reseñas' }, { status: 500 });
  }
}
