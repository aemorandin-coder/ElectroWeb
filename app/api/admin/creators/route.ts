import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
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

    const creator = await prisma.courseCreator.update({
      where: { id },
      data: { status, notes: notes || null },
      include: { user: { select: { email: true } } },
    });

    // Send email notification to creator asynchronously
    if (status === 'APPROVED' || status === 'REJECTED' || status === 'SUSPENDED') {
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
