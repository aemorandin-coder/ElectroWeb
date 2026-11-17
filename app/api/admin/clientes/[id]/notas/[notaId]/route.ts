import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

// C-276: borrar una nota del equipo. Cada quien borra las suyas; el dueño (SUPER_ADMIN), cualquiera.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; notaId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS') || !session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id, notaId } = await params;
  const nota = await prisma.notaCliente.findFirst({ where: { id: notaId, clienteId: id }, select: { id: true, autorId: true } });
  if (!nota) return NextResponse.json({ error: 'Esa nota ya no existe' }, { status: 404 });
  if (nota.autorId !== session.user.id && session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Solo quien la escribió puede borrarla' }, { status: 403 });
  }
  await prisma.notaCliente.delete({ where: { id: nota.id } });
  return NextResponse.json({ ok: true });
}
