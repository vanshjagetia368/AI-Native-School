/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Risk Score Forensic Decomposition
   ═══════════════════════════════════════════════════════════════
   Decomposes the behavioral risk score into weighted components,
   generates sensitivity curves, contribution matrices, and
   predictive risk trajectories.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute risk decomposition analytics.
 * @param {object} snapshot - Deep-cloned student data
 * @returns {object|null} Risk decomposition model
 */
function computeRiskDecomposition(snapshot) {
    const attempts = getSortedAttempts(snapshot);
    if (attempts.length < 2) return null;

    // Recompute component weights using the same formula as behavioral-risk-engine
    const WEIGHTS = { accuracy: 0.35, timeVariance: 0.25, dropOff: 0.20, confidenceGap: 0.20 };
    const recentAttempts = attempts.slice(-3);

    const components = {
        accuracy: computeAccuracyComponent(recentAttempts),
        timeVariance: computeTimeVarianceComponent(recentAttempts),
        dropOff: computeDropOffComponent(recentAttempts),
        confidenceGap: computeConfidenceGapComponent(recentAttempts),
    };

    const compositeScore = clamp(
        components.accuracy * WEIGHTS.accuracy +
        components.timeVariance * WEIGHTS.timeVariance +
        components.dropOff * WEIGHTS.dropOff +
        components.confidenceGap * WEIGHTS.confidenceGap
    );

    // ── Weighted Impact Decomposition ──
    const weightedImpact = {};
    let totalWeightedContrib = 0;
    for (const [key, weight] of Object.entries(WEIGHTS)) {
        const contrib = components[key] * weight;
        totalWeightedContrib += contrib;
        weightedImpact[key] = {
            rawScore: components[key],
            weight,
            weightedContribution: Math.round(contrib * 100) / 100,
        };
    }
    // Contribution percentages
    for (const key of Object.keys(weightedImpact)) {
        weightedImpact[key].contributionPct = totalWeightedContrib > 0
            ? Math.round((weightedImpact[key].weightedContribution / totalWeightedContrib) * 100)
            : 25;
    }

    // ── Risk Sensitivity Curve ──
    // How the composite changes if each component moves ±10
    const sensitivityCurve = {};
    for (const key of Object.keys(WEIGHTS)) {
        const variants = [];
        for (let delta = -30; delta <= 30; delta += 10) {
            const modified = { ...components };
            modified[key] = clamp(modified[key] + delta);
            const newScore = clamp(
                modified.accuracy * WEIGHTS.accuracy +
                modified.timeVariance * WEIGHTS.timeVariance +
                modified.dropOff * WEIGHTS.dropOff +
                modified.confidenceGap * WEIGHTS.confidenceGap
            );
            variants.push({ delta, compositeScore: newScore });
        }
        sensitivityCurve[key] = variants;
    }

    // ── Threshold Boundary Map ──
    const thresholds = {
        high: { max: 40, label: 'High Risk' },
        moderate: { max: 70, label: 'Moderate' },
        stable: { max: 100, label: 'Stable' },
    };
    const currentCategory = compositeScore <= 40 ? 'high' : compositeScore <= 70 ? 'moderate' : 'stable';
    const distanceToNext = currentCategory === 'high'
        ? 41 - compositeScore
        : currentCategory === 'moderate'
            ? 71 - compositeScore
            : 0;

    // ── Predictive Risk Trajectory ──
    const riskHistory = computeRiskTimeline(snapshot, attempts);
    const projectedNoIntervention = projectTrajectory(riskHistory, false);
    const projectedWithIntervention = projectTrajectory(riskHistory, true);

    return {
        compositeScore,
        components,
        weights: WEIGHTS,
        weightedImpact,
        sensitivityCurve,
        thresholdBoundary: {
            current: currentCategory,
            thresholds,
            distanceToNextThreshold: distanceToNext,
        },
        riskHistory,
        projectedNoIntervention,
        projectedWithIntervention,
        componentLabels: {
            accuracy: 'Accuracy Weight',
            timeVariance: 'Time Variance',
            dropOff: 'Drop-Off Weight',
            confidenceGap: 'Confidence Gap',
        },
    };
}

