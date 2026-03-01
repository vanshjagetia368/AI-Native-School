/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Executive Summary Engine
   ═══════════════════════════════════════════════════════════════
   Computes the Composite Intelligence Vector (CIV) and executive
   dashboard metrics from a deep-cloned student snapshot.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute the executive summary analytics for a student snapshot.
 * @param {object} snapshot - Deep-cloned student data
 * @returns {object} Executive summary model
 */
function computeExecutiveSummary(snapshot) {
    const attempts = getSortedAttempts(snapshot);
    const latest = attempts[attempts.length - 1] || {};
    const traits = latest.traitScores || { O: 50, C: 50, E: 50, A: 50, N: 50 };
    const insights = latest.computedInsights || {};
    const pi = insights.predictiveIndices || {};

    // ── CIV Dimensions ──
    const logicalProcessing = clamp(traits.C * 0.6 + traits.O * 0.4);
    const numericalProcessing = clamp(traits.C * 0.7 + (100 - traits.N) * 0.3);
    const abstractReasoning = clamp(traits.O * 0.7 + traits.E * 0.3);
    const emotionalRegulation = clamp((100 - traits.N) * 0.8 + traits.A * 0.2);

    // Cognitive speed from timing data
    const tVals = getTimingValues(latest);
    const avgTime = tVals.length > 0 ? tVals.reduce((a, b) => a + b, 0) / tVals.length : 10;
    const cognitiveSpeed = clamp(100 - (avgTime / 30) * 100);

    // Response consistency
    const rVals = Object.values(latest.responses || {});
    const responseConsistency = rVals.length > 1
        ? clamp(100 - stdDev(rVals) * 25)
        : 50;

    // Behavioral risk inversion
    const riskScore = snapshot.behavioralRisk?.score ?? 50;
    const behavioralRiskInversion = clamp(100 - (100 - riskScore));

    // Resilience quotient
    const resilience = snapshot.resilienceIndex?.composite ?? 50;

    const dimensions = {
        logicalProcessing,
        numericalProcessing,
        abstractReasoning,
        emotionalRegulation,
        cognitiveSpeed,
        responseConsistency,
        behavioralRiskInversion,
        resilienceQuotient: resilience,
    };

    // ── CIV Vector Magnitude ──
    const dimValues = Object.values(dimensions);
    const magnitude = Math.round(Math.sqrt(dimValues.reduce((s, v) => s + v * v, 0)) / Math.sqrt(dimValues.length));

    // ── CIV Weights ──
    const weights = { logicalProcessing: 0.15, numericalProcessing: 0.15, abstractReasoning: 0.12, emotionalRegulation: 0.15, cognitiveSpeed: 0.10, responseConsistency: 0.13, behavioralRiskInversion: 0.10, resilienceQuotient: 0.10 };
    const weightedCIV = clamp(Object.entries(dimensions).reduce((s, [k, v]) => s + v * (weights[k] || 0.125), 0));

    // ── Derived Executive Metrics ──

    // Stability Coefficient: low variance across attempts = high stability
    const traitVariances = computeTraitVariances(attempts);
    const avgVariance = traitVariances.length > 0
        ? traitVariances.reduce((a, b) => a + b, 0) / traitVariances.length
        : 10;
    const stabilityCoefficient = clamp(100 - avgVariance * 2);

    // Cognitive Entropy Index: measure of disorder in response patterns
    const cognitiveEntropy = computeResponseEntropy(latest);

    // Risk Gradient Indicator: rate of risk change
    const riskGradient = computeRiskGradient(snapshot, attempts);

    // Longitudinal Acceleration Rate
    const longiAcceleration = computeLongitudinalAcceleration(snapshot);

    // Predictive Confidence Band
    const predictiveConfidence = computePredictiveConfidence(snapshot, attempts);

    return {
        studentName: snapshot.name,
        studentId: snapshot.studentId,
        totalAssessments: attempts.length,
        latestDate: latest.completedAt || latest.startedAt || null,
        civ: {
            dimensions,
            magnitude,
            weightedScore: weightedCIV,
            weights,
        },
        executiveMetrics: {
            stabilityCoefficient,
            cognitiveEntropy,
            riskGradient,
            longitudinalAcceleration: longiAcceleration,
            predictiveConfidence,
        },
        dominantTrait: Object.entries(traits).sort((a, b) => b[1] - a[1])[0],
        overallTier: weightedCIV > 75 ? 'Superior' : weightedCIV > 60 ? 'Proficient' : weightedCIV > 45 ? 'Developing' : 'At-Risk',
    };
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

function computeTraitVariances(attempts) {
    if (attempts.length < 2) return [];
    const traits = ['O', 'C', 'E', 'A', 'N'];
    return traits.map(t => {
        const vals = attempts.map(a => a.traitScores?.[t]).filter(v => v != null);
        return vals.length > 1 ? stdDev(vals) : 0;
    });
}

function computeResponseEntropy(attempt) {
    const responses = Object.values(attempt.responses || {});
    if (responses.length < 5) return 50;
    const freq = {};
    responses.forEach(r => { freq[r] = (freq[r] || 0) + 1; });
    const total = responses.length;
    let entropy = 0;
    Object.values(freq).forEach(count => {
        const p = count / total;
        if (p > 0) entropy -= p * Math.log2(p);
    });
    const maxEntropy = Math.log2(Object.keys(freq).length || 1);
    return clamp((entropy / (maxEntropy || 1)) * 100);
}

function computeRiskGradient(snapshot, attempts) {
    if (attempts.length < 2) return 0;
    const riskHistory = [];
    for (const att of attempts) {
        const pi = att.computedInsights?.predictiveIndices;
        if (pi?.burnoutRisk != null) riskHistory.push(pi.burnoutRisk);
    }
    if (riskHistory.length < 2) return 0;
    const delta = riskHistory[riskHistory.length - 1] - riskHistory[0];
    return Math.round(delta * 10) / 10;
}

function computeLongitudinalAcceleration(snapshot) {
    const cgi = snapshot.cognitiveGrowthIndex;
    if (!cgi) return 0;
    const score = cgi.composite || cgi.score || 50;
    // Acceleration is the rate of change of CGI
    return Math.round((score - 50) * 2) / 10;
}

function computePredictiveConfidence(snapshot, attempts) {
    // Higher with more data points
    const dataDensity = Math.min(attempts.length / 5, 1);
    const hasRisk = snapshot.behavioralRisk != null ? 1 : 0;
    const hasCGI = snapshot.cognitiveGrowthIndex != null ? 1 : 0;
    const hasResilience = snapshot.resilienceIndex != null ? 1 : 0;
    const completeness = (dataDensity * 0.4 + hasRisk * 0.2 + hasCGI * 0.2 + hasResilience * 0.2);
    return clamp(completeness * 100);
}

// ── Export ──
if (typeof window !== 'undefined') {
    window.computeExecutiveSummary = computeExecutiveSummary;
}
