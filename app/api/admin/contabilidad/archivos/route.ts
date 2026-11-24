import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { LEER_FACTURAS, sesionCon } from '@/lib/contabilidad/ruta';
import { CONTABILIDAD_FILES_DIR, isInside } from '@/lib/private-uploads';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function detectarTipo(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === '%PDF') return { ext: 'pdf', mime: 'application/pdf' };
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: 'png', mime: 'image/png' };
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

/** POST /api/admin/contabilidad/archivos (G-76): sube PDF o foto privada de Contabilidad (compra, planilla, comprobante o factura SENIAT). */
export async function POST(request: NextRequest) {
  const s = await sesionCon(LEER_FACTURAS);
  if (s instanceof NextResponse) return s;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const tipoRaw = String(form?.get('tipo') ?? 'doc').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || 'doc';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Adjunta un archivo PDF, PNG, JPG o WebP.' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo debe pesar entre 1 byte y 8 MB.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const tipo = detectarTipo(buffer);
  if (!tipo) {
    return NextResponse.json({ error: 'Formato no permitido. Usa PDF, PNG, JPG o WebP reales.' }, { status: 400 });
  }

  const nombre = `contab-${tipoRaw}-${Date.now()}-${randomBytes(6).toString('hex')}.${tipo.ext}`;
  const destino = path.join(CONTABILIDAD_FILES_DIR, nombre);
  if (!isInside(CONTABILIDAD_FILES_DIR, destino)) {
    return NextResponse.json({ error: 'Ruta inválida.' }, { status: 400 });
  }

  await mkdir(CONTABILIDAD_FILES_DIR, { recursive: true });
  await writeFile(destino, buffer);

  return NextResponse.json({ archivo: nombre, url: `/api/admin/contabilidad/archivos/${nombre}` }, { status: 201 });
}
