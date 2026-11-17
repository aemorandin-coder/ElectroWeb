import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { FILTROS_CLIENTES, listaDeClientes, type FiltroClientes } from '@/lib/clientes/lista';

// C-276: la lista de Clientes del panel: filtro, búsqueda (nombre, correo, teléfono, cédula, RIF o empresa) y página, con
// cada fila en lista blanca (lib/dto/cliente.ts). Antes devolvía 50 sin páginas, con todas las órdenes de cada cliente.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_USERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const sp = request.nextUrl.searchParams;
    const filtroPedido = sp.get('filtro') ?? 'todos';
    const filtro: FiltroClientes = (FILTROS_CLIENTES as readonly string[]).includes(filtroPedido) ? (filtroPedido as FiltroClientes) : 'todos';
    const pagina = Math.min(1000, Math.max(1, Number.parseInt(sp.get('pagina') ?? '1', 10) || 1));
    return NextResponse.json(await listaDeClientes({ filtro, busqueda: sp.get('buscar') ?? '', pagina }));
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}
