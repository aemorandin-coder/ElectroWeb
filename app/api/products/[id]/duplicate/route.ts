import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { generateShortCode } from '@/lib/short-code';
import { registrarAccionAdmin } from '@/lib/audit-log';

// Duplicar un producto (C-51, opción A de Andrés, 24/09): el servidor copia todo.
// Antes lo armaba la pantalla: leía `specifications` (la API devuelve `specs`) y no copiaba el tipo ni los montos,
// así que la copia salía sin especificaciones y un digital se duplicaba como físico.
// La copia nace en borrador, sin destacar y sin stock (el inventario es de cada producto real), con SKU,
// slug y código corto nuevos. Los montos digitales se copian con su costo y proveedor; los códigos no.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const { id } = await params;
  const original = await prisma.product.findUnique({ where: { id }, include: { digitalVariants: true } });
  if (!original) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  if (original.deletedAt) return NextResponse.json({ error: 'Está en la papelera: restáuralo primero' }, { status: 409 });

  // SKU y slug libres: "-COPIA", "-COPIA-2", …
  const libre = async (base: string, campo: 'sku' | 'slug') => {
    for (let n = 1; n <= 50; n++) {
      const candidato = n === 1 ? base : `${base}-${n}`;
      const existe = await prisma.product.findFirst({ where: { [campo]: candidato }, select: { id: true } });
      if (!existe) return candidato;
    }
    return `${base}-${Date.now().toString(36)}`;
  };
  const sku = await libre(`${original.sku}-COPIA`.slice(0, 60), 'sku');
  const slug = await libre(`${original.slug}-copia`.slice(0, 180), 'slug');
  const shortCode = await generateShortCode(prisma);

  const {
    id: _id, sku: _sku, slug: _slug, shortCode: _short, createdAt: _c, updatedAt: _u, deletedAt: _d, deletedById: _db, statusAntesDePapelera: _sp, digitalVariants, ...resto
  } = original;
  void _id; void _sku; void _slug; void _short; void _c; void _u; void _d; void _db; void _sp;

  const copia = await prisma.$transaction(async (tx) => {
    const creado = await tx.product.create({
      data: {
        ...resto,
        name: `${original.name} (copia)`.slice(0, 200),
        sku,
        slug,
        shortCode,
        status: 'DRAFT',
        isFeatured: false,
        stock: 0,
      },
    });
    if (digitalVariants.length > 0) {
      await tx.digitalVariant.createMany({
        data: digitalVariants.map((v) => ({
          productId: creado.id, faceValue: v.faceValue, unit: v.unit, label: v.label, costUSD: v.costUSD,
          priceUSD: v.priceUSD, provider: v.provider, isActive: v.isActive, sortOrder: v.sortOrder,
        })),
      });
    }
    return creado;
  });

  await registrarAccionAdmin(session, 'PRODUCT_CREATED', { type: 'PRODUCT', id: copia.id }, {
    origen: 'Duplicado', de: original.name, sku,
  }, request);
  return NextResponse.json({ id: copia.id, name: copia.name, sku: copia.sku }, { status: 201 });
}
