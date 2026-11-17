import type { MetadataRoute } from 'next';

// C-282 (Fase 7 de la auditoría del 17/11): la tienda se puede instalar en el teléfono ("Agregar a la pantalla de inicio")
// y abre a pantalla completa, con su ícono. Los íconos salen del cuadro del logo (public/images/brand/logo-largo.png);
// el "maskable" lleva margen para que Android lo recorte en círculo o en cuadro sin cortar el dibujo.
// El blanco es el del encabezado de la tienda; el color de la barra del navegador está en el `viewport` de app/layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Electro Shop',
    short_name: 'Electro Shop',
    description: 'Tecnología, ferretería y gift cards en Guanare, con envíos a toda Venezuela.',
    lang: 'es-VE',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icons/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
