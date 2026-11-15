import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import AsistenteCampana from '../_components/AsistenteCampana';
import { datosDeEnvio } from '../_components/servidor';

// C-249d: una campaña de correo nueva, por pasos (PLAN.md §1.9), desde "Nueva campaña" en Marketing → Campañas.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nueva campaña de correo' };

export default async function PaginaNuevaCampana() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_CONTENT')) redirect('/admin');
  return <AsistenteCampana campana={null} envio={await datosDeEnvio()} />;
}
