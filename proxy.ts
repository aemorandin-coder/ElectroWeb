import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { getMaintenanceState, getRequestIP, isMaintenanceExemptPath, maintenanceResponse } from '@/lib/maintenance';

const REF_COOKIE = 'electroshop_ref';
const REF_TTL_DAYS = 30;

export default withAuth(
  async function proxy(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    const isAdminRoute = pathname.startsWith('/admin');
    const isLoginPage = pathname === '/login' || pathname === '/admin/login';
    const userRole = (token as any)?.role;
    const userType = (token as any)?.userType;
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
          pathname.startsWith('/api/settings') ||
          pathname.startsWith('/api/exchange-rates') ||
          pathname.startsWith('/api/contact') ||
          pathname.startsWith('/api/reviews') ||
          pathname.startsWith('/api/uploads') ||
          pathname.startsWith('/api/analytics') ||
          pathname.startsWith('/api/webhooks');

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
