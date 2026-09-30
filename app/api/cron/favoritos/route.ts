import { NextRequest, NextResponse } from 'next/server';
import { revisarFavoritos } from '@/lib/favoritos-avisos';
import { cronAutorizado, cronConfigurado } from '@/lib/cron-auth';

// C-138: el cron del servidor la llama cada hora para avisar a los clientes cuando un favorito baja de precio
// (también al empezar una oferta programada) o vuelve a estar disponible.
//   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/favoritos

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!cronConfigurado()) {
    return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 503 });
  }
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    return NextResponse.json(await revisarFavoritos());
  } catch (error) {
    console.error('Error revisando los favoritos:', error);
    return NextResponse.json({ error: 'Error revisando los favoritos' }, { status: 500 });
  }
}
