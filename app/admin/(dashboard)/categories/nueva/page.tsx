import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import AsistenteCategoria from '../_components/AsistenteCategoria';
import { categoriasParaElegir } from '../_components/servidor';

// C-249b: una categoría nueva, por pasos (PLAN.md §1.9). Con ?padre=<id>, una subcategoría ("Crear subcategoría").
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nueva categoría' };

export default async function PaginaNuevaCategoria({ searchParams }: { searchParams: Promise<{ padre?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_PRODUCTS')) redirect('/admin');
  const { padre } = await searchParams;
  const categorias = await categoriasParaElegir();
  return <AsistenteCategoria categoria={null} categorias={categorias} padre={categorias.some((c) => c.id === padre) ? padre : null} />;
}
