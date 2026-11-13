import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { getMaintenanceState, getRequestIP, isMaintenanceExemptPath, maintenanceResponse } from '@/lib/maintenance';
import { scheduleExchangeRateRefresh } from '@/lib/exchange-rate';
import { isFlyerCode, STUDIO_COOKIE, STUDIO_COOKIE_DAYS } from '@/lib/studio/code';
import { PAGINAS_SOLO_DUENO } from '@/lib/auth-helpers';
import { direccionActual } from '@/lib/direcciones-anteriores';
import { CABECERA_VERSION, VERSION_PESTANA } from '@/lib/version-build';

const REF_COOKIE = 'electroshop_ref';
const REF_TTL_DAYS = 30;

export default withAuth(
  async function proxy(req) {
    // ── PESTAÑAS DE OTRA VERSIÓN (C-203) ─────────────────────────────
    // Una pestaña abierta antes de un deploy tiene el código de la versión anterior. Si al navegar recibe el contenido de
    // la nueva, Next carga los archivos nuevos encima de los viejos y la página se rompe (el 11/11, Categorías del panel:
    // "getCategoryIconOption is not a function"). Cada pedido del router trae la versión de la pestaña (x-es-version,
    // lib/version-build.ts). Si no es esta, la respuesta va vacía: el prefetch se descarta y la navegación se vuelve una
    // carga completa de la página, ya con la versión nueva.
    // Una pestaña de antes de C-203 no manda la cabecera: su pedido se reconoce por ser un fetch del mismo sitio a una
    // página (la tienda solo hace fetch a /api, y al abrir una página el navegador manda "Sec-Fetch-Dest: document").
    // Next le quita a proxy.ts la cabecera "rsc" de sus pedidos: por eso no se usa. En desarrollo no se filtra.
    if (process.env.NODE_ENV === 'production' && !req.nextUrl.pathname.startsWith('/api/')) {
      const versionPestana = req.headers.get(CABECERA_VERSION);
      const delRouter = versionPestana !== null
        || (req.headers.get('sec-fetch-dest') === 'empty' && req.headers.get('sec-fetch-site') === 'same-origin');
      if (delRouter && versionPestana !== VERSION_PESTANA) {
        return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
      }
    }

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

    // ── SORTEO (C-212) ──────────────────────────────────────────────
    // ?invita=<código>: el enlace de un participante. Primer toque, como el de los promotores: quien se registre con
    // esta cookie queda como su invitado (app/api/auth/register)
    const invitaParam = req.nextUrl.searchParams.get('invita');
    if (invitaParam && /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/.test(invitaParam) && !req.cookies.get('electroshop_sorteo')) {
      response.cookies.set('electroshop_sorteo', invitaParam, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60, path: '/' });
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

    // Direcciones anteriores de productos (C-202): al cambiarle el nombre, el producto cambia de dirección. La vieja
    // responde 308 a la nueva, con lo que traía después del "?" (?ref=, ?es=). La base se lee como mucho una vez por minuto.
    const enFicha = pathname.match(/^\/productos\/([^/]+)\/?$/);
    if (enFicha) {
      let slug = enFicha[1];
      try { slug = decodeURIComponent(slug); } catch { /* mal escrita: la ficha responde que no existe */ }
      const actual = await direccionActual(slug);
      if (actual) {
        const destino = new URL(`/productos/${encodeURIComponent(actual)}`, req.url);
        destino.search = req.nextUrl.search;
        return NextResponse.redirect(destino, 308);
      }
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
          // C-181: la página del cliente avisa que se abrió (límite en el handler). C-182: el presupuesto en PDF
          /^\/api\/cotizaciones\/[A-Za-z0-9_-]{16,40}\/(vista|pdf)$/.test(pathname) ||
          // C-181: Numen, de servidor a servidor. Se autoriza con NUMEN_API_KEY dentro del handler (lib/numen-auth.ts)
          pathname.startsWith('/api/numen/') ||
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
