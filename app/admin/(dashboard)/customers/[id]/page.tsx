import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { fichaDelCliente } from '@/lib/clientes/ficha';
import FichaCliente from '@/components/admin/clientes/FichaCliente';

// C-276: la ficha de un cliente, en su propia página (antes era un cuadro chico dentro de la lista). La A que eligió el
// equipo el 16/11: dos columnas con todo a la vista. Los datos salen en lista blanca (lib/clientes/ficha.ts).
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ficha del cliente' };

export default async function PaginaFichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_USERS')) redirect('/admin');
  const { id } = await params;
  const ficha = await fichaDelCliente(id);
  if (!ficha) notFound();
  return <FichaCliente ficha={ficha} yo={session?.user?.id ?? null} />;
}
