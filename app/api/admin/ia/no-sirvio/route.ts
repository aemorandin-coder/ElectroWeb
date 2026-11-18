import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { esAdminVerificado } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { MOTIVOS_NO_SIRVIO } from '@/lib/ia/proveedores/catalogo';

// C-292 (lo que era C-288b) · POST /api/admin/ia/no-sirvio { pedidoId, motivo }: alguien del equipo marca que un resultado de la IA
// no sirvió. Queda en el pedido (ia_pedidos) y se ve en Ajustes → IA → Consumo y fallas, para saber qué motor y qué uso fallan.
// Cualquiera del panel con los dos pasos (no la contadora), sobre un pedido de los últimos 7 días que salió bien.
export const dynamic = 'force-dynamic';

const cuerpo = z.object({
  pedidoId: z.string().uuid(),
  motivo: z.enum(MOTIVOS_NO_SIRVIO.map((m) => m.id) as [string, ...string[]]),
  detalle: z.string().trim().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!esAdminVerificado(session)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const limite = checkRateLimit(session!.user.id, 'ia:no-sirvio', { maxRequests: 20, windowSeconds: 60 });
  if (!limite.success) return NextResponse.json({ error: 'Demasiados avisos seguidos. Espera un minuto.' }, { status: 429 });
  const datos = cuerpo.safeParse(await request.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: 'Elige el motivo.' }, { status: 400 });
  const { pedidoId, motivo, detalle } = datos.data;
  const r = await prisma.iaPedido.updateMany({
    where: { id: pedidoId, falla: null, createdAt: { gt: new Date(Date.now() - 7 * 86_400_000) } },
    data: { noSirvioAt: new Date(), noSirvioMotivo: detalle ? `${motivo}: ${detalle}` : motivo, noSirvioPorId: session!.user.id },
  });
  if (r.count === 0) return NextResponse.json({ error: 'Ese resultado ya no se puede marcar.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
