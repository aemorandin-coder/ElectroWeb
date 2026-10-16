import { NextRequest, NextResponse } from 'next/server';
import { tarjetaPara, type TipoTarjeta } from '@/lib/og/datos';
import { renderizarTarjeta } from '@/lib/og/imagen';
import { siteUrl } from '@/lib/seo';

// Imágenes para compartir un enlace (C-178): /og/producto/<slug>, /og/categoria/<slug> y /og/pagina/<página>.
// Fuera de /api/ a propósito: robots.txt cierra /api/ y los lectores de WhatsApp y Facebook lo respetan.
// Con la versión vigente en ?v= la respuesta se guarda un año (la dirección cambia cuando cambia la imagen);
// sin ella, o con una vieja, una hora.

const TIPOS: readonly TipoTarjeta[] = ['producto', 'categoria', 'pagina'];
const CLAVE = /^[a-z0-9][a-z0-9-]{0,199}$/i;

// Cada imagen se dibuja una vez por versión. Un proceso de PM2 (OPERACION.md): basta la memoria
const MAXIMO_EN_MEMORIA = 80;
const enMemoria = new Map<string, Promise<Buffer>>();

function dibujarUnaVez(llave: string, dibujar: () => Promise<Buffer>): Promise<Buffer> {
  const guardada = enMemoria.get(llave);
  if (guardada) return guardada;
  const nueva = dibujar();
  enMemoria.set(llave, nueva);
  nueva.catch(() => enMemoria.delete(llave));
  if (enMemoria.size > MAXIMO_EN_MEMORIA) enMemoria.delete(enMemoria.keys().next().value as string);
  return nueva;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string; clave: string }> }) {
  const { tipo, clave } = await params;
  if (!TIPOS.includes(tipo as TipoTarjeta) || !CLAVE.test(clave)) return new NextResponse('No encontrado', { status: 404 });

  const tarjeta = await tarjetaPara(tipo as TipoTarjeta, clave);
  if (!tarjeta) return new NextResponse('No encontrado', { status: 404 });

  try {
    const jpeg = await dibujarUnaVez(`${tipo}/${clave}/${tarjeta.version}`, async () => renderizarTarjeta(await tarjeta.dibujar()));
    const vigente = req.nextUrl.searchParams.get('v') === tarjeta.version;
    // ?vista: la vista previa de Configuración → SEO, que tiene que mostrar lo recién guardado
    const vista = req.nextUrl.searchParams.has('vista');
    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(jpeg.length),
        'Cache-Control': vista ? 'private, no-cache' : vigente ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    // Sin imagen la vista previa sale vacía: mejor el logo que nada
    console.error('[OG] No se pudo dibujar', `${tipo}/${clave}:`, error);
    return NextResponse.redirect(`${siteUrl()}/images/brand/logo-largo.png`, 302);
  }
}
