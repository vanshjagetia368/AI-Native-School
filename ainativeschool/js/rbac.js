/* ============================================
   AI Native Schools — Role-Based Access Control (RBAC)
   ============================================ */

import { getSession } from './storage.js';

export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    TEACHER: 'teacher',
    COUNSELOR: 'counselor',
    STUDENT: 'student',
    PARENT: 'parent'
};

// Permission Matrix
// Actions: 'view_students', 'view_reports', 'edit_students', 'export_data', 'view_cohort_analytics'
const PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: {
        view_students: 'all',
        view_reports: 'all',
        edit_students: true,
        export_data: true,
        view_cohort_analytics: 'national'
    },
    [ROLES.ADMIN]: {
        view_students: 'school',
        view_reports: 'school',
        edit_students: true,
        export_data: true,
        view_cohort_analytics: 'school'
    },
    [ROLES.TEACHER]: {
        view_students: 'class',
        view_reports: 'class',
        edit_students: false,
        export_data: 'limited',
        view_cohort_analytics: 'class'
    },
    [ROLES.COUNSELOR]: {
        view_students: 'school',
        view_reports: 'school',
        edit_students: false,
        export_data: 'limited',
        view_cohort_analytics: 'school'
    },
    [ROLES.STUDENT]: {
        view_students: 'own',
        view_reports: 'own',
        edit_students: false,
        export_data: false,
        view_cohort_analytics: false
    },
    [ROLES.PARENT]: {
        view_students: 'own',
        view_reports: 'own',
        edit_students: false,
        export_data: false,
        view_cohort_analytics: false
    }
};

export function hasPermission(role, action) {
    if (!PERMISSIONS[role]) return false;
    return !!PERMISSIONS[role][action];
}

export function getPermissionLevel(role, action) {
    if (!PERMISSIONS[role]) return false;
    return PERMISSIONS[role][action];
}

export function requireRole(allowedRoles, redirectUrl = '../index.html') {
    const session = getSession();
    if (!session || !session.loggedIn || !allowedRoles.includes(session.role)) {
        window.location.href = redirectUrl;
        return false;
    }
    return true;
}

// Higher-order guards
export function requireAdmin() {
    return requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]);
}

export function requireTeacherOrAbove() {
    return requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.COUNSELOR]);
}

export function requireSuperAdmin() {
    return requireRole([ROLES.SUPER_ADMIN]);
}
