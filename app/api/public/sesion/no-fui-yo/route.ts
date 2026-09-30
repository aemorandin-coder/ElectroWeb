import { NextRequest, NextResponse } from 'next/server';
import { ipParaRegistro } from '@/lib/ip';
import { checkRateLimit } from '@/lib/rate-limit';
import { bloquearPorNoFuiYo } from '@/lib/sesiones';

// C-140: botón "No fui yo" del aviso de entrada al panel. Solo POST (la página pide confirmar): una vista previa
// del enlace en Telegram o el correo no bloquea nada. El enlace va firmado (lib/sesiones.ts).
export async function POST(request: NextRequest) {
  const ip = ipParaRegistro(request.headers);
  if (!checkRateLimit(ip, 'sesion:no-fui-yo', { maxRequests: 10, windowSeconds: 3600 }).success) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un rato.' }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const s = typeof body?.s === 'string' ? body.s : '';
  const t = typeof body?.t === 'string' ? body.t : '';
  const r = await bloquearPorNoFuiYo(s, t, ip);
  if (!r) return NextResponse.json({ error: 'El enlace no es válido o ya venció (sirve 24 horas).' }, { status: 400 });
  return NextResponse.json({ ok: true, correo: r.correo });
}
