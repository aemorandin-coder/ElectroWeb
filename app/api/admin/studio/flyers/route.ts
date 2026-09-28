import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { flyerSchema } from '@/lib/studio/schema';
import { flyerColumns, flyerFromRow, flyerSelect, newFlyerCode } from '@/lib/studio/store';

const isCodeConflict = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

// ElectroStudio (C-112): las historias guardadas, las más recientes primero
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const rows = await prisma.studioFlyer.findMany({ orderBy: { updatedAt: 'desc' }, take: 300, select: flyerSelect });
  // C-113: las historias de antes del código de campaña lo reciben al listarlas (sin tocar su fecha de guardado)
  for (const row of rows.filter((r) => !r.code)) {
    for (let attempt = 0; attempt < 3 && !row.code; attempt++) {
      const code = newFlyerCode();
      try {
        await prisma.$executeRaw`UPDATE "studio_flyers" SET "code" = ${code} WHERE "id" = ${row.id} AND "code" IS NULL`;
        row.code = code;
      } catch (e) {
        // Código repetido (muy raro): se prueba con otro. En SQL crudo Prisma no lo reporta como P2002
        if (!(e instanceof Prisma.PrismaClientKnownRequestError)) throw e;
      }
    }
  }
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
  // Una copia empieza sin descargas: sus avisos de "cambió desde la descarga" no son los de la original
  const data = { ...parsed.data, exported: { at: '', prices: [], rate: 0, coupon: '' } };
  for (let attempt = 1; ; attempt++) {
    try {
      const row = await prisma.studioFlyer.create({
        data: { ...flyerColumns(data), data, code: newFlyerCode(), createdById: session?.user?.id ?? null },
        select: flyerSelect,
      });
      return NextResponse.json({ flyer: flyerFromRow(row) }, { status: 201 });
    } catch (e) {
      if (!isCodeConflict(e) || attempt >= 3) throw e;
    }
  }
}
