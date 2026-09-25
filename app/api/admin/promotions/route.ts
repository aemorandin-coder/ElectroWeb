import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { promotionSchema } from '@/lib/validations/promotion';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { datosPromocion, erroresZod, toAdminPromotion } from '@/lib/promotions-admin';

// Ofertas y cupones de la tienda (C-102). Precios = permiso de productos.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const [rows, ahorros] = await Promise.all([
    prisma.promotion.findMany({ orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }], take: 300 }),
    prisma.promotionRedemption.groupBy({ by: ['promotionId'], _sum: { amountUSD: true } }),
  ]);
  const ahorroPorId = new Map(ahorros.map((a) => [a.promotionId, Number(a._sum.amountUSD ?? 0)]));
  // Nombres de los productos elegidos, para mostrarlos en la lista y al editar
  const ids = [...new Set(rows.flatMap((p) => p.productIds))];
  const products = ids.length > 0
    ? await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, priceUSD: true } })
    : [];
  return NextResponse.json({
    promotions: rows.map((p) => toAdminPromotion({ ...p, _sum: ahorroPorId.get(p.id) ?? 0 })),
    products: products.map((p) => ({ id: p.id, name: p.name, priceUSD: Number(p.priceUSD) })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const parsed = promotionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa los campos marcados', fields: erroresZod(parsed.error) }, { status: 400 });
  }
  try {
    const promo = await prisma.promotion.create({
      data: { ...datosPromocion(parsed.data), createdById: session?.user?.id ?? null },
    });
    revalidateStorefront();
    await registrarAccionAdmin(session, 'DISCOUNT_CHANGED', { type: 'PROMOTION', id: promo.id }, {
      cambio: 'Creada', nombre: promo.name, tipo: promo.kind, codigo: promo.code, porcentaje: promo.percentOff, monto: promo.amountOffUSD ? Number(promo.amountOffUSD) : null,
    }, request);
    return NextResponse.json({ promotion: toAdminPromotion(promo) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un cupón con ese código', fields: { code: 'Ese código ya existe' } }, { status: 409 });
    }
    console.error('Error creando promoción:', error);
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }
}
