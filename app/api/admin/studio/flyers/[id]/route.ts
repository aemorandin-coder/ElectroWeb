import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { flyerSchema } from '@/lib/studio/schema';
import { flyerColumns, flyerFromRow, flyerSelect } from '@/lib/studio/store';
import { exigirVersion } from '@/lib/edicion/registro';
import { nombreDeSesion } from '@/lib/edicion/servidor';
import { publicarRecursoCambiado } from '@/lib/realtime/bus';
import { editoresDe } from '@/lib/realtime/presencia';

// Quién guardó por última vez cada historia, en memoria (el guardado automático ocurre cada pocos segundos: no va a la bitácora)
const ultimoGuardado = new Map<string, { id: string; nombre: string; en: number; avisado: number }>();
const AVISAR_CADA_MS = 30_000;

type Params = { params: Promise<{ id: string }> };

// PUT — guardado automático del editor (C-112). C-170: lleva la versión con que se abrió (`baseUpdatedAt`): si otra persona guardó
// antes, responde 409 con la historia como está ahora y el editor junta los cambios de las dos.
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const crudo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const v = exigirVersion(crudo?.baseUpdatedAt);
  if ('respuesta' in v) return v.respuesta;
  const { baseUpdatedAt: _version, ...resto } = crudo ?? {};
  void _version;
  const parsed = flyerSchema.safeParse(resto);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const data = parsed.data;
  const updated = await prisma.studioFlyer.updateMany({ where: { id, updatedAt: v.base }, data: { ...flyerColumns(data), data } });
  if (updated.count === 0) {
    const fila = await prisma.studioFlyer.findUnique({ where: { id }, select: flyerSelect });
    if (!fila) return NextResponse.json({ error: 'La historia ya no existe', conflicto: 'no_existe' }, { status: 404 });
    const por = ultimoGuardado.get(id);
    return NextResponse.json({
      error: `${por?.nombre ?? 'Otra persona'} cambió esta historia mientras la editabas`,
      conflicto: 'cambiado',
      por: por ? { nombre: por.nombre, en: new Date(por.en).toISOString() } : null,
      actual: { flyer: flyerFromRow(fila) },
    }, { status: 409 });
  }
  const row = await prisma.studioFlyer.findUniqueOrThrow({ where: { id }, select: flyerSelect });
  // Aviso en vivo a quien la tenga abierta, a lo sumo cada 30 s por historia
  const yo = { id: session?.user?.id ?? '', nombre: nombreDeSesion(session) };
  const previo = ultimoGuardado.get(id);
  const ahora = Date.now();
  const avisar = !previo || previo.id !== yo.id || ahora - previo.avisado > AVISAR_CADA_MS;
  ultimoGuardado.set(id, { ...yo, en: ahora, avisado: avisar ? ahora : previo?.avisado ?? ahora });
  if (avisar && editoresDe(`studio:${id}`, yo.id).length > 0) publicarRecursoCambiado(`studio:${id}`, 'actualizado', yo, ['contenido']);
  if (ultimoGuardado.size > 500) ultimoGuardado.delete(ultimoGuardado.keys().next().value as string);
  return NextResponse.json({ flyer: flyerFromRow(row) });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  // C-170: otra persona la tiene abierta ahora: se avisa antes de borrarla (con ?forzar=1 se sigue)
  const editores = editoresDe(`studio:${id}`, session?.user?.id);
  if (editores.length > 0 && new URL(request.url).searchParams.get('forzar') !== '1') {
    return NextResponse.json({ error: `${editores.map((e) => e.nombre).join(' y ')} la está editando ahora mismo`, conflicto: 'en_edicion', editores }, { status: 409 });
  }
  await prisma.studioFlyer.deleteMany({ where: { id } });
  publicarRecursoCambiado(`studio:${id}`, 'eliminado', { id: session?.user?.id ?? '', nombre: nombreDeSesion(session) });
  return NextResponse.json({ ok: true });
}
