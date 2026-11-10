import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth-helpers';
import { exigirVersion, registrarCambio, respuestaCambiado, respuestaNoExiste } from '@/lib/edicion/registro';
import { clavesCambiadas, nombreDeSesion } from '@/lib/edicion/servidor';
import { publicarRecursoCambiado } from '@/lib/realtime/bus';
import { editoresDe } from '@/lib/realtime/presencia';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { ELIMINADOS, EN_PAPELERA } from '@/lib/papelera';
import type { Prisma } from '@prisma/client';

const CAMPOS_CATEGORIA: Record<string, string> = { name: 'nombre', description: 'descripción', image: 'imagen', icon: 'ícono', color: 'color', parentId: 'categoría principal', isDepartment: 'departamento aparte' };

// C-187: el panel cuenta lo que tiene cada categoría (catálogo y papelera); lo eliminado, que se conserva solo por sus
// ventas, no cuenta. La tienda (sin sesión del panel) cuenta solo lo publicado.
const WITH_COUNT = {
  _count: { select: { products: { where: { eliminadoAt: null } } } },
} satisfies Prisma.CategoryInclude;
const CONTEO_PUBLICO = {
  _count: { select: { products: { where: { status: 'PUBLISHED' } } } },
} satisfies Prisma.CategoryInclude;

