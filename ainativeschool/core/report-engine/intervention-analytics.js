/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Intervention Effectiveness Analytics
   ═══════════════════════════════════════════════════════════════
   Computes intervention response deltas, behavioral correction
   rates, engagement-to-improvement ratios, and sustained
   improvement half-life.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute intervention effectiveness analytics for a student snapshot.
 * @param {object} snapshot - Deep-cloned student data
 * @returns {object|null} Intervention analytics model
 */
function computeReportInterventionAnalytics(snapshot) {
    const attempts = getSortedAttempts(snapshot);
    if (attempts.length < 2) return null;

    // ── Risk snapshots per attempt ──
    const riskSnapshots = [];
    for (const att of attempts) {
        const pi = att.computedInsights?.predictiveIndices;
        if (pi) {
            riskSnapshots.push({
                date: att.completedAt || att.startedAt,
                burnoutRisk: pi.burnoutRisk ?? 50,
                stressVulnerability: pi.stressVulnerability ?? 50,
                emotionalVolatility: pi.emotionalVolatility ?? 50,
                academicStability: pi.academicStability ?? 50,
            });
        }
    }
    if (riskSnapshots.length < 2) return null;

    // ── Intervention Response Delta per cycle ──
    const cycles = [];
    for (let i = 1; i < riskSnapshots.length; i++) {
        const pre = riskSnapshots[i - 1];
        const post = riskSnapshots[i];
        const burnoutDelta = pre.burnoutRisk - post.burnoutRisk;
        const stressDelta = pre.stressVulnerability - post.stressVulnerability;
        const stabilityDelta = post.academicStability - pre.academicStability;
        const avgImprovement = (burnoutDelta + stressDelta + stabilityDelta) / 3;

        cycles.push({
            cycle: i,
            preDate: pre.date,
            postDate: post.date,
            burnoutDelta: round2(burnoutDelta),
            stressDelta: round2(stressDelta),
            stabilityDelta: round2(stabilityDelta),
            avgImprovement: round2(avgImprovement),
            success: avgImprovement > 0,
        });
    }

    // ── Behavioral Correction Rate ──
    const successfulCycles = cycles.filter(c => c.success).length;
    const correctionRate = clamp((successfulCycles / cycles.length) * 100);

    // ── Engagement-to-Improvement Ratio ──
    let totalAnswered = 0, totalQuestions = 0;
    for (const att of attempts) {
        totalAnswered += Object.keys(att.responses || {}).length;
        totalQuestions += 30;
    }
    const engagementRate = clamp((totalAnswered / totalQuestions) * 100);
    const avgImprovement = cycles.length > 0
        ? round2(cycles.reduce((s, c) => s + c.avgImprovement, 0) / cycles.length)
        : 0;
    const engagementToImprovement = engagementRate > 0
        ? round2(avgImprovement / (engagementRate / 100))
        : 0;

    // ── Sustained Improvement Half-Life ──
    const halfLife = computeImprovementHalfLife(cycles);

    // ── Intervention type effectiveness ──
    const typeEffectiveness = computeTypeEffectiveness(snapshot, avgImprovement);

    // ── Pre vs Post aggregated comparison ──
    const prePostComparison = {
        burnoutRisk: {
            pre: round2(riskSnapshots[0].burnoutRisk),
            post: round2(riskSnapshots[riskSnapshots.length - 1].burnoutRisk),
            delta: round2(riskSnapshots[0].burnoutRisk - riskSnapshots[riskSnapshots.length - 1].burnoutRisk),
        },
        stressVulnerability: {
            pre: round2(riskSnapshots[0].stressVulnerability),
            post: round2(riskSnapshots[riskSnapshots.length - 1].stressVulnerability),
            delta: round2(riskSnapshots[0].stressVulnerability - riskSnapshots[riskSnapshots.length - 1].stressVulnerability),
        },
        academicStability: {
            pre: round2(riskSnapshots[0].academicStability),
            post: round2(riskSnapshots[riskSnapshots.length - 1].academicStability),
            delta: round2(riskSnapshots[riskSnapshots.length - 1].academicStability - riskSnapshots[0].academicStability),
        },
    };

    return {
        totalCycles: cycles.length,
        cycles,
        correctionRate,
        engagementRate,
        avgImprovement,
        engagementToImprovement,
        halfLife,
        typeEffectiveness,
        prePostComparison,
        successProbability: clamp(correctionRate * 0.7 + engagementRate * 0.3),
    };
}

function computeImprovementHalfLife(cycles) {
    // How many cycles until improvement effect halves
    if (cycles.length < 2) return { cycles: null, label: 'Insufficient data' };
    const positives = cycles.filter(c => c.avgImprovement > 0);
    if (positives.length === 0) return { cycles: null, label: 'No improvement detected' };

    // Find how quickly improvements diminish
    const improvements = positives.map(c => c.avgImprovement);
    const peak = Math.max(...improvements);
    const halfPeak = peak / 2;
    let halfLifeCycles = improvements.length;
    for (let i = 0; i < improvements.length; i++) {
        if (improvements[i] < halfPeak) {
            halfLifeCycles = i + 1;
            break;
        }
    }
    return {
        cycles: halfLifeCycles,
        peakImprovement: round2(peak),
        label: halfLifeCycles <= 2 ? 'Short-lived' : halfLifeCycles <= 4 ? 'Moderate' : 'Sustained',
    };
}

function computeTypeEffectiveness(snapshot, overallAvg) {
    if (!snapshot.interventionPlan?.recommendedLoops) return [];
    const types = {};
    for (const loop of snapshot.interventionPlan.recommendedLoops) {
        if (!types[loop.type]) types[loop.type] = { count: 0, totalImprovement: 0 };
        types[loop.type].count++;
        types[loop.type].totalImprovement += overallAvg;
    }
    return Object.entries(types).map(([type, data]) => ({
        type,
        count: data.count,
        avgImprovement: round2(data.totalImprovement / data.count),
    })).sort((a, b) => b.avgImprovement - a.avgImprovement);
}

// ── Helpers ──
function clamp(val) { return Math.max(0, Math.min(100, Math.round(val))); }
function round2(val) { return Math.round(val * 100) / 100; }

function getSortedAttempts(student) {
    if (!student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt)
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

// ── Export ──
if (typeof window !== 'undefined') {
    window.computeReportInterventionAnalytics = computeReportInterventionAnalytics;
}
