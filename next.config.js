// C-149: la tienda vive en un solo dominio (el de NEXT_PUBLIC_BASE_URL, sin "www"). La variante con "www" respondía
// con el mismo contenido: dos direcciones para cada página, y Google reparte entre las dos lo que debería sumar en una.
const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://electroshopve.com').replace(/\/+$/, '');
const SITE_HOST = new URL(SITE_URL).hostname;
const wwwRedirect = SITE_HOST.startsWith('www.')
  ? []
  // Menos /api/: un servicio externo que llame a la API con "www" (un webhook, un cron) no sigue redirecciones
  : [{ source: '/:path((?!api/).*)', has: [{ type: 'host', value: `www.${SITE_HOST}` }], destination: `${SITE_URL}/:path`, permanent: true }];

// C-166: Content-Security-Policy. Por defecto solo AVISA (Report-Only: no bloquea nada y cada aviso va a /api/csp-report, que
// los agrupa en Reportes → Seguridad). Solo en las páginas (no en /api ni /_next). Para que bloquee: CSP_ENFORCE="true" en el .env del servidor y volver a compilar
// (las cabeceras se fijan en el build). En desarrollo no se pone: React usa eval y llenaría todo de avisos falsos.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- next.config.js es CommonJS
const { construirPolitica } = require('./lib/csp-policy');
const CSP_ENFORCE = process.env.CSP_ENFORCE === 'true';
const CSP_HEADERS = process.env.NODE_ENV === 'production'
  ? [
      { key: CSP_ENFORCE ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only', value: construirPolitica({ enforce: CSP_ENFORCE }) },
      { key: 'Reporting-Endpoints', value: 'csp="/api/csp-report"' },
    ]
  : [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // C-165: no anunciar con qué está hecha la tienda (cabecera X-Powered-By)
  poweredByHeader: false,
  // En producción, scripts/deploy.sh alterna .next-a y .next-b: compila en la que no se está sirviendo y solo
  // entonces reinicia. Antes el build borraba .next con la tienda corriendo y PM2 la reiniciaba sin parar
  // ("Could not find a production build", 55.910 veces hasta el 26/09). Next graba este nombre en cada ruta
  // compilada: una carpeta no se puede renombrar después del build.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    // El build de producción es siempre desde cero en otra carpeta: la caché en disco de Turbopack no ahorra nada,
    // escribe ~550 MB y sube la memoria del build. El 28/09 el servidor (7,8 GB, sin swap) lo mató por falta de memoria.
    turbopackFileSystemCacheForBuild: false,
  },
  images: {
    // C-33: optimización activada. Antes (unoptimized) cada foto bajaba en su PNG original de 0,3-1,8 MB aunque se viera a 200 px;
    // ahora /_next/image la entrega redimensionada al tamaño en pantalla y en WebP, y la guarda en .next/cache/images.
    formats: ['image/webp'],
    qualities: [75],
    // Los archivos subidos llevan la fecha en el nombre: una foto nueva es otra URL, así que se puede guardar 30 días
    minimumCacheTTL: 2592000,
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
      // Fotos de perfil de Google (C-85). Sin esto, /_next/image responde 400 y la foto sale rota (C-80).
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  async redirects() {
    return [
      ...wwwRedirect,
      {
        source: '/auth/signin',
        destination: '/login',
        permanent: true,
      },
      { source: '/auth/login', destination: '/login', permanent: true },
      // Rutas eliminadas o duplicadas (C-06)
      { source: '/mis-pedidos', destination: '/customer/orders', permanent: true },
      { source: '/mi-cuenta', destination: '/customer', permanent: true },
      { source: '/customer/wallet', destination: '/customer/balance', permanent: true },
      { source: '/comparar', destination: '/productos', permanent: true },
      // Pantallas duplicadas del panel (C-110): todo vive en Consultas
      { source: '/admin/messages', destination: '/admin/inquiries', permanent: false },
      { source: '/admin/product-requests', destination: '/admin/inquiries?tab=requests', permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
  // Única fuente de cabeceras de seguridad (proxy.ts ya no las pone)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control',      value: 'on' },
          { key: 'Strict-Transport-Security',    value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options',              value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',       value: 'nosniff' },
          { key: 'X-XSS-Protection',             value: '1; mode=block' },
          { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',           value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
      {
        // C-166: la política solo viaja con las PÁGINAS. La API y los archivos de Next no la necesitan, y son ~1,3 KB más en
        // cada respuesta: junto con las cookies de sesión (el login) podrían pasar el límite de cabeceras de nginx (4 KB)
        source: '/((?!api/|_next/).*)',
        headers: CSP_HEADERS,
      },
      {
        // Las respuestas de la API no se guardan, salvo los archivos subidos (C-33) y la imagen versionada del popup (C-23b)
        source: '/api/:path((?!uploads/|public/hot-ad-image).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        // Menos los documentos de empresa: privados, sin caché compartida (C-72)
        source: '/uploads/:path((?!documents/).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
