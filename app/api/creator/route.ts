import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitAdminEvent } from '@/lib/admin-events';

// GET — get current user's creator profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userId = (session.user as any).id;
    const creator = await prisma.courseCreator.findUnique({
      where: { userId },
      include: { _count: { select: { courses: true } } },
    });

    return NextResponse.json(creator);
  } catch (error) {
    console.error('GET /api/creator error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

// POST — apply to become a creator
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userId = (session.user as any).id;
    const { displayName, bio, expertise } = await request.json();

    if (!displayName) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const existing = await prisma.courseCreator.findUnique({ where: { userId } });
    if (existing) {
      return NextResponse.json({ error: 'Ya tienes una solicitud enviada' }, { status: 400 });
    }

    const creator = await prisma.courseCreator.create({
      data: { userId, displayName, bio: bio || null, expertise: expertise || null },
    });

    // Notify admins about new creator application (fire-and-forget)
    emitAdminEvent({
      type: 'CREATOR_APPLIED',
      title: `Solicitud de creador · ${String(displayName).slice(0, 80)}`,
      summary: `${String(displayName).slice(0, 80)} quiere publicar cursos`,
      fields: [['Correo', session.user.email], ['Especialidad', typeof expertise === 'string' ? expertise.slice(0, 200) : null]],
      link: '/admin/creators',
    });

    return NextResponse.json(creator, { status: 201 });
  } catch (error) {
    console.error('POST /api/creator error:', error);
    return NextResponse.json({ error: 'Error al enviar solicitud' }, { status: 500 });
  }
}

// PATCH — update creator profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const userId = (session.user as any).id;
    const body = await request.json();

    const creator = await prisma.courseCreator.update({
      where: { userId },
      data: {
        displayName: body.displayName,
        bio: body.bio || null,
        expertise: body.expertise || null,
        avatar: body.avatar || null,
      },
    });

    return NextResponse.json(creator);
  } catch (error) {
    console.error('PATCH /api/creator error:', error);
    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
  }
}
