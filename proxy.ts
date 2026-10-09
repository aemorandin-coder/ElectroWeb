import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { getMaintenanceState, getRequestIP, isMaintenanceExemptPath, maintenanceResponse } from '@/lib/maintenance';
import { scheduleExchangeRateRefresh } from '@/lib/exchange-rate';
import { isFlyerCode, STUDIO_COOKIE, STUDIO_COOKIE_DAYS } from '@/lib/studio/code';
import { PAGINAS_SOLO_DUENO } from '@/lib/auth-helpers';

const REF_COOKIE = 'electroshop_ref';
const REF_TTL_DAYS = 30;

export default withAuth(
  async function proxy(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    const isAdminRoute = pathname.startsWith('/admin');
    const isLoginPage = pathname === '/login' || pathname === '/admin/login';
    const userRole = token?.role;
    const userType = token?.userType;
    const isAdminUser = userType === 'admin' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    // ── MAINTENANCE MODE (D3) ────────────────────────────────────────
    // Los visitantes ven la página de mantenimiento (503); los admins logueados, las IPs
    // permitidas y las rutas de login, panel, auth y webhooks siguen funcionando.
    if (!isAdminUser && !isMaintenanceExemptPath(pathname)) {
      const maintenance = await getMaintenanceState();
      const ip = getRequestIP(req.headers);
      if (maintenance.active && !(ip && maintenance.allowedIPs.includes(ip))) {
        return maintenanceResponse(maintenance, pathname.startsWith('/api/'));
      }
    }

    // Tasa BCV automática (C-50b): sin await y como mucho una revisión cada 5 minutos por proceso
    if (!pathname.startsWith('/api/')) scheduleExchangeRateRefresh();

    const response = NextResponse.next();

    // ── REFERRAL COOKIE (first-touch attribution) ────────────────────
    const refParam = req.nextUrl.searchParams.get('ref');
    if (refParam && /^[A-Za-z0-9_-]{3,20}$/.test(refParam)) {
      if (!req.cookies.get(REF_COOKIE)) {
        response.cookies.set(REF_COOKIE, refParam.toUpperCase(), {
          httpOnly: true,
          sameSite: 'lax',
          maxAge: REF_TTL_DAYS * 24 * 60 * 60,
          path: '/',
        });
      }
    }

    // ── ELECTROSTUDIO (C-113) ───────────────────────────────────────
    // ?es=<código>: llegó por una historia de Instagram. Último toque: la historia más reciente se queda con la compra
    const esParam = req.nextUrl.searchParams.get('es');
    if (isFlyerCode(esParam)) {
      response.cookies.set(STUDIO_COOKIE, esParam, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: STUDIO_COOKIE_DAYS * 24 * 60 * 60,
        path: '/',
      });
    }

    // Cabeceras de seguridad: solo en next.config.js (una sola fuente)

    // ── REDIRECTS ────────────────────────────────────────────────────
    if (pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/login?redirect=admin', req.url));
    }

    // ── ADMIN PROTECTION ─────────────────────────────────────────────
    if (isAdminRoute && !isLoginPage) {
      if (!token) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('redirect', 'admin');
        return NextResponse.redirect(loginUrl);
      }

      if (!isAdminUser) {
        return NextResponse.redirect(new URL('/login?redirect=admin&error=admin_required', req.url));
      }

      // Páginas solo del dueño (C-141): Configuración, Métodos de pago y Equipo. Sus APIs ya responden 403
      if (userRole !== 'SUPER_ADMIN' && PAGINAS_SOLO_DUENO.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
    }

    // ── DOS PASOS (C-141) ────────────────────────────────────────────
    // Sin la verificación en dos pasos, el admin solo puede configurarla: el panel lo lleva a Mi seguridad y sus
    // APIs responden 403. Las demás APIs con acciones de admin lo cortan con hasPermission (lib/auth-helpers.ts).
    if (token && isAdminUser && token.dosPasos !== true) {
      if (pathname.startsWith('/api/admin/') && pathname !== '/api/admin/dos-pasos') {
        return NextResponse.json({ error: 'Configura la verificación en dos pasos para usar el panel.', codigo: 'DOS_PASOS' }, { status: 403 });
      }
      if (isAdminRoute && !isLoginPage && pathname !== '/admin/seguridad') {
        return NextResponse.redirect(new URL('/admin/seguridad', req.url));
      }
    }

    // ── CUSTOMER PROTECTION ──────────────────────────────────────────
    if (pathname.startsWith('/customer') && !token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ── CHECKOUT PROTECTION ──────────────────────────────────────────
    if (pathname.startsWith('/checkout') && !token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', '/checkout');
      loginUrl.searchParams.set('message', 'login_required');
      return NextResponse.redirect(loginUrl);
    }

    // ── API HEADERS ──────────────────────────────────────────────────
    if (pathname.startsWith('/api/')) {
      response.headers.set('X-RateLimit-Policy', 'sliding-window');
    }

    // La cookie x-is-admin (legible por JS y sin uso) ya no existe: se borra donde quedó guardada
    if (req.cookies.get('x-is-admin')) {
      response.cookies.delete('x-is-admin');
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Páginas: la protección de /admin, /customer y /checkout está en la función de arriba
        // (el matcher cubre toda la tienda por el modo mantenimiento)
        if (!pathname.startsWith('/api/')) return true;

        const isLoginPage = pathname === '/login' || pathname === '/admin/login';
        const isPublicApiRoute =
          pathname.startsWith('/api/public') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/products') ||
          pathname.startsWith('/api/categories') ||
          // Consultar una gift card antes de iniciar sesión (sin saldo, con límite). El canje (POST) exige sesión en el handler (C-71)
          pathname === '/api/gift-cards/redeem' ||
          // Solo la versión pública: /api/settings (completa) exige sesión de admin (C-50a)
          pathname === '/api/settings/public' ||
          pathname.startsWith('/api/exchange-rates') ||
          pathname.startsWith('/api/contact') ||
          // Cotizaciones (C-148): pedirla desde la tienda y aprobarla con el enlace, sin cuenta. Captcha y límite en el handler
          pathname === '/api/cotizaciones' ||
          /^\/api\/cotizaciones\/[A-Za-z0-9_-]{16,40}$/.test(pathname) ||
          // Exige sesión dentro del handler y responde 401 en JSON (sin redirigir al login)
          pathname.startsWith('/api/product-requests') ||
          pathname.startsWith('/api/reviews') ||
          pathname.startsWith('/api/uploads') ||
          pathname.startsWith('/api/analytics') ||
          pathname.startsWith('/api/webhooks') ||
          // El cron del servidor: se autoriza con CRON_SECRET dentro del handler (C-100, C-138, C-157, C-165, C-167, C-169)
          pathname === '/api/cron/envios' ||
          pathname === '/api/cron/favoritos' ||
          pathname === '/api/cron/resenas' ||
          pathname === '/api/cron/respaldos' ||
          pathname === '/api/cron/promotores' ||
          pathname === '/api/cron/papelera' ||
          // Avisos de la Content-Security-Policy (C-166): los manda el navegador del visitante, sin sesión. Límite en el handler
          pathname === '/api/csp-report' ||
          // Tiempo real (C-127): sin sesión solo recibe el stock; el handler filtra por sesión y permisos
          pathname === '/api/realtime';

        if (isLoginPage || isPublicApiRoute) return true;

        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Toda la tienda (modo mantenimiento, cookie de referidos y protección de rutas),
    // excepto archivos estáticos y de metadatos
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|uploads/|fonts/|images/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|mp4|webm)$).*)',
  ],
};
