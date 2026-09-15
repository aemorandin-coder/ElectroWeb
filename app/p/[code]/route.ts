import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeShortCode } from '@/lib/short-code';

/**
 * Enlace corto para compartir: /p/<código> → /productos/<slug>.
 * 307 y no 301: el slug cambia si se renombra el producto y un 301 queda guardado en el navegador.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const code = normalizeShortCode((await params).code);
  const base = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;

  const product = code
    ? await prisma.product.findFirst({ where: { shortCode: { equals: code, mode: 'insensitive' } }, select: { slug: true, status: true } })
    : null;

  if (!product || product.status !== 'PUBLISHED') {
    return NextResponse.redirect(new URL('/productos', base), 307);
  }

  return NextResponse.redirect(new URL(`/productos/${product.slug}`, base), 307);
}
