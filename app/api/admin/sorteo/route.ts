// C-212: el sorteo en el panel (Marketing → Sorteo): leerlo con sus números y guardarlo. Permiso de contenido, como el resto
// de Marketing. El costo del premio es solo del panel: nunca sale a la tienda.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { z } from '@/lib/zod';
import { MARGEN_ESTIMADO, resumenDelSorteo } from '@/lib/sorteo/servidor';
import { safeHotAdLink } from '@/lib/hot-ad';
import type { Sorteo } from '@prisma/client';

/** Un día de Venezuela ('2026-12-18') como el primer o el último instante de ese día (UTC-4) */
const inicioDelDia = (dia: string) => new Date(`${dia}T00:00:00-04:00`);
const finDelDia = (dia: string) => new Date(`${dia}T23:59:59.999-04:00`);
const diaDe = (fecha: Date) => new Date(fecha.getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10);

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige un día');
const esquema = z.object({
  titulo: z.string().trim().min(3, 'Ponle un título').max(60),
  premio: z.string().trim().min(3, 'Escribe el premio').max(120),
  imagen: z.string().trim().max(300).optional().default(''),
  costoPremioUSD: z.coerce.number().min(0).max(100_000),
  compraMinimaUSD: z.coerce.number().min(1, 'Desde $1').max(10_000),
  topeInvitar: z.coerce.number().int().min(0).max(20),
  desde: dia,
  hasta: dia,
  resultadoEl: dia,
  activo: z.boolean(),
}).refine((d) => d.hasta >= d.desde, { path: ['hasta'], message: 'El cierre no puede ser antes del inicio' })
  .refine((d) => d.resultadoEl >= d.hasta, { path: ['resultadoEl'], message: 'El resultado va el día del cierre o después' });

function paraElPanel(sorteo: Sorteo) {
  return {
    id: sorteo.id, titulo: sorteo.titulo, premio: sorteo.premio, imagen: sorteo.imagen ?? '', activo: sorteo.activo,
    costoPremioUSD: Number(sorteo.costoPremioUSD), compraMinimaUSD: Number(sorteo.compraMinimaUSD), topeInvitar: sorteo.topeInvitar,
    desde: diaDe(sorteo.desde), hasta: diaDe(sorteo.hasta), resultadoEl: diaDe(sorteo.resultadoEl),
    cerrado: new Date() > sorteo.hasta,
    sorteadoAt: sorteo.sorteadoAt?.toISOString() ?? null, ganadorEmail: sorteo.ganadorEmail, ganadorDetalle: sorteo.ganadorDetalle,
    boletosAlSortear: sorteo.boletosAlSortear, huellaLista: sorteo.huellaLista,
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
  const parsed = esquema.safeParse(body);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? ''), i.message]));
    return NextResponse.json({ error: 'Revisa los campos marcados', fields }, { status: 400 });
  }
  const d = parsed.data;
  // La foto: una ruta de la tienda o https (como el popup); otra cosa no se guarda
  const imagen = d.imagen ? safeHotAdLink(d.imagen)?.href ?? null : null;
  const datos = {
    titulo: d.titulo, premio: d.premio, imagen, costoPremioUSD: d.costoPremioUSD, compraMinimaUSD: d.compraMinimaUSD,
    topeInvitar: d.topeInvitar, desde: inicioDelDia(d.desde), hasta: finDelDia(d.hasta), resultadoEl: inicioDelDia(d.resultadoEl), activo: d.activo,
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
