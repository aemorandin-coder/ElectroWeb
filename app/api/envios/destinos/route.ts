import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ESTADOS_VENEZUELA } from '@/lib/envios/empresas';
import { ciudadesZoom } from '@/lib/envios/zoom';
import { agenciasMrw } from '@/lib/envios/mrw';

// GET ?empresa=ZOOM → ciudades con cobro a destino · ?empresa=MRW → agencias. Para el checkout (C-100).
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const empresa = request.nextUrl.searchParams.get('empresa');
  const orden = (estado: string) => ESTADOS_VENEZUELA.indexOf(estado as (typeof ESTADOS_VENEZUELA)[number]);

  if (empresa === 'ZOOM') {
    const ciudades = await ciudadesZoom();
    if (!ciudades) {
      return NextResponse.json({ error: 'ZOOM no responde en este momento. Intenta en unos minutos o elige MRW.' }, { status: 503 });
    }
    const estados = [...new Set(ciudades.map((c) => c.estado))].sort((a, b) => orden(a) - orden(b));
    return NextResponse.json({ estados, ciudades }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
  }

  if (empresa === 'MRW') {
    const agencias = await agenciasMrw();
    const estados = [...new Set(agencias.map((a) => a.estado))].sort((a, b) => orden(a) - orden(b));
    return NextResponse.json({ estados, agencias }, { headers: { 'Cache-Control': 'private, max-age=3600' } });
  }

  return NextResponse.json({ error: 'Empresa inválida' }, { status: 400 });
}
