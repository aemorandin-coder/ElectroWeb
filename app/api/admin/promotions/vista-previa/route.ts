// C-249b: antes de guardar una oferta o un cupón, a cuántos afecta (PLAN.md §1.9): cuántos productos de la tienda entran
// con los datos nuevos y, si ya existe, cuántos entraban, cuántas compras la usaron y de cuántos clientes. No guarda nada.
// Valida con el mismo esquema que la ruta que guarda, así las dos leen lo mismo.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { erroresZod } from '@/lib/promotions-admin';
import { promotionSchema } from '@/lib/validations/promotion';

/** Lo que la tienda muestra de una promoción: productos físicos publicados (los digitales nunca llevan descuento) */
function enTienda(d: { kind: 'AUTOMATIC' | 'COUPON'; scope: 'ALL' | 'CATEGORY' | 'PRODUCT'; categoryIds: string[]; productIds: string[] }): Prisma.ProductWhereInput {
  return {
    status: 'PUBLISHED',
    productType: 'PHYSICAL',
    deletedAt: null,
    // C-119: los usados, reacondicionados y de caja abierta no llevan cupón (las ofertas sí)
    ...(d.kind === 'COUPON' ? { condition: 'NEW' as const } : {}),
    ...(d.scope === 'CATEGORY' ? { categoryId: { in: d.categoryIds } } : d.scope === 'PRODUCT' ? { id: { in: d.productIds } } : {}),
  };
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = promotionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa los campos marcados', fields: erroresZod(parsed.error) }, { status: 400 });
  }
  const id = body && typeof body.id === 'string' && body.id.length <= 60 ? body.id : null;
  const actual = id ? await prisma.promotion.findUnique({ where: { id } }) : null;
  if (id && !actual) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  const [productos, antes] = await Promise.all([
    prisma.product.count({ where: enTienda(parsed.data) }),
    actual
      ? Promise.all([
        prisma.product.count({ where: enTienda(actual) }),
        prisma.promotionRedemption.groupBy({ by: ['userId'], where: { promotionId: actual.id } }),
        prisma.promotionRedemption.aggregate({ where: { promotionId: actual.id }, _sum: { amountUSD: true }, _count: true }),
      ])
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    productos,
    antes: antes && actual
      ? {
        productos: antes[0],
        compras: antes[2]._count,
        clientes: antes[1].length,
        ahorroUSD: Number(antes[2]._sum.amountUSD ?? 0),
        usos: actual.usesCount,
      }
      : null,
  });
}
