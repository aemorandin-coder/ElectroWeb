import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIP, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { emitAdminEvent } from '@/lib/admin-events';
import { formatUSD } from '@/lib/currency';
import { aprobarCotizacion, cotizacionPorToken, resumenInventario } from '@/lib/cotizaciones';
import { estaVencida } from '@/lib/cotizaciones/core';

// POST /api/cotizaciones/<token> — el cliente da su conformidad a la cotización que recibió (C-148).
// Quien tiene el enlace puede aprobarla: por eso se pide nombre y cédula o RIF, y queda la IP.
const aprobarSchema = z.object({
  nombre: z.string().trim().min(3, 'Escribe tu nombre y apellido').max(100),
  documento: z.string().trim().min(5, 'Escribe tu cédula o el RIF de la empresa').max(20),
  acepta: z.literal(true, { error: 'Marca que estás de acuerdo con la cotización' }),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIP(request);
  // 10 por minuto: el enlace es largo y al azar (no se adivina); el límite frena a quien pruebe en serie
  const limite = checkRateLimit(ip, 'cotizacion:aprobar', RATE_LIMITS.SENSITIVE);
  if (!limite.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto.' }, { status: 429, headers: getRateLimitHeaders(limite, RATE_LIMITS.SENSITIVE) });
  }
  const { token } = await params;
  const cotizacion = await cotizacionPorToken(token);
  if (!cotizacion) return NextResponse.json({ error: 'Esta cotización no existe o ya no está disponible.' }, { status: 404 });
  if (cotizacion.status === 'APPROVED') return NextResponse.json({ error: 'Esta cotización ya fue aprobada.' }, { status: 409 });
  if (estaVencida(cotizacion.status, cotizacion.sentAt, cotizacion.validityDays)) {
    return NextResponse.json({ error: 'Esta cotización venció. Escríbenos y te la actualizamos.' }, { status: 409 });
  }
  const datos = aprobarSchema.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    const problema = datos.error.issues[0];
    return NextResponse.json({ error: problema?.message ?? 'Revisa los datos', field: problema?.path[0] }, { status: 400 });
  }

  // Condicional: si el equipo la cambió o la cerró en el mismo instante, no se aprueba una versión que el cliente no vio.
  // Al aprobarse se descuentan del inventario los productos del catálogo que se cotizaron (C-148b).
  const aprobada = await aprobarCotizacion(cotizacion.id, { nombre: datos.data.nombre, documento: datos.data.documento, ip }, { estados: ['SENT'], updatedAt: cotizacion.updatedAt });
  if (!aprobada) return NextResponse.json({ error: 'La cotización cambió mientras la revisabas. Recarga la página y vuelve a verla.' }, { status: 409 });
  const inventario = resumenInventario(aprobada.movimientos);

  emitAdminEvent({
    type: 'QUOTE_APPROVED',
    title: `Cotización aprobada · ${cotizacion.number}`,
    summary: `${datos.data.nombre} aprobó la cotización de ${cotizacion.clientName}.`,
    // El aviso del panel muestra los tres primeros datos: el inventario va antes que el documento
    fields: [['Total', formatUSD(Number(cotizacion.totalUSD))], ['Descontado del inventario', inventario.descontado || null], ['Faltó inventario', inventario.faltante || null], ['Documento', datos.data.documento], ['Contacto', cotizacion.contactPhone]],
    link: `/admin/cotizaciones/${cotizacion.id}`,
  });
  return NextResponse.json({ ok: true });
}
