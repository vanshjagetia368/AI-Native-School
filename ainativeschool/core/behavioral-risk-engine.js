/* ═══════════════════════════════════════════════════════════════
   AI Native Schools — Behavioral Risk Score Engine
   & Micro-Intervention Recommendation Engine
   ═══════════════════════════════════════════════════════════════
   Pure computation module. No DOM access.
   Reads student.attempts to derive behavioral risk metrics.
   ═══════════════════════════════════════════════════════════════ */

// ─── Constants ─────────────────────────────────────────────────
const MIN_ATTEMPTS_REQUIRED = 2;
const MAX_RECENT_ATTEMPTS = 3;

const RISK_WEIGHTS = {
    accuracy: 0.4,
    timeVariance: 0.2,
    dropOff: 0.2,
    confidenceGap: 0.2,
};

const RISK_THRESHOLDS = {
    HIGH: { max: 40, label: 'High Risk', emoji: '🔴' },
    MODERATE: { max: 70, label: 'Moderate', emoji: '🟡' },
    STABLE: { max: 100, label: 'Stable', emoji: '🟢' },
};

// ─── Helpers ───────────────────────────────────────────────────

/** Clamp a value between 0 and 100 */
function clamp(val) {
    return Math.max(0, Math.min(100, Math.round(val)));
}

