import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';

// C-229 y C-235: Contabilidad empieza en la mesa para quien lleva la contabilidad (el dueño y la contadora) y en Facturas
// para quien solo factura. El Resumen del mes llega con C-230 (docs/plan/CONTABILIDAD.md §8).
export default async function PaginaContabilidad() {
  const session = await getServerSession(authOptions);
  redirect(hasPermission(session, 'VER_CONTABILIDAD') ? '/admin/contabilidad/mesa' : '/admin/contabilidad/facturas');
}
