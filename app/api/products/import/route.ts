import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { createImportedProduct } from '@/lib/product-import-server';

/**
 * Carga masiva (C-118): crea en borrador un producto del .json, con las fotos ya subidas por /api/upload.
 * Uno por pedido, para que la vista previa muestre el avance y un error no tumbe a los demás.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
    }
    const result = await createImportedProduct(body.producto, body.imagenes);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    console.error('Error importing product:', err);
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un producto con este SKU' }, { status: 400 });
    }
    return NextResponse.json({ error: 'No se pudo crear el producto' }, { status: 500 });
  }
}
