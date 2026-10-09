import { respuestaYaResuelto } from '@/lib/edicion/registro';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { sendCreatorStatusEmail } from '@/lib/email-templates/CourseCertificate';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_USERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const creators = await prisma.courseCreator.findMany({
      include: {
        user: { select: { name: true, email: true, image: true } },
        _count: { select: { courses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(creators);
  } catch (error) {
    console.error('GET /api/admin/creators error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_USERS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id, status, notes } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'id y status son requeridos' }, { status: 400 });
    }
    // Solo estados conocidos: antes se guardaba cualquier texto y el creador quedaba en un estado que ninguna página entiende
    if (!['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    // C-170: dos administradores resolviendo la misma solicitud. El cambio entra solo si el creador sigue en el estado que se vio:
    // la segunda persona recibe "ya la atendió…" y el creador no recibe el correo dos veces.
    const antes = await prisma.courseCreator.findUnique({ where: { id }, select: { status: true } });
    if (!antes) return NextResponse.json({ error: 'Creador no encontrado', conflicto: 'no_existe' }, { status: 404 });
    const cambiaEstado = antes.status !== status;
    const tomado = await prisma.courseCreator.updateMany({ where: { id, status: antes.status }, data: { status, notes: notes || null } });
    if (tomado.count === 0) {
      return respuestaYaResuelto({ tipo: 'CREATOR', id, que: 'atendió esta solicitud', acciones: ['CREATOR_STATUS_CHANGED'] });
    }
    const creator = await prisma.courseCreator.findUniqueOrThrow({ where: { id }, include: { user: { select: { email: true } } } });

    await registrarAccionAdmin(session, 'CREATOR_STATUS_CHANGED', { type: 'CREATOR', id }, {
      creador: creator.displayName,
      estado: status,
      ...(notes ? { notas: String(notes).slice(0, 300) } : {}),
    }, request);

    // Send email notification to creator asynchronously
    // Solo si el estado cambió de verdad: guardar otra vez el mismo (o solo la nota) no vuelve a avisar
    if (cambiaEstado && (status === 'APPROVED' || status === 'REJECTED' || status === 'SUSPENDED')) {
      sendCreatorStatusEmail(creator.user.email ?? '', {
        creatorName: creator.displayName,
        status: status as 'APPROVED' | 'REJECTED' | 'SUSPENDED',
        notes: notes || undefined,
      }).catch((err) => console.error('[Creator status email error]', err));
    }

    return NextResponse.json(creator);
  } catch (error) {
    console.error('PATCH /api/admin/creators error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