// ── Component Computations (mirrors behavioral-risk-engine logic, read-only) ──

function computeAccuracyComponent(recentAttempts) {
    const scores = recentAttempts.map(att => {
        const responses = Object.values(att.responses || {}).map(Number);
        if (responses.length === 0) return 50;
        const totalQ = responses.length;
        let weightedCorrect = 0, totalWeight = 0;
        responses.forEach((r, i) => {
            const diff = 1 + (i / totalQ);
            weightedCorrect += (r / 5) * diff;
            totalWeight += diff;
        });
        return clamp((weightedCorrect / totalWeight) * 100);
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function computeTimeVarianceComponent(recentAttempts) {
    const variances = recentAttempts.map(att => {
        const tVals = getTimingValues(att);
        if (tVals.length < 2) return 50;
        const sd = stdDev(tVals);
        const mean = tVals.reduce((a, b) => a + b, 0) / tVals.length;
        const cv = mean > 0 ? sd / mean : 0;
        return clamp(100 - cv * 100);
    });
    return Math.round(variances.reduce((a, b) => a + b, 0) / variances.length);
}

function computeDropOffComponent(recentAttempts) {
    const scores = recentAttempts.map(att => {
        const responses = Object.values(att.responses || {}).map(Number);
        if (responses.length < 4) return 50;
        const qtr = Math.floor(responses.length / 4);
        const firstAvg = responses.slice(0, qtr).reduce((a, b) => a + b, 0) / qtr;
        const lastAvg = responses.slice(-qtr).reduce((a, b) => a + b, 0) / qtr;
        const dropOff = firstAvg > 0 ? ((firstAvg - lastAvg) / firstAvg) * 100 : 0;
        return clamp(100 - Math.abs(dropOff) * 2);
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function computeConfidenceGapComponent(recentAttempts) {
    const scores = recentAttempts.map(att => {
        const conf = att.confidenceScore || 50;
        const traitVals = Object.values(att.traitScores || {});
        const actual = traitVals.length > 0 ? traitVals.reduce((a, b) => a + b, 0) / traitVals.length : 50;
        const gap = Math.abs(conf - actual);
        return clamp(100 - gap * 2);
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function computeRiskTimeline(snapshot, attempts) {
    const timeline = [];
    for (let i = 1; i < attempts.length; i++) {
        const recent = attempts.slice(Math.max(0, i - 2), i + 1);
        const accuracy = computeAccuracyComponent(recent);
        const timeVar = computeTimeVarianceComponent(recent);
        const dropOff = computeDropOffComponent(recent);
        const confGap = computeConfidenceGapComponent(recent);
        const score = clamp(accuracy * 0.35 + timeVar * 0.25 + dropOff * 0.20 + confGap * 0.20);
        timeline.push({
            attempt: i + 1,
            date: attempts[i].completedAt || attempts[i].startedAt,
            score,
            components: { accuracy, timeVar, dropOff, confGap },
        });
    }
    return timeline;
}

function projectTrajectory(history, withIntervention) {
    if (history.length < 2) return [];
    const last = history[history.length - 1].score;
    const secondLast = history[history.length - 2].score;
    const trend = last - secondLast;
    const projected = [];
    for (let i = 1; i <= 3; i++) {
        const modifier = withIntervention ? Math.abs(trend) * 0.5 : 0;
        const val = clamp(last + (trend * i) + (withIntervention ? modifier * i : 0));
        projected.push({ futureAttempt: history.length + i, projectedScore: val });
    }
    return projected;
}

// ── Helpers ──
function clamp(val) { return Math.max(0, Math.min(100, Math.round(val))); }

function getSortedAttempts(student) {
    if (!student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt && a.traitScores)
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

function getTimingValues(attempt) {
    return Object.values(attempt.timePerQuestion || {}).map(Number).filter(v => !isNaN(v));
}

function stdDev(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

// ── Export ──
if (typeof window !== 'undefined') {
    window.computeRiskDecomposition = computeRiskDecomposition;
}
