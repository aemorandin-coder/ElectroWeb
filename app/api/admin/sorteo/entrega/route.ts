// C-254: publicar la entrega del sorteo (su foto, su video y su nombre) o quitarla de la tienda. Permiso de contenido, como
// el resto del sorteo. El servidor exige el permiso de la persona, una foto subida a la tienda y, si hay video, un enlace de
// YouTube; lo demás no se guarda. Queda en la bitácora quién lo hizo.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { registrarAccionAdmin } from '@/lib/audit-log';
import { prisma } from '@/lib/prisma';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import { z } from '@/lib/zod';
import { esquemaEntrega } from '@/lib/sorteo/entrega';
import { erroresPorCampo } from '@/lib/sorteo/esquema';
import { borrarFotoEntrega, borrarSubidaOriginal, prepararFotoEntrega } from '@/lib/sorteo/foto-entrega';
import { enlaceYoutube, leerYoutube } from '@/lib/youtube';

/** El sorteo de la entrega: el más reciente y ya sorteado (no se publica la de uno viejo ni la de uno sin ganador) */
async function sorteoDeLaEntrega(sorteoId: string) {
  const actual = await prisma.sorteo.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!actual || actual.id !== sorteoId) return { error: 'Ese no es el sorteo de ahora', status: 404 } as const;
  if (!actual.sorteadoAt) return { error: 'Todavía no hay ganador: la entrega se publica después de sortear', status: 409 } as const;
  return { sorteo: actual } as const;
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const parsed = esquemaEntrega.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa los campos marcados', fields: erroresPorCampo(parsed.error.issues) }, { status: 400 });
  }
  const d = parsed.data;
  const r = await sorteoDeLaEntrega(d.sorteoId);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });

  // La foto, sin los datos de dónde se tomó; si no está en el disco, no se publica
  const foto = await prepararFotoEntrega(d.foto);
  if (!foto) return NextResponse.json({ error: 'No se encontró la foto: súbela otra vez', fields: { foto: 'Sube su foto con el premio' } }, { status: 400 });
  const video = leerYoutube(d.video);

  // Cambiar una ya publicada no vuelve a empezar la semana de la bandera: cuenta desde la primera vez
  const publicadaAt = r.sorteo.entregaPublicadaAt ?? new Date();
  const sorteo = await prisma.sorteo.update({
    where: { id: r.sorteo.id },
    data: {
      entregaNombre: d.nombre, entregaCiudad: d.ciudad || null, entregaFoto: foto,
      entregaVideo: video ? enlaceYoutube(video) : null, entregaPermiso: true, entregaPublicadaAt: publicadaAt,
    },
  });
  // Cambió la foto: la de antes no queda en el disco
  if (r.sorteo.entregaFoto && r.sorteo.entregaFoto !== foto) await borrarFotoEntrega(r.sorteo.entregaFoto);
  // Se hizo una copia limpia nueva: la subida original (que puede traer el GPS) tampoco queda. Nunca la foto de un premio,
  // la de este sorteo ni la de otro ("Sorteo nuevo con estos datos" la repite)
  if (foto !== d.foto && (await prisma.sorteo.count({ where: { imagen: { endsWith: d.foto } } })) === 0) await borrarSubidaOriginal(d.foto, r.sorteo.imagen);
  await registrarAccionAdmin(session, 'SETTINGS_UPDATED', { type: 'SORTEO', id: sorteo.id }, {
    accion: r.sorteo.entregaPublicadaAt ? 'Cambió la entrega' : 'Publicó la entrega', nombre: d.nombre, video: Boolean(video),
  }, request);
  revalidateStorefront();
  return NextResponse.json({ ok: true, publicadaAt: publicadaAt.toISOString() });
}

const esquemaQuitar = z.object({ sorteoId: z.string().min(1).max(40) });

/** Quitar la entrega de la tienda (la persona cambió de idea): se borra todo lo suyo, también su foto del disco, y vuelve el correo tapado */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const parsed = esquemaQuitar.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Falta el sorteo' }, { status: 400 });
  const r = await sorteoDeLaEntrega(parsed.data.sorteoId);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
  await prisma.sorteo.update({
    where: { id: r.sorteo.id },
    data: { entregaNombre: null, entregaCiudad: null, entregaFoto: null, entregaVideo: null, entregaPermiso: false, entregaPublicadaAt: null },
  });
  await borrarFotoEntrega(r.sorteo.entregaFoto);
  await registrarAccionAdmin(session, 'SETTINGS_UPDATED', { type: 'SORTEO', id: r.sorteo.id }, { accion: 'Quitó la entrega de la tienda' }, request);
  revalidateStorefront();
  return NextResponse.json({ ok: true });
}
