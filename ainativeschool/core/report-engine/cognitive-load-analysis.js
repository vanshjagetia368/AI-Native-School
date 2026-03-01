/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Cognitive Load & Performance Dynamics
   ═══════════════════════════════════════════════════════════════
   Analyzes temporal response patterns, accuracy decay, fatigue
   coefficients, and performance entropy across assessment data.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute cognitive load and performance dynamics.
 * @param {object} snapshot - Deep-cloned student data
 * @returns {object} Cognitive load analysis model
 */
function computeCognitiveLoadAnalysis(snapshot) {
    const attempts = getSortedAttempts(snapshot);
    if (attempts.length === 0) return null;

    const latest = attempts[attempts.length - 1];
    const tVals = getTimingValues(latest);
    const responses = latest.responses || {};
    const rVals = Object.values(responses).map(Number);

    // ── Response Latency Distribution ──
    const latencyDistribution = computeLatencyDistribution(tVals);

    // ── Time-Normalized Accuracy ──
    const timeNormalizedAccuracy = computeTimeNormalizedAccuracy(tVals, rVals);

    // ── Accuracy Decay Gradient ──
    const accuracyDecay = computeAccuracyDecayGradient(rVals);

    // ── Performance Entropy Score ──
    const performanceEntropy = computePerformanceEntropy(rVals, tVals);

    // ── Sequential Fatigue Coefficient ──
    const fatigue = computeFatigueCoefficient(tVals, rVals);

    // ── Drop-off Inflection Point ──
    const dropOffPoint = findDropOffInflection(tVals);

    // ── Cross-attempt performance dynamics ──
    const attemptDynamics = attempts.map((att, idx) => {
        const tv = getTimingValues(att);
        const rv = Object.values(att.responses || {}).map(Number);
        const avgT = tv.length > 0 ? tv.reduce((a, b) => a + b, 0) / tv.length : 0;
        const avgR = rv.length > 0 ? rv.reduce((a, b) => a + b, 0) / rv.length : 0;
        return {
            attempt: idx + 1,
            date: att.completedAt || att.startedAt,
            avgResponseTime: Math.round(avgT * 100) / 100,
            avgResponseValue: Math.round(avgR * 100) / 100,
            questionsAnswered: rv.length,
            entropy: computePerformanceEntropy(rv, tv),
        };
    });

    // ── Sequential Performance Heatmap Data ──
    const heatmapData = tVals.map((t, i) => ({
        question: i + 1,
        time: Math.round(t * 100) / 100,
        response: rVals[i] || 0,
        normalized: tVals.length > 0 ? Math.round((t / Math.max(...tVals)) * 100) : 0,
    }));

    return {
        latencyDistribution,
        timeNormalizedAccuracy,
        accuracyDecayGradient: accuracyDecay,
        performanceEntropy,
        sequentialFatigueCoefficient: fatigue,
        dropOffInflectionPoint: dropOffPoint,
        attemptDynamics,
        heatmapData,
        rawTiming: tVals,
        rawResponses: rVals,
    };
}

// ── Helpers ──

function clamp(val) { return Math.max(0, Math.min(100, Math.round(val))); }

