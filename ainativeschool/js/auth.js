/* ============================================
   AI Native Schools — Auth Utilities
   Admin auth + Reset Password flow.
   Student login is in auth-utils.js.
   Password ops use auth-core.js.
   ============================================ */

import { getSchool, saveSchool, saveSession, getStudentInSchool } from './storage.js';
import { hashPassword, updatePassword } from './auth-core.js';

// --- School Code Generator ---
export function generateSchoolCode(schoolName) {
    const prefix = schoolName
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 3)
        .toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return (prefix + suffix).substring(0, 6).padEnd(6, 'X');
}

// --- Email Validation ---
export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
        return { valid: false, message: 'Enter a valid email address' };
    }
    return { valid: true, message: 'Valid email' };
}

// --- Register School ---
export async function registerSchool({ schoolName, schoolCode, adminName, adminEmail, adminPassword }) {
    if (getSchool(schoolCode)) {
        return { success: false, message: 'School code already exists. Please try again.' };
    }

    const hashedPw = await hashPassword(adminPassword);

    const schoolData = {
        schoolCode,
        schoolName,
        admin: {
            name: adminName,
            email: adminEmail,
            passwordHash: hashedPw,
        },
        classes: [],
        createdAt: new Date().toISOString(),
    };

    saveSchool(schoolCode, schoolData);

    saveSession({
        loggedIn: true,
        role: 'admin',
        schoolCode,
        schoolName,
        adminName,
        adminEmail,
        loginTime: Date.now(),
    });

    return { success: true, message: 'School registered successfully!' };
}

// --- Authenticate Admin ---
export async function authenticateAdmin(schoolCode, email, password) {
    const school = getSchool(schoolCode);
    if (!school) return { success: false, message: 'School code not found' };

    if (!school.admin || school.admin.email !== email) {
        return { success: false, message: 'Admin email not found for this school' };
    }

    if (school.admin.passwordHash === null) {
        return { success: false, message: 'Demo school admin login not configured' };
    }

    const hashedInput = await hashPassword(password);
    if (hashedInput !== school.admin.passwordHash) {
        return { success: false, message: 'Incorrect password' };
    }

    saveSession({
        loggedIn: true,
        role: 'admin',
        schoolCode,
        schoolName: school.schoolName,
        adminName: school.admin.name,
        adminEmail: school.admin.email,
        loginTime: Date.now(),
    });

    return { success: true, message: 'Login successful!' };
}

// ═══════════════════════════════════════════════════
// RESET PASSWORD FLOW
// ═══════════════════════════════════════════════════

const RESET_ATTEMPTS_KEY = 'resetAttempts';
const RESET_LOCKOUT_MS = 10 * 60 * 1000;

function getResetAttempts() {
    try {
        const data = JSON.parse(sessionStorage.getItem(RESET_ATTEMPTS_KEY) || '{}');
        if (data.lockedUntil) {
            if (Date.now() > data.lockedUntil) {
                sessionStorage.removeItem(RESET_ATTEMPTS_KEY);
                return { count: 0, lockedUntil: null };
            }
            return data;
        }
        if (data.timestamp && Date.now() - data.timestamp > 30 * 60 * 1000) {
            sessionStorage.removeItem(RESET_ATTEMPTS_KEY);
            return { count: 0, lockedUntil: null };
        }
        return data;
    } catch {
        return { count: 0, lockedUntil: null };
    }
}

function incrementResetAttempts() {
    const data = getResetAttempts();
    data.count = (data.count || 0) + 1;
    data.timestamp = data.timestamp || Date.now();
    if (data.count >= 5) {
        data.lockedUntil = Date.now() + RESET_LOCKOUT_MS;
    }
    sessionStorage.setItem(RESET_ATTEMPTS_KEY, JSON.stringify(data));
    return data;
}

export function checkResetRateLimit() {
    const data = getResetAttempts();
    if (data.lockedUntil && Date.now() < data.lockedUntil) {
        const remainingMinutes = Math.ceil((data.lockedUntil - Date.now()) / 60000);
        return { allowed: false, message: `Too many attempts. Locked for ${remainingMinutes} minutes.` };
    }
    return { allowed: true };
}

// Step 1: Verify student exists
export function verifyStudentForReset(schoolCode, studentId) {
    const rl = checkResetRateLimit();
    if (!rl.allowed) return { success: false, message: rl.message };

    const student = getStudentInSchool(schoolCode, studentId);
    if (!student) {
        const limitInfo = incrementResetAttempts();
        if (limitInfo.lockedUntil) {
            return { success: false, message: 'Too many attempts. Locked for 10 minutes.' };
        }
        return { success: false, message: 'Student not found in this school' };
    }

    return { success: true, hasDob: !!student.dob, student };
}

// Step 2: Verify DOB
export function verifyDobForReset(schoolCode, studentId, dobInput) {
    const rl = checkResetRateLimit();
    if (!rl.allowed) return { success: false, message: rl.message };

    const student = getStudentInSchool(schoolCode, studentId);
    if (!student) {
        const limitInfo = incrementResetAttempts();
        if (limitInfo.lockedUntil) {
            return { success: false, message: 'Too many attempts. Locked for 10 minutes.' };
        }
        return { success: false, message: 'Student not found' };
    }

    const normalize = (d) => d.replace(/[-/.]/g, '/').trim();
    if (normalize(student.dob) !== normalize(dobInput)) {
        incrementResetAttempts();
        return { success: false, message: 'Date of birth does not match our records' };
    }

    return { success: true };
}

// Step 3: Set new password — uses auth-core.js updatePassword
export async function resetPassword(schoolCode, studentId, newPassword) {
    console.log('resetPassword called for:', studentId);

    const success = await updatePassword(schoolCode, studentId, newPassword);

    if (!success) {
        console.error('resetPassword — updatePassword returned false');
        return { success: false, message: 'Failed to update password' };
    }

    console.log('Password updated successfully for:', studentId);
    return { success: true, message: 'Password updated successfully!' };
}
