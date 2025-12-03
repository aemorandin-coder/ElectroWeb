import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
    const isLoginPage = req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/admin/login';

    // Redirect old admin/login to new login
    if (req.nextUrl.pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/login?redirect=admin', req.url));
    }

    if (isAdminRoute && !isLoginPage) {
      if (!token) {
        return NextResponse.redirect(new URL('/login?redirect=admin', req.url));
      }
      
      // Check if user is admin
      const userType = (token as any)?.userType;
      if (userType !== 'admin') {
        return NextResponse.redirect(new URL('/login?redirect=admin&error=admin_required', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isLoginPage = req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/admin/login';
        if (isLoginPage) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
