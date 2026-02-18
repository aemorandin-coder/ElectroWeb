import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    const isAdminRoute = pathname.startsWith('/admin');
    const isLoginPage = pathname === '/login' || pathname === '/admin/login';

    // ═══════════════════════════════════════════════════════════════
    // 1. SECURITY HEADERS - Apply to all responses
    // ═══════════════════════════════════════════════════════════════
    const response = NextResponse.next();

    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');

    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // ═══════════════════════════════════════════════════════════════
    // 2. REDIRECTS
    // ═══════════════════════════════════════════════════════════════

    // Redirect old admin/login to new login
    if (pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/login?redirect=admin', req.url));
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. ADMIN ROUTES PROTECTION
    // ═══════════════════════════════════════════════════════════════
    if (isAdminRoute && !isLoginPage) {
      if (!token) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('redirect', 'admin');
        return NextResponse.redirect(loginUrl);
      }

      // Check if user is admin
      const userType = (token as any)?.userType;
      const role = (token as any)?.role;

      if (userType !== 'admin' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/login?redirect=admin&error=admin_required', req.url));
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. CUSTOMER ROUTES PROTECTION
    // ═══════════════════════════════════════════════════════════════
    if (pathname.startsWith('/customer')) {
      if (!token) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. CHECKOUT PROTECTION
    // ═══════════════════════════════════════════════════════════════
    if (pathname.startsWith('/checkout')) {
      if (!token) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', '/checkout');
        loginUrl.searchParams.set('message', 'login_required');
        return NextResponse.redirect(loginUrl);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. API RATE LIMITING HEADERS (for client awareness)
    // ═══════════════════════════════════════════════════════════════
    if (pathname.startsWith('/api/')) {
      response.headers.set('X-RateLimit-Policy', 'sliding-window');
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const isLoginPage = pathname === '/login' || pathname === '/admin/login';
        const isPublicApiRoute = pathname.startsWith('/api/public') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/products') ||
          pathname.startsWith('/api/categories') ||
          pathname.startsWith('/api/settings') ||
          pathname.startsWith('/api/exchange-rates') ||
          pathname.startsWith('/api/contact') ||
          pathname.startsWith('/api/reviews') ||
          pathname.startsWith('/api/uploads') ||
          pathname.startsWith('/api/analytics') ||
          pathname.startsWith('/api/webhooks'); // Also adding webhooks for safety

        // Allow login pages
        if (isLoginPage) {
          return true;
        }

        // Allow public API routes
        if (isPublicApiRoute) {
          return true;
        }

        // For protected routes, require token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Admin routes
    '/admin/:path*',
    // Customer routes
    '/customer/:path*',
    // Checkout
    '/checkout/:path*',
    // Login
    '/login',
    // API routes (for headers)
    '/api/:path*',
  ],
};
