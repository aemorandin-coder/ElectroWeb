import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, isAuthorized } from '@/lib/auth-helpers';
import { digitalVariantsInputSchema, minActivePrice, syncDigitalVariants, type DigitalVariantInput } from '@/lib/digital-variants';
import { parseDigitalMargin, specsForUpdate } from '@/lib/product-specs';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { publicarRecursoCambiado, publicarStock } from '@/lib/realtime/bus';
import { editoresDe } from '@/lib/realtime/presencia';
import { clavesCambiadas, leerVersionBase, nombreDeSesion, nombrePorId, ultimoCambio } from '@/lib/edicion/servidor';
import { nombresDeColumnas } from '@/lib/edicion/producto';
import { borrarParaSiempre } from '@/lib/papelera';
import { precioValido } from '@/lib/pricing';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { conditionInputSchema, pickConditionInput } from '@/lib/product-condition';
import { leerNombreMarca, resolverMarca } from '@/lib/marcas';

// Variantes con costo y proveedor: esta ruta es solo para quien administra productos (C-60)
const adminVariantsInclude = { orderBy: [{ sortOrder: 'asc' as const }] };
function formatVariants(variants: { faceValue: unknown; costUSD: unknown; priceUSD: unknown }[]) {
  return variants.map((v) => ({ ...v, faceValue: Number(v.faceValue), costUSD: Number(v.costUSD), priceUSD: Number(v.priceUSD) }));
}

const incluirParaAdmin = { category: true, brand: { select: { name: true } }, digitalVariants: adminVariantsInclude } as const;

// Decimal → número para que viaje por JSON
const safeNumber = (val: unknown): number | null => {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

type ProductoConRelaciones = NonNullable<Awaited<ReturnType<typeof leerProducto>>>;
function leerProducto(id: string) {
  return prisma.product.findUnique({ where: { id }, include: incluirParaAdmin });
}
function formatearProducto(product: ProductoConRelaciones) {
  return {
    ...product,
    priceUSD: safeNumber(product.priceUSD) ?? 0,
    priceVES: safeNumber(product.priceVES),
    compareAtPriceUSD: safeNumber(product.compareAtPriceUSD),
    costPerItem: safeNumber(product.costPerItem),
    weightKg: safeNumber(product.weightKg),
    shippingCost: safeNumber(product.shippingCost),
    digitalVariants: formatVariants(product.digitalVariants),
  };
}

// GET /api/products/[id] - Get a single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    // SEGURIDAD: devuelve borradores y costPerItem, solo para quien administra productos
    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
    }

    const { id } = await params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID de producto inválido' },
        { status: 400 }
      );
    }

    const product = await leerProducto(id);

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // C-169: si está en la papelera, el editor lo dice (quién lo movió) en vez de dejar editar como si nada
    const deletedByName = product.deletedAt ? await nombrePorId(product.deletedById) : null;
    return NextResponse.json({ ...formatearProducto(product), deletedByName });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error('Error fetching product:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2023') {
      return NextResponse.json(
        { error: 'ID de producto inválido' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al obtener el producto', details: error.message },
      { status: 500 }
    );
  }
}

/** Alguien más guardó (o movió a la papelera) el producto mientras este editor lo tenía abierto (C-169) */
class ConflictoEdicion extends Error {}

/** Cambios de una sola cosa (activar, desactivar, destacar desde la lista): no pisan nada más, no necesitan la versión con que se abrió */
const CLAVES_SOLO_ESTADO = ['status', 'isActive', 'isFeatured', 'baseUpdatedAt'];

/**
 * Qué responder cuando el guardado no puede seguir: 404 si ya no existe, 410 si está en la papelera, 409 con el producto como
 * está ahora (para que el editor combine lo suyo con lo de la otra persona).
 */
async function respuestaDeConflicto(id: string) {
  const actual = await leerProducto(id);
  if (!actual) return NextResponse.json({ error: 'Este producto ya no existe', conflicto: 'no_existe' }, { status: 404 });
  if (actual.deletedAt) {
    const nombre = (await nombrePorId(actual.deletedById)) ?? 'Alguien del equipo';
    return NextResponse.json({
      error: `${nombre} movió este producto a la papelera`,
      conflicto: 'en_papelera',
      por: { nombre, en: actual.deletedAt.toISOString() },
    }, { status: 410 });
  }
  const por = await ultimoCambio('PRODUCT', id, ['PRODUCT_UPDATED', 'PRODUCT_PRICE_CHANGED', 'PRODUCT_RESTORED']);
  return NextResponse.json({
    error: `${por?.nombre ?? 'Otra persona'} cambió este producto mientras lo editabas`,
    conflicto: 'cambiado',
    por,
    actual: formatearProducto(actual),
  }, { status: 409 });
}

