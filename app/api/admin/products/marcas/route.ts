import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// GET /api/admin/products/marcas (C-155): las marcas que ya existen, para sugerirlas en el asistente y que
// "Xiaomi" no termine escrita de tres formas. Solo lectura.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const marcas = await prisma.brand.findMany({ select: { name: true }, orderBy: { name: 'asc' }, take: 500 });
  return NextResponse.json({ marcas: marcas.map((m) => m.name) });
}
