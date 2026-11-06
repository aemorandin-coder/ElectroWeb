import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { nombreDeSesion } from '@/lib/edicion/servidor';
import { publicarRecursoCambiado } from '@/lib/realtime/bus';
import { revalidateStorefront } from '@/lib/revalidate-storefront';

// POST /api/products/[id]/restaurar (C-169): saca un producto de la papelera y lo deja como estaba (publicado, borrador o archivado).
// Su SKU y su dirección siguen siendo suyos mientras estuvo en la papelera: no hay choque al volver.
// C-187: también recupera un producto eliminado (tenía ventas y se conservó oculto). Eso deshace un "Borrar para siempre",
// así que solo lo hace el dueño, y vuelve como borrador: nada se publica solo.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const { id } = await params;
  const producto = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, sku: true, deletedAt: true, eliminadoAt: true, statusAntesDePapelera: true } });
  if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  if (!producto.deletedAt) return NextResponse.json({ error: 'El producto no está en la papelera' }, { status: 409 });

  const eliminado = producto.eliminadoAt !== null;
  // El "Deshacer" de mover a la papelera solo saca de la papelera: no recupera lo que entretanto se borró para siempre
  if (eliminado && new URL(request.url).searchParams.get('desde') === 'papelera') {
    return NextResponse.json({ error: 'Ya se borró para siempre: recupéralo desde Papelera → Eliminados' }, { status: 409 });
  }
  if (eliminado && !hasPermission(session, 'MANAGE_SETTINGS')) {
    return NextResponse.json({ error: 'Solo el dueño puede recuperar un producto eliminado' }, { status: 403 });
  }

  const estado = eliminado ? 'DRAFT' : producto.statusAntesDePapelera ?? 'DRAFT';
  const restaurado = await prisma.product.updateMany({
    where: { id, deletedAt: { not: null }, eliminadoAt: eliminado ? { not: null } : null },
    data: { status: estado, deletedAt: null, deletedById: null, statusAntesDePapelera: null, eliminadoAt: null },
  });
  if (restaurado.count > 0) {
    revalidateStorefront();
    await registrarAccionAdmin(session, 'PRODUCT_RESTORED', { type: 'PRODUCT', id }, { producto: producto.name, sku: producto.sku, estado, ...(eliminado ? { origen: 'Recuperado de los eliminados' } : {}) }, request);
    publicarRecursoCambiado(`product:${id}`, 'restaurado', { id: session!.user.id, nombre: nombreDeSesion(session) });
  }
  // `updatedAt` nuevo: el editor que lo tenía abierto sigue desde aquí
  const actual = await prisma.product.findUnique({ where: { id }, select: { updatedAt: true, status: true } });
  return NextResponse.json({
    id, status: actual?.status ?? estado, updatedAt: actual?.updatedAt.toISOString() ?? null,
    message: eliminado ? 'Producto recuperado: quedó en borrador' : 'Producto restaurado',
  });
}
