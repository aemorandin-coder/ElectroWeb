// C-212: el sorteo en el panel (Marketing → Sorteo): leerlo con sus números y guardarlo. Permiso de contenido, como el resto
// de Marketing. El costo del premio es solo del panel: nunca sale a la tienda. C-221: encender y apagar desde el tablero.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { z } from '@/lib/zod';
import { diaDe, erroresPorCampo, esquemaSorteo, finDelDia, inicioDelDia } from '@/lib/sorteo/esquema';
import { MARGEN_ESTIMADO, resumenDelSorteo } from '@/lib/sorteo/servidor';
import { safeHotAdLink } from '@/lib/hot-ad';
import { Prisma, type Sorteo } from '@prisma/client';
import { leerQueTrae } from '@/lib/sorteo/premio';

function paraElPanel(sorteo: Sorteo) {
  return {
    id: sorteo.id, titulo: sorteo.titulo, premio: sorteo.premio, imagen: sorteo.imagen ?? '', activo: sorteo.activo,
    incluye: leerQueTrae(sorteo.incluye), lema: sorteo.lema ?? '', nombreCorto: sorteo.nombreCorto ?? '',
    costoPremioUSD: Number(sorteo.costoPremioUSD), compraMinimaUSD: Number(sorteo.compraMinimaUSD), topeInvitar: sorteo.topeInvitar,
    desde: diaDe(sorteo.desde), hasta: diaDe(sorteo.hasta), resultadoEl: diaDe(sorteo.resultadoEl),
    cerrado: new Date() > sorteo.hasta,
    sorteadoAt: sorteo.sorteadoAt?.toISOString() ?? null, ganadorEmail: sorteo.ganadorEmail, ganadorDetalle: sorteo.ganadorDetalle,
    boletosAlSortear: sorteo.boletosAlSortear, huellaLista: sorteo.huellaLista,
    // C-254: la entrega (lo que sale en la tienda con el permiso de la persona)
    entrega: {
      nombre: sorteo.entregaNombre ?? '', ciudad: sorteo.entregaCiudad ?? '', foto: sorteo.entregaFoto ?? '', video: sorteo.entregaVideo ?? '',
      permiso: sorteo.entregaPermiso, publicadaAt: sorteo.entregaPublicadaAt?.toISOString() ?? null,
    },
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const sorteo = await prisma.sorteo.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!sorteo) return NextResponse.json({ sorteo: null });
  const resumen = await resumenDelSorteo(sorteo);
  return NextResponse.json({
    sorteo: paraElPanel(sorteo),
    numeros: {
      boletos: resumen.boletos.length,
      participantes: resumen.participantes.length,
      ventasUSD: resumen.ventasUSD,
      margenUSD: Math.round(resumen.ventasUSD * MARGEN_ESTIMADO * 100) / 100,
    },
    participantes: resumen.participantes.slice(0, 300),
  });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = esquemaSorteo.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa los campos marcados', fields: erroresPorCampo(parsed.error.issues) }, { status: 400 });
  }
  const d = parsed.data;
  // La foto: una ruta de la tienda o https (como el popup); otra cosa no se guarda
  const imagen = d.imagen ? safeHotAdLink(d.imagen)?.href ?? null : null;
  const datos = {
    titulo: d.titulo, premio: d.premio, imagen, costoPremioUSD: d.costoPremioUSD, compraMinimaUSD: d.compraMinimaUSD,
    topeInvitar: d.topeInvitar, desde: inicioDelDia(d.desde), hasta: finDelDia(d.hasta), resultadoEl: inicioDelDia(d.resultadoEl), activo: d.activo,
    // C-253: sin mandarlos (un panel de antes), quedan como estaban
    ...(d.incluye === undefined ? {} : { incluye: d.incluye.length ? d.incluye : Prisma.DbNull }),
    ...(d.lema === undefined ? {} : { lema: d.lema || null }),
    ...(d.nombreCorto === undefined ? {} : { nombreCorto: d.nombreCorto || null }),
  };
  const actual = await prisma.sorteo.findFirst({ orderBy: { createdAt: 'desc' } });
  // Uno ya sorteado no se cambia: el próximo es un sorteo nuevo
  if (actual?.sorteadoAt && (body as { nuevo?: boolean })?.nuevo !== true) {
    return NextResponse.json({ error: 'Este sorteo ya se hizo. Para otro, toca "Sorteo nuevo".' }, { status: 409 });
  }
  const sorteo = actual && !actual.sorteadoAt
    ? await prisma.sorteo.update({ where: { id: actual.id }, data: datos })
    : await prisma.sorteo.create({ data: datos });
  // Solo uno activo a la vez
  if (sorteo.activo) await prisma.sorteo.updateMany({ where: { id: { not: sorteo.id }, activo: true }, data: { activo: false } });
  revalidateStorefront();
  return NextResponse.json({ sorteo: paraElPanel(sorteo) });
}

const esquemaEncendido = z.object({ activo: z.boolean() });

/** C-221: encender o apagar el sorteo vigente desde su tablero, sin tocar lo demás. Uno ya sorteado no se enciende. */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const parsed = esquemaEncendido.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Falta si se enciende o se apaga' }, { status: 400 });
  const actual = await prisma.sorteo.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!actual) return NextResponse.json({ error: 'Todavía no hay un sorteo' }, { status: 404 });
  if (actual.sorteadoAt && parsed.data.activo) return NextResponse.json({ error: 'Este sorteo ya se hizo: no se vuelve a encender' }, { status: 409 });
  const sorteo = await prisma.sorteo.update({ where: { id: actual.id }, data: { activo: parsed.data.activo } });
  if (sorteo.activo) await prisma.sorteo.updateMany({ where: { id: { not: sorteo.id }, activo: true }, data: { activo: false } });
  revalidateStorefront();
  return NextResponse.json({ sorteo: paraElPanel(sorteo) });
}
