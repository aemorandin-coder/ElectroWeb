import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { DESCUENTO_MAX } from '@/lib/proveedores/lista';
import { leerNombreProveedor, leerPorcentaje } from '@/lib/proveedores/servidor';

// C-196: los proveedores de los productos. Solo quien administra productos (el costo y a quién se le compra no son
// para Marketing). Nunca salen a la tienda.

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  const proveedores = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, discountPercent: true, notes: true, _count: { select: { products: { where: { deletedAt: null } } } } },
  });
  return NextResponse.json({
    proveedores: proveedores.map((p) => ({ id: p.id, name: p.name, discountPercent: Number(p.discountPercent), notes: p.notes, productos: p._count.products })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = leerNombreProveedor(body?.name);
  if (!name) return NextResponse.json({ error: 'El nombre del proveedor lleva de 2 a 80 caracteres' }, { status: 400 });
  const descuento = leerPorcentaje(body?.discountPercent ?? 0, DESCUENTO_MAX);
  if (descuento === null) return NextResponse.json({ error: `El descuento va de 0 a ${DESCUENTO_MAX} %` }, { status: 400 });
  const notas = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 500) || null : null;
  const repetido = await prisma.supplier.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, select: { id: true } });
  if (repetido) return NextResponse.json({ error: 'Ya hay un proveedor con ese nombre' }, { status: 409 });
  const creado = await prisma.supplier.create({ data: { name, discountPercent: descuento, notes: notas } });
  await registrarAccionAdmin(session, 'PANEL_RECORD_UPDATED', { type: 'SUPPLIER', id: creado.id }, { accion: 'Proveedor nuevo', proveedor: name }, request);
  return NextResponse.json({ id: creado.id, name: creado.name, discountPercent: Number(creado.discountPercent), notes: creado.notes, productos: 0 }, { status: 201 });
}
