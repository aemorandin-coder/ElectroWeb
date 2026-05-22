import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const video = await prisma.techServiceVideo.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.videoUrl !== undefined && { videoUrl: body.videoUrl }),
        ...(body.thumbnail !== undefined && { thumbnail: body.thumbnail }),
        ...(body.platform !== undefined && { platform: body.platform }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.beforeImage !== undefined && { beforeImage: body.beforeImage }),
        ...(body.afterImage !== undefined && { afterImage: body.afterImage }),
        ...(body.customerName !== undefined && { customerName: body.customerName }),
        ...(body.testimonial !== undefined && { testimonial: body.testimonial }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.order !== undefined && { order: body.order }),
      },
    });

    return NextResponse.json(video);
  } catch (error) {
    console.error('PATCH service-video error:', error);
    return NextResponse.json({ error: 'Error al actualizar trabajo' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.techServiceVideo.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE service-video error:', error);
    return NextResponse.json({ error: 'Error al eliminar trabajo' }, { status: 500 });
  }
}