/** ¿`candidato` es `id` o cuelga de él? Evita ciclos al elegir la categoría padre (C-110) */
async function esDescendiente(id: string, candidato: string): Promise<boolean> {
  let actual: string | null = candidato;
  for (let i = 0; actual && i < 50; i++) {
    if (actual === id) return true;
    const fila: { parentId: string | null } | null = await prisma.category.findUnique({ where: { id: actual }, select: { parentId: true } });
    actual = fila?.parentId ?? null;
  }
  return false;
}

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
    // C-187: esta API es pública y contaba también borradores, archivados y la papelera (en producción, "Consolas: 3"
    // sin ninguna a la venta). Sin sesión del panel cuenta solo lo publicado, como la página de categorías.
    const session = await getServerSession(authOptions);
    const delPanel = isAuthorized(session, 'MANAGE_PRODUCTS') || isAuthorized(session, 'MANAGE_CONTENT');

    const categories = await prisma.category.findMany({
      where: slug ? { slug } : undefined,
      include: delPanel ? WITH_COUNT : CONTEO_PUBLICO,
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
        // C-200: solo una categoría principal puede ser un departamento aparte (Ferretería)
        isDepartment: body.isDepartment === true && !parentId,
      },
      include: WITH_COUNT,
    });

    revalidateStorefront();
    return NextResponse.json(category, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
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
    // C-170: la versión con que se abrió el editor; si otra persona guardó antes, se avisa en vez de pisarla
    const v = exigirVersion(body.baseUpdatedAt);
    if ('respuesta' in v) return v.respuesta;
    const antes = await prisma.category.findUnique({ where: { id } });
    if (!antes) return respuestaNoExiste('categoría');

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      const limpio = typeof name === 'string' ? name.trim() : '';
      if (limpio.length < 2 || limpio.length > 60 || !toSlug(limpio)) {
        return NextResponse.json({ error: 'El nombre debe tener entre 2 y 60 caracteres' }, { status: 400 });
      }
      updateData.name = limpio;
      // C-160: el slug NO cambia al renombrar. Es la dirección /categorias/<slug>: cambiarla rompía los enlaces
      // guardados, los de otras páginas y lo que Google ya conoce de la categoría.
    }
    // Una categoría no puede ser su propia madre ni colgar de una de sus hijas: el árbol quedaba en ciclo
    if (parentId && await esDescendiente(id, parentId)) {
      return NextResponse.json({ error: 'Esa categoría no puede ser la principal de sí misma ni de una de sus subcategorías' }, { status: 400 });
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (image !== undefined)       updateData.image = image || null;
    if (icon !== undefined)        updateData.icon = icon || null;
    if (color !== undefined)       updateData.color = color || null;
    if (parentId !== undefined)    updateData.parentId = parentId || null;
    // C-200: departamento aparte, solo en una categoría principal (con categoría padre deja de serlo)
    if (body.isDepartment !== undefined) updateData.isDepartment = body.isDepartment === true;
    const padreFinal = parentId !== undefined ? parentId || null : antes.parentId;
    if (padreFinal) updateData.isDepartment = false;

    const category = await prisma.$transaction(async (tx) => {
      const tomada = await tx.category.updateMany({ where: { id, updatedAt: v.base }, data: { updatedAt: new Date() } });
      if (tomada.count === 0) return null;
      return tx.category.update({ where: { id }, data: updateData, include: WITH_COUNT });
    });
    if (!category) {
      const actual = await prisma.category.findUnique({ where: { id }, include: WITH_COUNT });
      if (!actual) return respuestaNoExiste('categoría');
      return respuestaCambiado({ tipo: 'CATEGORY', id, etiqueta: 'categoría', femenino: true, actual });
    }

    revalidateStorefront();
    const cambios = clavesCambiadas(antes as unknown as Record<string, unknown>, updateData);
    if (cambios.length > 0) {
      await registrarCambio({ session, request, recurso: `category:${id}`, tipo: 'CATEGORY', id, nombre: category.name, campos: cambios.map((c) => CAMPOS_CATEGORIA[c] ?? c) });
    }
    return NextResponse.json(category);
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
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
    // C-170: otra persona tiene abierta esta categoría: se avisa antes de borrarla (con ?forzar=1 se sigue)
    const editores = editoresDe(`category:${id}`, session?.user?.id);
    if (editores.length > 0 && searchParams.get('forzar') !== '1') {
      return NextResponse.json({ error: `${editores.map((e) => e.nombre).join(' y ')} la está editando ahora mismo`, conflicto: 'en_edicion', editores }, { status: 409 });
    }

    // Con productos o subcategorías, decirlo (antes: 500 genérico por la llave foránea)
    const cat = await prisma.category.findUnique({ where: { id }, select: { parentId: true, _count: { select: { children: true } } } });
    if (!cat) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    const [enCatalogo, enPapelera, eliminados] = await Promise.all([
      prisma.product.count({ where: { categoryId: id, deletedAt: null } }),
      prisma.product.count({ where: { categoryId: id, ...EN_PAPELERA } }),
      prisma.product.count({ where: { categoryId: id, ...ELIMINADOS } }),
    ]);
    const plural = (n: number) => `${n} producto${n === 1 ? '' : 's'}`;
    if (enCatalogo > 0) {
      return NextResponse.json({ error: `Tiene ${plural(enCatalogo)}: muévelos a otra categoría antes de eliminarla` }, { status: 409 });
    }
    // C-187: antes decía "Tiene 1 producto" y en la lista no aparecía ninguno (estaba en la papelera)
    if (enPapelera > 0) {
      return NextResponse.json({ error: `Tiene ${plural(enPapelera)} en la papelera: restáuralos y muévelos a otra categoría, o bórralos para siempre` }, { status: 409 });
    }
    if (cat._count.children > 0) {
      return NextResponse.json({ error: 'Tiene subcategorías: muévelas o elimínalas antes' }, { status: 409 });
    }
    // C-187: lo eliminado (se conserva solo por sus ventas) no frena: pasa a la categoría principal o a otra. Nadie lo ve
    // y ningún reporte agrupa por categoría; si el dueño lo recupera, vuelve como borrador y le elige la categoría.
    if (eliminados > 0) {
      const destino = cat.parentId ?? (await prisma.category.findFirst({ where: { id: { not: id } }, orderBy: { name: 'asc' }, select: { id: true } }))?.id;
      if (!destino) return NextResponse.json({ error: 'Es la única categoría: crea otra antes de eliminarla' }, { status: 409 });
      await prisma.$transaction([
        prisma.product.updateMany({ where: { categoryId: id, ...ELIMINADOS }, data: { categoryId: destino } }),
        prisma.category.delete({ where: { id } }),
      ]);
    } else {
      await prisma.category.delete({ where: { id } });
    }

    revalidateStorefront();
    publicarRecursoCambiado(`category:${id}`, 'eliminado', { id: session?.user?.id ?? '', nombre: nombreDeSesion(session) });
    return NextResponse.json({ message: 'Categoría eliminada exitosamente' });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }
    // Un producto entró a la categoría mientras tanto
    if (error?.code === 'P2003') {
      return NextResponse.json({ error: 'Tiene productos: muévelos a otra categoría antes de eliminarla' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 });
  }
}
