import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { getCategoriesWithProducts, getVisibleProducts } from '@/lib/queries/seo';
import { productImages, siteUrl } from '@/lib/seo';

// Se regenera cada hora: sin esto quedaba fijo desde el build y un producto nuevo no entraba hasta el siguiente deploy (C-149)
export const revalidate = 3600;

/**
 * Sitemap (C-149). Solo páginas que se pueden indexar:
 * - Sin /login ni /registro, y sin fecha en las páginas fijas (decía "modificada hoy" en cada visita).
 * - Las categorías van con su slug (antes iban con el nombre y las 14 daban "no encontrado") y solo si tienen productos.
 * - Los productos, con las mismas reglas de la tienda (publicados y, si está activo, sin los agotados) y con sus fotos.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteUrl();
  const page = (path: string, changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly', priority: number) => ({ url: `${site}${path}`, changeFrequency, priority });

  const staticRoutes: MetadataRoute.Sitemap = [
    page('', 'daily', 1.0),
    page('/productos', 'daily', 0.9),
    page('/categorias', 'weekly', 0.8),
    page('/gift-cards', 'weekly', 0.7),
    page('/servicios', 'monthly', 0.6),
    page('/cotizacion', 'monthly', 0.6),
    page('/solicitar-producto', 'monthly', 0.5),
    page('/contacto', 'monthly', 0.5),
    page('/terminos', 'yearly', 0.2),
    page('/privacidad', 'yearly', 0.2),
  ];

  try {
    const [products, categories, courses] = await Promise.all([
      getVisibleProducts(),
      getCategoriesWithProducts(),
      prisma.course.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 1000 }),
    ]);
    // El DTO público no lleva la fecha de modificación: se lee aparte, solo ese campo
    const updated = new Map(
      (await prisma.product.findMany({ where: { id: { in: products.map((p) => p.id) } }, select: { id: true, updatedAt: true } })).map((p) => [p.id, p.updatedAt])
    );

    return [
      ...staticRoutes,
      // La lista de cursos solo cuando hay alguno publicado: una página vacía no trae compradores
      ...(courses.length > 0 ? [page('/cursos', 'weekly', 0.7)] : []),
      ...categories.map((category) => ({
        url: `${site}/categorias/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.75,
      })),
      ...products.map((product) => ({
        url: `${site}/productos/${product.slug}`,
        lastModified: updated.get(product.id),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
        images: productImages(product).slice(0, 10),
      })),
      ...courses.map((course) => ({
        url: `${site}/cursos/${course.slug}`,
        lastModified: course.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ];
  } catch (error) {
    console.error('[Sitemap] Error fetching dynamic routes:', error);
    // No bloquear el sitemap si la DB falla — retornar solo estáticas
    return staticRoutes;
  }
}
