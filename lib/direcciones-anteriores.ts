// C-202: las direcciones que tuvo un producto antes de cambiarle el nombre → la de ahora. proxy.ts responde con un 308
// antes de armar la página: la ficha se arma por partes (loading.tsx) y ahí una redirección sale como una etiqueta en
// el HTML, no como un 308 de verdad, y Google necesita el 308 para pasar la página vieja a la nueva.
import { prisma } from '@/lib/prisma';

// El proxy corre en cada petición. La lista de direcciones anteriores se lee como mucho una vez por minuto y solo sirve
// para descartar rápido: casi ninguna visita llega por una dirección vieja. Cuando una está en la lista, se confirma en
// la base antes de redirigir, porque en ese minuto pudo volver a ser la dirección de un producto (si le devolvieron el
// nombre) y con la lista vieja se armaría un bucle. Los cambios del último minuto los cubre la ficha (getProductBySlug).
const CACHE_MS = 60_000;
let cache: { anteriores: Set<string>; expira: number } | null = null;
let cargando: Promise<Set<string>> | null = null;

async function cargar(): Promise<Set<string>> {
  try {
    const filas = await prisma.product.findMany({
      where: { status: 'PUBLISHED', deletedAt: null, previousSlugs: { isEmpty: false } },
      select: { previousSlugs: true },
    });
    return new Set(filas.flatMap((f) => f.previousSlugs));
  } catch (error) {
    // Si la base falla, la tienda sigue: sin redirecciones, la ficha busca igual por la dirección anterior
    console.error('Direcciones anteriores de productos:', error);
    return new Set();
  }
}

/** La dirección de ahora del producto publicado que antes se llamaba `slug`, o null si `slug` no es una dirección anterior */
export async function direccionActual(slug: string, ahora = Date.now()): Promise<string | null> {
  if (!cache || cache.expira <= ahora) {
    cargando ??= cargar().finally(() => { cargando = null; });
    const anteriores = await cargando;
    cache = { anteriores, expira: ahora + CACHE_MS };
  }
  if (!cache.anteriores.has(slug)) return null;

  const [enUso, dueno] = await Promise.all([
    prisma.product.findFirst({ where: { slug }, select: { id: true } }),
    prisma.product.findFirst({
      where: { status: 'PUBLISHED', deletedAt: null, previousSlugs: { has: slug } },
      select: { slug: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ]).catch(() => [null, null] as const);
  // Hoy es la dirección de un producto (o ya no es de nadie): la lista quedó vieja y se vuelve a leer
  if (enUso || !dueno || dueno.slug === slug) { cache = null; return null; }
  return dueno.slug;
}
