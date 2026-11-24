import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';

export default async function PaginaMesaRedirect() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'VER_CONTABILIDAD')) {
    redirect(hasPermission(session, 'FACTURAR') ? '/admin/contabilidad/facturas' : '/admin');
  }
  redirect('/admin/contabilidad?tab=resumen');
}
