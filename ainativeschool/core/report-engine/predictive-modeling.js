/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Predictive Dropout Modeling
   ═══════════════════════════════════════════════════════════════
   Logistic probability scoring with confidence intervals,
   projection trajectories, and threshold crossing indicators.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute predictive dropout modeling for a student snapshot.
 * @param {object} snapshot - Deep-cloned student data
 * @returns {object|null} Predictive model
 */
function computeReportPredictiveModeling(snapshot) {
    const attempts = getSortedAttempts(snapshot);
    if (attempts.length < 2) return null;

    // ── Input factors (mirrors dropout-model.js logic, read-only) ──
    const behavioralRiskFactor = getBehavioralRiskFactor(snapshot);
    const emotionalVolatilityFactor = getEmotionalVolatilityFactor(snapshot, attempts);
    const engagementFactor = getEngagementFactor(snapshot, attempts);
    const academicDecayFactor = getAcademicDecayFactor(attempts);
    const interventionFailureFactor = getInterventionFailureFactor(snapshot);

    const weights = {
        behavioralRisk: 0.25,
        emotionalVolatility: 0.20,
        engagement: 0.20,
        academicDecay: 0.20,
        interventionFailure: 0.15,
    };

    // ── Logistic Probability Score ──
    const linearCombination =
        behavioralRiskFactor * weights.behavioralRisk +
        emotionalVolatilityFactor * weights.emotionalVolatility +
        engagementFactor * weights.engagement +
        academicDecayFactor * weights.academicDecay +
        interventionFailureFactor * weights.interventionFailure;

    const probability = clamp(linearCombination);

    // ── Confidence Interval ──
    const variability = computeFactorVariability([
        behavioralRiskFactor, emotionalVolatilityFactor, engagementFactor,
        academicDecayFactor, interventionFailureFactor,
    ]);
    const ciWidth = Math.min(25, variability * 2);
    const confidenceInterval = {
        lower: clamp(probability - ciWidth),
        upper: clamp(probability + ciWidth),
        width: Math.round(ciWidth * 2 * 10) / 10,
    };

    // ── Factor Breakdown ──
    const factors = {
        behavioralRisk: {
            score: behavioralRiskFactor,
            weight: weights.behavioralRisk,
            contribution: Math.round(behavioralRiskFactor * weights.behavioralRisk * 10) / 10,
            label: 'Behavioral Risk',
        },
        emotionalVolatility: {
            score: emotionalVolatilityFactor,
            weight: weights.emotionalVolatility,
            contribution: Math.round(emotionalVolatilityFactor * weights.emotionalVolatility * 10) / 10,
            label: 'Emotional Volatility',
        },
        engagement: {
            score: engagementFactor,
            weight: weights.engagement,
            contribution: Math.round(engagementFactor * weights.engagement * 10) / 10,
            label: 'Engagement Proxy',
        },
        academicDecay: {
            score: academicDecayFactor,
            weight: weights.academicDecay,
            contribution: Math.round(academicDecayFactor * weights.academicDecay * 10) / 10,
            label: 'Academic Decay',
        },
        interventionFailure: {
            score: interventionFailureFactor,
            weight: weights.interventionFailure,
            contribution: Math.round(interventionFailureFactor * weights.interventionFailure * 10) / 10,
            label: 'Intervention Failure',
        },
    };

    // ── Projection Trajectory ──
    const trajectory = computeDropoutTrajectory(probability, attempts);

    // ── Threshold Crossing Indicator ──
    const thresholds = {
        low: { max: 35, label: 'Low Risk', color: '#4acea0' },
        medium: { max: 65, label: 'Medium Risk', color: '#e8924a' },
        high: { max: 100, label: 'High Risk', color: '#e85c7a' },
    };
    const currentCategory = probability <= 35 ? 'low' : probability <= 65 ? 'medium' : 'high';
    const nextThreshold = currentCategory === 'low' ? 36 : currentCategory === 'medium' ? 66 : null;
    const distanceToThreshold = nextThreshold ? nextThreshold - probability : 0;

    return {
        probability,
        confidenceInterval,
        factors,
        trajectory,
        thresholds,
        currentCategory,
        distanceToThreshold,
        riskLabel: thresholds[currentCategory].label,
        riskColor: thresholds[currentCategory].color,
        modelConfidence: clamp(100 - ciWidth * 2),
    };
}

// ── Factor Extractors ──

function getBehavioralRiskFactor(snapshot) {
    const risk = snapshot.behavioralRisk;
    if (!risk) return 50;
    return clamp(100 - (risk.score || 50));
}

function getEmotionalVolatilityFactor(snapshot, attempts) {
    const latest = attempts[attempts.length - 1];
    const ev = latest?.computedInsights?.predictiveIndices?.emotionalVolatility;
    return ev != null ? clamp(ev) : 50;
}

function getEngagementFactor(snapshot, attempts) {
    let totalAnswered = 0, totalExpected = 0;
    for (const att of attempts) {
        totalAnswered += Object.keys(att.responses || {}).length;
        totalExpected += 30;
    }
    const completionRate = totalExpected > 0 ? totalAnswered / totalExpected : 0.5;
    return clamp(100 - completionRate * 100); // High completion = low dropout factor
}

function getAcademicDecayFactor(attempts) {
    if (attempts.length < 2) return 50;
    const stabilities = attempts.map(a =>
        a.computedInsights?.predictiveIndices?.academicStability ?? 50
    );
    const first = stabilities[0];
    const last = stabilities[stabilities.length - 1];
    const decay = first - last;
    return clamp(50 + decay);
}

function getInterventionFailureFactor(snapshot) {
    const ia = snapshot.interventionAnalytics;
    if (!ia) return 50;
    return clamp(100 - (ia.successRate || 50));
}

function computeFactorVariability(factors) {
    const mean = factors.reduce((a, b) => a + b, 0) / factors.length;
    const variance = factors.reduce((s, v) => s + (v - mean) ** 2, 0) / factors.length;
    return Math.sqrt(variance);
}

function computeDropoutTrajectory(currentProb, attempts) {
    // Project future probability based on trend
    const points = [{ month: 0, probability: currentProb }];
    const trend = attempts.length > 2 ? (currentProb - 50) / attempts.length : 0;

    for (let m = 1; m <= 6; m++) {
        const projected = clamp(currentProb + trend * m * 1.5);
        points.push({ month: m, probability: projected });
    }
    return points;
}

// ── Helpers ──
function clamp(val) { return Math.max(0, Math.min(100, Math.round(val))); }

function getSortedAttempts(student) {
    if (!student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt && a.traitScores)
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

// ── Export ──
if (typeof window !== 'undefined') {
    window.computeReportPredictiveModeling = computeReportPredictiveModeling;
}
