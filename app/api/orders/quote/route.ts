import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { parseDeliveryMethod, parseOrderItems, quoteOrder, OrderInputError } from '@/lib/order-quote';

// POST - Cotiza el carrito con precios, envío y descuentos del servidor (no crea nada).
// El checkout lo usa para mostrar el mismo total que cobrará POST /api/orders.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(session.user.id, 'orders:quote', RATE_LIMITS.STANDARD);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Has realizado demasiadas operaciones. Espera unos minutos.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.STANDARD) }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const items = parseOrderItems(body?.items);
    const deliveryMethod = parseDeliveryMethod(body?.deliveryMethod);

    const { calculation, errors } = await quoteOrder(session.user.id, items, deliveryMethod);

    return NextResponse.json({ calculation, errors });
  } catch (error) {
    if (error instanceof OrderInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error quoting order:', error);
    return NextResponse.json({ error: 'Error al calcular la orden' }, { status: 500 });
  }
}
