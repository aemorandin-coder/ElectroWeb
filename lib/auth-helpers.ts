import { Session } from 'next-auth';

/**
 * Check if a user has a specific permission
 * ADMIN role has all permissions by default
 */
export function hasPermission(session: Session | null, permission: string): boolean {
    if (!session) return false;

    const user = session.user as any;
    const userRole = user?.role;
    const userPermissions = user?.permissions || [];

    // ADMIN and SUPER_ADMIN roles have all permissions
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;

    // Check if user has the specific permission
    return userPermissions.includes(permission);
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
