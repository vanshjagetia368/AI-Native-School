/* ═══════════════════════════════════════════════════════════════
   AI Native Schools — Resilience Index Engine
   ═══════════════════════════════════════════════════════════════
   Measures psychological resilience — distinct from risk.
   
   Components:
   • Recovery Speed — how quickly scores bounce back after dips
   • Emotional Stabilization — variance reduction over time
   • Confidence Recalibration — self-assessment accuracy improvement
   • Performance Bounce-Back — score recovery after poor attempts
   ═══════════════════════════════════════════════════════════════ */

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

function stdDev(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT 1: Recovery Speed (0–100)
// ═══════════════════════════════════════════════════════════════
// Measures how quickly trait scores recover after a dip.
// Fast recovery = high resilience.

function computeRecoverySpeed(attempts) {
    if (attempts.length < 3) return 50;

    // Track conscientiousness as primary resilience indicator
    const cScores = attempts
        .map(a => a.traitScores && a.traitScores.C)
        .filter(v => v != null);

    if (cScores.length < 3) return 50;

    let recoveries = 0, dips = 0;
    for (let i = 1; i < cScores.length; i++) {
        if (cScores[i] < cScores[i - 1] - 5) {
            dips++;
            // Check if recovery happens quickly (within 1-2 attempts)
            if (i + 1 < cScores.length && cScores[i + 1] > cScores[i]) {
                recoveries++;
            }
        }
    }

    if (dips === 0) return 70; // never dipped = good but untested
    return clamp((recoveries / dips) * 100);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT 2: Emotional Stabilization (0–100)
// ═══════════════════════════════════════════════════════════════
// Measures decreasing emotional variance over time.
// Lower variance in later attempts = better stabilization.

function computeEmotionalStabilization(attempts) {
    if (attempts.length < 3) return 50;

    const nScores = attempts
        .map(a => a.traitScores && a.traitScores.N)
        .filter(v => v != null);

    if (nScores.length < 3) return 50;

    // Compare variance of first half vs second half
    const mid = Math.floor(nScores.length / 2);
    const firstHalf = nScores.slice(0, mid);
    const secondHalf = nScores.slice(mid);

    const sdFirst = stdDev(firstHalf);
    const sdSecond = stdDev(secondHalf);

    // Also factor in whether neuroticism is trending down
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trendBonus = avgFirst > avgSecond ? 10 : 0;

    // Decreasing variance = good
    if (sdFirst === 0) return 60 + trendBonus;
    const varianceReduction = ((sdFirst - sdSecond) / sdFirst) * 100;
    return clamp(50 + varianceReduction * 0.5 + trendBonus);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT 3: Confidence Recalibration (0–100)
// ═══════════════════════════════════════════════════════════════
// Measures improvement in self-assessment accuracy over time.

function computeConfidenceRecalibration(attempts) {
    if (attempts.length < 2) return 50;

    const gaps = attempts
        .filter(a => a.confidenceScore != null && a.responses)
        .map(a => {
            const vals = Object.values(a.responses).map(Number).filter(v => !isNaN(v));
            if (vals.length === 0) return null;
            const actualAcc = ((vals.reduce((s, v) => s + v, 0) / vals.length) - 1) / 4 * 100;
            return Math.abs(a.confidenceScore - actualAcc);
        })
        .filter(v => v != null);

    if (gaps.length < 2) return 50;

    // Is the gap shrinking over time?
    const firstGap = gaps[0];
    const lastGap = gaps[gaps.length - 1];

    if (firstGap === 0) return 80; // always accurate
    const improvement = ((firstGap - lastGap) / firstGap) * 100;
    return clamp(50 + improvement * 0.5);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT 4: Performance Bounce-Back (0–100)
// ═══════════════════════════════════════════════════════════════
// Measures ability to recover academic stability after poor attempts.

function computeBounceback(attempts) {
    if (attempts.length < 3) return 50;

    const stability = attempts
        .map(a => {
            if (a.computedInsights && a.computedInsights.predictiveIndices) {
                return a.computedInsights.predictiveIndices.academicStability;
            }
            return null;
        })
        .filter(v => v != null);

    if (stability.length < 3) return 50;

    let bounces = 0, drops = 0;
    for (let i = 1; i < stability.length - 1; i++) {
        if (stability[i] < stability[i - 1] - 5) {
            drops++;
            if (stability[i + 1] > stability[i] + 3) {
                bounces++;
            }
        }
    }

    if (drops === 0) return 65; // no drops = untested
    return clamp((bounces / drops) * 100);
}

// ═══════════════════════════════════════════════════════════════
// MAIN: computeResilienceIndex(student)
// ═══════════════════════════════════════════════════════════════

/**
 * Compute the Resilience Index for a student.
 * @param {object} student - Student object from storage
 * @returns {object|null} Resilience result or null
 */
function computeResilienceIndex(student) {
    if (!student) return null;

    const attempts = getSortedAttempts(student);
    if (attempts.length === 0) return null;

    const recoverySpeed = computeRecoverySpeed(attempts);
    const emotionalStabilization = computeEmotionalStabilization(attempts);
    const confidenceRecalibration = computeConfidenceRecalibration(attempts);
    const bounceback = computeBounceback(attempts);

    const score = clamp(
        recoverySpeed * 0.30 +
        emotionalStabilization * 0.25 +
        confidenceRecalibration * 0.20 +
        bounceback * 0.25
    );

    // Determine trend
    let trend = 'stable';
    if (attempts.length >= 3) {
        const recentScores = attempts.slice(-3).map(a =>
            a.traitScores ? (100 - (a.traitScores.N || 50)) : 50
        );
        const first = recentScores[0];
        const last = recentScores[recentScores.length - 1];
        if (last > first + 5) trend = 'improving';
        else if (last < first - 5) trend = 'declining';
    }

    const result = {
        score,
        recoverySpeed,
        volatilityStability: emotionalStabilization,
        confidenceRecalibration,
        bounceback,
        trend,
        lastUpdated: new Date().toISOString(),
    };

    // ── Safely extend student object ──
    student.resilienceIndex = {
        score,
        recoverySpeed,
        volatilityStability: emotionalStabilization,
        trend,
    };

    return result;
}

// ─── Global Exports ────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.computeResilienceIndex = computeResilienceIndex;
}
