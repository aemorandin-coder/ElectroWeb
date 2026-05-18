import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const REF_COOKIE = 'electroshop_ref';
const REF_TTL_DAYS = 30;

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    const isAdminRoute = pathname.startsWith('/admin');
    const isLoginPage = pathname === '/login' || pathname === '/admin/login';

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

    // ── SECURITY HEADERS ─────────────────────────────────────────────
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

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

      const userType = (token as any)?.userType;
      const role = (token as any)?.role;

      if (userType !== 'admin' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/login?redirect=admin&error=admin_required', req.url));
      }
    }

    // ── CUSTOMER PROTECTION ──────────────────────────────────────────
    const isCustomerRoute =
      pathname.startsWith('/customer') ||
      pathname.startsWith('/mis-pedidos');

    if (isCustomerRoute && !token) {
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

    // ── ADMIN IDENTITY HEADER ─────────────────────────────────────────
    // Lets the frontend bypass maintenance mode for logged-in admins
    // without requiring a DB round-trip in each component.
    const userRole = (token as any)?.role;
    const userType = (token as any)?.userType;
    const isAdminUser = userType === 'admin' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (isAdminUser) {
      response.headers.set('X-Is-Admin', '1');
      response.cookies.set('x-is-admin', '1', {
        httpOnly: false, // readable by client JS for maintenance bypass
        sameSite: 'lax',
        maxAge: 60 * 60 * 8, // 8 hours — matches typical session
        path: '/',
      });
    } else {
      // Clear the cookie if they're not an admin (logged out, role changed)
      response.cookies.delete('x-is-admin');
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
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

        // Public pages — always allow (protection handled in proxy function above)
        const isPublicPage =
          pathname === '/' ||
          pathname.startsWith('/p/') ||
          pathname.startsWith('/productos') ||
          pathname.startsWith('/categorias') ||
          pathname.startsWith('/servicios') ||
          pathname.startsWith('/contacto') ||
          pathname.startsWith('/cursos') ||
          pathname.startsWith('/comparar') ||
          pathname.startsWith('/gift-cards') ||
          pathname.startsWith('/canjear-gift-card') ||
          pathname.startsWith('/solicitar-producto') ||
          pathname.startsWith('/registro') ||
          pathname.startsWith('/privacidad') ||
          pathname.startsWith('/terminos') ||
          pathname.startsWith('/verificar-email') ||
          pathname.startsWith('/recuperar-contrasena');

        if (isLoginPage || isPublicApiRoute || isPublicPage) return true;

        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Public pages — needed for referral cookie capture + security headers
    '/',
    '/p/:path*',
    '/productos/:path*',
    '/categorias/:path*',
    '/servicios',
    '/contacto',
    '/cursos',
    '/comparar',
    '/gift-cards',
    '/canjear-gift-card',
    '/solicitar-producto',
    '/registro',
    '/privacidad',
    '/terminos',
    '/verificar-email/:path*',
    '/recuperar-contrasena/:path*',
    // Protected routes
    '/admin/:path*',
    '/customer/:path*',
    '/mis-pedidos/:path*',
    '/checkout/:path*',
    '/login',
    // API routes (for headers)
    '/api/:path*',
  ],
};
