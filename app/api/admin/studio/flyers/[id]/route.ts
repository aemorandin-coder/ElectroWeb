import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { flyerSchema } from '@/lib/studio/schema';
import { flyerColumns, flyerFromRow, flyerSelect } from '@/lib/studio/store';

type Params = { params: Promise<{ id: string }> };

// PUT — guardado automático del editor (C-112)
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  const parsed = flyerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const data = parsed.data;
  const updated = await prisma.studioFlyer.updateMany({ where: { id }, data: { ...flyerColumns(data), data } });
  if (updated.count === 0) return NextResponse.json({ error: 'La historia ya no existe' }, { status: 404 });
  const row = await prisma.studioFlyer.findUniqueOrThrow({ where: { id }, select: flyerSelect });
  return NextResponse.json({ flyer: flyerFromRow(row) });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { id } = await params;
  await prisma.studioFlyer.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
