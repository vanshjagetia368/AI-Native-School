/* ═══════════════════════════════════════════════════════════════
   AI Native Schools — Intervention Effectiveness Tracker
   ═══════════════════════════════════════════════════════════════
   Tracks and evaluates the effectiveness of micro-interventions
   by comparing pre/post risk metrics, engagement rates, and
   improvement percentages.
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
// MAIN: computeInterventionEffectiveness(student)
// ═══════════════════════════════════════════════════════════════

/**
 * Compute intervention effectiveness metrics.
 * @param {object} student - Student object from storage
 * @returns {object|null} Effectiveness result or null
 */
function computeInterventionEffectiveness(student) {
    if (!student) return null;

    const attempts = getSortedAttempts(student);
    if (attempts.length < 2) return null;

    // ── Compute per-attempt risk snapshots ──
    const riskSnapshots = [];
    for (const att of attempts) {
        if (att.computedInsights && att.computedInsights.predictiveIndices) {
            riskSnapshots.push({
                date: att.completedAt,
                burnoutRisk: att.computedInsights.predictiveIndices.burnoutRisk,
                stressVulnerability: att.computedInsights.predictiveIndices.stressVulnerability,
                emotionalVolatility: att.computedInsights.predictiveIndices.emotionalVolatility,
                academicStability: att.computedInsights.predictiveIndices.academicStability,
            });
        }
    }

    if (riskSnapshots.length < 2) return null;

    // ── Compute deltas between consecutive attempts ──
    const interventionCycles = [];
    for (let i = 1; i < riskSnapshots.length; i++) {
        const pre = riskSnapshots[i - 1];
        const post = riskSnapshots[i];

        const burnoutDelta = pre.burnoutRisk - post.burnoutRisk; // positive = improvement
        const stressDelta = pre.stressVulnerability - post.stressVulnerability;
        const stabilityDelta = post.academicStability - pre.academicStability; // positive = improvement

        const avgImprovement = (burnoutDelta + stressDelta + stabilityDelta) / 3;
        const success = avgImprovement > 0;

        interventionCycles.push({
            preDate: pre.date,
            postDate: post.date,
            burnoutDelta,
            stressDelta,
            stabilityDelta,
            avgImprovement: Math.round(avgImprovement * 10) / 10,
            success,
        });
    }

    // ── Aggregate metrics ──
    const totalInterventions = interventionCycles.length;
    const successfulCycles = interventionCycles.filter(c => c.success).length;
    const successRate = clamp((successfulCycles / totalInterventions) * 100);
    const avgImprovement = Math.round(
        (interventionCycles.reduce((sum, c) => sum + c.avgImprovement, 0) / totalInterventions) * 10
    ) / 10;

    // ── Engagement rate: based on completion rate and response patterns ──
    let totalAnswered = 0, totalQuestions = 0;
    for (const att of attempts) {
        if (att.responses) {
            totalAnswered += Object.keys(att.responses).length;
        }
        totalQuestions += 30; // 30 questions per assessment
    }
    const engagementRate = clamp((totalAnswered / totalQuestions) * 100);

    // ── Identify most/least effective intervention types ──
    const typeEffectiveness = {};
    if (student.interventionPlan && student.interventionPlan.recommendedLoops) {
        for (const loop of student.interventionPlan.recommendedLoops) {
            if (!typeEffectiveness[loop.type]) {
                typeEffectiveness[loop.type] = { count: 0, totalImprovement: 0 };
            }
            typeEffectiveness[loop.type].count++;
            // Use overall avg improvement as proxy for this type
            typeEffectiveness[loop.type].totalImprovement += avgImprovement;
        }
    }

    const loopEffectiveness = Object.entries(typeEffectiveness).map(([type, data]) => ({
        type,
        count: data.count,
        avgImprovement: Math.round((data.totalImprovement / data.count) * 10) / 10,
    })).sort((a, b) => b.avgImprovement - a.avgImprovement);

    const result = {
        totalInterventions,
        avgImprovement,
        successRate,
        engagementRate,
        cycles: interventionCycles,
        loopEffectiveness,
        lastEvaluated: new Date().toISOString(),
    };

    // ── Safely extend student object ──
    student.interventionAnalytics = {
        totalInterventions,
        avgImprovement,
        successRate,
        engagementRate,
        lastEvaluated: result.lastEvaluated,
    };

    return result;
}

// ─── Global Exports ────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.computeInterventionEffectiveness = computeInterventionEffectiveness;
}
