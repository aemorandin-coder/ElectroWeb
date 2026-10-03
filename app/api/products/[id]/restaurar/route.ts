import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { nombreDeSesion } from '@/lib/edicion/servidor';
import { publicarRecursoCambiado } from '@/lib/realtime/bus';
import { revalidateStorefront } from '@/lib/revalidate-storefront';

// POST /api/products/[id]/restaurar (C-169): saca un producto de la papelera y lo deja como estaba (publicado, borrador o archivado).
// Su SKU y su dirección siguen siendo suyos mientras estuvo en la papelera: no hay choque al volver.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const { id } = await params;
  const producto = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, sku: true, deletedAt: true, statusAntesDePapelera: true } });
  if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  if (!producto.deletedAt) return NextResponse.json({ error: 'El producto no está en la papelera' }, { status: 409 });

  const estado = producto.statusAntesDePapelera ?? 'DRAFT';
  const restaurado = await prisma.product.updateMany({
    where: { id, deletedAt: { not: null } },
    data: { status: estado, deletedAt: null, deletedById: null, statusAntesDePapelera: null },
  });
  if (restaurado.count > 0) {
    revalidateStorefront();
    await registrarAccionAdmin(session, 'PRODUCT_RESTORED', { type: 'PRODUCT', id }, { producto: producto.name, sku: producto.sku, estado }, request);
    publicarRecursoCambiado(`product:${id}`, 'restaurado', { id: session!.user.id, nombre: nombreDeSesion(session) });
  }
  // `updatedAt` nuevo: el editor que lo tenía abierto sigue desde aquí
  const actual = await prisma.product.findUnique({ where: { id }, select: { updatedAt: true, status: true } });
  return NextResponse.json({ id, status: actual?.status ?? estado, updatedAt: actual?.updatedAt.toISOString() ?? null, message: 'Producto restaurado' });
}
