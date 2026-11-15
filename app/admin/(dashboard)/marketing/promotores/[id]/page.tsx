import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import AsistentePromotor from '../_components/AsistentePromotor';
import { ejemploDeCompra } from '../_components/servidor';

// C-249d: cambiar un promotor (su nombre, sus notas, la comisión y el descuento de su código), por pasos (PLAN.md §1.9).
// El último paso dice qué cambia y a cuántas comisiones y compras toca; guarda con la versión con que se abrió (C-170).
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cambiar promotor' };

export default async function PaginaCambiarPromotor({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_USERS')) redirect('/admin');
  const { id } = await params;
  const p = await prisma.influencer.findUnique({
    where: { id },
    select: {
      id: true, code: true, name: true, commissionRate: true, customerDiscountPercent: true, notes: true, status: true, updatedAt: true,
      user: { select: { name: true, email: true } }, coupon: { select: { id: true } },
    },
  });
  if (!p) notFound();
  return (
    <AsistentePromotor
      key={p.updatedAt.toISOString()}
      promotor={{
        id: p.id, code: p.code, name: p.name, commissionRate: Number(p.commissionRate), customerDiscountPercent: p.customerDiscountPercent,
        notes: p.notes ?? '', status: p.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE', updatedAt: p.updatedAt.toISOString(),
        usuario: { nombre: p.user.name, email: p.user.email }, conCupon: p.coupon !== null,
      }}
      ejemplo={await ejemploDeCompra()}
    />
  );
}
