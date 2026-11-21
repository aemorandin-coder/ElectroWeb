import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { z } from '@/lib/zod';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { estrellaDelDia } from '@/lib/destacados';
import { getCategoriesRail, visibleProducts } from '@/lib/queries/home';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { estadoLanzamiento } from '@/lib/lanzamiento';
import { estadoNavidad } from '@/lib/navidad';

const patchSchema = z.object({
  accion: z.enum(['agregar', 'quitar', 'estrella_primero']),
  productId: z.string().trim().min(1, 'Falta el producto').max(40),
});

async function cargarDestacados() {
  const [rows, visibles] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      select: {
        id: true,
        name: true,
        slug: true,
        priceUSD: true,
        mainImage: true,
        stock: true,
        productType: true,
        category: { select: { name: true } },
      },
      orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 36,
    }),
    prisma.product.findMany({
      where: await visibleProducts({ isFeatured: true }),
      select: { id: true },
      orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 36,
    }),
  ]);

  const estrellaHoyId = estrellaDelDia(visibles)[0]?.id ?? null;

  return {
    destacados: rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceUSD: Number(p.priceUSD),
      image: p.mainImage,
      stock: p.stock,
      productType: p.productType,
      categoryName: p.category.name,
    })),
    estrellaHoyId,
  };
}

function puedeEditarPortada(session: Parameters<typeof isAuthorized>[0]): boolean {
  return isAuthorized(session, 'MANAGE_CONTENT') || isAuthorized(session, 'MANAGE_PRODUCTS');
}

/**
 * GET /api/admin/marketing/portada — datos curados para Studio de Portada (G-74):
 * productos destacados actuales, vista previa de categorías y estado de campañas activas.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!puedeEditarPortada(session)) {
    return NextResponse.json({ error: 'Sin permiso para editar la portada' }, { status: 403 });
  }

  try {
    const [destacadosInfo, categoriasRail, settings] = await Promise.all([
      cargarDestacados(),
      getCategoriesRail(12),
      prisma.companySettings.findUnique({
        where: { id: 'default' },
        select: {
          launchThemeEnabled: true,
          launchThemeFrom: true,
          launchThemeUntil: true,
          launchThemeTitle: true,
          christmasTheme: true,
          christmasThemeFrom: true,
          christmasThemeUntil: true,
        },
      }),
    ]);

    return NextResponse.json({
      ...destacadosInfo,
      categoriasPreview: categoriasRail.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        productCount: c.productCount,
      })),
      campanas: {
        lanzamiento: {
          estado: settings ? estadoLanzamiento(settings) : 'apagado',
          titulo: settings?.launchThemeTitle?.trim() || 'Lanzamiento',
        },
        navidad: {
          estado: settings ? estadoNavidad(settings) : 'apagado',
        },
      },
    });
  } catch (error) {
    console.error('[PORTADA API GET] Error:', error);
    return NextResponse.json({ error: 'No se pudo cargar el estado de la portada' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/marketing/portada — curaduría directa de destacados desde Portada (G-74).
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!puedeEditarPortada(session)) {
    return NextResponse.json({ error: 'Sin permiso para editar la portada' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }, { status: 400 });
  }

  const { accion, productId } = parsed.data;

  try {
    const producto = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, status: true, isFeatured: true, publishedAt: true },
    });
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    if ((accion === 'agregar' || accion === 'estrella_primero') && producto.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Solo puedes destacar productos publicados' }, { status: 400 });
    }
    if (accion === 'estrella_primero' && !producto.isFeatured) {
      return NextResponse.json({ error: 'Primero agrega el producto a destacados' }, { status: 400 });
    }

    await prisma.product.update({
      where: { id: productId },
      data:
        accion === 'quitar'
          ? { isFeatured: false }
          : accion === 'agregar'
            ? { isFeatured: true, ...(producto.publishedAt ? {} : { publishedAt: new Date() }) }
            : { isFeatured: true, publishedAt: new Date() },
    });

    await registrarAccionAdmin(
      session,
      'PRODUCT_UPDATED',
      { type: 'PRODUCT', id: producto.id },
      { origen: 'portada_studio', accion, nombre: producto.name },
      request
    );

    revalidatePath('/');
    return NextResponse.json(await cargarDestacados());
  } catch (error) {
    console.error('[PORTADA API PATCH] Error:', error);
    return NextResponse.json({ error: 'No se pudo actualizar el destacado' }, { status: 500 });
  }
}
