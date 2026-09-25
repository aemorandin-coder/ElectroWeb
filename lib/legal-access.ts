// Quién puede ver una firma (C-103): su dueño, o quien administra clientes en el panel.
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function firmaAccesible(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { status: 401 as const };
  const firma = await prisma.documentSignature.findUnique({
    where: { id: id.slice(0, 40) },
    include: { document: { select: { slug: true, version: true } } },
  });
  if (!firma) return { status: 404 as const };
  const esAdmin = session.user.userType === 'admin' && isAuthorized(session, 'MANAGE_USERS');
  if (firma.userId !== session.user.id && !esAdmin) return { status: 404 as const };
  return { status: 200 as const, firma };
}
