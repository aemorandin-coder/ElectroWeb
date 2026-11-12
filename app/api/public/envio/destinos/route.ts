import { NextResponse } from 'next/server';
import { ESTADOS_VENEZUELA } from '@/lib/envios/empresas';
import { ciudadesZoom } from '@/lib/envios/zoom';

// GET → los estados y las ciudades de ZOOM con cobro a destino, para "Calcula tu envío" de la ficha y el carrito
// (C-199). Público: son los datos de la API pública de ZOOM, sin nada de la tienda.
export async function GET() {
  const ciudades = await ciudadesZoom();
  if (!ciudades) return NextResponse.json({ error: 'ZOOM no responde en este momento' }, { status: 503 });
  const orden = (estado: string) => ESTADOS_VENEZUELA.indexOf(estado as (typeof ESTADOS_VENEZUELA)[number]);
  const estados = [...new Set(ciudades.map((c) => c.estado))].sort((a, b) => orden(a) - orden(b));
  return NextResponse.json({ estados, ciudades }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
