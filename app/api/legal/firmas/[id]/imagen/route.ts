import { NextRequest, NextResponse } from 'next/server';
import { firmaAccesible } from '@/lib/legal-access';
import { leerArchivo } from '@/lib/legal-docs';

// Imagen del trazo (C-103), para verla en el panel sin descargar el PDF
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acceso = await firmaAccesible(id);
  if (acceso.status !== 200) return NextResponse.json({ error: 'No encontrado' }, { status: acceso.status });
  const png = await leerArchivo(acceso.firma.signaturePath);
  if (!png) return NextResponse.json({ error: 'El archivo no está disponible' }, { status: 404 });
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
