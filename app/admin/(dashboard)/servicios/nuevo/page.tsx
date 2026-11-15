import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import AsistenteTrabajo from '../_components/AsistenteTrabajo';

// C-249e: un trabajo nuevo del portafolio de Servicios, por pasos (PLAN.md §1.9), desde "Agregar trabajo".
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nuevo trabajo realizado' };

export default async function PaginaNuevoTrabajo() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_CONTENT')) redirect('/admin');
  // Se propone el lugar siguiente al último de la lista
  const ultimo = await prisma.techServiceVideo.aggregate({ _max: { order: true } });
  return <AsistenteTrabajo trabajo={null} ordenSugerido={(ultimo._max.order ?? -1) + 1} />;
}
