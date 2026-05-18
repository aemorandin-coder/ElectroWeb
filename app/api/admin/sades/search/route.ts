import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // @ts-ignore
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').toLowerCase().trim();

    const API_URL = process.env.SADES_API_URL;
    const API_KEY = process.env.SADES_API_KEY;

    if (!API_URL || !API_KEY) {
      return NextResponse.json({ error: 'SADES no configurado' }, { status: 500 });
    }

    const res = await fetch(`${API_URL}/catalogo?page=1&pageSize=100`, {
      headers: { 'X-API-Key': API_KEY },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Error al consultar catálogo SADES' }, { status: 502 });
    }

    const json = await res.json();
    const all: any[] = json.data || [];

    const filtered = q
      ? all.filter(
          (p) =>
            p.nombre?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.categoria?.toLowerCase().includes(q)
        )
      : all.slice(0, 30);

    return NextResponse.json({
      results: filtered.slice(0, 30).map((p) => ({
        sku: p.sku,
        nombre: p.nombre,
        descripcion: p.descripcion || '',
        categoria: p.categoria || '',
        precioUSD: p.precioUSD,
        stock: p.stockDisponible ?? p.stock ?? 0,
        imagenApiUrl: p.imagenApiUrl || null,
      })),
    });
  } catch (error: any) {
    console.error('SADES search error:', error);
    return NextResponse.json({ error: 'Error al buscar en SADES' }, { status: 500 });
  }
}
