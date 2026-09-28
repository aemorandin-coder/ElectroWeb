import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { brandSchema, normalizeBrand, type StudioBrand } from '@/lib/studio/schema';
import { studioStoreInfo } from '@/lib/studio/store';

// GET — ajustes de marca de ElectroStudio (C-112) y los datos de la tienda que los alimentan.
// La primera vez la marca arranca con el Instagram, la web y los métodos de pago activos de la tienda.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const [row, store] = await Promise.all([
    prisma.studioBrand.findUnique({ where: { id: 'default' }, select: { data: true } }),
    studioStoreInfo(),
  ]);
  let brand: StudioBrand;
  if (row) brand = normalizeBrand(row.data);
  else {
    const handle = store.instagram?.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '').replace(/^@?/, '@');
    brand = normalizeBrand({
      ...(handle && handle.length > 1 ? { handle } : {}),
      website: store.website,
      ...(store.payments.length ? { payments: store.payments.slice(0, 4).map((p) => p.label).join(' · ') } : {}),
    });
  }
  return NextResponse.json({ brand, store });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_CONTENT')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const parsed = brandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }
  await prisma.studioBrand.upsert({
    where: { id: 'default' },
    create: { id: 'default', data: parsed.data },
    update: { data: parsed.data },
  });
  return NextResponse.json({ brand: parsed.data });
}
