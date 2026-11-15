import { NextRequest, NextResponse } from 'next/server';
import { revisarDespachos } from '@/lib/proveedores/despacho';
import { cronAutorizado, cronConfigurado } from '@/lib/cron-auth';

// C-227: el cron del servidor la llama una vez al día (a las 10:00). Manda los avisos de venta que no salieron (el
// proveedor no tenía correo o el correo falló) y, el día del plazo, el recordatorio de la guía con su aviso al equipo.
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/despachos

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!cronConfigurado()) {
    return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 503 });
  }
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    return NextResponse.json(await revisarDespachos());
  } catch (error) {
    console.error('Error revisando los despachos de los proveedores:', error);
    return NextResponse.json({ error: 'Error revisando los despachos de los proveedores' }, { status: 500 });
  }
}
