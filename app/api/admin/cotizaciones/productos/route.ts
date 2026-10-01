import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { buscarProductosParaCotizar, productosParaCotizar } from '@/lib/cotizaciones/productos';

// Buscador de productos del editor de cotizaciones (C-148b).
//   ?q=texto   → hasta 8 productos publicados que responden a la búsqueda
//   ?ids=a,b   → esos productos, para mostrar lo disponible de las líneas que ya están en la cotización

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_ORDERS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const params = request.nextUrl.searchParams;
  try {
    const ids = params.get('ids');
    if (ids !== null) {
      const lista = [...new Set(ids.split(',').filter((id) => /^[a-z0-9]{10,40}$/i.test(id)))].slice(0, 100);
      return NextResponse.json({ productos: await productosParaCotizar(lista), aproximado: false });
    }
    return NextResponse.json(await buscarProductosParaCotizar((params.get('q') ?? '').trim()));
  } catch (error) {
    console.error('Error buscando productos para cotizar:', error);
    return NextResponse.json({ error: 'No se pudo buscar. Intenta de nuevo.' }, { status: 500 });
  }
}
