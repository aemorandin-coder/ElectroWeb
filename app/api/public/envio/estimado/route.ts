import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { ipDelCliente } from '@/lib/ip';
import { ESTIMADO_ITEMS_MAX, estimarEnvio } from '@/lib/envios/estimado';

// POST { items: [{ productId, quantity }], ciudad } → el flete de referencia de ZOOM de cada paquete hasta esa ciudad,
// retirando en su oficina (C-199, "Calcula tu envío" de la ficha y el carrito). Público y sin sesión: el peso, las
// medidas y el valor salen de la base; el navegador solo dice qué productos y cuántos. Con límite por IP.
export async function POST(request: NextRequest) {
  const ip = ipDelCliente(request.headers) ?? 'sin-ip';
  const limite = checkRateLimit(ip, 'public:envio:estimado', { maxRequests: 30, windowSeconds: 60 });
  if (!limite.success) return NextResponse.json({ error: `Demasiadas consultas. Espera ${limite.resetIn} s.` }, { status: 429 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const ciudad = typeof body?.ciudad === 'string' ? body.ciudad : '';
  if (!/^\d{1,6}$/.test(ciudad)) return NextResponse.json({ error: 'Ciudad inválida' }, { status: 400 });
  const crudos = Array.isArray(body?.items) ? body.items : [];
  if (crudos.length === 0 || crudos.length > ESTIMADO_ITEMS_MAX) {
    return NextResponse.json({ error: `De 1 a ${ESTIMADO_ITEMS_MAX} productos` }, { status: 400 });
  }
  const items: Array<{ productId: string; quantity: number }> = [];
  for (const crudo of crudos) {
    const i = (crudo ?? {}) as Record<string, unknown>;
    const quantity = typeof i.quantity === 'number' ? i.quantity : NaN;
    if (typeof i.productId !== 'string' || !/^[a-z0-9]{10,40}$/i.test(i.productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return NextResponse.json({ error: 'Producto inválido' }, { status: 400 });
    }
    items.push({ productId: i.productId, quantity });
  }

  try {
    return NextResponse.json(await estimarEnvio(items, ciudad), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Estimado de envío:', error);
    return NextResponse.json({ error: 'No se pudo calcular el envío' }, { status: 500 });
  }
}
