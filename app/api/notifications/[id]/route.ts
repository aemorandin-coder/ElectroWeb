import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/notifications/:id { read: boolean } — solo las notificaciones propias
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (typeof body?.read !== 'boolean') {
      return NextResponse.json({ error: 'Falta read (true o false)' }, { status: 400 });
    }

    // Una sola consulta con el dueño en el filtro: la de otro usuario da el mismo 404 que una que no existe
    const updated = await prisma.notification.updateMany({ where: { id, userId: session.user.id }, data: { read: body.read } });
    if (updated.count === 0) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ id, read: body.read });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Error al actualizar notificación' }, { status: 500 });
  }
}

// DELETE /api/notifications/:id — solo las propias
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const deleted = await prisma.notification.deleteMany({ where: { id, userId: session.user.id } });
    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Notificación eliminada' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Error al eliminar notificación' }, { status: 500 });
  }
}
