import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { getOfertasVigentes } from '@/lib/promotions';
import { mejorOferta } from '@/lib/promotions-core';
import { legacyDigitalVariants } from '@/lib/dto/product';

/** Un carrito más grande no existe en la tienda: el resto se ignora */
const MAX_LINEAS = 50;

interface Pedido {
  productId: string;
  digitalVariantId?: string;
  digitalAmount?: number;
}

function leerPedidos(raw: unknown): Pedido[] {
  if (!Array.isArray(raw)) return [];
  const pedidos: Pedido[] = [];
  for (const r of raw.slice(0, MAX_LINEAS)) {
    if (!r || typeof r !== 'object') continue;
    const { productId, digitalVariantId, digitalAmount } = r as Record<string, unknown>;
    if (typeof productId !== 'string' || !/^[A-Za-z0-9_-]{1,60}$/.test(productId)) continue;
    pedidos.push({
      productId,
      digitalVariantId: typeof digitalVariantId === 'string' && digitalVariantId.length <= 60 ? digitalVariantId : undefined,
      digitalAmount: typeof digitalAmount === 'number' && Number.isFinite(digitalAmount) && digitalAmount > 0 ? digitalAmount : undefined,
    });
  }
  return pedidos;
}

/**
 * POST /api/products/precios
 * C-281 (F-05): el precio de hoy (con la oferta automática, como lo muestra la ficha) y el stock de lo que hay en un
 * carrito, sin sesión. El carrito de invitado guardaba el precio y el stock del día en que se agregó. Solo lo que ya es
 * público en la ficha: nada de costos ni de solicitudes de descuento. El cobro lo sigue calculando POST /api/orders.
 */
export async function POST(request: NextRequest) {
  const limite = checkRateLimit(getClientIP(request), 'products:precios', RATE_LIMITS.PUBLIC);
  if (!limite.success) {
    return NextResponse.json({ error: 'Demasiadas consultas. Intenta en un minuto.' }, { status: 429, headers: getRateLimitHeaders(limite, RATE_LIMITS.PUBLIC) });
  }

  const body = (await request.json().catch(() => null)) as { items?: unknown } | null;
  const pedidos = leerPedidos(body?.items);
  if (pedidos.length === 0) return NextResponse.json({ precios: [] });

  const [productos, ofertas] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: [...new Set(pedidos.map((p) => p.productId))] } },
      select: {
        id: true, status: true, productType: true, categoryId: true, priceUSD: true, compareAtPriceUSD: true, stock: true,
        specs: true, digitalPlatform: true,
        digitalVariants: { where: { isActive: true }, select: { id: true, faceValue: true, priceUSD: true } },
      },
    }),
    getOfertasVigentes(),
  ]);
  const porId = new Map(productos.map((p) => [p.id, p]));

  const precios = pedidos.map((pedido) => {
    const p = porId.get(pedido.productId);
    if (!p || p.status !== 'PUBLISHED') return { ...pedido, disponible: false as const };
    const digital = p.productType === 'DIGITAL';
    let precio = Number(p.priceUSD);
    let conVariante = false;
    if (digital) {
      // Las mismas variantes que acepta la orden (lib/order-quote.ts): las de la tabla o, sin migrar, las de specs
      const variantes = p.digitalVariants.length > 0
        ? p.digitalVariants.map((v) => ({ id: v.id, faceValue: Number(v.faceValue), priceUSD: Number(v.priceUSD) }))
        : legacyDigitalVariants(p.specs, p.digitalPlatform);
      if (variantes.length > 0) {
        const variante = (pedido.digitalVariantId ? variantes.find((v) => v.id === pedido.digitalVariantId) : undefined)
          ?? (pedido.digitalAmount !== undefined ? variantes.find((v) => v.faceValue === pedido.digitalAmount) : undefined);
        if (!variante) return { ...pedido, disponible: false as const };
        precio = variante.priceUSD;
        conVariante = true;
      }
    }
    if (!(precio > 0)) return { ...pedido, disponible: false as const };
    const oferta = mejorOferta(ofertas, { id: p.id, categoryId: p.categoryId, productType: digital ? 'DIGITAL' : 'PHYSICAL' }, precio);
    const antes = Math.max(precio, conVariante ? 0 : Number(p.compareAtPriceUSD ?? 0));
    const ahora = oferta ? oferta.priceUSD : precio;
    return {
      ...pedido,
      disponible: true as const,
      priceUSD: ahora,
      listPriceUSD: antes > ahora ? antes : null,
      // Lo digital no tiene stock que mostrar: el carrito lo guarda como 999
      stock: digital ? null : Math.max(0, p.stock),
    };
  });

  return NextResponse.json({ precios }, { headers: { 'Cache-Control': 'no-store' } });
}
