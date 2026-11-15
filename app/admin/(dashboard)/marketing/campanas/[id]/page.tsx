import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { leerBloques } from '@/lib/email-campaigns';
import AsistenteCampana from '../_components/AsistenteCampana';
import { datosDeEnvio } from '../_components/servidor';

// C-249d: cambiar el borrador de una campaña, por pasos (PLAN.md §1.9). Guarda con la versión con que se abrió (C-170).
// Una campaña enviada, en curso o pausada no se reescribe (el servidor tampoco lo deja): vuelve a la lista.
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cambiar campaña de correo' };

export default async function PaginaCambiarCampana({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, 'MANAGE_CONTENT')) redirect('/admin');
  const { id } = await params;
  const c = await prisma.emailCampaign.findUnique({ where: { id }, select: { id: true, subject: true, preheader: true, content: true, status: true, updatedAt: true } });
  if (!c) notFound();
  if (c.status !== 'DRAFT') redirect('/admin/marketing#campanas');
  return (
    <AsistenteCampana
      key={c.updatedAt.toISOString()}
      campana={{ id: c.id, subject: c.subject, preheader: c.preheader || '', bloques: leerBloques(c.content), updatedAt: c.updatedAt.toISOString() }}
      envio={await datosDeEnvio()}
    />
  );
}
