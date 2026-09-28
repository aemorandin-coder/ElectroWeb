import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { flyerSchema } from '@/lib/studio/schema';
import { flyerColumns, flyerFromRow } from '@/lib/studio/store';

// ElectroStudio (C-112): las historias guardadas, las más recientes primero
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const rows = await prisma.studioFlyer.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 300,
    select: { id: true, data: true, updatedAt: true },
  });
  return NextResponse.json({ flyers: rows.map(flyerFromRow) });
}

// POST — nueva historia (vacía, duplicada o hecha a partir de otra)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = flyerSchema.safeParse((await request.json().catch(() => null)) ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  const data = parsed.data;
  const row = await prisma.studioFlyer.create({
    data: { ...flyerColumns(data), data, createdById: session?.user?.id ?? null },
    select: { id: true, data: true, updatedAt: true },
  });
  return NextResponse.json({ flyer: flyerFromRow(row) }, { status: 201 });
}
