import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { orderBlockers, parseDeliveryMethod, parseOrderItems, quoteOrder, OrderInputError } from '@/lib/order-quote';
import { emitirCotizacion } from '@/lib/pago-movil/cotizacion';

// POST - Cotiza el carrito con precios, envío y descuentos del servidor (no crea nada).
// El checkout lo usa para mostrar el mismo total que cobrará POST /api/orders y, con `blockers` y `errors`,
// para no dejar pagar una compra que después no se podría crear (C-114).
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

    const couponCode = typeof body?.couponCode === 'string' && body.couponCode.trim() ? body.couponCode.trim().slice(0, 40) : null;
    const { calculation, errors, coupon, settings } = await quoteOrder(session.user.id, items, deliveryMethod, couponCode);
    const blockers = orderBlockers(calculation, settings, deliveryMethod);

    // C-125: el monto exacto en Bs. para el Pago Móvil sale de aquí (céntimos redondeados una sola vez) y va firmado:
    // el checkout lo muestra, lo copia y lo manda al banco tal cual, y la verificación usa esta misma tasa
    const tasa = Number(settings?.exchangeRateVES ?? 0);
    const pagoMovil = errors.length === 0 && blockers.length === 0 ? emitirCotizacion(session.user.id, calculation.totalUSD, tasa) : null;

    return NextResponse.json({ calculation, errors, coupon, blockers, pagoMovil });
  } catch (error) {
    if (error instanceof OrderInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error quoting order:', error);
    return NextResponse.json({ error: 'Error al calcular la orden' }, { status: 500 });
  }
}
