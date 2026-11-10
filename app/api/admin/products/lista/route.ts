import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { csvDeLista, idsDeLista, leerParamsLista, listarProductosAdmin } from '@/lib/admin/productos-lista';

// C-196: la lista de Admin → Productos por páginas (lib/admin/productos-lista.ts).
// GET ?q&filtro&categoria&proveedor&orden&pagina → una página con los números de cada filtro.
// ?soloIds=1 → todos los ids de la vista (para las acciones en lote). ?formato=csv → la vista para Excel.
// El costo y el proveedor solo los ve quien administra productos; Marketing (MANAGE_CONTENT) ve la lista sin ellos.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const verCosto = isAuthorized(session, 'MANAGE_PRODUCTS');
  if (!verCosto && !isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const sp = request.nextUrl.searchParams;
  const params = leerParamsLista(sp);
  try {
    if (sp.get('soloIds') === '1') return NextResponse.json(await idsDeLista(params));
    if (sp.get('formato') === 'csv') {
      const cuerpo = await csvDeLista(params, verCosto);
      return new NextResponse(cuerpo, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="productos_${new Date().toISOString().slice(0, 10)}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }
    return NextResponse.json(await listarProductosAdmin(params, verCosto), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Lista de productos del panel:', error);
    return NextResponse.json({ error: 'No se pudo cargar la lista de productos' }, { status: 500 });
  }
}
