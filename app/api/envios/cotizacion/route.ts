import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { OrderInputError, parseOrderItems, quoteOrder } from '@/lib/order-quote';
import { roundMoney } from '@/lib/pricing';
import { tarifaZoom } from '@/lib/envios/zoom';

// POST { items, cityCode, officeCode?, mode } → lo que ZOOM le cobrará al cliente al recibir (C-100).
// Es una referencia para el checkout: la tienda no la cobra (cobro a destino). Peso y valor salen del servidor.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const rateLimit = checkRateLimit(session.user.id, 'envios:cotizacion', RATE_LIMITS.STANDARD);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Demasiadas consultas. Espera un minuto.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit, RATE_LIMITS.STANDARD) }
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const cityCode = typeof body?.cityCode === 'string' ? body.cityCode : '';
    const officeCode = typeof body?.officeCode === 'string' ? body.officeCode : '';
    const mode = body?.mode === 'DOOR' ? 'DOOR' : 'OFFICE';
    if (!/^\d{1,6}$/.test(cityCode) || (mode === 'OFFICE' && !/^\d{1,8}$/.test(officeCode))) {
      return NextResponse.json({ error: 'Destino inválido' }, { status: 400 });
    }

    const items = parseOrderItems(body?.items);
    const { calculation, settings } = await quoteOrder(session.user.id, items, 'SHIPPING');
    if (!calculation.physical) return NextResponse.json({ error: 'No hay productos físicos' }, { status: 400 });

    const tasa = Number(settings?.exchangeRateVES ?? 0);
    const tarifa = await tarifaZoom({
      ciudad: cityCode,
      oficina: mode === 'OFFICE' ? officeCode : null,
      modo: mode,
      pesoKg: calculation.shipping.totalWeight,
      piezas: calculation.shipping.pieces,
      valorDeclaradoBs: tasa > 0 ? calculation.physical.subtotalUSD * tasa : 0,
    });
    if (!tarifa) return NextResponse.json({ error: 'ZOOM no pudo calcular la tarifa ahora' }, { status: 503 });

    return NextResponse.json({
      totalBs: roundMoney(tarifa.totalBs),
      totalUSD: tasa > 0 ? roundMoney(tarifa.totalBs / tasa) : null,
      pesoKg: calculation.shipping.totalWeight,
    });
  } catch (error) {
    if (error instanceof OrderInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error cotizando con ZOOM:', error);
    return NextResponse.json({ error: 'Error al calcular la tarifa' }, { status: 500 });
  }
}
