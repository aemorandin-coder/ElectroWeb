import { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

// Lo privado de la tienda. Las páginas con enlace secreto (presupuestos, certificados, verificación) no van aquí:
// llevan "noindex", que es lo que de verdad las saca de un buscador; cerrarlas impediría leer esa etiqueta.
const PRIVATE = ['/admin/', '/api/', '/customer/', '/carrito', '/checkout/', '/canjear-gift-card'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // C-149: las fotos nuevas de los productos se guardan como /api/uploads/…; sin este permiso, "Disallow: /api/"
        // dejaba esas fotos fuera de Google Imágenes y de las vistas previas de Facebook. La regla más larga gana.
        allow: ['/', '/api/uploads/'],
        disallow: PRIVATE,
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
