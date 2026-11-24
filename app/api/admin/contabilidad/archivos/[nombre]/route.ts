import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { LEER_FACTURAS, sesionCon } from '@/lib/contabilidad/ruta';
import { CONTABILIDAD_FILES_DIR, contabilidadFileName, isInside } from '@/lib/private-uploads';

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** GET /api/admin/contabilidad/archivos/[nombre] (G-76): descarga privada de documentos contables. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = await params;
  const soloContabilidad = /^contab-(compra|planilla|pago|iva-)/i.test(nombre);
  const s = await sesionCon(soloContabilidad ? 'VER_CONTABILIDAD' : LEER_FACTURAS);
  if (s instanceof NextResponse) return s;
  if (!contabilidadFileName(nombre)) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const ruta = path.join(CONTABILIDAD_FILES_DIR, nombre);
  if (!isInside(CONTABILIDAD_FILES_DIR, ruta) || !existsSync(/*turbopackIgnore: true*/ ruta)) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const buffer = await readFile(/*turbopackIgnore: true*/ ruta);
  const ext = path.extname(nombre).toLowerCase();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${nombre}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
