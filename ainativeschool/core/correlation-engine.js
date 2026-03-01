/* ═══════════════════════════════════════════════════════════════
   AI Native Schools — Skill-Academic Correlation Engine
   ═══════════════════════════════════════════════════════════════
   Computes normalized correlations between psychometric traits,
   behavioral risk factors, and intervention responsiveness.
   Uses simplified Pearson correlation approach.
   ═══════════════════════════════════════════════════════════════ */

// ─── Helpers ───────────────────────────────────────────────────

function clamp(val) {
    return Math.max(0, Math.min(100, Math.round(val)));
}

function getSortedAttempts(student) {
    if (!student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt && a.traitScores)
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

/**
 * Compute Pearson correlation coefficient between two arrays.
 * Returns value in [-1, 1], or 0 if insufficient data.
 */
function pearson(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);

    const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
    const meanY = ySlice.reduce((a, b) => a + b, 0) / n;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        const dx = xSlice[i] - meanX;
        const dy = ySlice[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}

/**
 * Normalize correlation [-1,1] to display score [0,100]
 */
function normalizeCorrelation(r) {
    return clamp((r + 1) * 50);
}

// ═══════════════════════════════════════════════════════════════
// MAIN: computeSkillAcademicCorrelation(student)
// ═══════════════════════════════════════════════════════════════

/**
 * Compute correlations between psychometric traits and performance indicators.
 * @param {object} student - Student object from storage
 * @returns {object|null} Correlation matrix or null
 */
function computeSkillAcademicCorrelation(student) {
    if (!student) return null;

    const attempts = getSortedAttempts(student);
    if (attempts.length < 2) return null;

    // Extract trait series across attempts
    const traitSeries = { O: [], C: [], E: [], A: [], N: [] };
    const performanceSeries = {
        academicStability: [],
        burnoutRisk: [],
        emotionalVolatility: [],
        persistenceQuotient: [],
    };

    for (const att of attempts) {
        if (!att.traitScores) continue;

        for (const trait of ['O', 'C', 'E', 'A', 'N']) {
            if (att.traitScores[trait] != null) {
                traitSeries[trait].push(att.traitScores[trait]);
            }
        }

        if (att.computedInsights && att.computedInsights.predictiveIndices) {
            const pi = att.computedInsights.predictiveIndices;
            if (pi.academicStability != null) performanceSeries.academicStability.push(pi.academicStability);
            if (pi.burnoutRisk != null) performanceSeries.burnoutRisk.push(pi.burnoutRisk);
            if (pi.emotionalVolatility != null) performanceSeries.emotionalVolatility.push(pi.emotionalVolatility);
            if (pi.persistenceQuotient != null) performanceSeries.persistenceQuotient.push(pi.persistenceQuotient);
        }
    }

    // ── Compute key correlations ──
    const result = {
        // Openness vs humanities-type performance (using academic stability as proxy)
        opennessVsHumanities: pearson(traitSeries.O, performanceSeries.academicStability),
        // Conscientiousness vs math-type performance (using persistence as proxy)
        conscientiousnessVsMath: pearson(traitSeries.C, performanceSeries.persistenceQuotient),
        // Risk vs performance (inverted — higher burnout = lower academic stability)
        riskVsPerformance: pearson(
            performanceSeries.burnoutRisk,
            performanceSeries.academicStability
        ),
        // Persistence vs exam stability
        persistenceVsExamStability: pearson(
            performanceSeries.persistenceQuotient,
            performanceSeries.academicStability
        ),
    };

    // ── Full correlation matrix for heatmap ──
    const traits = ['O', 'C', 'E', 'A', 'N'];
    const metrics = Object.keys(performanceSeries);
    const matrix = {};

    for (const trait of traits) {
        matrix[trait] = {};
        for (const metric of metrics) {
            matrix[trait][metric] = pearson(traitSeries[trait], performanceSeries[metric]);
        }
    }

    result.matrix = matrix;
    result.normalizedScores = {
        opennessVsHumanities: normalizeCorrelation(result.opennessVsHumanities),
        conscientiousnessVsMath: normalizeCorrelation(result.conscientiousnessVsMath),
        riskVsPerformance: normalizeCorrelation(result.riskVsPerformance),
        persistenceVsExamStability: normalizeCorrelation(result.persistenceVsExamStability),
    };

    // ── Predictive pathway suggestions ──
    result.pathwaySuggestions = [];
    if (result.opennessVsHumanities > 0.4) {
        result.pathwaySuggestions.push('Strong correlation between Openness and academic stability — humanities/creative tracks may be optimal.');
    }
    if (result.conscientiousnessVsMath > 0.4) {
        result.pathwaySuggestions.push('High Conscientiousness strongly predicts persistence — STEM/structured tracks well-suited.');
    }
    if (result.riskVsPerformance < -0.3) {
        result.pathwaySuggestions.push('Burnout risk inversely correlated with performance — stress management interventions critical.');
    }
    if (result.pathwaySuggestions.length === 0) {
        result.pathwaySuggestions.push('Correlations are moderate — student shows balanced aptitude across domains.');
    }

    // ── Safely extend student object ──
    student.skillAcademicCorrelation = {
        opennessVsHumanities: result.opennessVsHumanities,
        conscientiousnessVsMath: result.conscientiousnessVsMath,
        riskVsPerformance: result.riskVsPerformance,
        persistenceVsExamStability: result.persistenceVsExamStability,
    };

    return result;
}

// ─── Global Exports ────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.computeSkillAcademicCorrelation = computeSkillAcademicCorrelation;
}
