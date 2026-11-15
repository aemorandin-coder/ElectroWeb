import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import AsistenteLote from '../_components/AsistenteLote';

// C-249b: generar gift cards impresas por pasos (PLAN.md §1.9), desde "Generar impresas" de Gift cards.
export const metadata = { title: 'Generar tarjetas impresas' };

export default async function PaginaNuevoLote() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_ORDERS')) redirect('/admin');
  return <AsistenteLote />;
}
