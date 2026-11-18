// C-297: el producto estrella de cada semana del sorteo vigente (Andrés, 18/11: "seleccionamos uno a la semana"), desde
// Marketing → Sorteo. Permiso de contenido, como el resto del sorteo.
// - GET: las semanas (lunes a domingo, recortadas a las fechas del sorteo), cada una con su producto, sus boletos, cuántas
//   unidades se vendieron esa semana y si está trabada.
// - PUT { semana, productId, boletos }: elegir o cambiar el de una semana. DELETE ?semana=…: quitarlo.
// Nadie pierde boletos que ya ganó: una semana que empezó y ya vendió su producto queda trabada. Se le pueden subir los
// boletos (todos ganan), pero no cambiar el producto, bajarle los boletos ni quitarlo.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { z } from '@/lib/zod';
import { diaDe, finDelDia, inicioDelDia } from '@/lib/sorteo/esquema';
import { semanasEntre } from '@/lib/sorteo/semanas';
import type { Sorteo } from '@prisma/client';

const NO_CUENTAN = ['CANCELLED', 'REFUNDED'] as const;

async function sorteoAbierto(): Promise<Sorteo | null> {
  const s = await prisma.sorteo.findFirst({ orderBy: { createdAt: 'desc' } });
  return s && !s.sorteadoAt ? s : null;
}

/** Las unidades del producto vendidas (pagadas, no canceladas ni devueltas) entre dos instantes */
async function unidadesVendidas(productId: string, desde: Date, hasta: Date): Promise<number> {
  const r = await prisma.orderItem.aggregate({
    where: { productId, order: { createdAt: { gte: desde, lte: hasta }, paymentStatus: 'PAID', status: { notIn: [...NO_CUENTAN] } } },
    _sum: { quantity: true },
  });
  return r._sum.quantity ?? 0;
}

async function semanasDe(sorteo: Sorteo) {
  const estrellas = await prisma.estrellaSorteo.findMany({
    where: { sorteoId: sorteo.id },
    select: { id: true, desde: true, hasta: true, boletos: true, productId: true, product: { select: { name: true, slug: true, mainImage: true, images: true, priceUSD: true, status: true } } },
  });
  const ahora = new Date();
  return Promise.all(semanasEntre(diaDe(sorteo.desde), diaDe(sorteo.hasta)).map(async (w) => {
    const desde = inicioDelDia(w.desde);
    const hasta = finDelDia(w.hasta);
    const e = estrellas.find((x) => diaDe(x.desde) === w.desde) ?? null;
    const vendidas = e ? await unidadesVendidas(e.productId, desde, hasta) : 0;
    let imagen = e?.product.mainImage ?? null;
    if (!imagen && e?.product.images) {
      try { imagen = (JSON.parse(e.product.images) as string[])[0] ?? null; } catch { imagen = null; }
    }
    return {
      desde: w.desde, hasta: w.hasta,
      cuando: ahora > hasta ? 'paso' : ahora >= desde ? 'ahora' : 'viene',
      estrella: e ? {
        productId: e.productId, nombre: e.product.name, slug: e.product.slug, imagen, precioUSD: Number(e.product.priceUSD),
        publicado: e.product.status === 'PUBLISHED', boletos: e.boletos, vendidas,
      } : null,
      trabada: Boolean(e) && ahora >= desde && vendidas > 0,
    };
  }));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const sorteo = await sorteoAbierto();
  return NextResponse.json({ semanas: sorteo ? await semanasDe(sorteo) : [] });
}

const esquema = z.object({
  semana: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  productId: z.string().min(1).max(60),
  boletos: z.coerce.number().int().min(1, 'Desde 1 boleto').max(100, 'Hasta 100 boletos'),
});

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Revisa los datos' }, { status: 400 });
  const { semana, productId, boletos } = parsed.data;
  const sorteo = await sorteoAbierto();
  if (!sorteo) return NextResponse.json({ error: 'No hay un sorteo abierto' }, { status: 404 });
  const w = semanasEntre(diaDe(sorteo.desde), diaDe(sorteo.hasta)).find((x) => x.desde === semana);
  if (!w) return NextResponse.json({ error: 'Esa semana no es del sorteo' }, { status: 400 });
  const desde = inicioDelDia(w.desde);
  const hasta = finDelDia(w.hasta);
  if (new Date() > hasta) return NextResponse.json({ error: 'Esa semana ya pasó' }, { status: 409 });
  const producto = await prisma.product.findFirst({ where: { id: productId, status: 'PUBLISHED', deletedAt: null }, select: { id: true } });
  if (!producto) return NextResponse.json({ error: 'Ese producto no está publicado' }, { status: 400 });

  const actual = await prisma.estrellaSorteo.findFirst({ where: { sorteoId: sorteo.id, desde } });
  if (actual && new Date() >= desde && (await unidadesVendidas(actual.productId, desde, hasta)) > 0) {
    // Trabada: solo se le pueden subir los boletos
    if (actual.productId !== productId) return NextResponse.json({ error: 'Esta semana ya vendió su producto estrella: no se cambia, para que nadie pierda sus boletos' }, { status: 409 });
    if (boletos < actual.boletos) return NextResponse.json({ error: `Esta semana ya vendió su producto estrella: sus boletos no bajan de ${actual.boletos}` }, { status: 409 });
  }
  if (actual) await prisma.estrellaSorteo.update({ where: { id: actual.id }, data: { productId, boletos, hasta } });
  else await prisma.estrellaSorteo.create({ data: { sorteoId: sorteo.id, productId, boletos, desde, hasta } });
  revalidateStorefront();
  return NextResponse.json({ semanas: await semanasDe(sorteo) });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const semana = request.nextUrl.searchParams.get('semana') ?? '';
  const sorteo = await sorteoAbierto();
  if (!sorteo) return NextResponse.json({ error: 'No hay un sorteo abierto' }, { status: 404 });
  const w = semanasEntre(diaDe(sorteo.desde), diaDe(sorteo.hasta)).find((x) => x.desde === semana);
  if (!w) return NextResponse.json({ error: 'Esa semana no es del sorteo' }, { status: 400 });
  const desde = inicioDelDia(w.desde);
  const actual = await prisma.estrellaSorteo.findFirst({ where: { sorteoId: sorteo.id, desde } });
  if (!actual) return NextResponse.json({ semanas: await semanasDe(sorteo) });
  if (new Date() >= desde && (await unidadesVendidas(actual.productId, desde, finDelDia(w.hasta))) > 0) {
    return NextResponse.json({ error: 'Esta semana ya vendió su producto estrella: no se quita, para que nadie pierda sus boletos' }, { status: 409 });
  }
  await prisma.estrellaSorteo.delete({ where: { id: actual.id } });
  revalidateStorefront();
  return NextResponse.json({ semanas: await semanasDe(sorteo) });
}
