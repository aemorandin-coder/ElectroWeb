import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { isInside } from '@/lib/private-uploads';

// C-219: la foto de un producto para un correo, en JPEG y del tamaño justo. Las fotos se guardan en WebP y Outlook de
// Windows no lo muestra. Solo lee de public/uploads (nunca los documentos ni las fotos de garantía, que son privados), con
// unos pocos anchos fijos, y se guarda en la caché del navegador y de Gmail por 30 días.
//   GET /api/public/foto-correo/products/product-123.webp?w=128

const PUBLIC_UPLOADS = path.join(process.cwd(), 'public', 'uploads');
const ANCHOS = new Set([64, 128, 192, 600]);
const PRIVADAS = new Set(['documents', 'warranty']);

export async function GET(request: NextRequest, { params }: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await params;
  const nombre = ruta.join('/');
  if (ruta.length === 0 || PRIVADAS.has(ruta[0]) || !/^(?:[\w-]+\/)*[\w-][\w.-]*\.(?:webp|png|jpe?g|avif)$/i.test(nombre)) {
    return NextResponse.json({ error: 'Foto no válida' }, { status: 400 });
  }
  const ancho = Number(request.nextUrl.searchParams.get('w') ?? 128);
  if (!ANCHOS.has(ancho)) return NextResponse.json({ error: 'Ancho no válido' }, { status: 400 });

  const archivo = path.join(PUBLIC_UPLOADS, nombre);
  if (!isInside(PUBLIC_UPLOADS, archivo)) return NextResponse.json({ error: 'Foto no válida' }, { status: 400 });

  try {
    const original = await readFile(archivo);
    // Cuadrada para las miniaturas (64 a 192), con el producto entero sobre blanco; la de 600 conserva su forma
    const cuadrada = ancho <= 192;
    const jpeg = await sharp(original)
      .resize(ancho, cuadrada ? ancho : undefined, { fit: cuadrada ? 'contain' : 'inside', background: '#ffffff', withoutEnlargement: !cuadrada })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return new NextResponse(new Uint8Array(jpeg), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=2592000, immutable' },
    });
  } catch {
    return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });
  }
}
