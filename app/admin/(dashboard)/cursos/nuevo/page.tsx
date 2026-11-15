import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import AsistenteCurso from '../_components/AsistenteCurso';

// C-249e: un curso nuevo, por pasos (PLAN.md §1.9), desde "Nuevo curso" en Cursos.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nuevo curso' };

export default async function PaginaNuevoCurso() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_CONTENT')) redirect('/admin');
  return <AsistenteCurso curso={null} />;
}
