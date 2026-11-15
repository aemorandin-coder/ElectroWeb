import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { toAdminPromotion } from '@/lib/promotions-admin';
import AsistentePromocion from '../_components/AsistentePromocion';
import { categoriasDelPanel, muestraGeneral, productosElegidos } from '../_components/servidor';

// C-249b: cambiar una oferta o un cupón que ya existe, por pasos (PLAN.md §1.9). El último paso dice qué cambia y a
// cuántos afecta antes de guardar; guarda con la versión con que se abrió (C-170).
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cambiar oferta o cupón' };

export default async function PaginaCambiarPromocion({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_PRODUCTS')) redirect('/admin');
  const { id } = await params;
  const promo = await prisma.promotion.findUnique({ where: { id } });
  if (!promo) notFound();
  const [ahorro, elegidos, categorias, muestra] = await Promise.all([
    prisma.promotionRedemption.aggregate({ where: { promotionId: id }, _sum: { amountUSD: true } }),
    productosElegidos(promo.productIds),
    categoriasDelPanel(),
    muestraGeneral(),
  ]);
  return (
    <AsistentePromocion
      key={promo.updatedAt.toISOString()}
      modo="editar"
      promocion={toAdminPromotion({ ...promo, _sum: Number(ahorro._sum.amountUSD ?? 0) })}
      productosIniciales={elegidos.refs}
      fichasIniciales={elegidos.fichas}
      muestraGeneral={muestra}
      categorias={categorias}
    />
  );
}
