/* ============================================
   AI Native Schools — Session & Route Guards
   ============================================ */

import { getSession, clearSession } from './storage.js';
import { ROLES, hasPermission } from './rbac.js';

/**
 * Require the user to be authenticated with one of the allowed roles.
 * Redirects to index.html if not authenticated.
 */
export function requireAuth(allowedRoles = []) {
    const session = getSession();

    if (!session || !session.loggedIn) {
        window.location.replace('index.html');
        return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
        window.location.replace('index.html');
        return null;
    }

    return session;
}

/**
 * Require admin auth — resolves correct path for admin/ subdirectory
 * Allows roles: SUPER_ADMIN, ADMIN, TEACHER, COUNSELOR to access the dashboard at least.
 * Specific views will guard themselves using hasPermission().
 */
export function requireAdmin() {
    const session = getSession();

    const adminRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.COUNSELOR];

    if (!session || !session.loggedIn || !adminRoles.includes(session.role)) {
        window.location.replace('../index.html');
        return null;
    }

    return session;
}

export function requireGuest() {
    const session = getSession();

    if (session && session.loggedIn) {
        const adminRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.COUNSELOR];
        if (adminRoles.includes(session.role)) {
            window.location.replace('admin/dashboard.html');
        } else if (session.role === ROLES.STUDENT) {
            window.location.replace('student/dashboard.html');
        } else if (session.role === ROLES.PARENT) {
            window.location.replace('parent/dashboard.html');
        }
        return false;
    }

    return true;
}

/**
 * Logout: clear session and redirect.
 * fromAdmin flag for correct path resolution.
 */
export function logout(fromAdmin = false) {
    clearSession();
    window.location.replace(fromAdmin ? '../index.html' : 'index.html');
}