function getSortedAttempts(student) {
    if (!student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt)
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

function computeLatencyDistribution(tVals) {
    if (tVals.length === 0) return { bins: [], mean: 0, median: 0, p90: 0, p10: 0, skewness: 0 };
    const sorted = [...tVals].sort((a, b) => a - b);
    const mean = tVals.reduce((a, b) => a + b, 0) / tVals.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const p10 = sorted[Math.floor(sorted.length * 0.1)];

    // Histogram bins (5 bins)
    const min = sorted[0], max = sorted[sorted.length - 1];
    const binWidth = (max - min) / 5 || 1;
    const bins = [];
    for (let i = 0; i < 5; i++) {
        const lo = min + i * binWidth;
        const hi = lo + binWidth;
        const count = tVals.filter(v => v >= lo && (i === 4 ? v <= hi : v < hi)).length;
        bins.push({ lo: Math.round(lo * 10) / 10, hi: Math.round(hi * 10) / 10, count });
    }

    // Skewness
    const sd = stdDev(tVals);
    const skewness = sd > 0
        ? Math.round((tVals.reduce((s, v) => s + ((v - mean) / sd) ** 3, 0) / tVals.length) * 100) / 100
        : 0;

    return {
        bins,
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        p90: Math.round(p90 * 100) / 100,
        p10: Math.round(p10 * 100) / 100,
        skewness,
    };
}

function computeTimeNormalizedAccuracy(tVals, rVals) {
    if (tVals.length === 0 || rVals.length === 0) return [];
    const n = Math.min(tVals.length, rVals.length);
    const result = [];
    for (let i = 0; i < n; i++) {
        const timeWeight = tVals[i] > 0 ? 1 / tVals[i] : 1;
        result.push({
            question: i + 1,
            accuracy: rVals[i],
            time: tVals[i],
            normalizedScore: Math.round(rVals[i] * timeWeight * 100) / 100,
        });
    }
    return result;
}

function computeAccuracyDecayGradient(rVals) {
    if (rVals.length < 6) return { gradient: 0, segments: [] };
    const segSize = Math.floor(rVals.length / 3);
    const segments = [
        { label: 'First Third', avg: avg(rVals.slice(0, segSize)) },
        { label: 'Middle Third', avg: avg(rVals.slice(segSize, segSize * 2)) },
        { label: 'Final Third', avg: avg(rVals.slice(segSize * 2)) },
    ];
    const gradient = Math.round((segments[2].avg - segments[0].avg) * 100) / 100;
    return { gradient, segments };
}

function computePerformanceEntropy(rVals, tVals) {
    if (rVals.length < 3) return 50;
    const combined = rVals.map((r, i) => r * (tVals[i] || 1));
    const sd = stdDev(combined);
    const mean = combined.reduce((a, b) => a + b, 0) / combined.length;
    const cv = mean > 0 ? sd / mean : 0;
    return clamp(cv * 100);
}

function computeFatigueCoefficient(tVals, rVals) {
    if (tVals.length < 6) return { coefficient: 0, detected: false };
    const half = Math.floor(tVals.length / 2);
    const firstHalfTime = avg(tVals.slice(0, half));
    const secondHalfTime = avg(tVals.slice(half));
    const timeIncrease = firstHalfTime > 0 ? (secondHalfTime - firstHalfTime) / firstHalfTime : 0;

    const firstHalfResp = avg(rVals.slice(0, Math.min(half, rVals.length)));
    const secondHalfResp = avg(rVals.slice(Math.min(half, rVals.length)));
    const respDecrease = firstHalfResp > 0 ? (firstHalfResp - secondHalfResp) / firstHalfResp : 0;

    const coefficient = Math.round((timeIncrease + respDecrease) * 50 * 100) / 100;
    return {
        coefficient: clamp(Math.abs(coefficient)),
        detected: timeIncrease > 0.2 || respDecrease > 0.1,
        timeIncreasePct: Math.round(timeIncrease * 100),
        responseDecreasePct: Math.round(respDecrease * 100),
    };
}

function findDropOffInflection(tVals) {
    if (tVals.length < 5) return { questionIndex: null, detected: false };
    let maxDelta = 0, inflectionIdx = null;
    for (let i = 1; i < tVals.length; i++) {
        const delta = tVals[i] - tVals[i - 1];
        if (delta > maxDelta) {
            maxDelta = delta;
            inflectionIdx = i;
        }
    }
    return {
        questionIndex: inflectionIdx !== null ? inflectionIdx + 1 : null,
        detected: maxDelta > 3,
        maxDelta: Math.round(maxDelta * 100) / 100,
    };
}

function avg(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

// ── Export ──
if (typeof window !== 'undefined') {
    window.computeCognitiveLoadAnalysis = computeCognitiveLoadAnalysis;
}
