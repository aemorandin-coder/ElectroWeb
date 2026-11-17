import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { datosEditablesDe, verificacionDe } from '@/lib/clientes/datos-editables';
import EditarCliente from '@/components/admin/clientes/EditarCliente';

// C-276: cambiar los datos de un cliente, por pasos (PLAN.md §1.9), con antes → después y a quién afecta al final. Son los
// mismos datos que cambiaba la ventana vieja de la lista; la verificación de la empresa se guarda por Verificaciones.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Editar cliente' };

export default async function PaginaEditarCliente({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_USERS')) redirect('/admin');
  const { id } = await params;
  const [datos, verificacion] = await Promise.all([datosEditablesDe(id), verificacionDe(id)]);
  if (!datos) notFound();
  return <EditarCliente id={id} datos={datos} verificacion={verificacion} />;
}
