import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { oficinasZoom } from '@/lib/envios/zoom';

// GET ?ciudad=19 → oficinas de ZOOM donde se retira con cobro a destino (C-100).
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const ciudad = request.nextUrl.searchParams.get('ciudad') ?? '';
  if (!/^\d{1,6}$/.test(ciudad)) return NextResponse.json({ error: 'Ciudad inválida' }, { status: 400 });

  const oficinas = await oficinasZoom(ciudad);
  if (!oficinas) {
    return NextResponse.json({ error: 'ZOOM no responde en este momento. Intenta en unos minutos o elige MRW.' }, { status: 503 });
  }
  return NextResponse.json({ oficinas }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
}
