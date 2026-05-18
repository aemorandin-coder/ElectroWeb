import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';

const WITH_COUNT = {
  _count: { select: { products: true } },
} as const;

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    const categories = await prisma.category.findMany({
      where: slug ? { slug } : undefined,
      include: WITH_COUNT,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, image, icon, color, parentId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: toSlug(name.trim()),
        description: description?.trim() || null,
        image: image || null,
        icon: icon || null,
        color: color || null,
        parentId: parentId || null,
      },
      include: WITH_COUNT,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, image, icon, color, parentId } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = name.trim();
      updateData.slug = toSlug(name.trim());
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (image !== undefined)       updateData.image = image || null;
    if (icon !== undefined)        updateData.icon = icon || null;
    if (color !== undefined)       updateData.color = color || null;
    if (parentId !== undefined)    updateData.parentId = parentId || null;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: WITH_COUNT,
    });

    return NextResponse.json(category);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ message: 'Categoría eliminada exitosamente' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 });
  }
}
