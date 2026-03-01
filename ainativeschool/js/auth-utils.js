/* ============================================
   AI Native Schools — Student Login Auth
   Uses auth-core.js as single source of truth.
   ============================================ */

import { getSchools, getSchool, saveSchool } from './storage.js';
import { hashPassword, verifyPassword } from './auth-core.js';

// ─── Rate Limiting ───────────────────────────────────────
// Per-student lockout is stored ON the student object itself
// (loginAttempts, lockUntil) so it persists across sessions.

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Authenticate a student. Single, canonical function.
 *
 * Flow:
 * 1. Find school → find student
 * 2. Check lockout (lockUntil on student object)
 * 3. Compare password (hash compare, with legacy plain fallback)
 * 4. On fail: increment loginAttempts, possibly set lockUntil
 * 5. On success: reset loginAttempts, create session
 *
 * NEVER reveals if ID or password was wrong → generic message.
 */
export async function authenticateStudent(schoolCode, studentId, password) {
    const schools = getSchools();
    const school = schools[schoolCode];

    if (!school) {
        return { success: false, message: 'Invalid credentials.' };
    }

    // Find student across classes
    let foundStudent = null;
    let foundClass = null;
    let foundClassObj = null;
    let foundIdx = -1;

    if (school.classes) {
        for (const cls of school.classes) {
            const idx = (cls.students || []).findIndex(st => st.studentId === studentId);
            if (idx !== -1) {
                foundStudent = cls.students[idx];
                foundClass = cls.className;
                foundClassObj = cls;
                foundIdx = idx;
                break;
            }
        }
    }

    if (!foundStudent) {
        return { success: false, message: 'Invalid credentials.' };
    }

    // ── Lockout Check ────────────────────────────────────
    if (foundStudent.lockUntil && Date.now() < foundStudent.lockUntil) {
        const remainMin = Math.ceil((foundStudent.lockUntil - Date.now()) / 60000);
        return {
            success: false,
            message: `Account temporarily locked. Try again in ${remainMin} minute${remainMin !== 1 ? 's' : ''}.`
        };
    }

    // ── Password Verification ────────────────────────────
    let isValid = false;

    if (foundStudent.passwordHash) {
        // Normal path: compare against stored hash
        isValid = await verifyPassword(password, foundStudent.passwordHash);
    } else if (foundStudent.password) {
        // Legacy fallback: plain text password from initial seed/import
        isValid = (foundStudent.password === password);
    } else {
        // No password at all — student must set up. Allow through as "first login".
        // This handles the case where passwordHash is null and there's no legacy password.
        isValid = false;
    }

    // ── Failed Attempt ───────────────────────────────────
    if (!isValid) {
        foundStudent.loginAttempts = (foundStudent.loginAttempts || 0) + 1;

        if (foundStudent.loginAttempts >= MAX_ATTEMPTS) {
            foundStudent.lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        }

        // Persist the updated attempt count
        foundClassObj.students[foundIdx] = foundStudent;
        saveSchool(schoolCode, school);

        return { success: false, message: 'Invalid credentials.' };
    }

    // ── Success ──────────────────────────────────────────
    foundStudent.loginAttempts = 0;
    foundStudent.lockUntil = null;
    foundClassObj.students[foundIdx] = foundStudent;
    saveSchool(schoolCode, school);

    // Create session
    const sessionData = {
        loggedIn: true,
        role: 'student',
        studentId: foundStudent.studentId,
        name: foundStudent.name,
        className: foundClass,
        schoolCode,
        schoolName: school.schoolName,
        isFirstLogin: foundStudent.isFirstLogin === true,
        loginTime: Date.now()
    };
    localStorage.setItem('currentSession', JSON.stringify(sessionData));

    return {
        success: true,
        student: foundStudent,
        message: 'Login successful.'
    };
}
