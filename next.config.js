/** @type {import('next').NextConfig} */
const nextConfig = {
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
