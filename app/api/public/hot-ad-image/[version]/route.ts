import { NextRequest, NextResponse } from 'next/server';
import { readHotAdImage } from '@/lib/queries/hot-ad';

/**
 * GET /api/public/hot-ad-image/<versión> (C-23b)
 * Imagen del popup guardada como base64 en la BD, servida como archivo. La versión va en la ruta para que
 * el optimizador de imágenes la acepte. Con la versión correcta se cachea un año; con otra, 5 minutos.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  const image = await readHotAdImage();
  if (!image) {
    return new NextResponse(null, { status: 404 });
  }

  const matches = version === image.version;
  return new NextResponse(new Uint8Array(image.bytes), {
    status: 200,
    headers: {
      'Content-Type': image.mime,
      'Content-Length': String(image.bytes.length),
      'Cache-Control': matches ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
      ETag: `"${image.version}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
