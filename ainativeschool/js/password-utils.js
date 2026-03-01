// js/password-utils.js

/**
 * Hashes a plain text password using SHA-256 (Web Crypto API).
 * @param {string} password - The plain text password
 * @returns {Promise<string>} The hex string representation of the hash hash
 */
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Compares a plain text password to a stored hash.
 * @param {string} plain - The plain text password
 * @param {string} hash - The stored SHA-256 hash
 * @returns {Promise<boolean>} True if they match
 */
export async function verifyPassword(plain, hash) {
    const plainHash = await hashPassword(plain);
    return plainHash === hash;
}

/**
 * Evaluates the strength of a password and returns a score and requirements met.
 * @param {string} password
 * @returns {Object} { score: 0-4, requirements: { length, upper, lower, number, special }, label, color }
 */
export function validatePasswordStrength(password) {
    const reqs = {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };

    let score = 0;
    if (reqs.length) score++;
    if (reqs.upper || reqs.lower) score++; // Has some casing
    if (reqs.upper && reqs.lower) score++; // Has both casings
    if (reqs.number) score++;
    if (reqs.special) score++;

    let label = 'Weak';
    let color = 'rgba(232, 92, 122, 1)'; // Red

    if (score >= 4 && reqs.length) {
        label = 'Strong';
        color = 'var(--C)'; // Green
    } else if (score >= 2 && reqs.length) {
        label = 'Medium';
        color = 'var(--O)'; // Orange
    }

    return {
        score,
        requirements: reqs,
        label,
        color,
        isValid: (reqs.length && reqs.upper && reqs.lower && reqs.number && reqs.special)
    };
}
