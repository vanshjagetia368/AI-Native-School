/* ============================================
   AI Native Schools — Centralized Auth Core
   Single source of truth for all password ops.
   ============================================ */

import { getSchool, saveSchool } from './storage.js';

// --- Debug Mode ---
window.DEBUG_AUTH = false;

function debugLog(...args) {
    if (window.DEBUG_AUTH) console.log('[AUTH-CORE]', ...args);
}

// ─── SHA-256 Hash (Web Crypto API) ───────────────────────
export async function hashPassword(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Verify password against stored hash ─────────────────
export async function verifyPassword(plainInput, storedHash) {
    const inputHash = await hashPassword(plainInput);
    debugLog('verifyPassword — inputHash:', inputHash);
    debugLog('verifyPassword — storedHash:', storedHash);
    debugLog('verifyPassword — match:', inputHash === storedHash);
    return inputHash === storedHash;
}

// ─── Update password in localStorage ─────────────────────
// Finds the student inside school→classes→students,
// sets passwordHash, removes legacy `password` field,
// resets lockout state, and persists to localStorage.
export async function updatePassword(schoolCode, studentId, newPlainPassword) {
    const school = getSchool(schoolCode);
    if (!school || !school.classes) {
        debugLog('updatePassword — school not found:', schoolCode);
        return false;
    }

    const hashedNew = await hashPassword(newPlainPassword);
    debugLog('updatePassword — new hash for', studentId, ':', hashedNew);

    for (const cls of school.classes) {
        const idx = (cls.students || []).findIndex(s => s.studentId === studentId);
        if (idx !== -1) {
            const student = cls.students[idx];

            debugLog('updatePassword — old passwordHash:', student.passwordHash);
            debugLog('updatePassword — old password:', student.password);

            // Set the canonical hash field
            student.passwordHash = hashedNew;

            // Remove legacy plain-text field permanently
            delete student.password;

            // Reset lockout state
            student.loginAttempts = 0;
            student.lockUntil = null;

            // Mark as no longer first login (if this was a setup)
            student.isFirstLogin = false;

            cls.students[idx] = student;
            saveSchool(schoolCode, school);

            debugLog('updatePassword — SUCCESS, saved for', studentId);
            return true;
        }
    }

    debugLog('updatePassword — student not found:', studentId);
    return false;
}
