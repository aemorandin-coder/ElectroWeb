// Content-Security-Policy de la tienda (C-166). Es CommonJS para que next.config.js y el código de la tienda usen la misma.
//
// Sin nonce: la guía de Next 16 lo recomienda cuando hay páginas estáticas, y un nonce obliga a renderizar todo en cada visita.
// Lo que sí hace esta política: nadie puede cargar scripts, conectarse ni incrustar marcos de dominios que no estén aquí,
// ni usar `eval`, ni <object>, ni cambiar la base de las direcciones o el destino de los formularios. Lo que no hace:
// impedir un script en línea inyectado (para eso haría falta nonce).
//
// Cada dominio tiene su razón. Si una pantalla nueva carga algo de otro dominio, se agrega aquí y se explica.

const GOOGLE_ANALYTICS = ['https://www.googletagmanager.com', 'https://*.google-analytics.com'];
const META_PIXEL = ['https://connect.facebook.net'];
const HCAPTCHA = ['https://hcaptcha.com', 'https://*.hcaptcha.com'];

const DIRECTIVAS = {
  'default-src': ["'self'"],
  // 'unsafe-inline': Next pone su arranque en línea; el pixel y gtag se inyectan en línea desde AnalyticsTracker
  'script-src': ["'self'", "'unsafe-inline'", ...GOOGLE_ANALYTICS, ...META_PIXEL, ...HCAPTCHA],
  'style-src': ["'self'", "'unsafe-inline'", ...HCAPTCHA],
  // Fotos de productos, de ElectroStudio, banderas, avatares de Google y miniaturas de YouTube: cualquier https
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'media-src': ["'self'", 'blob:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'", 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com',
    'https://*.g.doubleclick.net', 'https://www.facebook.com', 'https://connect.facebook.net', ...HCAPTCHA,
  ],
  // Videos de cursos, servicios y portada, y el captcha
  'frame-src': ['https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://player.vimeo.com', 'https://www.tiktok.com', ...HCAPTCHA, 'blob:'],
  'worker-src': ["'self'", 'blob:'],
  'manifest-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

/**
 * La política como texto de cabecera. `frame-ancestors` y `upgrade-insecure-requests` solo cuentan cuando bloquea:
 * en "solo reportar" los navegadores los ignoran (y se quejan en la consola).
 */
function construirPolitica({ enforce = false, reportUri = '/api/csp-report' } = {}) {
  const partes = Object.entries(DIRECTIVAS).map(([nombre, valores]) => `${nombre} ${valores.join(' ')}`);
  if (enforce) partes.push("frame-ancestors 'self'", 'upgrade-insecure-requests');
  // report-uri lo entienden todos los navegadores; report-to (con la cabecera Reporting-Endpoints), Chrome y Edge
  partes.push(`report-uri ${reportUri}`, 'report-to csp');
  return partes.join('; ');
}

module.exports = { construirPolitica, DIRECTIVAS };
