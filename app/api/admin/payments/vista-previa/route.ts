// C-249b: antes de guardar un método de pago (PLAN.md §1.9), lo que diría el servidor y a cuántos afecta: las recargas de
// Puntos ES y las órdenes que esperan un pago con este método (los clientes ya vieron los datos de antes). No guarda nada.
// Valida con la misma función que la ruta que guarda (validateAndSanitizePaymentMethod).
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAuthorized } from '@/lib/auth-helpers';
import { esPagoManual } from '@/lib/checkout-pago';
import { prisma } from '@/lib/prisma';
import { validateAndSanitizePaymentMethod } from '@/lib/validations/payment-methods';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session, 'MANAGE_SETTINGS')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Cuerpo de la petición inválido' }, { status: 400 });
  const revision = validateAndSanitizePaymentMethod(body);
  const id = typeof body.id === 'string' && body.id.length <= 60 ? body.id : null;
  const actual = id ? await prisma.companyPaymentMethod.findUnique({ where: { id }, select: { id: true, type: true } }) : null;
  if (id && !actual) return NextResponse.json({ error: 'Método no encontrado' }, { status: 404 });
  const [recargas, ordenes] = actual
    ? await Promise.all([
      prisma.transaction.count({ where: { companyPaymentMethodId: actual.id, status: 'PENDING' } }),
      // Las órdenes guardan el tipo, no el método: las que esperan que el equipo confirme un pago de ese tipo
      esPagoManual(actual.type)
        ? prisma.order.count({ where: { paymentMethod: actual.type, paymentStatus: 'PENDING', status: { not: 'CANCELLED' } } })
        : Promise.resolve(0),
    ])
    : [0, 0];
  return NextResponse.json({ error: revision.success ? null : revision.error, recargas, ordenes });
}