// PATCH /api/products/[id] - Update a product (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const oldProduct = await prisma.product.findUnique({ where: { id } });

    if (!oldProduct) {
      return NextResponse.json({ error: 'Producto no encontrado', conflicto: 'no_existe' }, { status: 404 });
    }

    // C-169: dos administradores sobre el mismo producto. Antes ganaba el último que guardaba, sin aviso, y un producto
    // movido o borrado por otro hacía perder todo el trabajo. Ahora el editor manda la versión (`updatedAt`) con que lo abrió.
    if (oldProduct.deletedAt) return respuestaDeConflicto(id);
    const base = leerVersionBase(body.baseUpdatedAt);
    if (base === 'invalida') return NextResponse.json({ error: 'Versión inválida' }, { status: 400 });
    const soloEstado = Object.keys(body).every((clave) => CLAVES_SOLO_ESTADO.includes(clave));
    if (base === null && !soloEstado) {
      return NextResponse.json({ error: 'Falta la versión con la que abriste el producto. Recarga la página para editarlo.', conflicto: 'sin_version' }, { status: 428 });
    }
    if (base && oldProduct.updatedAt.getTime() !== base.getTime()) return respuestaDeConflicto(id);

    // Validar imágenes si se están actualizando
    if (body.images && Array.isArray(body.images) && body.images.length > 8) {
      return NextResponse.json({
        error: 'Máximo 8 imágenes permitidas por producto'
      }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    // Only update fields that are provided and exist in schema
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    // Antes parseFloat sin más: "-5" guardaba un precio negativo y "" rompía con un 500 (C-104)
    if (body.priceUSD !== undefined) {
      const precio = precioValido(body.priceUSD);
      if (precio === null) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
      updateData.priceUSD = precio;
    }
    // C-127: entero de 0 a 1.000.000. Antes parseInt sin más: "-5" dejaba stock negativo y "abc" daba un 500
    if (body.stock !== undefined) {
      const stock = Number(body.stock);
      if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) return NextResponse.json({ error: 'Stock inválido' }, { status: 400 });
      updateData.stock = stock;
    }
    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;

    // Handle images: convert array to JSON string
    if (body.images !== undefined) {
      if (Array.isArray(body.images)) {
        updateData.images = JSON.stringify(body.images);
        // Also update mainImage to the first image
        if (body.images.length > 0) {
          updateData.mainImage = body.images[0];
        }
      } else {
        updateData.images = body.images;
      }
    }

    // Handle specs: map specifications -> specs and stringify.
    // Las claves internas (digitalPricing, margen del wizard) se conservan si no llegan (C-95).
    const digitalMarginPercent = parseDigitalMargin(body.digitalMarginPercent);
    if (body.specifications !== undefined || body.digitalPricing !== undefined || digitalMarginPercent !== undefined) {
      updateData.specs = JSON.stringify(specsForUpdate(oldProduct.specs, {
        specifications: body.specifications,
        digitalPricing: body.digitalPricing,
        digitalMarginPercent,
      }));
    } else if (body.specs !== undefined) {
      // Fallback if sent as specs
      updateData.specs = JSON.stringify(specsForUpdate(oldProduct.specs, { specifications: body.specs }));
    }

    // Handle status: map isActive -> status
    if (body.isActive !== undefined) {
      updateData.status = body.isActive ? 'PUBLISHED' : 'DRAFT';
    } else if (body.status !== undefined) {
      // Antes cualquier texto llegaba a Prisma y daba 500 (C-51)
      if (!['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(body.status)) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }
      updateData.status = body.status;
    }

    if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;

    // Pricing extras
    if (body.compareAtPriceUSD !== undefined) {
      const antes = body.compareAtPriceUSD ? precioValido(body.compareAtPriceUSD) : null;
      if (body.compareAtPriceUSD && antes === null) return NextResponse.json({ error: 'Precio anterior inválido' }, { status: 400 });
      updateData.compareAtPriceUSD = antes;
    }
    if (body.costPerItem !== undefined) updateData.costPerItem = body.costPerItem ? parseFloat(body.costPerItem) : null;

    // Inventory extras
    if (body.barcode !== undefined) updateData.barcode = body.barcode || null;
    if (body.tags !== undefined) updateData.tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : null;

    // SEO Fields
    if (body.seoTitle !== undefined) updateData.seoTitle = body.seoTitle || null;
    if (body.seoDescription !== undefined) updateData.seoDescription = body.seoDescription || null;
    if (body.seoImage !== undefined) updateData.seoImage = body.seoImage || null;

    // Slug update (generate from name if name changed, or use provided)
    if (body.slug !== undefined) {
      updateData.slug = body.slug;
    } else if (body.name !== undefined && body.name !== oldProduct.name) {
      const newSlug = body.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const existing = await prisma.product.findFirst({ where: { slug: newSlug, NOT: { id } } });
      updateData.slug = existing ? `${newSlug}-${Math.random().toString(36).substring(2, 7)}` : newSlug;
    }

    // Fields that might not exist in current schema or need specific handling
    if (body.brandId !== undefined) updateData.brandId = body.brandId;
    // C-155: la marca escrita en el asistente; vacía la quita
    const marca = leerNombreMarca(body.brandName);
    if ('error' in marca) return NextResponse.json({ error: marca.error }, { status: 400 });

    // Digital Product Fields
    if (body.productType !== undefined) updateData.productType = body.productType;
    if (body.digitalPlatform !== undefined) updateData.digitalPlatform = body.digitalPlatform;
    if (body.digitalRegion !== undefined) updateData.digitalRegion = body.digitalRegion;
    if (body.deliveryMethod !== undefined) updateData.deliveryMethod = body.deliveryMethod;
    if (body.redemptionInstructions !== undefined) updateData.redemptionInstructions = body.redemptionInstructions;
    if (body.accountFieldLabel !== undefined) updateData.accountFieldLabel = body.accountFieldLabel ? String(body.accountFieldLabel).slice(0, 80) : null;
    if (body.accountFieldHint !== undefined) updateData.accountFieldHint = body.accountFieldHint ? String(body.accountFieldHint).slice(0, 160) : null;

    // Variantes digitales (C-60): se validan y el precio "desde" del producto es la más barata activa
    let variants: DigitalVariantInput[] | null = null;
    if (body.digitalVariants !== undefined) {
      const parsed = digitalVariantsInputSchema.safeParse(body.digitalVariants);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Montos digitales inválidos' }, { status: 400 });
      }
      variants = parsed.data;
      updateData.priceUSD = minActivePrice(variants);
    }

    // Shipping Fields (for PHYSICAL products)
    if (body.weightKg !== undefined) updateData.weightKg = body.weightKg !== null ? parseFloat(body.weightKg) : null;
    if (body.dimensions !== undefined) updateData.dimensions = body.dimensions;
    if (body.isConsolidable !== undefined) updateData.isConsolidable = body.isConsolidable;
    // C-100: envío gratis (solo booleano; un digital nunca lo lleva)
    if (typeof body.freeShipping === 'boolean') updateData.freeShipping = body.freeShipping;
    if (body.shippingCost !== undefined) updateData.shippingCost = body.shippingCost !== null ? parseFloat(body.shippingCost) : null;

    // C-119: condición del producto. Un digital siempre es nuevo
    const conditionBody = pickConditionInput(body);
    const nextType = body.productType ?? oldProduct.productType;
    if (conditionBody || (nextType === 'DIGITAL' && oldProduct.condition !== 'NEW')) {
      const parsed = conditionInputSchema.safeParse(nextType === 'DIGITAL' ? {} : conditionBody);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Condición inválida' }, { status: 400 });
      }
      Object.assign(updateData, parsed.data);
    }

    const product = await prisma.$transaction(async (tx) => {
      // Lo primero: tomar el producto solo si sigue en la versión con que se abrió y fuera de la papelera. Es lo que impide
      // que dos guardados a la vez se pisen (el segundo no cuenta ninguna fila y se le devuelve el conflicto).
      const tomado = await tx.product.updateMany({ where: { id, deletedAt: null, ...(base ? { updatedAt: base } : {}) }, data: { updatedAt: new Date() } });
      if (tomado.count === 0) throw new ConflictoEdicion();
      if (body.brandName !== undefined) updateData.brandId = await resolverMarca(tx, marca.nombre);
      await tx.product.update({ where: { id }, data: updateData });
      if (variants) await syncDigitalVariants(tx, id, variants);
      return tx.product.findUniqueOrThrow({ where: { id }, include: { category: true, digitalVariants: adminVariantsInclude } });
    });

    revalidateStorefront();
    // C-127: la ficha abierta muestra el stock nuevo (y "Agotado") sin recargar
    if (product.stock !== oldProduct.stock) void publicarStock([id]);

    // Bitácora (C-104): cambios de precio con el valor anterior y el nuevo
    const precioAntes = Number(oldProduct.priceUSD);
    const precioDespues = Number(product.priceUSD);
    const tachadoAntes = oldProduct.compareAtPriceUSD != null ? Number(oldProduct.compareAtPriceUSD) : null;
    const tachadoDespues = product.compareAtPriceUSD != null ? Number(product.compareAtPriceUSD) : null;
    if (precioAntes !== precioDespues || tachadoAntes !== tachadoDespues) {
      await registrarAccionAdmin(session, 'PRODUCT_PRICE_CHANGED', { type: 'PRODUCT', id }, {
        origen: 'Edición del producto',
        producto: product.name,
        antes: precioAntes,
        despues: precioDespues,
        ...(tachadoAntes !== tachadoDespues ? { tachadoAntes, tachadoDespues } : {}),
      }, request);
    }

    // C-169: quién cambió qué, y aviso en vivo a quien lo tenga abierto
    const columnas = clavesCambiadas(oldProduct as unknown as Record<string, unknown>, updateData);
    if (columnas.length > 0) {
      const campos = nombresDeColumnas(columnas);
      await registrarAccionAdmin(session, 'PRODUCT_UPDATED', { type: 'PRODUCT', id }, { producto: product.name, campos }, request);
      publicarRecursoCambiado(`product:${id}`, 'actualizado', { id: session!.user.id, nombre: nombreDeSesion(session) }, campos);
    }

    const safeNum = (v: unknown) => v != null ? Number(v) : null;
    const formattedProduct = {
      ...product,
      priceUSD: safeNum(product.priceUSD) ?? 0,
      priceVES: safeNum(product.priceVES),
      compareAtPriceUSD: safeNum(product.compareAtPriceUSD),
      costPerItem: safeNum(product.costPerItem),
      weightKg: safeNum(product.weightKg),
      shippingCost: safeNum(product.shippingCost),
      digitalVariants: formatVariants(product.digitalVariants),
    };

    return NextResponse.json(formattedProduct);
  } catch (err: unknown) {
    if (err instanceof ConflictoEdicion) return respuestaDeConflicto((await params).id);
    const error = err as { code?: string; message?: string };
    console.error('Error updating product:', error);

    if (error.code === 'P2002') {
      return NextResponse.json({
        error: 'Ya existe un producto con este SKU'
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Error al actualizar producto',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Mueve el producto a la papelera (C-169). Ya no borra.
//   ?forzar=1     mover aunque otra persona lo esté editando (el editor pregunta antes)
//   ?definitivo=1 borrar para siempre: solo el dueño, y solo desde la papelera
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const quien = { id: session!.user.id, nombre: nombreDeSesion(session) };

    const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, sku: true, status: true, priceUSD: true, deletedAt: true } });
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    if (searchParams.get('definitivo') === '1') {
      // Borrar datos de verdad: solo el dueño (decisión del 02/10, igual que Configuración)
      if (!hasPermission(session, 'MANAGE_SETTINGS')) {
        return NextResponse.json({ error: 'Solo el dueño puede borrar para siempre' }, { status: 403 });
      }
      if (!product.deletedAt) {
        return NextResponse.json({ error: 'Primero muévelo a la papelera' }, { status: 409 });
      }
      const resultado = await borrarParaSiempre(id);
      await registrarAccionAdmin(session, 'PRODUCT_PURGED', { type: 'PRODUCT', id }, { producto: product.name, sku: product.sku, resultado }, request);
      publicarRecursoCambiado(`product:${id}`, 'eliminado', quien);
      revalidateStorefront();
      if (resultado === 'archivado') {
        return NextResponse.json({ message: 'El producto tiene órdenes: no se puede borrar. Quedó archivado.', archived: true });
      }
      return NextResponse.json({ message: 'Producto borrado para siempre' });
    }

    if (product.deletedAt) {
      return NextResponse.json({ papelera: true, yaEstaba: true, id });
    }

    // Otra persona lo está editando ahora: se avisa antes de sacárselo (con la papelera no se pierde nada, pero se entera)
    const editores = editoresDe(`product:${id}`, quien.id);
    if (editores.length > 0 && searchParams.get('forzar') !== '1') {
      return NextResponse.json({
        error: `${editores.map((e) => e.nombre).join(' y ')} ${editores.length === 1 ? 'lo está' : 'lo están'} editando ahora mismo`,
        conflicto: 'en_edicion',
        editores,
      }, { status: 409 });
    }

    const movido = await prisma.product.updateMany({
      where: { id, deletedAt: null },
      data: { status: 'ARCHIVED', deletedAt: new Date(), deletedById: quien.id, statusAntesDePapelera: product.status },
    });
    if (movido.count > 0) {
      revalidateStorefront();
      await registrarAccionAdmin(session, 'PRODUCT_TRASHED', { type: 'PRODUCT', id }, { producto: product.name, sku: product.sku, precio: Number(product.priceUSD), eraEstado: product.status }, request);
      publicarRecursoCambiado(`product:${id}`, 'papelera', quien);
    }
    return NextResponse.json({ papelera: true, id, message: 'Producto movido a la papelera' });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error('Error moving product to trash:', error);

    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return NextResponse.json({
        error: 'No se puede eliminar el producto porque tiene datos relacionados. Intenta archivarlo.',
        details: 'El producto tiene registros asociados que no pueden ser eliminados.'
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Error al eliminar el producto',
      details: error.message
    }, { status: 500 });
  }
}
