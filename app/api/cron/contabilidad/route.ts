import { NextRequest, NextResponse } from 'next/server';
import { revisarAlertasContables } from '@/lib/contabilidad/hub';
import { cronAutorizado, cronConfigurado } from '@/lib/cron-auth';

// G-76: cron diario para avisos de vencimientos fiscales (Alcaldía día 10, IVA día 15, Pensiones, Alquiler) y contingencias.
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!cronConfigurado()) {
    return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 503 });
  }
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    return NextResponse.json(await revisarAlertasContables());
  } catch (error) {
    console.error('Error revisando alertas contables:', error);
    return NextResponse.json({ error: 'Error revisando alertas contables' }, { status: 500 });
  }
}
