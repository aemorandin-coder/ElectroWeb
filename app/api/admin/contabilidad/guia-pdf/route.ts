import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const NOMBRE_PDF = 'Guia-Contadora-ElectroShop.pdf';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!hasPermission(session, 'VER_CONTABILIDAD')) {
    return NextResponse.json({ error: 'Sin permiso para consultar la guía contable.' }, { status: 403 });
  }

  const ruta = path.join(process.cwd(), 'docs', 'guias', NOMBRE_PDF);
  try {
    const buffer = await fs.readFile(ruta);
    const { searchParams } = new URL(request.url);
    const descargar = searchParams.get('descargar') === '1';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename="${NOMBRE_PDF}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'La guía en PDF no está disponible en este momento.' }, { status: 404 });
  }
}