/** Standard deviation of an array of numbers */
function stdDev(arr) {
    if (!arr || arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sq = arr.map(v => (v - mean) ** 2);
    return Math.sqrt(sq.reduce((a, b) => a + b, 0) / arr.length);
}

/** Get sorted attempts in chronological order */
function getSortedAttempts(student) {
    if (!student || !student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt) // Only completed attempts
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT 1: ACCURACY WEIGHT (0–100)
// ═══════════════════════════════════════════════════════════════
// Derived from last 3 assessments: average correct response rate
// weighted by question difficulty (question index serves as
// difficulty proxy — later questions are harder).
// High accuracy → high score. Low accuracy → low score.

function computeAccuracyWeight(recentAttempts) {
    if (!recentAttempts.length) return 50; // neutral fallback

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const attempt of recentAttempts) {
        const responses = attempt.responses;
        if (!responses || typeof responses !== 'object') continue;

        const keys = Object.keys(responses).map(Number).sort((a, b) => a - b);
        if (keys.length === 0) continue;

        let attemptScore = 0;
        let attemptWeight = 0;

        for (const qIdx of keys) {
            const val = Number(responses[qIdx]);
            if (isNaN(val)) continue;

            // Difficulty weight: later questions are harder (index-based proxy)
            const difficultyWeight = 1 + (qIdx / keys.length);

            // Treat Likert 4-5 as "strong/correct" answers, normalize to 0–1
            const accuracy = (val - 1) / 4; // maps 1→0, 5→1
            attemptScore += accuracy * difficultyWeight;
            attemptWeight += difficultyWeight;
        }

        if (attemptWeight > 0) {
            totalWeightedScore += (attemptScore / attemptWeight);
            totalWeight += 1;
        }
    }

    if (totalWeight === 0) return 50;
    return clamp((totalWeightedScore / totalWeight) * 100);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT 2: TIME VARIANCE WEIGHT (0–100)
// ═══════════════════════════════════════════════════════════════
// High variance in response times → lower score (erratic pacing)
// Stable timing → higher score

function computeTimeVarianceWeight(recentAttempts) {
    const allTimes = [];

    for (const attempt of recentAttempts) {
        const tpq = attempt.timePerQuestion;
        if (!tpq || typeof tpq !== 'object') continue;
        const times = Object.values(tpq).map(Number).filter(t => t > 0);
        allTimes.push(...times);
    }

    if (allTimes.length < 3) return 50; // Insufficient data

    const sd = stdDev(allTimes);
    const mean = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;

    // Coefficient of variation (CV): sd/mean. CV > 1 is very erratic.
    const cv = mean > 0 ? sd / mean : 0;

    // Map CV to score: CV=0 → 100, CV≥1.5 → 0
    const score = 100 * (1 - Math.min(cv / 1.5, 1));
    return clamp(score);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT 3: DROP-OFF WEIGHT (0–100)
// ═══════════════════════════════════════════════════════════════
// Performance difference between first 25% and last 25% of test.
// Higher drop-off (fatigue) → lower score.

function computeDropOffWeight(recentAttempts) {
    const deltas = [];

    for (const attempt of recentAttempts) {
        const responses = attempt.responses;
        if (!responses || typeof responses !== 'object') continue;

        const keys = Object.keys(responses).map(Number).sort((a, b) => a - b);
        if (keys.length < 4) continue; // Need at least 4 questions

        const q25 = Math.ceil(keys.length * 0.25);

        // First 25% questions
        const firstQuarter = keys.slice(0, q25).map(k => Number(responses[k])).filter(v => !isNaN(v));
        // Last 25% questions
        const lastQuarter = keys.slice(-q25).map(k => Number(responses[k])).filter(v => !isNaN(v));

        if (firstQuarter.length === 0 || lastQuarter.length === 0) continue;

        const firstAvg = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
        const lastAvg = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;

        // Drop-off: how much performance dropped (positive = decline)
        // Scale relative to max Likert range (4)
        const dropOff = (firstAvg - lastAvg) / 4; // -1 to +1
        deltas.push(dropOff);
    }

    if (deltas.length === 0) return 50;

    const avgDropOff = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    // Map: dropOff=0 (no decline) → 100, dropOff=1 (severe decline) → 0
    // Negative values (improvement) get capped at 100
    const score = 100 * (1 - Math.max(0, Math.min(avgDropOff * 2, 1)));
    return clamp(score);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT 4: CONFIDENCE GAP WEIGHT (0–100)
// ═══════════════════════════════════════════════════════════════
// Self-reported confidence vs actual accuracy.
// Higher mismatch → lower score.

function computeConfidenceGapWeight(recentAttempts) {
    const gaps = [];

    for (const attempt of recentAttempts) {
        const confScore = attempt.confidenceScore;
        if (confScore === undefined || confScore === null) continue;

        // Derive actual performance from responses
        const responses = attempt.responses;
        if (!responses || typeof responses !== 'object') continue;

        const vals = Object.values(responses).map(Number).filter(v => !isNaN(v));
        if (vals.length === 0) continue;

        // Actual accuracy mapped to 0–100 (Likert 1-5 → 0-100)
        const actualAccuracy = ((vals.reduce((a, b) => a + b, 0) / vals.length) - 1) / 4 * 100;

        // Confidence is already 0–100
        const gap = Math.abs(confScore - actualAccuracy);
        gaps.push(gap);
    }

    if (gaps.length === 0) return 50;
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    // Map: gap=0 → 100 (perfect calibration), gap≥60 → 0
    const score = 100 * (1 - Math.min(avgGap / 60, 1));
    return clamp(score);
}

// ═══════════════════════════════════════════════════════════════
// MAIN: computeBehavioralRisk(student)
// ═══════════════════════════════════════════════════════════════

/**
 * Compute composite behavioral risk score for a student.
 * @param {object} student - Student object from storage
 * @returns {object|null} Risk result or null if insufficient data
 */
export function computeBehavioralRisk(student) {
    if (!student) return null;

    const allAttempts = getSortedAttempts(student);

    // Safety: require minimum 2 completed attempts
    if (allAttempts.length < MIN_ATTEMPTS_REQUIRED) {
        return null;
    }

    // Use last N attempts for computation
    const recentAttempts = allAttempts.slice(-MAX_RECENT_ATTEMPTS);

    // Compute individual components
    const accuracy = computeAccuracyWeight(recentAttempts);
    const timeVariance = computeTimeVarianceWeight(recentAttempts);
    const dropOff = computeDropOffWeight(recentAttempts);
    const confidenceGap = computeConfidenceGapWeight(recentAttempts);

    // Composite score (weighted average)
    const compositeScore = clamp(
        (accuracy * RISK_WEIGHTS.accuracy) +
        (timeVariance * RISK_WEIGHTS.timeVariance) +
        (dropOff * RISK_WEIGHTS.dropOff) +
        (confidenceGap * RISK_WEIGHTS.confidenceGap)
    );

    // Classification
    let classification;
    if (compositeScore <= RISK_THRESHOLDS.HIGH.max) {
        classification = RISK_THRESHOLDS.HIGH.label;
    } else if (compositeScore <= RISK_THRESHOLDS.MODERATE.max) {
        classification = RISK_THRESHOLDS.MODERATE.label;
    } else {
        classification = RISK_THRESHOLDS.STABLE.label;
    }

    return {
        score: compositeScore,
        classification,
        components: {
            accuracy,
            timeVariance,
            dropOff,
            confidenceGap,
        },
        lastUpdated: new Date().toISOString(),
    };
}

// ═══════════════════════════════════════════════════════════════
// MICRO-INTERVENTION ENGINE
// ═══════════════════════════════════════════════════════════════

const INTERVENTION_RULES = [
    {
        component: 'accuracy',
        threshold: 50,
        type: 'Concept Reinforcement',
        description: 'Focused 5-question loop targeting weak concept areas to rebuild foundational understanding.',
        difficulty: 'Adaptive',
        durationMinutes: 10,
    },
    {
        component: 'timeVariance',
        threshold: 40,
        type: 'Pacing Stabilization',
        description: 'Structured timing drill with progressive intervals to develop consistent response pacing.',
        difficulty: 'Moderate',
        durationMinutes: 8,
    },
    {
        component: 'dropOff',
        threshold: 40,
        type: 'Attention Endurance',
        description: 'Multi-stage problem sequence designed to build sustained focus and prevent late-test fatigue.',
        difficulty: 'Progressive',
        durationMinutes: 12,
    },
    {
        component: 'confidenceGap',
        threshold: 40,
        type: 'Calibration Training',
        description: 'Confidence prediction quiz where students estimate accuracy before seeing results, improving self-assessment.',
        difficulty: 'Moderate',
        durationMinutes: 7,
    },
];

/**
 * Generate a micro-intervention plan based on the risk result.
 * @param {object} riskResult - Output from computeBehavioralRisk
 * @returns {object|null} Intervention plan or null if no result
 */
export function generateInterventionPlan(riskResult) {
    if (!riskResult || !riskResult.components) return null;

    const recommendedLoops = [];

    for (const rule of INTERVENTION_RULES) {
        const componentScore = riskResult.components[rule.component];
        if (componentScore !== undefined && componentScore < rule.threshold) {
            recommendedLoops.push({
                type: rule.type,
                description: rule.description,
                triggerComponent: rule.component,
                triggerScore: componentScore,
                difficulty: rule.difficulty,
                durationMinutes: rule.durationMinutes,
            });
        }
    }

    return {
        recommendedLoops,
        lastGenerated: new Date().toISOString(),
    };
}

// ═══════════════════════════════════════════════════════════════
// HISTORY HELPER — For trend visualization
// ═══════════════════════════════════════════════════════════════

/**
 * Compute risk score history across all attempts (for trend charts).
 * Returns an array of { attemptNumber, score, components, date }.
 * Starts from the 2nd attempt onward.
 * @param {object} student - Student object from storage
 * @returns {object[]} Array of historical risk snapshots
 */
export function computeRiskHistory(student) {
    if (!student) return [];

    const allAttempts = getSortedAttempts(student);
    if (allAttempts.length < MIN_ATTEMPTS_REQUIRED) return [];

    const history = [];

    // Compute risk at each point where we have >= 2 attempts
    for (let i = 1; i < allAttempts.length; i++) {
        // Create a temporary student-like object with attempts up to index i
        const subset = allAttempts.slice(0, i + 1);
        const recentSubset = subset.slice(-MAX_RECENT_ATTEMPTS);

        const accuracy = computeAccuracyWeight(recentSubset);
        const timeVariance = computeTimeVarianceWeight(recentSubset);
        const dropOff = computeDropOffWeight(recentSubset);
        const confidenceGap = computeConfidenceGapWeight(recentSubset);

        const compositeScore = clamp(
            (accuracy * RISK_WEIGHTS.accuracy) +
            (timeVariance * RISK_WEIGHTS.timeVariance) +
            (dropOff * RISK_WEIGHTS.dropOff) +
            (confidenceGap * RISK_WEIGHTS.confidenceGap)
        );

        history.push({
            attemptNumber: allAttempts[i].attemptNumber || (i + 1),
            score: compositeScore,
            components: { accuracy, timeVariance, dropOff, confidenceGap },
            date: allAttempts[i].completedAt || allAttempts[i].startedAt,
        });
    }

    return history;
}
