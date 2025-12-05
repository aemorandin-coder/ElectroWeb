import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

// GET /api/courses - List all courses (public or filtered)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const featured = searchParams.get('featured') === 'true';

    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (featured) {
      where.isFeatured = true;
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Error al obtener cursos' },
      { status: 500 }
    );
  }
}

// POST /api/courses - Create new course (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      duration,
      level,
      instructor,
      priceUSD,
      isOnline,
      isInPerson,
      maxStudents,
      syllabus,
      thumbnail,
      isFeatured,
      isActive,
      metaTitle,
      metaDescription,
    } = body;

    // Validate required fields
    if (!title || !description || !priceUSD) {
      return NextResponse.json(
        { error: 'Título, descripción y precio son requeridos' },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug already exists
    const existingCourse = await prisma.course.findUnique({
      where: { slug },
    });

    if (existingCourse) {
      return NextResponse.json(
        { error: 'Ya existe un curso con ese título' },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description,
        duration,
        level,
        instructor,
        priceUSD: parseFloat(priceUSD),
        isOnline: isOnline ?? true,
        isInPerson: isInPerson ?? false,
        maxStudents: maxStudents ? parseInt(maxStudents) : null,
        syllabus,
        thumbnail,
        isFeatured: isFeatured ?? false,
        isActive: isActive ?? true,
        metaTitle,
        metaDescription,
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Error al crear curso' },
      { status: 500 }
    );
  }
}

// PATCH /api/courses - Update course (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del curso es requerido' },
        { status: 400 }
      );
    }

    // Check if course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      return NextResponse.json(
        { error: 'Curso no encontrado' },
        { status: 404 }
      );
    }

    // Update slug if title changed
    if (updateData.title && updateData.title !== existingCourse.title) {
      updateData.slug = updateData.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    const course = await prisma.course.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Error al actualizar curso' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses - Delete course (admin only)
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
    if (!isAuthorized(session, 'MANAGE_CONTENT')) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar cursos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID del curso es requerido' },
        { status: 400 }
      );
    }

    await prisma.course.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Curso eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Error al eliminar curso' },
      { status: 500 }
    );
  }
}
