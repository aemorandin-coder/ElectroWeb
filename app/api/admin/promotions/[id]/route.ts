import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { promotionSchema } from '@/lib/validations/promotion';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { datosPromocion, erroresZod, toAdminPromotion } from '@/lib/promotions-admin';
import { exigirVersion, registrarCambio, respuestaCambiado, respuestaNoExiste } from '@/lib/edicion/registro';
import { nombreDeSesion } from '@/lib/edicion/servidor';
import { publicarRecursoCambiado } from '@/lib/realtime/bus';
import { editoresDe } from '@/lib/realtime/presencia';

type Params = { params: Promise<{ id: string }> };

// PATCH: edición completa, o solo { isActive } para pausar o reanudar
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const { id } = await params;
  const actual = await prisma.promotion.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  // C-167: el cupón de un promotor sigue a su promotor (código, porcentaje y pausa)
  if (actual.influencerId) return NextResponse.json({ error: 'Este cupón es el código de un promotor: se cambia o se pausa en Marketing → Promotores.' }, { status: 409 });

  const body = await request.json().catch(() => null);
  if (body && typeof body === 'object' && Object.keys(body).length === 1 && typeof body.isActive === 'boolean') {
    const promo = await prisma.promotion.update({ where: { id }, data: { isActive: body.isActive } });
    revalidateStorefront();
    await registrarAccionAdmin(session, 'DISCOUNT_CHANGED', { type: 'PROMOTION', id }, { cambio: body.isActive ? 'Reanudada' : 'Pausada', nombre: promo.name }, request);
    return NextResponse.json({ promotion: toAdminPromotion(promo) });
  }

  // C-170: editar el formulario pide la versión con que se abrió (pausar o reanudar, no)
  const v = exigirVersion(body?.baseUpdatedAt);
  if ('respuesta' in v) return v.respuesta;
  const parsed = promotionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa los campos marcados', fields: erroresZod(parsed.error) }, { status: 400 });
  }
  // Ya usada: el tipo y el código no cambian (las compras que la usaron deben seguir diciendo lo mismo)
  if (actual.usesCount > 0 && (parsed.data.kind !== actual.kind || parsed.data.code !== actual.code)) {
    return NextResponse.json({ error: 'Ya se usó en compras: no se puede cambiar el tipo ni el código. Crea una nueva.' }, { status: 409 });
  }
  try {
    const { startsAt, ...resto } = datosPromocion(parsed.data);
    // Sin fecha de inicio en el formulario se conserva la original (no reinicia una oferta que ya corre)
    const promo = await prisma.$transaction(async (tx) => {
      // Se toma solo si sigue en la versión con que se abrió el editor
      const tomada = await tx.promotion.updateMany({ where: { id, updatedAt: v.base }, data: { updatedAt: new Date() } });
      if (tomada.count === 0) return null;
      return tx.promotion.update({ where: { id }, data: { ...resto, startsAt: body?.startsAt ? startsAt : actual.startsAt } });
    });
    if (!promo) {
      const ahora = await prisma.promotion.findUnique({ where: { id } });
      if (!ahora) return respuestaNoExiste('oferta');
      return respuestaCambiado({ tipo: 'PROMOTION', id, etiqueta: 'oferta', femenino: true, actual: toAdminPromotion(ahora) });
    }
    revalidateStorefront();
    await registrarAccionAdmin(session, 'DISCOUNT_CHANGED', { type: 'PROMOTION', id }, {
      cambio: 'Editada', nombre: promo.name, porcentaje: promo.percentOff, monto: promo.amountOffUSD ? Number(promo.amountOffUSD) : null,
    }, request);
    await registrarCambio({ session, request, recurso: `promotion:${id}`, tipo: 'PROMOTION', id, nombre: promo.name, campos: ['datos de la oferta'] });
    return NextResponse.json({ promotion: toAdminPromotion(promo) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un cupón con ese código', fields: { code: 'Ese código ya existe' } }, { status: 409 });
    }
    console.error('Error editando promoción:', error);
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }
}

// DELETE: solo si nunca se usó; si ya tiene compras se pausa (el historial de ahorro se conserva)
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_PRODUCTS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const { id } = await params;
  const promo = await prisma.promotion.findUnique({ where: { id }, include: { _count: { select: { redemptions: true } } } });
  if (!promo) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  if (promo.influencerId) return NextResponse.json({ error: 'Este cupón es el código de un promotor: se cambia o se pausa en Marketing → Promotores.' }, { status: 409 });
  // C-170: otra persona la tiene abierta ahora: se avisa antes de borrarla (con ?forzar=1 se sigue)
  const editores = editoresDe(`promotion:${id}`, session?.user?.id);
  if (editores.length > 0 && new URL(request.url).searchParams.get('forzar') !== '1') {
    return NextResponse.json({ error: `${editores.map((e) => e.nombre).join(' y ')} la está editando ahora mismo`, conflicto: 'en_edicion', editores }, { status: 409 });
  }

  if (promo._count.redemptions > 0) {
    await prisma.promotion.update({ where: { id }, data: { isActive: false } });
    revalidateStorefront();
    await registrarAccionAdmin(session, 'DISCOUNT_CHANGED', { type: 'PROMOTION', id }, { cambio: 'Pausada al intentar borrarla', nombre: promo.name }, request);
    return NextResponse.json({ paused: true, message: 'Ya se usó en compras: quedó pausada en vez de borrada.' });
  }
  await prisma.promotion.delete({ where: { id } });
  publicarRecursoCambiado(`promotion:${id}`, 'eliminado', { id: session?.user?.id ?? '', nombre: nombreDeSesion(session) });
  revalidateStorefront();
  await registrarAccionAdmin(session, 'DISCOUNT_CHANGED', { type: 'PROMOTION', id }, { cambio: 'Eliminada', nombre: promo.name }, request);
  return NextResponse.json({ deleted: true });
}
