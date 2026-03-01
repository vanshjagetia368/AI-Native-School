/* ═══════════════════════════════════════════════════════════════
   AI Native Schools — Academic Strategy Profiler
   ═══════════════════════════════════════════════════════════════
   Classifies students into strategic academic profiles:
   • Fast but careless
   • Slow but accurate
   • Confident but unstable
   • Consistent performer
   • High cognitive, low persistence
   ═══════════════════════════════════════════════════════════════ */

// ─── Helpers ───────────────────────────────────────────────────

function getSortedAttempts(student) {
    if (!student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt)
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

// ─── Profile Definitions ───────────────────────────────────────

const PROFILES = {
    FAST_CARELESS: {
        type: 'Fast but Careless',
        strengths: ['Quick processing speed', 'High cognitive throughput', 'Time-efficient'],
        weaknesses: ['Accuracy gaps under speed', 'Insufficient review before submission', 'Prone to avoidable errors'],
        examRecommendations: ['Allocate last 10% of time for review', 'Read each question twice before answering', 'Use elimination strategy for multiple choice'],
    },
    SLOW_ACCURATE: {
        type: 'Slow but Accurate',
        strengths: ['High accuracy', 'Thorough analysis', 'Low error rate'],
        weaknesses: ['Time management challenges', 'May not complete all questions', 'Perfectionism can slow progress'],
        examRecommendations: ['Practice timed drills to build speed', 'Skip difficult questions and return later', 'Set time checkpoints per section'],
    },
    CONFIDENT_UNSTABLE: {
        type: 'Confident but Unstable',
        strengths: ['Strong self-belief', 'Willingness to attempt challenging problems', 'High engagement'],
        weaknesses: ['Performance varies significantly', 'Overestimation of ability', 'Mood-dependent performance'],
        examRecommendations: ['Develop consistent preparation routines', 'Practice under simulated exam conditions', 'Track performance patterns to identify triggers'],
    },
    CONSISTENT: {
        type: 'Consistent Performer',
        strengths: ['Reliable performance', 'Strong self-regulation', 'Steady growth trajectory'],
        weaknesses: ['May plateau without stretch goals', 'Could miss innovation opportunities', 'Comfort zone tendency'],
        examRecommendations: ['Set progressive difficulty targets', 'Attempt bonus/challenge questions', 'Focus on deepening mastery in weaker areas'],
    },
    HIGH_COG_LOW_PERSIST: {
        type: 'High Cognitive, Low Persistence',
        strengths: ['Strong intellectual capacity', 'Quick understanding of concepts', 'Creative problem-solving'],
        weaknesses: ['Drops off during long tasks', 'Inconsistent follow-through', 'Boredom-prone under routine tasks'],
        examRecommendations: ['Break study into short focused sessions', 'Use variety in study methods', 'Accountability partnerships help completion'],
    },
};

// ═══════════════════════════════════════════════════════════════
// CLASSIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════

function classifyStudent(attempts, student) {
    if (attempts.length === 0) return null;

    const latest = attempts[attempts.length - 1];
    const scores = latest.traitScores;
    if (!scores) return null;

    // ── Derive behavioral signals ──

    // Speed: Average time per question (low time = fast)
    let avgTime = 15; // default
    if (latest.timePerQuestion) {
        const times = Object.values(latest.timePerQuestion).map(Number).filter(t => t > 0);
        if (times.length > 0) {
            avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        }
    }
    const isFast = avgTime < 10;
    const isSlow = avgTime > 20;

    // Accuracy: Completion rate and response quality
    let completionRate = 1;
    if (latest.responses) {
        completionRate = Object.keys(latest.responses).length / 30;
    }
    const isAccurate = completionRate >= 0.90;
    const isCareless = completionRate < 0.80 || (latest.skippedQuestions || 0) > 5;

    // Confidence calibration
    let calibrationGap = 20;
    if (latest.confidenceScore != null && latest.responses) {
        const vals = Object.values(latest.responses).map(Number).filter(v => !isNaN(v));
        if (vals.length > 0) {
            const actualAcc = ((vals.reduce((a, b) => a + b, 0) / vals.length) - 1) / 4 * 100;
            calibrationGap = Math.abs(latest.confidenceScore - actualAcc);
        }
    }
    const isOverConfident = calibrationGap > 25 && (latest.confidenceScore || 0) > 60;

    // Stability: Variance across attempts
    let isUnstable = false;
    if (attempts.length >= 2) {
        const cScores = attempts.map(a => a.traitScores && a.traitScores.C).filter(v => v != null);
        if (cScores.length >= 2) {
            const mean = cScores.reduce((a, b) => a + b, 0) / cScores.length;
            const variance = cScores.reduce((s, v) => s + (v - mean) ** 2, 0) / cScores.length;
            isUnstable = variance > 150;
        }
    }

    // Cognitive capacity vs persistence
    const highCognitive = (scores.O || 0) >= 60;
    const lowPersistence = (scores.C || 0) < 45;

    // Consistency check
    const isConsistent = !isUnstable && isAccurate && !isCareless && !isFast;

    // ── Classification Logic ──

    if (isFast && (isCareless || !isAccurate)) {
        return PROFILES.FAST_CARELESS;
    }
    if (isSlow && isAccurate) {
        return PROFILES.SLOW_ACCURATE;
    }
    if (isOverConfident && isUnstable) {
        return PROFILES.CONFIDENT_UNSTABLE;
    }
    if (highCognitive && lowPersistence) {
        return PROFILES.HIGH_COG_LOW_PERSIST;
    }
    if (isConsistent) {
        return PROFILES.CONSISTENT;
    }

    // Default to consistent if no strong signals
    return PROFILES.CONSISTENT;
}

// ═══════════════════════════════════════════════════════════════
// MAIN: classifyStrategyProfile(student)
// ═══════════════════════════════════════════════════════════════

/**
 * Classify a student's academic strategy profile.
 * @param {object} student - Student object from storage
 * @returns {object|null} Strategy profile or null
 */
function classifyStrategyProfile(student) {
    if (!student) return null;

    const attempts = getSortedAttempts(student);
    if (attempts.length === 0) return null;

    const profile = classifyStudent(attempts, student);
    if (!profile) return null;

    // ── Safely extend student object ──
    student.strategyProfile = {
        type: profile.type,
        strengths: [...profile.strengths],
        weaknesses: [...profile.weaknesses],
        examRecommendations: [...profile.examRecommendations],
    };

    return student.strategyProfile;
}

// ─── Global Exports ────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.classifyStrategyProfile = classifyStrategyProfile;
}
