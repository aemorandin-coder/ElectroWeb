import { NextRequest, NextResponse } from 'next/server';
import { esCodigoSorteo } from '@/lib/sorteo/reglas';
import { esInvitacionVigente, getSorteoVigente } from '@/lib/sorteo/servidor';

/**
 * C-263: el enlace corto para invitar al sorteo (el equipo lo eligió para el flyer, 15/11): /s/<código> → /sorteo?invita=<código>.
 * - 307, como /p/<código>: depende de la base (el código puede dejar de ser del sorteo vigente) y un 301 queda guardado.
 * - La cookie del invitado la deja /sorteo?invita=… (proxy.ts), igual que si se abre el enlace largo.
 * - Un código que no es de un participante del sorteo vigente lleva a /sorteo, sin el parámetro.
 * - No se indexa (X-Robots-Tag) ni va en el sitemap. Quien arma la vista previa (WhatsApp, Facebook) sigue la redirección y
 *   lee el Open Graph de /sorteo, cuyo canonical es /sorteo.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const pedido = (await params).codigo.toUpperCase();
  const base = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const sorteo = esCodigoSorteo(pedido) ? await getSorteoVigente() : null;
  const vale = sorteo ? await esInvitacionVigente(pedido, sorteo.id) : false;
  const destino = new URL(vale ? `/sorteo?invita=${pedido}` : '/sorteo', base);
  const respuesta = NextResponse.redirect(destino, 307);
  respuesta.headers.set('X-Robots-Tag', 'noindex');
  return respuesta;
}
