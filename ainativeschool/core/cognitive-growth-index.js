/* ═══════════════════════════════════════════════════════════════
   AI Native Schools — Cognitive Growth Index (CGI) Engine
   ═══════════════════════════════════════════════════════════════
   Computes a composite Cognitive Growth Index measuring
   longitudinal cognitive evolution across four dimensions:
   
   • Psychometric Stability Score   (PSS) — 25%
   • Academic Improvement Delta     (AID) — 25%
   • Behavioral Risk Reduction      (BRR) — 25%
   • Intervention Responsiveness    (IRS) — 25%
   
   Each normalized to 0–100. Composite = weighted average.
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

// ═══════════════════════════════════════════════════════════════
// COMPONENT 1: Psychometric Stability Score (PSS)
// ═══════════════════════════════════════════════════════════════
// Measures consistency of OCEAN trait scores across attempts.
// Low variance = high stability = high PSS.

function computePSS(attempts) {
    if (attempts.length < 2) return 50; // neutral baseline

    const traits = ['O', 'C', 'E', 'A', 'N'];
    const traitVariances = [];

    for (const trait of traits) {
        const scores = attempts
            .map(a => a.traitScores && a.traitScores[trait])
            .filter(v => v != null);

        if (scores.length < 2) continue;

        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, v) => sum + (v - mean) ** 2, 0) / scores.length;
        // Normalize: variance of 0 = perfect stability (100), variance of 400+ = 0
        traitVariances.push(clamp(100 * (1 - Math.min(variance / 400, 1))));
    }

    if (traitVariances.length === 0) return 50;
    return clamp(traitVariances.reduce((a, b) => a + b, 0) / traitVariances.length);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT 2: Academic Improvement Delta (AID)
// ═══════════════════════════════════════════════════════════════
// Measures improvement trend in academic stability index across
// psychometric attempts. Rising stability = positive delta.

function computeAID(attempts) {
    if (attempts.length < 2) return 50;

    const stabilityScores = attempts
        .map(a => {
            if (a.computedInsights && a.computedInsights.predictiveIndices) {
                return a.computedInsights.predictiveIndices.academicStability;
            }
            return null;
        })
        .filter(v => v != null);

    if (stabilityScores.length < 2) return 50;

    // Calculate trend: average improvement per step
    let totalDelta = 0;
    for (let i = 1; i < stabilityScores.length; i++) {
        totalDelta += stabilityScores[i] - stabilityScores[i - 1];
    }
    const avgDelta = totalDelta / (stabilityScores.length - 1);

    // Map: -30 delta → 0, 0 delta → 50, +30 delta → 100
    return clamp(50 + (avgDelta / 30) * 50);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT 3: Behavioral Risk Reduction Delta (BRR)
// ═══════════════════════════════════════════════════════════════
// Higher score if behavioral risk is decreasing over time.
// Uses risk scores from multiple assessment cycles.

function computeBRR(student) {
    const attempts = getSortedAttempts(student);
    if (attempts.length < 2) return 50;

    // Compute risk scores across attempts using response patterns
    const riskScores = [];
    for (let i = 1; i < attempts.length; i++) {
        const recent = attempts.slice(Math.max(0, i - 2), i + 1);
        // Simple accuracy-based risk proxy from responses
        let totalAcc = 0, count = 0;
        for (const att of recent) {
            if (!att.responses) continue;
            const vals = Object.values(att.responses).map(Number).filter(v => !isNaN(v));
            if (vals.length > 0) {
                totalAcc += ((vals.reduce((a, b) => a + b, 0) / vals.length) - 1) / 4 * 100;
                count++;
            }
        }
        if (count > 0) riskScores.push(totalAcc / count);
    }

    if (riskScores.length < 2) {
        // Fall back to stored behavioral risk
        if (student.behavioralRisk && student.behavioralRisk.score != null) {
            return clamp(student.behavioralRisk.score);
        }
        return 50;
    }

    // Improvement = later scores higher than earlier (risk reducing)
    let totalImprovement = 0;
    for (let i = 1; i < riskScores.length; i++) {
        totalImprovement += riskScores[i] - riskScores[i - 1];
    }
    const avgImprovement = totalImprovement / (riskScores.length - 1);

    return clamp(50 + (avgImprovement / 20) * 50);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT 4: Intervention Responsiveness Score (IRS)
// ═══════════════════════════════════════════════════════════════
// Measures how well the student responds to interventions.
// Uses pre/post intervention risk deltas if available.

function computeIRS(student) {
    // If intervention analytics already computed, use success rate
    if (student.interventionAnalytics && student.interventionAnalytics.successRate != null) {
        return clamp(student.interventionAnalytics.successRate);
    }

    // Otherwise estimate from attempt trends and intervention plan
    const attempts = getSortedAttempts(student);
    if (attempts.length < 2) return 50;

    // Check if interventions were recommended and scores improved
    if (student.interventionPlan && student.interventionPlan.recommendedLoops) {
        const hasInterventions = student.interventionPlan.recommendedLoops.length > 0;
        if (!hasInterventions) return 65; // No interventions needed = good sign

        // Measure improvement in last vs first attempt
        const first = attempts[0];
        const last = attempts[attempts.length - 1];

        if (first.traitScores && last.traitScores) {
            const firstC = first.traitScores.C || 50;
            const lastC = last.traitScores.C || 50;
            const improvement = lastC - firstC;
            return clamp(50 + improvement);
        }
    }

    return 50;
}

// ═══════════════════════════════════════════════════════════════
// MAIN: computeCognitiveGrowthIndex(student)
// ═══════════════════════════════════════════════════════════════

/**
 * Compute the Cognitive Growth Index for a student.
 * Safely extends the student object with longitudinal data.
 * @param {object} student - Student object from storage
 * @returns {object|null} CGI result or null if insufficient data
 */
function computeCognitiveGrowthIndex(student) {
    if (!student) return null;

    const attempts = getSortedAttempts(student);
    if (attempts.length === 0) return null;

    const pss = computePSS(attempts);
    const aid = computeAID(attempts);
    const brr = computeBRR(student);
    const irs = computeIRS(student);

    const cgi = clamp((pss * 0.25) + (aid * 0.25) + (brr * 0.25) + (irs * 0.25));

    const currentYear = new Date().getFullYear();
    const result = {
        score: cgi,
        components: { pss, aid, brr, irs },
        lastUpdated: new Date().toISOString(),
    };

    // ── Safely extend student.longitudinal ──
    if (!student.longitudinal) {
        student.longitudinal = {
            yearlyIndex: [],
            delta: 0,
            lastUpdated: null,
        };
    }

    // Update or add current year entry
    const yearEntry = student.longitudinal.yearlyIndex.find(e => e.year === currentYear);
    if (yearEntry) {
        yearEntry.score = cgi;
    } else {
        student.longitudinal.yearlyIndex.push({ year: currentYear, score: cgi });
    }

    // Sort by year
    student.longitudinal.yearlyIndex.sort((a, b) => a.year - b.year);

    // Compute delta (last 2 entries)
    const entries = student.longitudinal.yearlyIndex;
    if (entries.length >= 2) {
        student.longitudinal.delta = entries[entries.length - 1].score - entries[entries.length - 2].score;
    } else {
        student.longitudinal.delta = 0;
    }

    student.longitudinal.lastUpdated = result.lastUpdated;

    return result;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS (for module use) & GLOBAL (for inline script use)
// ═══════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
    window.computeCognitiveGrowthIndex = computeCognitiveGrowthIndex;
}
