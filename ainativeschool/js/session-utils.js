// js/session-utils.js
import { showToast } from './toast.js';

const SESSION_KEY = 'currentSession';
const STORAGE_KEY = 'ai_native_schools';
const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Validates the current session against local storage.
 * @param {string} requiredRole - e.g. 'student', 'admin', 'super_admin'
 * @returns {Object|null} The session object if valid, null otherwise.
 */
export function validateSession(requiredRole) {
    const sessionRaw = localStorage.getItem(SESSION_KEY);

    if (!sessionRaw) {
        redirectToLogin();
        return null;
    }

    let session;
    try {
        session = JSON.parse(sessionRaw);
    } catch (e) {
        clearSessionAndRedirect('Session corrupted. Please log in again.');
        return null;
    }

    // Check expiry
    const now = Date.now();
    if (!session.loginTime || (now - session.loginTime) > SESSION_EXPIRY_MS) {
        clearSessionAndRedirect('Session expired due to inactivity. Please log in again.');
        return null;
    }

    // Update loginTime to keep session alive during activity
    session.loginTime = now;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Role check
    if (requiredRole && session.role !== requiredRole) {
        clearSessionAndRedirect('Unauthorized access.');
        return null;
    }

    // Data verification
    const schoolsRaw = localStorage.getItem(STORAGE_KEY);
    const schools = schoolsRaw ? JSON.parse(schoolsRaw) : {};
    const school = schools[session.schoolCode];

    if (!school) {
        clearSessionAndRedirect('School data missing. Please contact administrator.');
        return null;
    }

    if (session.role === 'student') {
        let studentFound = false;
        if (school.classes) {
            for (const cls of school.classes) {
                const s = (cls.students || []).find(st => st.studentId === session.studentId);
                if (s) {
                    studentFound = true;
                    // Sync session data with actual student data
                    session.name = s.name;
                    session.className = cls.className; // className is on the class, not the student
                    session.isFirstLogin = s.isFirstLogin;
                    session.psychometricCompleted = s.psychometricCompleted;
                    break;
                }
            }
        }
        if (!studentFound) {
            clearSessionAndRedirect('Student profile missing from school records. Please contact administrator.');
            return null;
        }
    } else {
        // Basic admin check - in a real app this would verify the admin token/existence in the school object
        if (school.admin && school.admin.email !== session.email && session.role !== 'super_admin') {
            // Might be a teacher/counselor, handled by RBAC, but this is a rough data check
        }
    }

    return session;
}

function clearSessionAndRedirect(message) {
    localStorage.removeItem(SESSION_KEY);
    // Use sessionStorage to pass a toast message to the login page
    if (message) {
        sessionStorage.setItem('authError', message);
    }
    redirectToLogin();
}

function redirectToLogin() {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        return; // Already on login
    }
    window.location.href = '../index.html'; // Assuming this is called from /student or /admin
}

/**
 * Destroys the current session safely.
 */
export function destroySession() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = window.location.pathname.includes('/student/') || window.location.pathname.includes('/admin/') ? '../index.html' : 'index.html';
}
