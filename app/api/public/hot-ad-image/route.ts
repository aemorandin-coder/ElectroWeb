import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { imageVersion, parseImageDataUri } from '@/lib/queries/hot-ad';

/**
 * GET /api/public/hot-ad-image?v=<versión> (C-25)
 * Sirve como archivo la imagen del popup cuando está guardada como base64 en la BD.
 * Con la versión correcta se cachea un año (una imagen nueva trae otra versión); sin ella, 5 minutos.
 */
export async function GET(request: NextRequest) {
  const row = await prisma.companySettings.findUnique({
    where: { id: 'default' },
    select: { hotAdEnabled: true, hotAdImage: true },
  });
  const raw = row?.hotAdEnabled ? row.hotAdImage?.trim() : null;
  const parsed = raw ? parseImageDataUri(raw) : null;
  if (!raw || !parsed) {
    return new NextResponse(null, { status: 404 });
  }

  const version = imageVersion(raw);
  const matches = request.nextUrl.searchParams.get('v') === version;
  return new NextResponse(new Uint8Array(parsed.bytes), {
    status: 200,
    headers: {
      'Content-Type': parsed.mime,
      'Content-Length': String(parsed.bytes.length),
      'Cache-Control': matches ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
      ETag: `"${version}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
