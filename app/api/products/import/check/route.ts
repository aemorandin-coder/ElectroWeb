import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { IMPORT_MAX_ITEMS } from '@/lib/product-import';
import { checkImportItems } from '@/lib/product-import-server';

/** Vista previa de la carga masiva (C-118): revisa cada fila contra la base, sin escribir nada */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => null);
    const items: unknown = body?.productos;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No hay productos para revisar' }, { status: 400 });
    }
    if (items.length > IMPORT_MAX_ITEMS) {
      return NextResponse.json({ error: `Son ${IMPORT_MAX_ITEMS} productos por archivo como máximo` }, { status: 400 });
    }
    return NextResponse.json({ filas: await checkImportItems(items) });
  } catch (error) {
    console.error('Error checking import:', error);
    return NextResponse.json({ error: 'No se pudo revisar el archivo' }, { status: 500 });
  }
}
