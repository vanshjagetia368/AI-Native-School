/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Resilience Index Forensic Analysis
   ═══════════════════════════════════════════════════════════════
   Computes recovery speed constants, emotional stabilization curves,
   confidence recalibration ratios, and volatility compression indices.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute resilience forensic analysis for a student snapshot.
 * @param {object} snapshot - Deep-cloned student data
 * @returns {object|null} Resilience analysis model
 */
function computeReportResilienceAnalysis(snapshot) {
    const attempts = getSortedAttempts(snapshot);
    if (attempts.length < 2) return null;

    // ── Recovery Speed Constant ──
    const recoverySpeed = computeRecoverySpeedConstant(attempts);

    // ── Emotional Stabilization Curve ──
    const emotionalCurve = computeEmotionalStabilizationCurve(attempts);

    // ── Confidence Recalibration Ratio ──
    const confRecalibration = computeConfidenceRecalibrationRatio(attempts);

    // ── Volatility Compression Index ──
    const volatilityCompression = computeVolatilityCompressionIndex(attempts);

    // ── Composite Resilience from existing engine data ──
    const existingResilience = snapshot.resilienceIndex || {};

    return {
        recoverySpeed,
        emotionalStabilizationCurve: emotionalCurve,
        confidenceRecalibration: confRecalibration,
        volatilityCompression,
        existingComposite: existingResilience.composite ?? null,
        existingComponents: {
            recoverySpeed: existingResilience.recoverySpeed ?? null,
            emotionalStabilization: existingResilience.emotionalStabilization ?? null,
            confidenceRecalibration: existingResilience.confidenceRecalibration ?? null,
            bounceback: existingResilience.bounceback ?? null,
        },
        overallLabel: getResilienceLabel(existingResilience.composite ?? computeCompositeFromAnalysis(recoverySpeed, emotionalCurve, confRecalibration, volatilityCompression)),
    };
}

function computeRecoverySpeedConstant(attempts) {
    // Identify dips (trait score drops) and measure recovery
    const traits = ['O', 'C', 'E', 'A', 'N'];
    const dipRecoveries = [];

    for (const trait of traits) {
        const values = attempts.map(a => a.traitScores?.[trait]).filter(v => v != null);
        for (let i = 1; i < values.length - 1; i++) {
            if (values[i] < values[i - 1] - 5) { // Dip detected
                const dipMagnitude = values[i - 1] - values[i];
                const recovery = values[i + 1] - values[i];
                const recoveryRatio = dipMagnitude > 0 ? recovery / dipMagnitude : 0;
                dipRecoveries.push({
                    trait,
                    dipAtAttempt: i + 1,
                    dipMagnitude: Math.round(dipMagnitude * 10) / 10,
                    recovery: Math.round(recovery * 10) / 10,
                    recoveryRatio: Math.round(recoveryRatio * 100) / 100,
                });
            }
        }
    }

    const avgRecoveryRatio = dipRecoveries.length > 0
        ? dipRecoveries.reduce((s, d) => s + d.recoveryRatio, 0) / dipRecoveries.length
        : 0;

    return {
        constant: clamp(avgRecoveryRatio * 100),
        totalDipsDetected: dipRecoveries.length,
        avgRecoveryRatio: Math.round(avgRecoveryRatio * 100) / 100,
        details: dipRecoveries.slice(0, 5), // Latest 5
        label: avgRecoveryRatio > 0.7 ? 'Fast' : avgRecoveryRatio > 0.4 ? 'Moderate' : 'Slow',
    };
}

