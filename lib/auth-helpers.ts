import { Session } from 'next-auth';

/**
 * Permisos del panel (C-141, decisión de Andrés del 30/09):
 * - SUPER_ADMIN (dueño): todo.
 * - ADMIN (administrador): todo el día a día, menos la configuración sensible (MANAGE_SETTINGS: Configuración,
 *   métodos de pago, correo, Telegram y avisos, documentos legales) y el equipo (MANAGE_TEAM).
 * - Ningún admin tiene permisos hasta entrar con la verificación en dos pasos (`dosPasos` en la sesión).
 * - Otros roles: solo los permisos de su lista (hoy ninguno).
 * El menú del panel usa esta misma función.
 */
export const SOLO_DUENO = ['MANAGE_SETTINGS', 'MANAGE_TEAM'];
/** Páginas del panel que solo abre el super admin (el `proxy` devuelve a los demás al inicio del panel). */
export const PAGINAS_SOLO_DUENO = ['/admin/settings', '/admin/payments', '/admin/equipo'];

export function hasPermission(session: Session | null, permission: string): boolean {
    if (!session) return false;

    const user = session.user as { role?: string; permissions?: string[]; dosPasos?: boolean };
    const userRole = user?.role;

    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        if (user.dosPasos !== true) return false;
        return userRole === 'SUPER_ADMIN' || !SOLO_DUENO.includes(permission);
    }

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

/** Admin del panel con los dos pasos hechos (para las rutas que antes miraban solo el rol). */
export function esAdminVerificado(session: Session | null): boolean {
    const user = session?.user as { role?: string; dosPasos?: boolean } | undefined;
    return (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && user.dosPasos === true;
}
