import { NextRequest, NextResponse } from 'next/server';
import { firmaAccesible } from '@/lib/legal-access';
import { leerArchivo } from '@/lib/legal-docs';

// Constancia firmada en PDF (C-103). Solo el dueño o el admin de clientes.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acceso = await firmaAccesible(id);
  if (acceso.status !== 200) return NextResponse.json({ error: acceso.status === 401 ? 'No autorizado' : 'No encontrado' }, { status: acceso.status });
  const pdf = await leerArchivo(acceso.firma.pdfPath);
  if (!pdf) return NextResponse.json({ error: 'El archivo no está disponible' }, { status: 404 });
  const nombre = `constancia-${acceso.firma.document.slug}-v${acceso.firma.document.version}-${acceso.firma.idNumber}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombre.replace(/[^a-zA-Z0-9._-]/g, '')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
