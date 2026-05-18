import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Rutas estáticas — prioridad alta
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/productos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/categorias`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gift-cards`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/cursos`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/servicios`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contacto`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/registro`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terminos`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/privacidad`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  // Rutas dinámicas de productos — el oro SEO del sitio
  let productRoutes: MetadataRoute.Sitemap = [];
  let categoryRoutes: MetadataRoute.Sitemap = [];

  try {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, updatedAt: true, slug: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000, // Límite de seguridad
      }),
      prisma.category.findMany({
        select: { id: true, name: true, updatedAt: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    productRoutes = products.map((product) => ({
      url: `${BASE_URL}/productos/${product.slug || product.id}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }));

    categoryRoutes = categories.map((category) => ({
      url: `${BASE_URL}/categorias/${encodeURIComponent(category.name.toLowerCase())}`,
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));
  } catch (error) {
    console.error('[Sitemap] Error fetching dynamic routes:', error);
    // No bloquear el sitemap si la DB falla — retornar solo estáticas
  }

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
