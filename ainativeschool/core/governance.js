/* ═══════════════════════════════════════════════════════════════
   AI Native Schools — Data Governance Layer
   ═══════════════════════════════════════════════════════════════
   Provides data governance features:
   • Encryption simulation
   • Consent flag management
   • Audit logging
   • Role access tracking
   ═══════════════════════════════════════════════════════════════ */

const AUDIT_STORAGE_KEY = 'ai_native_audit_log';
const CONSENT_STORAGE_KEY = 'ai_native_consent_flags';
const MAX_AUDIT_ENTRIES = 500;

// ═══════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════

/**
 * Log an audit event.
 * @param {string} role - User role performing the action
 * @param {string} action - Description of the action
 * @param {object} [metadata] - Optional additional context
 */
function logAuditEvent(role, action, metadata = {}) {
    const log = getAuditLog();

    log.push({
        role: role || 'unknown',
        action: action || 'unspecified',
        timestamp: new Date().toISOString(),
        metadata,
    });

    // Prune to max entries
    if (log.length > MAX_AUDIT_ENTRIES) {
        log.splice(0, log.length - MAX_AUDIT_ENTRIES);
    }

    try {
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    } catch (e) {
        console.warn('Audit log save failed:', e);
    }
}

/**
 * Retrieve the full audit log.
 * @returns {object[]} Array of audit entries
 */
function getAuditLog() {
    try {
        const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Get filtered audit log entries.
 * @param {object} filters - { role, action, since }
 * @returns {object[]} Filtered audit entries
 */
function getFilteredAuditLog(filters = {}) {
    let log = getAuditLog();

    if (filters.role) {
        log = log.filter(e => e.role === filters.role);
    }
    if (filters.action) {
        log = log.filter(e => e.action.toLowerCase().includes(filters.action.toLowerCase()));
    }
    if (filters.since) {
        const sinceDate = new Date(filters.since);
        log = log.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    return log;
}

/**
 * Clear the audit log (admin only action).
 */
function clearAuditLog() {
    try {
        localStorage.removeItem(AUDIT_STORAGE_KEY);
    } catch (e) {
        console.warn('Audit log clear failed:', e);
    }
}

// ═══════════════════════════════════════════════════════════════
// CONSENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Get consent status for a student.
 * @param {string} studentId
 * @returns {object} Consent record
 */
function getConsent(studentId) {
    const consents = getAllConsents();
    return consents[studentId] || {
        dataProcessing: false,
        psychometricAssessment: false,
        parentNotification: false,
        lastUpdated: null,
    };
}

/**
 * Update consent flags for a student.
 * @param {string} studentId
 * @param {object} flags - Consent flags to set
 */
function updateConsent(studentId, flags = {}) {
    const consents = getAllConsents();

    if (!consents[studentId]) {
        consents[studentId] = {
            dataProcessing: false,
            psychometricAssessment: false,
            parentNotification: false,
            lastUpdated: null,
        };
    }

    Object.assign(consents[studentId], flags, {
        lastUpdated: new Date().toISOString(),
    });

    try {
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consents));
    } catch (e) {
        console.warn('Consent save failed:', e);
    }

    logAuditEvent('system', `Consent updated for student ${studentId}`, flags);
}

/**
 * Check if a student has a specific consent.
 * @param {string} studentId
 * @param {string} consentType - e.g. 'dataProcessing'
 * @returns {boolean}
 */
function checkConsent(studentId, consentType) {
    const consent = getConsent(studentId);
    return !!consent[consentType];
}

function getAllConsents() {
    try {
        const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

// ═══════════════════════════════════════════════════════════════
// ENCRYPTION SIMULATION
// ═══════════════════════════════════════════════════════════════
// Note: This is a simulation layer for MVP. In production,
// actual encryption would use AES-256-GCM via Web Crypto API.

/**
 * Simulate data encryption (base64 encoding for demo).
 * @param {*} data - Data to "encrypt"
 * @returns {string} "Encrypted" string
 */
function simulateEncryption(data) {
    try {
        const json = JSON.stringify(data);
        return btoa(unescape(encodeURIComponent(json)));
    } catch (e) {
        console.warn('Encryption simulation failed:', e);
        return '';
    }
}

/**
 * Simulate data decryption.
 * @param {string} encrypted - "Encrypted" string
 * @returns {*} Decrypted data
 */
function simulateDecryption(encrypted) {
    try {
        return JSON.parse(decodeURIComponent(escape(atob(encrypted))));
    } catch (e) {
        console.warn('Decryption simulation failed:', e);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// ROLE ACCESS TRACKING
// ═══════════════════════════════════════════════════════════════

/**
 * Track a page access by role.
 * @param {string} role
 * @param {string} page
 */
function trackAccess(role, page) {
    logAuditEvent(role, `Accessed: ${page}`, { page });
}

/**
 * Get access summary statistics.
 * @returns {object} Access counts by role and page
 */
function getAccessSummary() {
    const log = getAuditLog();
    const accessEvents = log.filter(e => e.action.startsWith('Accessed:'));

    const byRole = {};
    const byPage = {};

    for (const event of accessEvents) {
        // By role
        if (!byRole[event.role]) byRole[event.role] = 0;
        byRole[event.role]++;

        // By page
        const page = event.metadata && event.metadata.page;
        if (page) {
            if (!byPage[page]) byPage[page] = 0;
            byPage[page]++;
        }
    }

    return { byRole, byPage, totalEvents: accessEvents.length };
}

// ═══════════════════════════════════════════════════════════════
// GOVERNANCE REPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a governance compliance summary.
 * @param {string} schoolCode
 * @returns {object} Compliance report
 */
function generateGovernanceReport(schoolCode) {
    const log = getAuditLog();
    const consents = getAllConsents();
    const accessSummary = getAccessSummary();

    const totalStudents = Object.keys(consents).length;
    const consentedStudents = Object.values(consents).filter(c => c.dataProcessing).length;

    return {
        schoolCode,
        generatedAt: new Date().toISOString(),
        auditLog: {
            totalEntries: log.length,
            recentEntries: log.slice(-10),
        },
        consent: {
            totalStudents,
            consentedStudents,
            consentRate: totalStudents > 0 ? Math.round((consentedStudents / totalStudents) * 100) : 0,
        },
        access: accessSummary,
        encryption: {
            status: 'simulated',
            algorithm: 'Base64 (MVP) → AES-256-GCM (Production)',
        },
    };
}

// ─── Global Exports ────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.logAuditEvent = logAuditEvent;
    window.getAuditLog = getAuditLog;
    window.getFilteredAuditLog = getFilteredAuditLog;
    window.clearAuditLog = clearAuditLog;
    window.getConsent = getConsent;
    window.updateConsent = updateConsent;
    window.checkConsent = checkConsent;
    window.simulateEncryption = simulateEncryption;
    window.simulateDecryption = simulateDecryption;
    window.trackAccess = trackAccess;
    window.getAccessSummary = getAccessSummary;
    window.generateGovernanceReport = generateGovernanceReport;
}
