import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { esAdminVerificado, hasPermission } from '@/lib/auth-helpers';
import { ordenesQueCoinciden } from '@/lib/admin/buscar';
import { ETIQUETA_ESTADO } from '@/lib/order-admin';
import { prisma } from '@/lib/prisma';
import { abreviarNombre } from '@/lib/visitantes';

export const dynamic = 'force-dynamic';

// C-279: el buscador del Dashboard (Ctrl K). GET ?q= → hasta 6 productos y 6 órdenes que coinciden, con lo justo para la lista.
// Los productos, con permiso de Productos o de Marketing; las órdenes, con permiso de Órdenes (lib/admin/buscar.ts: número,
// cliente, teléfono, cédula, referencia del Pago Móvil o guía). Nada de costos, correos ni teléfonos en la respuesta.

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!esAdminVerificado(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ productos: [], ordenes: [] });
  const verProductos = hasPermission(session, 'MANAGE_PRODUCTS') || hasPermission(session, 'MANAGE_CONTENT');
  const verOrdenes = hasPermission(session, 'MANAGE_ORDERS');

  const [productos, ordenes] = await Promise.all([
    verProductos
      ? prisma.product.findMany({
        where: { deletedAt: null, OR: [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }] },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        take: 6,
        select: { id: true, name: true, stock: true, priceUSD: true, mainImage: true, status: true, productType: true },
      })
      : Promise.resolve([]),
    verOrdenes
      ? ordenesQueCoinciden(q).then((condiciones) => (condiciones.length === 0 ? [] : prisma.order.findMany({
        where: { OR: condiciones },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, orderNumber: true, totalUSD: true, status: true, billingName: true, guestName: true, user: { select: { name: true } } },
      })))
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    productos: productos.map((p) => ({
      id: p.id, nombre: p.name, stock: p.stock, precioUSD: Number(p.priceUSD), foto: p.mainImage, publicado: p.status === 'PUBLISHED', digital: p.productType !== 'PHYSICAL',
    })),
    ordenes: ordenes.map((o) => ({
      id: o.id, numero: o.orderNumber, totalUSD: Number(o.totalUSD), estado: ETIQUETA_ESTADO[o.status] ?? o.status,
      cliente: abreviarNombre(o.billingName || o.user?.name || o.guestName) ?? 'Cliente',
    })),
  });
}