function computeEmotionalStabilizationCurve(attempts) {
    // Track N (Neuroticism) and emotional volatility across time
    const curve = attempts.map((att, idx) => {
        const n = att.traitScores?.N ?? 50;
        const ev = att.computedInsights?.predictiveIndices?.emotionalVolatility ?? n;
        return {
            attempt: idx + 1,
            date: att.completedAt || att.startedAt,
            neuroticism: n,
            emotionalVolatility: Math.round(ev * 10) / 10,
            stabilityScore: clamp(100 - ev),
        };
    });

    // Trend analysis
    const firstHalf = curve.slice(0, Math.floor(curve.length / 2));
    const secondHalf = curve.slice(Math.floor(curve.length / 2));
    const firstAvg = firstHalf.length > 0
        ? firstHalf.reduce((s, c) => s + c.stabilityScore, 0) / firstHalf.length
        : 50;
    const secondAvg = secondHalf.length > 0
        ? secondHalf.reduce((s, c) => s + c.stabilityScore, 0) / secondHalf.length
        : 50;

    return {
        dataPoints: curve,
        trend: secondAvg > firstAvg + 3 ? 'Stabilizing' : secondAvg < firstAvg - 3 ? 'Destabilizing' : 'Steady',
        firstHalfAvg: Math.round(firstAvg * 10) / 10,
        secondHalfAvg: Math.round(secondAvg * 10) / 10,
        improvement: Math.round((secondAvg - firstAvg) * 10) / 10,
    };
}

function computeConfidenceRecalibrationRatio(attempts) {
    // Measure how self-assessment accuracy improves
    const calibrationSeries = attempts.map((att, idx) => {
        const conf = att.confidenceScore || 50;
        const traitAvg = Object.values(att.traitScores || {}).length > 0
            ? Object.values(att.traitScores).reduce((a, b) => a + b, 0) / Object.values(att.traitScores).length
            : 50;
        const gap = Math.abs(conf - traitAvg);
        return {
            attempt: idx + 1,
            confidence: conf,
            actual: Math.round(traitAvg * 10) / 10,
            gap: Math.round(gap * 10) / 10,
            calibrationScore: clamp(100 - gap * 2),
        };
    });

    const firstGap = calibrationSeries.length > 0 ? calibrationSeries[0].gap : 0;
    const lastGap = calibrationSeries.length > 0 ? calibrationSeries[calibrationSeries.length - 1].gap : 0;

    return {
        series: calibrationSeries,
        ratio: firstGap > 0 ? Math.round(((firstGap - lastGap) / firstGap) * 100) / 100 : 0,
        improved: lastGap < firstGap,
        label: lastGap < 10 ? 'Well-Calibrated' : lastGap < 20 ? 'Moderately Calibrated' : 'Poorly Calibrated',
    };
}

function computeVolatilityCompressionIndex(attempts) {
    // Does trait volatility decrease over time?
    const traits = ['O', 'C', 'E', 'A', 'N'];
    if (attempts.length < 3) return { index: 50, trend: 'Insufficient data' };

    const midpoint = Math.floor(attempts.length / 2);
    const firstHalf = attempts.slice(0, midpoint);
    const secondHalf = attempts.slice(midpoint);

    const firstVolatility = computeAvgVolatility(firstHalf, traits);
    const secondVolatility = computeAvgVolatility(secondHalf, traits);

    const compression = firstVolatility > 0
        ? clamp(((firstVolatility - secondVolatility) / firstVolatility) * 100)
        : 50;

    return {
        index: compression,
        firstHalfVolatility: Math.round(firstVolatility * 100) / 100,
        secondHalfVolatility: Math.round(secondVolatility * 100) / 100,
        trend: compression > 55 ? 'Compressing' : compression < 45 ? 'Expanding' : 'Stable',
    };
}

function computeAvgVolatility(attempts, traits) {
    let totalVol = 0, count = 0;
    for (const t of traits) {
        const vals = attempts.map(a => a.traitScores?.[t]).filter(v => v != null);
        if (vals.length > 1) {
            for (let i = 1; i < vals.length; i++) {
                totalVol += Math.abs(vals[i] - vals[i - 1]);
                count++;
            }
        }
    }
    return count > 0 ? totalVol / count : 0;
}

function computeCompositeFromAnalysis(recovery, emotional, confidence, volatility) {
    return clamp(
        recovery.constant * 0.3 +
        emotional.secondHalfAvg * 0.3 +
        (confidence.improved ? 70 : 40) * 0.2 +
        volatility.index * 0.2
    );
}

function getResilienceLabel(score) {
    if (score >= 75) return 'Highly Resilient';
    if (score >= 55) return 'Moderately Resilient';
    if (score >= 35) return 'Developing Resilience';
    return 'Low Resilience';
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
    window.computeReportResilienceAnalysis = computeReportResilienceAnalysis;
}
