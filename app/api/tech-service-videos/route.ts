import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminPermission } from '@prisma/client';

// GET /api/tech-service-videos - List all tech service videos (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    const videos = await prisma.techServiceVideo.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error('Error fetching tech service videos:', error);
    return NextResponse.json(
      { error: 'Error al obtener videos' },
      { status: 500 }
    );
  }
}

// POST /api/tech-service-videos - Create new video (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Check permissions
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user.email! },
      select: { permissions: true },
    });

    if (!adminUser?.permissions.includes(AdminPermission.MANAGE_CONTENT)) {
      return NextResponse.json(
        { error: 'No tienes permisos para agregar videos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      videoUrl,
      thumbnail,
      customerName,
      testimonial,
      isActive,
      order,
    } = body;

    // Validate required fields
    if (!title || !videoUrl) {
      return NextResponse.json(
        { error: 'Título y URL del video son requeridos' },
        { status: 400 }
      );
    }

    const video = await prisma.techServiceVideo.create({
      data: {
        title,
        description,
        videoUrl,
        thumbnail,
        customerName,
        testimonial,
        isActive: isActive ?? true,
        order: order ? parseInt(order) : 0,
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error('Error creating tech service video:', error);
    return NextResponse.json(
      { error: 'Error al crear video' },
      { status: 500 }
    );
  }
}

// PATCH /api/tech-service-videos - Update video (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Check permissions
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user.email! },
      select: { permissions: true },
    });

    if (!adminUser?.permissions.includes(AdminPermission.MANAGE_CONTENT)) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar videos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del video es requerido' },
        { status: 400 }
      );
    }

    // Check if video exists
    const existingVideo = await prisma.techServiceVideo.findUnique({
      where: { id },
    });

    if (!existingVideo) {
      return NextResponse.json(
        { error: 'Video no encontrado' },
        { status: 404 }
      );
    }

    const video = await prisma.techServiceVideo.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(video);
  } catch (error) {
    console.error('Error updating tech service video:', error);
    return NextResponse.json(
      { error: 'Error al actualizar video' },
      { status: 500 }
    );
  }
}

// DELETE /api/tech-service-videos - Delete video (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Check permissions
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: session.user.email! },
      select: { permissions: true },
    });

    if (!adminUser?.permissions.includes(AdminPermission.MANAGE_CONTENT)) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar videos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID del video es requerido' },
        { status: 400 }
      );
    }

    await prisma.techServiceVideo.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Video eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting tech service video:', error);
    return NextResponse.json(
      { error: 'Error al eliminar video' },
      { status: 500 }
    );
  }
}
