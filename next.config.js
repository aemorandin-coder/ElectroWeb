/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    qualities: [100, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
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
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
