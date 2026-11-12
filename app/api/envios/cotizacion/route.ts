import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { OrderInputError, parseOrderItems, quoteOrder } from '@/lib/order-quote';
import { roundMoney } from '@/lib/pricing';
import { tarifaZoom } from '@/lib/envios/zoom';

// POST { items, cityCode, officeCode?, mode } → lo que ZOOM le cobrará al cliente al recibir (C-100). C-199: con el de
// cada paquete (`paquetes`), si la compra llega en dos.
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
    // C-199: cada paquete desde su origen (la tienda, Guanare; la ferretería, La Victoria), con su peso y su valor
    const tarifas = await Promise.all(calculation.paquetes.map((paquete) => tarifaZoom({
      ciudad: cityCode,
      oficina: mode === 'OFFICE' ? officeCode : null,
      modo: mode,
      pesoKg: paquete.shipping.totalWeight,
      piezas: paquete.shipping.pieces,
      valorDeclaradoBs: tasa > 0 ? paquete.totals.subtotalUSD * tasa : 0,
      origen: paquete.origen,
    })));
    if (tarifas.some((t) => !t)) return NextResponse.json({ error: 'ZOOM no pudo calcular la tarifa ahora' }, { status: 503 });

    const paquetes = calculation.paquetes.map((paquete, i) => {
      const totalBs = roundMoney(tarifas[i]!.totalBs);
      return {
        origen: paquete.origen, origenNombre: paquete.origenNombre, pesoKg: paquete.shipping.totalWeight,
        // El paquete con envío gratis lo paga la tienda: la referencia es para el que paga el cliente
        gratis: paquete.shipping.isFreeShipping,
        totalBs, totalUSD: tasa > 0 ? roundMoney(totalBs / tasa) : null,
      };
    });
    const totalBs = roundMoney(paquetes.reduce((s, p) => s + p.totalBs, 0));
    return NextResponse.json({
      totalBs,
      totalUSD: tasa > 0 ? roundMoney(totalBs / tasa) : null,
      pesoKg: calculation.shipping.totalWeight,
      paquetes,
    });
  } catch (error) {
    if (error instanceof OrderInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Error cotizando con ZOOM:', error);
    return NextResponse.json({ error: 'Error al calcular la tarifa' }, { status: 500 });
  }
}
