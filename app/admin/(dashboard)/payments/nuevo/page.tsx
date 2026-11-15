import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import AsistenteMetodo from '../_components/AsistenteMetodo';

// C-249b: un método de pago nuevo, por pasos (PLAN.md §1.9). Solo el dueño (el proxy ya lo cuida, como a la lista).
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nuevo método de pago' };

export default async function PaginaNuevoMetodo() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_SETTINGS')) redirect('/admin');
  // Como antes: el nuevo va al final de la lista
  const cuantos = await prisma.companyPaymentMethod.count();
  return <AsistenteMetodo metodo={null} orden={cuantos + 1} />;
}
