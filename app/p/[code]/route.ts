import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const product = await prisma.product.findUnique({
    where: { shortCode: code },
    select: { slug: true, status: true },
  });

  if (!product || product.status === 'ARCHIVED') {
    return NextResponse.redirect(new URL('/productos', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
  }

  return NextResponse.redirect(
    new URL(`/productos/${product.slug}`, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
    { status: 301 }
  );
}
