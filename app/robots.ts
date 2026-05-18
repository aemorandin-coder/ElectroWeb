import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com';

  return {
    rules: [
      {
        // Bots principales
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/customer/',
          '/carrito',
          '/checkout/',
          '/mis-pedidos',
          '/canjear-gift-card',
          '/_next/',
          '/uploads/',
        ],
      },
      {
        // WhatsApp y Facebook previews — permitir acceso a páginas de productos
        userAgent: ['WhatsApp', 'facebookexternalhit', 'Twitterbot', 'LinkedInBot'],
        allow: '/',
        disallow: ['/admin/', '/api/', '/customer/', '/checkout/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
