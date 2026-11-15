import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import AsistentePromocion from '../_components/AsistentePromocion';
import { categoriasDelPanel, muestraGeneral } from '../_components/servidor';

// C-249b: una oferta o un cupón nuevo, por pasos (PLAN.md §1.9). Llega con ?tipo=cupon desde "Nuevo cupón".
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nueva oferta o cupón' };

export default async function PaginaNuevaPromocion({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_PRODUCTS')) redirect('/admin');
  const { tipo } = await searchParams;
  const [categorias, muestra] = await Promise.all([categoriasDelPanel(), muestraGeneral()]);
  return (
    <AsistentePromocion
      modo="nuevo"
      tipo={tipo === 'cupon' ? 'COUPON' : 'AUTOMATIC'}
      promocion={null}
      productosIniciales={[]}
      fichasIniciales={[]}
      muestraGeneral={muestra}
      categorias={categorias}
    />
  );
}
