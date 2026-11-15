// C-249d: antes de guardar un promotor, el servidor dice si los datos pasan y, al cambiar uno, a cuántos afecta (PLAN.md
// §1.9). No guarda nada. Usa los mismos esquemas y las mismas comprobaciones que las rutas que guardan
// (POST /api/influencers y PATCH /api/influencers/<id>), así las dos dicen lo mismo.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { edicionPromotorSchema, limpiarCodigo, promotorSchema } from '@/lib/influencer-admin';
import { codigoLibre } from '@/lib/influencer-cupon';

const malo = (error: string, campo: string | null) => NextResponse.json({ error, campo }, { status: 400 });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_USERS')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: session ? 403 : 401 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const { id, ...resto } = body ?? {};

  // Cambiar uno: lo que se puede editar, y cuántas comisiones y compras ya tiene (no cambian: el cambio vale para las nuevas)
  if (typeof id === 'string') {
    const edicion = edicionPromotorSchema.safeParse(resto);
    if (!edicion.success) return malo(edicion.error.issues[0]?.message ?? 'Datos inválidos', String(edicion.error.issues[0]?.path[0] ?? '') || null);
    const promotor = await prisma.influencer.findUnique({ where: { id }, select: { id: true, coupon: { select: { usesCount: true } } } });
    if (!promotor) return NextResponse.json({ error: 'Ese promotor ya no existe' }, { status: 404 });
    const [porAcreditar, acreditadas] = await Promise.all([
      prisma.referralConversion.aggregate({ where: { influencerId: id, status: 'PENDING' }, _count: true, _sum: { commission: true } }),
      prisma.referralConversion.aggregate({ where: { influencerId: id, status: 'APPROVED' }, _count: true, _sum: { commission: true } }),
    ]);
    return NextResponse.json({
      error: null,
      afecta: {
        porAcreditar: porAcreditar._count,
        porAcreditarUSD: Number(porAcreditar._sum.commission ?? 0),
        acreditadas: acreditadas._count,
        acreditadasUSD: Number(acreditadas._sum.commission ?? 0),
        comprasConCodigo: promotor.coupon?.usesCount ?? 0,
      },
    });
  }

  // Uno nuevo: lo mismo que revisa crearPromotor (lib/influencer-admin.ts) antes de crearlo
  const parsed = promotorSchema.safeParse(resto);
  if (!parsed.success) return malo(parsed.error.issues[0]?.message ?? 'Datos inválidos', String(parsed.error.issues[0]?.path[0] ?? '') || null);
  const code = limpiarCodigo(parsed.data.code);
  if (code.length < 3 || code.length > 20) return malo('El código debe tener entre 3 y 20 caracteres (letras, números, _ -)', 'code');
  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, influencerProfile: { select: { id: true } } } });
  if (!user) return malo('Usuario no encontrado', 'userId');
  if (user.influencerProfile) return malo('Este usuario ya es promotor', 'userId');
  if (!(await codigoLibre(code))) return malo('Ese código ya lo usa otro promotor o un cupón', 'code');
  return NextResponse.json({ error: null, code });
}
