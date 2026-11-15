import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { anotarGuia, marcarPreparando } from '@/lib/proveedores/despacho';

// POST /api/proveedor/despacho/<token> — el aliado comercial, con el enlace de su correo y sin cuenta (C-227):
//   { "accion": "preparando" }               marca "Lo estoy preparando"
//   { "accion": "guia", "guia": "1234567890" }  anota la guía: la orden queda enviada y el cliente recibe su correo
// El enlace es largo y firmado (no se adivina) y la base guarda solo su hash; el límite frena a quien pruebe en serie.

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIP(request);
  const limite = checkRateLimit(ip, 'proveedor:despacho', RATE_LIMITS.SENSITIVE);
  if (!limite.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Espere un minuto.' }, { status: 429, headers: getRateLimitHeaders(limite, RATE_LIMITS.SENSITIVE) });
  }
  const { token } = await params;
  const body = (await request.json().catch(() => null)) as { accion?: unknown; guia?: unknown } | null;

  if (body?.accion === 'preparando') {
    const r = await marcarPreparando(token);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
  }
  if (body?.accion === 'guia') {
    const r = await anotarGuia(token, body.guia);
    return r.ok ? NextResponse.json({ ok: true, guia: r.guia }) : NextResponse.json({ error: r.error }, { status: r.status });
  }
  return NextResponse.json({ error: 'Acción desconocida' }, { status: 400 });
}
