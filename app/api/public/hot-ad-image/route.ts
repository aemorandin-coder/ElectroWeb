import { NextRequest, NextResponse } from 'next/server';
import { readHotAdImage } from '@/lib/queries/hot-ad';

/**
 * GET /api/public/hot-ad-image?v=<versión> (C-25)
 * Ruta vieja, para HTML en caché de antes de C-23b: la tienda ahora usa /api/public/hot-ad-image/<versión>.
 * Con la versión correcta se cachea un año (una imagen nueva trae otra versión); sin ella, 5 minutos.
 */
export async function GET(request: NextRequest) {
  const image = await readHotAdImage();
  if (!image) {
    return new NextResponse(null, { status: 404 });
  }

  const matches = request.nextUrl.searchParams.get('v') === image.version;
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
