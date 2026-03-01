/* ═══════════════════════════════════════════════════════════════
   AI Native Schools — Predictive Dropout Risk Model
   ═══════════════════════════════════════════════════════════════
   Computes dropout probability using a weighted model across:
   • Behavioral risk score
   • Emotional volatility
   • Attendance rate (proxy from assessment engagement)
   • Academic decay
   • Intervention failure rate
   ═══════════════════════════════════════════════════════════════ */

// ─── Configuration ─────────────────────────────────────────────

const DROPOUT_WEIGHTS = {
    behavioralRisk: 0.25,
    emotionalVolatility: 0.20,
    attendanceProxy: 0.20,
    academicDecay: 0.20,
    interventionFailure: 0.15,
};

const DROPOUT_CATEGORIES = {
    LOW: { max: 35, label: 'Low', color: '#4acea0' },
    MEDIUM: { max: 65, label: 'Medium', color: '#e8924a' },
    HIGH: { max: 100, label: 'High', color: '#e85c7a' },
};

// ─── Helpers ───────────────────────────────────────────────────

function clamp(val) {
    return Math.max(0, Math.min(100, Math.round(val)));
}

function getSortedAttempts(student) {
    if (!student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt)
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

// ═══════════════════════════════════════════════════════════════
// INPUT 1: Behavioral Risk Factor
// ═══════════════════════════════════════════════════════════════

function getBehavioralRiskFactor(student) {
    if (student.behavioralRisk && student.behavioralRisk.score != null) {
        // Invert: high behavioral score = stable = LOW dropout risk
        return clamp(100 - student.behavioralRisk.score);
    }
    return 40; // neutral baseline
}

// ═══════════════════════════════════════════════════════════════
// INPUT 2: Emotional Volatility Factor
// ═══════════════════════════════════════════════════════════════

function getEmotionalVolatilityFactor(student) {
    const attempts = getSortedAttempts(student);
    if (attempts.length === 0) return 40;

    const latest = attempts[attempts.length - 1];
    if (latest.computedInsights && latest.computedInsights.predictiveIndices) {
        return clamp(latest.computedInsights.predictiveIndices.emotionalVolatility || 40);
    }

    // Fallback: derive from neuroticism trait
    if (latest.traitScores && latest.traitScores.N != null) {
        return clamp(latest.traitScores.N);
    }

    return 40;
}

// ═══════════════════════════════════════════════════════════════
// INPUT 3: Attendance Proxy (Assessment Engagement)
// ═══════════════════════════════════════════════════════════════
// Uses assessment completion rate and frequency as proxy for
// engagement/attendance since actual attendance isn't tracked.

function getAttendanceProxy(student) {
    const attempts = getSortedAttempts(student);
    if (attempts.length === 0) return 50; // neutral

    // Completion rate
    let totalAnswered = 0, totalQuestions = 0;
    for (const att of attempts) {
        if (att.responses) {
            totalAnswered += Object.keys(att.responses).length;
        }
        totalQuestions += 30;
    }
    const completionRate = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 50;

    // Low completion = high dropout risk
    return clamp(100 - completionRate);
}

// ═══════════════════════════════════════════════════════════════
// INPUT 4: Academic Decay
// ═══════════════════════════════════════════════════════════════
// Measures decline in academic stability across attempts.

function getAcademicDecay(student) {
    const attempts = getSortedAttempts(student);
    if (attempts.length < 2) return 30; // low baseline

    const stabilityScores = attempts
        .map(a => {
            if (a.computedInsights && a.computedInsights.predictiveIndices) {
                return a.computedInsights.predictiveIndices.academicStability;
            }
            return null;
        })
        .filter(v => v != null);

    if (stabilityScores.length < 2) return 30;

    // Calculate decay: negative trend = high risk
    const first = stabilityScores[0];
    const last = stabilityScores[stabilityScores.length - 1];
    const decay = first - last; // positive means declining

    // Map: -20 (improving) → 0, 0 → 30, +30 (declining) → 100
    return clamp(30 + (decay / 30) * 70);
}

// ═══════════════════════════════════════════════════════════════
// INPUT 5: Intervention Failure Rate
// ═══════════════════════════════════════════════════════════════

function getInterventionFailureRate(student) {
    if (student.interventionAnalytics && student.interventionAnalytics.successRate != null) {
        return clamp(100 - student.interventionAnalytics.successRate);
    }

    // If no intervention data, return moderate baseline
    return 35;
}

// ═══════════════════════════════════════════════════════════════
// MAIN: predictDropoutRisk(student)
// ═══════════════════════════════════════════════════════════════

/**
 * Predict dropout risk for a student using weighted factor model.
 * @param {object} student - Student object from storage
 * @returns {object|null} Dropout prediction or null
 */
function predictDropoutRisk(student) {
    if (!student) return null;

    const attempts = getSortedAttempts(student);
    if (attempts.length === 0) return null;

    const factors = {
        behavioralRisk: getBehavioralRiskFactor(student),
        emotionalVolatility: getEmotionalVolatilityFactor(student),
        attendanceProxy: getAttendanceProxy(student),
        academicDecay: getAcademicDecay(student),
        interventionFailure: getInterventionFailureRate(student),
    };

    // Weighted composite
    const probabilityScore = clamp(
        factors.behavioralRisk * DROPOUT_WEIGHTS.behavioralRisk +
        factors.emotionalVolatility * DROPOUT_WEIGHTS.emotionalVolatility +
        factors.attendanceProxy * DROPOUT_WEIGHTS.attendanceProxy +
        factors.academicDecay * DROPOUT_WEIGHTS.academicDecay +
        factors.interventionFailure * DROPOUT_WEIGHTS.interventionFailure
    );

    // Categorize
    let category = 'Low';
    for (const [, cat] of Object.entries(DROPOUT_CATEGORIES)) {
        if (probabilityScore <= cat.max) {
            category = cat.label;
            break;
        }
    }

    // Confidence level based on data availability
    const dataPoints = [
        student.behavioralRisk != null,
        student.interventionAnalytics != null,
        attempts.length >= 2,
        attempts.length >= 3,
        student.longitudinal != null,
    ].filter(Boolean).length;
    const confidenceLevel = clamp(dataPoints * 20);

    const result = {
        probabilityScore,
        category,
        confidenceLevel,
        factors,
        lastUpdated: new Date().toISOString(),
    };

    // ── Safely extend student object ──
    student.dropoutPrediction = {
        probabilityScore,
        category,
        confidenceLevel,
    };

    return result;
}

// ─── Global Exports ────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.predictDropoutRisk = predictDropoutRisk;
}
