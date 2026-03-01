/* ═══════════════════════════════════════════════════════════════
   AI Native Schools — Early Warning Escalation Engine
   ═══════════════════════════════════════════════════════════════
   Triggers structured alerts when student metrics cross danger
   thresholds. Includes cooldown logic to prevent alert spam.
   
   Trigger conditions:
   1. Risk increases > 20% in 14 days
   2. Emotional instability spike > threshold
   3. Drop-off decay exceeds threshold
   4. CGI declines 2 consecutive cycles
   ═══════════════════════════════════════════════════════════════ */

// ─── Configuration ─────────────────────────────────────────────

const ESCALATION_CONFIG = {
    riskIncreaseThreshold: 20,       // % risk increase
    riskTimeWindowDays: 14,          // window for risk increase check
    emotionalSpikeThreshold: 75,     // emotional volatility threshold
    dropOffDecayThreshold: 35,       // drop-off score below this = alert
    cgiDeclineCycles: 2,             // consecutive decline cycles
    cooldownHours: 24,               // minimum hours between same-type alerts
};

const SEVERITY = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
};

// ─── Helpers ───────────────────────────────────────────────────

function getSortedAttempts(student) {
    if (!student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt)
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

function hoursSince(isoTimestamp) {
    return (Date.now() - new Date(isoTimestamp).getTime()) / (1000 * 60 * 60);
}

function isOnCooldown(alerts, type, cooldownHours) {
    if (!alerts || alerts.length === 0) return false;
    const lastOfType = alerts
        .filter(a => a.type === type && !a.resolved)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    if (!lastOfType) return false;
    return hoursSince(lastOfType.timestamp) < cooldownHours;
}

// ═══════════════════════════════════════════════════════════════
// CHECK 1: Rapid Risk Increase
// ═══════════════════════════════════════════════════════════════

function checkRiskIncrease(student, alerts) {
    const attempts = getSortedAttempts(student);
    if (attempts.length < 2) return null;

    const recent = attempts[attempts.length - 1];
    const recentDate = new Date(recent.completedAt);

    // Find an attempt within the time window
    const windowStart = new Date(recentDate.getTime() - ESCALATION_CONFIG.riskTimeWindowDays * 24 * 60 * 60 * 1000);
    const earlier = attempts.filter(a => new Date(a.completedAt) >= windowStart && a !== recent);
    if (earlier.length === 0) return null;

    const earlierAttempt = earlier[0];

    // Compare behavioral risk or predictive indices
    const getVolatility = (att) => {
        if (att.computedInsights && att.computedInsights.predictiveIndices) {
            return att.computedInsights.predictiveIndices.stressVulnerability || 0;
        }
        return 0;
    };

    const oldRisk = getVolatility(earlierAttempt);
    const newRisk = getVolatility(recent);
    const increase = newRisk - oldRisk;

    if (increase > ESCALATION_CONFIG.riskIncreaseThreshold) {
        const type = 'rapid_risk_increase';
        if (isOnCooldown(alerts, type, ESCALATION_CONFIG.cooldownHours)) return null;
        return {
            type,
            severity: increase > 35 ? SEVERITY.CRITICAL : SEVERITY.HIGH,
            message: `Risk score increased by ${Math.round(increase)}% in ${ESCALATION_CONFIG.riskTimeWindowDays} days`,
            timestamp: new Date().toISOString(),
            resolved: false,
            data: { oldRisk, newRisk, increase: Math.round(increase) },
        };
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// CHECK 2: Emotional Instability Spike
// ═══════════════════════════════════════════════════════════════

function checkEmotionalSpike(student, alerts) {
    const attempts = getSortedAttempts(student);
    if (attempts.length === 0) return null;

    const latest = attempts[attempts.length - 1];
    if (!latest.computedInsights || !latest.computedInsights.predictiveIndices) return null;

    const volatility = latest.computedInsights.predictiveIndices.emotionalVolatility;
    if (volatility > ESCALATION_CONFIG.emotionalSpikeThreshold) {
        const type = 'emotional_instability_spike';
        if (isOnCooldown(alerts, type, ESCALATION_CONFIG.cooldownHours)) return null;
        return {
            type,
            severity: volatility > 85 ? SEVERITY.CRITICAL : SEVERITY.HIGH,
            message: `Emotional volatility at ${volatility}% — exceeds safety threshold`,
            timestamp: new Date().toISOString(),
            resolved: false,
            data: { volatility },
        };
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// CHECK 3: Drop-off Decay
// ═══════════════════════════════════════════════════════════════

function checkDropOffDecay(student, alerts) {
    if (!student.behavioralRisk || !student.behavioralRisk.components) return null;

    const dropOff = student.behavioralRisk.components.dropOff;
    if (dropOff < ESCALATION_CONFIG.dropOffDecayThreshold) {
        const type = 'dropoff_decay';
        if (isOnCooldown(alerts, type, ESCALATION_CONFIG.cooldownHours)) return null;
        return {
            type,
            severity: dropOff < 20 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
            message: `Attention drop-off score at ${dropOff}% — significant fatigue pattern detected`,
            timestamp: new Date().toISOString(),
            resolved: false,
            data: { dropOff },
        };
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// CHECK 4: CGI Consecutive Decline
// ═══════════════════════════════════════════════════════════════

function checkCGIDecline(student, alerts) {
    if (!student.longitudinal || !student.longitudinal.yearlyIndex) return null;

    const entries = student.longitudinal.yearlyIndex;
    if (entries.length < ESCALATION_CONFIG.cgiDeclineCycles + 1) return null;

    // Check last N+1 entries for N consecutive declines
    const recent = entries.slice(-(ESCALATION_CONFIG.cgiDeclineCycles + 1));
    let consecutiveDeclines = 0;
    for (let i = 1; i < recent.length; i++) {
        if (recent[i].score < recent[i - 1].score) {
            consecutiveDeclines++;
        } else {
            consecutiveDeclines = 0;
        }
    }

    if (consecutiveDeclines >= ESCALATION_CONFIG.cgiDeclineCycles) {
        const type = 'cgi_consecutive_decline';
        if (isOnCooldown(alerts, type, ESCALATION_CONFIG.cooldownHours)) return null;
        const totalDecline = recent[0].score - recent[recent.length - 1].score;
        return {
            type,
            severity: totalDecline > 15 ? SEVERITY.CRITICAL : SEVERITY.MEDIUM,
            message: `CGI declined for ${consecutiveDeclines} consecutive cycles (−${Math.round(totalDecline)} points)`,
            timestamp: new Date().toISOString(),
            resolved: false,
            data: { consecutiveDeclines, totalDecline: Math.round(totalDecline) },
        };
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// MAIN: evaluateEscalation(student)
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate all escalation checks for a student.
 * Safely extends student.alerts array.
 * @param {object} student - Student object from storage
 * @returns {object[]} Array of newly triggered alerts (may be empty)
 */
function evaluateEscalation(student) {
    if (!student) return [];

    // Initialize alerts array if not present
    if (!student.alerts) {
        student.alerts = [];
    }

    const newAlerts = [];
    const checks = [
        checkRiskIncrease,
        checkEmotionalSpike,
        checkDropOffDecay,
        checkCGIDecline,
    ];

    for (const check of checks) {
        const alert = check(student, student.alerts);
        if (alert) {
            student.alerts.push(alert);
            newAlerts.push(alert);
        }
    }

    // Prune old resolved alerts (keep last 50 max)
    if (student.alerts.length > 50) {
        const resolved = student.alerts.filter(a => a.resolved);
        const unresolved = student.alerts.filter(a => !a.resolved);
        student.alerts = [...unresolved, ...resolved.slice(-20)];
    }

    return newAlerts;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY: resolveAlert
// ═══════════════════════════════════════════════════════════════

function resolveAlert(student, alertIndex) {
    if (student.alerts && student.alerts[alertIndex]) {
        student.alerts[alertIndex].resolved = true;
        student.alerts[alertIndex].resolvedAt = new Date().toISOString();
    }
}

// ─── Global Exports ────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.evaluateEscalation = evaluateEscalation;
    window.resolveAlert = resolveAlert;
}
