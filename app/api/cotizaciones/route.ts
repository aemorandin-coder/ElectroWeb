import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyCaptcha } from '@/lib/captcha';
import { checkRateLimit, getClientIP, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { emitAdminEvent } from '@/lib/admin-events';
import { crearCotizacion } from '@/lib/cotizaciones';
import { CONDICIONES_POR_DEFECTO, TERMINOS_POR_DEFECTO, solicitudSchema } from '@/lib/cotizaciones/core';

// POST /api/cotizaciones — un cliente (con o sin cuenta) pide una cotización desde la tienda (C-148).
// No manda precios: los productos que elija se cotizan con el precio de la tienda y el equipo los ajusta en el panel.
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const limite = checkRateLimit(ip, 'cotizacion:pedir', RATE_LIMITS.AUTH);
    if (!limite.success) {
      return NextResponse.json({ error: 'Enviaste varias solicitudes seguidas. Espera un minuto.' }, { status: 429, headers: getRateLimitHeaders(limite, RATE_LIMITS.AUTH) });
    }
    const datos = solicitudSchema.safeParse(await request.json().catch(() => null));
    if (!datos.success) {
      const problema = datos.error.issues[0];
      return NextResponse.json({ error: problema?.message ?? 'Revisa los datos', field: problema?.path[0] }, { status: 400 });
    }
    const captcha = await verifyCaptcha(datos.data.captchaToken, ip);
    if (!captcha.ok) return NextResponse.json({ error: captcha.error, field: 'captcha' }, { status: captcha.status });

    const session = await getServerSession(authOptions);
    const d = datos.data;
    const pedidos = d.items ?? [];
    const requestNote = d.requestNote;
    const cliente = { clientName: d.clientName, clientDoc: d.clientDoc, contactName: d.contactName, contactEmail: d.contactEmail, contactPhone: d.contactPhone, location: d.location };

    // Los precios salen de la base, nunca del navegador. Un producto que ya no está publicado se ignora.
    const productos = pedidos.length
      ? await prisma.product.findMany({ where: { id: { in: pedidos.map((p) => p.productId) }, status: 'PUBLISHED' }, select: { id: true, name: true, priceUSD: true } })
      : [];
    const items = pedidos.flatMap((p) => {
      const producto = productos.find((x) => x.id === p.productId);
      return producto ? [{ productId: producto.id, title: producto.name, description: null, quantity: p.quantity, unitPriceUSD: Number(producto.priceUSD) }] : [];
    });

    const cotizacion = await crearCotizacion(
      { ...cliente, subject: null, validityDays: 15, advancePercent: null, conditions: CONDICIONES_POR_DEFECTO, terms: TERMINOS_POR_DEFECTO, items },
      { status: 'REQUESTED', userId: session?.user?.id ?? null, requestNote },
    );

    emitAdminEvent({
      type: 'QUOTE_REQUESTED',
      title: `Piden cotización · ${cotizacion.clientName}`,
      summary: requestNote.slice(0, 180),
      fields: [['Número', cotizacion.number], ['Contacto', cliente.contactName], ['Teléfono', cliente.contactPhone], ['Productos elegidos', items.length]],
      link: `/admin/cotizaciones/${cotizacion.id}`,
    });

    return NextResponse.json({ ok: true, numero: cotizacion.number }, { status: 201 });
  } catch (error) {
    console.error('Error creando la solicitud de cotización:', error);
    return NextResponse.json({ error: 'No pudimos registrar tu solicitud. Intenta de nuevo.' }, { status: 500 });
  }
}
