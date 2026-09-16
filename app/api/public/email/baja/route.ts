import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { escaparHtml, firmaBajaValida, urlBase } from '@/lib/email-campaigns';

/**
 * Baja de promociones desde el enlace del correo (C-75). Firmado: no hace falta sesión
 * y nadie puede dar de baja a otra persona cambiando el id.
 * GET muestra la confirmación; POST es la baja "de un clic" que piden Gmail y Yahoo (List-Unsubscribe-Post).
 */

async function darDeBaja(request: NextRequest): Promise<boolean> {
  const userId = request.nextUrl.searchParams.get('u') ?? '';
  const firma = request.nextUrl.searchParams.get('t') ?? '';
  if (!userId || !firma || !firmaBajaValida(userId, firma)) return false;

  const usuario = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!usuario) return false;

  await prisma.notificationPreference.upsert({
    where: { userId },
    update: { emailPromotions: false },
    create: { userId, emailPromotions: false },
  });
  return true;
}

function pagina(ok: boolean): NextResponse {
  const titulo = ok ? 'Listo, no recibirás más promociones' : 'El enlace no es válido';
  const texto = ok
    ? 'Seguirás recibiendo los correos de tus pedidos. Puedes volver a activar las promociones cuando quieras en tu panel.'
    : 'Puede que esté incompleto. Desactiva las promociones desde Mi panel → Configuración.';
  const base = urlBase();
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaparHtml(titulo)}</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#f8f9fa;color:#212529;">
<main style="max-width:420px;margin:12vh auto;padding:32px;background:#fff;border:1px solid #e9ecef;border-radius:16px;text-align:center;">
<h1 style="font-size:20px;margin:0 0 12px;">${escaparHtml(titulo)}</h1>
<p style="font-size:15px;line-height:1.6;color:#495057;margin:0 0 24px;">${escaparHtml(texto)}</p>
<a href="${escaparHtml(base)}/customer/settings" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#2a63cd;color:#fff;text-decoration:none;font-weight:600;">Ir a mi configuración</a>
</main></body></html>`;
  return new NextResponse(html, { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(request: NextRequest) {
  return pagina(await darDeBaja(request));
}

export async function POST(request: NextRequest) {
  const ok = await darDeBaja(request);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
