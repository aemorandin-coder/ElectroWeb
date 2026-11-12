import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { DESCUENTO_MAX } from '@/lib/proveedores/lista';
import { leerNombreProveedor, leerPorcentaje } from '@/lib/proveedores/servidor';
import { esLaDeSiempre, leerTerminos } from '@/lib/proveedores/no-se-envia';

type Ctx = { params: Promise<{ id: string }> };

// C-196: cambiar el nombre, el descuento o las notas de un proveedor. C-204: y la lista de lo que no se envía
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  const { id } = await params;
  const actual = await prisma.supplier.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const data: { name?: string; discountPercent?: number; pricesIncludeTax?: boolean; notes?: string | null; noShipTerms?: string[] } = {};
  if (body?.name !== undefined) {
    const name = leerNombreProveedor(body.name);
    if (!name) return NextResponse.json({ error: 'El nombre del proveedor lleva de 2 a 80 caracteres' }, { status: 400 });
    const repetido = await prisma.supplier.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } }, select: { id: true } });
    if (repetido) return NextResponse.json({ error: 'Ya hay un proveedor con ese nombre' }, { status: 409 });
    data.name = name;
  }
  if (body?.discountPercent !== undefined) {
    const d = leerPorcentaje(body.discountPercent, DESCUENTO_MAX);
    if (d === null) return NextResponse.json({ error: `El descuento va de 0 a ${DESCUENTO_MAX} %` }, { status: 400 });
    data.discountPercent = d;
  }
  if (body?.pricesIncludeTax !== undefined) {
    if (typeof body.pricesIncludeTax !== 'boolean') return NextResponse.json({ error: 'IVA incluido: sí o no' }, { status: 400 });
    data.pricesIncludeTax = body.pricesIncludeTax;
  }
  if (body?.notes !== undefined) data.notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) || null : null;
  if (body?.noShipTerms !== undefined) {
    const terminos = leerTerminos(body.noShipTerms);
    if (terminos === null) return NextResponse.json({ error: 'La lista de lo que no se envía: hasta 120 palabras o frases' }, { status: 400 });
    // La de siempre se guarda vacía: si la lista de siempre mejora, la toma sola
    data.noShipTerms = esLaDeSiempre(terminos) ? [] : terminos;
  }
  const guardado = await prisma.supplier.update({ where: { id }, data });
  await registrarAccionAdmin(session, 'PANEL_RECORD_UPDATED', { type: 'SUPPLIER', id }, {
    accion: 'Proveedor cambiado', proveedor: guardado.name,
    ...(data.discountPercent !== undefined && data.discountPercent !== Number(actual.discountPercent) ? { descuento: { antes: Number(actual.discountPercent), despues: data.discountPercent } } : {}),
    ...(data.noShipTerms !== undefined ? { noSeEnvia: data.noShipTerms.length === 0 ? 'la lista de siempre' : data.noShipTerms } : {}),
  }, request);
  return NextResponse.json({ id: guardado.id, name: guardado.name, discountPercent: Number(guardado.discountPercent), pricesIncludeTax: guardado.pricesIncludeTax, notes: guardado.notes, noShipTerms: guardado.noShipTerms });
}

// Se borra solo si no tiene productos (ni en la papelera): el costo y el código de cada producto dependen de él
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  const { id } = await params;
  const proveedor = await prisma.supplier.findUnique({ where: { id }, select: { name: true, _count: { select: { products: true } } } });
  if (!proveedor) return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });
  if (proveedor._count.products > 0) {
    return NextResponse.json({ error: `Tiene ${proveedor._count.products} ${proveedor._count.products === 1 ? 'producto' : 'productos'}: cámbialos de proveedor primero` }, { status: 409 });
  }
  await prisma.supplier.delete({ where: { id } });
  await registrarAccionAdmin(session, 'PANEL_RECORD_UPDATED', { type: 'SUPPLIER', id }, { accion: 'Proveedor borrado', proveedor: proveedor.name }, request);
  return NextResponse.json({ ok: true });
}
