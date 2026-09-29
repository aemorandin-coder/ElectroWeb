import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { buildImportTemplate } from '@/lib/product-import-server';

/** Plantilla .json de la carga masiva (C-118), con las categorías y marcas de hoy */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  try {
    const template = await buildImportTemplate();
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(template, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="plantilla-productos-${date}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating import template:', error);
    return NextResponse.json({ error: 'No se pudo generar la plantilla' }, { status: 500 });
  }
}
