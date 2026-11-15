import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import AsistentePromotor from '../_components/AsistentePromotor';
import { ejemploDeCompra } from '../_components/servidor';

// C-249d: un promotor nuevo, por pasos (PLAN.md §1.9), desde "Nuevo promotor" en Marketing → Promotores.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nuevo promotor' };

export default async function PaginaNuevoPromotor() {
  const session = await getServerSession(authOptions);
  // El mismo permiso que la API de promotores
  if (!hasPermission(session, 'MANAGE_USERS')) redirect('/admin');
  return <AsistentePromotor promotor={null} ejemplo={await ejemploDeCompra()} />;
}
