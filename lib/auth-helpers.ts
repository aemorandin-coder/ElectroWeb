import { Session } from 'next-auth';

/**
 * Permisos del panel (C-141, decisión de Andrés del 30/09):
 * - SUPER_ADMIN (dueño): todo.
 * - ADMIN (administrador): todo el día a día, menos la configuración sensible (MANAGE_SETTINGS: Configuración,
 *   métodos de pago, correo, Telegram y avisos, documentos legales) y el equipo (MANAGE_TEAM).
 * - Ningún admin tiene permisos hasta entrar con la verificación en dos pasos (`dosPasos` en la sesión).
 * - Otros roles: solo los permisos de su lista (hoy ninguno).
 * - C-229, Contabilidad (decisión del 14/11, docs/plan/CONTABILIDAD.md §5): los administradores facturan (FACTURAR);
 *   ver los libros, el IVA y los márgenes (VER_CONTABILIDAD) y declarar y firmar (DECLARAR) son del dueño, y desde
 *   C-235 también de la contadora. Cargar un talonario (CARGAR_TALONARIO), solo el dueño.
 * - ACCOUNTANT (la contadora, C-235): solo Contabilidad (PERMISOS_CONTADORA), y también con los dos pasos.
 * El menú del panel usa esta misma función.
 */
export const SOLO_DUENO = ['MANAGE_SETTINGS', 'MANAGE_TEAM', 'VER_CONTABILIDAD', 'DECLARAR', 'CARGAR_TALONARIO', 'CONFIG_CONTABLE'];

/** C-235: lo único que puede la contadora: ver Contabilidad (y descargarla) y declarar y firmar. No factura. */
export const PERMISOS_CONTADORA = ['VER_CONTABILIDAD', 'DECLARAR'];

/** C-235: los roles que entran al panel (con la sesión de admin y los dos pasos). Los poderes los da cada permiso. */
export const ROLES_PANEL = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'] as const;
export const esRolDelPanel = (rol: string | null | undefined): boolean => rol === 'ADMIN' || rol === 'SUPER_ADMIN' || rol === 'ACCOUNTANT';

/** C-235 / G-76: las páginas que abre la contadora (las demás del panel la llevan al Hub de Contabilidad) y las APIs que puede llamar. */
export const INICIO_CONTADORA = '/admin/contabilidad';
export const PAGINAS_CONTADORA = ['/admin/contabilidad', '/admin/seguridad', '/admin/versiones'];
export const APIS_CONTADORA = ['/api/admin/contabilidad', '/api/admin/dos-pasos', '/api/admin/version', '/api/admin/sidebar-counts'];
/** Páginas del panel que solo abre el super admin (el `proxy` devuelve a los demás al inicio del panel). */
export const PAGINAS_SOLO_DUENO = ['/admin/settings', '/admin/payments', '/admin/equipo', '/admin/contabilidad/talonarios'];

export function hasPermission(session: Session | null, permission: string): boolean {
    if (!session) return false;

    const user = session.user as { role?: string; permissions?: string[]; dosPasos?: boolean };
    const userRole = user?.role;

    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        if (user.dosPasos !== true) return false;
        return userRole === 'SUPER_ADMIN' || !SOLO_DUENO.includes(permission);
    }

    // C-235: la contadora, solo lo suyo y con los dos pasos
    if (userRole === 'ACCOUNTANT') return user.dosPasos === true && PERMISOS_CONTADORA.includes(permission);

    return (user?.permissions || []).includes(permission);
}

/**
 * Check if user is authenticated and has required permission
 * Returns true if authorized, false otherwise
 */
export function isAuthorized(session: Session | null, permission?: string): boolean {
    if (!session) return false;
    if (!permission) return true; // No specific permission required

    return hasPermission(session, permission);
}

/** C-235: cualquiera del panel (admin, dueño o contadora) con los dos pasos: para lo que no da poderes (la versión). */
export function esDelPanelVerificado(session: Session | null): boolean {
    const user = session?.user as { role?: string; dosPasos?: boolean } | undefined;
    return esRolDelPanel(user?.role) && user?.dosPasos === true;
}

/** Admin del panel con los dos pasos hechos (para las rutas que antes miraban solo el rol). La contadora no lo es. */
export function esAdminVerificado(session: Session | null): boolean {
    const user = session?.user as { role?: string; dosPasos?: boolean } | undefined;
    return (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && user.dosPasos === true;
}
