import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH - Actualizar notificación (marcar como leída)
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { read } = body;

        // Verificar que la notificación pertenece al usuario
        const notification = await prisma.notification.findUnique({
            where: { id: params.id },
        });

        if (!notification) {
            return NextResponse.json(
                { error: 'Notificación no encontrada' },
                { status: 404 }
            );
        }

        if (notification.userId !== session.user.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const updated = await prisma.notification.update({
            where: { id: params.id },
            data: { read },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating notification:', error);
        return NextResponse.json(
            { error: 'Error al actualizar notificación' },
            { status: 500 }
        );
    }
}

// DELETE - Eliminar notificación
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Verificar que la notificación pertenece al usuario
        const notification = await prisma.notification.findUnique({
            where: { id: params.id },
        });

        if (!notification) {
            return NextResponse.json(
                { error: 'Notificación no encontrada' },
                { status: 404 }
            );
        }

        if (notification.userId !== session.user.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        await prisma.notification.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: 'Notificación eliminada' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return NextResponse.json(
            { error: 'Error al eliminar notificación' },
            { status: 500 }
        );
    }
}
