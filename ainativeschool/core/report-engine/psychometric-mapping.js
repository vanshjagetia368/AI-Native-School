/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Psychometric Architecture Mapping
   ═══════════════════════════════════════════════════════════════
   Computes per-trait dimensional mapping including z-scores,
   percentiles, stability indices, and cross-trait interactions.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute psychometric dimensional mapping for a student snapshot.
 * @param {object} snapshot - Deep-cloned student data
 * @returns {object} Psychometric mapping model
 */
function computePsychometricMapping(snapshot) {
    const attempts = getSortedAttempts(snapshot);
    if (attempts.length === 0) return null;

    const traits = ['O', 'C', 'E', 'A', 'N'];
    const traitNames = { O: 'Openness', C: 'Conscientiousness', E: 'Extraversion', A: 'Agreeableness', N: 'Neuroticism' };

    // ── Per-trait dimensional analysis ──
    const dimensionalMap = {};
    for (const trait of traits) {
        const values = attempts.map(a => a.traitScores?.[trait]).filter(v => v != null);
        const n = values.length;

        const mean = n > 0 ? values.reduce((a, b) => a + b, 0) / n : 0;
        const sd = n > 1 ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n) : 0;

        // Intra-attempt variance (variance of responses within each attempt for this trait domain)
        const intraVariances = attempts.map(a => {
            const responses = getTraitResponses(a, trait);
            if (responses.length < 2) return 0;
            const rMean = responses.reduce((x, y) => x + y, 0) / responses.length;
            return responses.reduce((s, v) => s + (v - rMean) ** 2, 0) / responses.length;
        });
        const avgIntraVariance = intraVariances.length > 0
            ? Math.round((intraVariances.reduce((a, b) => a + b, 0) / intraVariances.length) * 100) / 100
            : 0;

        // Z-score normalization (against population mean of 50, sd of 15)
        const zScore = Math.round(((mean - 50) / 15) * 100) / 100;

        // Percentile (from z-score via approximation)
        const percentile = Math.round(normalCDF(zScore) * 100);

        // Stability index: inverse of coefficient of variation
        const cv = mean > 0 ? sd / mean : 0;
        const stabilityIndex = clamp(100 - cv * 200);

        // Volatility coefficient
        const volatility = n > 2 ? computeVolatility(values) : 0;

        dimensionalMap[trait] = {
            name: traitNames[trait],
            mean: Math.round(mean * 10) / 10,
            standardDeviation: Math.round(sd * 100) / 100,
            intraAttemptVariance: avgIntraVariance,
            zScore,
            percentile,
            stabilityIndex,
            volatilityCoefficient: Math.round(volatility * 100) / 100,
            values, // Raw series for charting
        };
    }

    // ── Trait Coherence Matrix ──
    const coherenceMatrix = {};
    for (const t1 of traits) {
        coherenceMatrix[t1] = {};
        for (const t2 of traits) {
            if (t1 === t2) {
                coherenceMatrix[t1][t2] = 1.0;
            } else {
                coherenceMatrix[t1][t2] = pearson(
                    dimensionalMap[t1].values,
                    dimensionalMap[t2].values
                );
            }
        }
    }

    // ── Intra-Dimensional Stability Ratio ──
    const stabilityRatios = {};
    for (const trait of traits) {
        const dm = dimensionalMap[trait];
        stabilityRatios[trait] = {
            name: traitNames[trait],
            ratio: dm.values.length > 1
                ? Math.round((1 - dm.standardDeviation / (dm.mean || 1)) * 100) / 100
                : 1.0,
        };
    }

    // ── Cross-Trait Interaction Map ──
    const interactions = [];
    for (let i = 0; i < traits.length; i++) {
        for (let j = i + 1; j < traits.length; j++) {
            const r = coherenceMatrix[traits[i]][traits[j]];
            const strength = Math.abs(r);
            if (strength > 0.2) {
                interactions.push({
                    trait1: traitNames[traits[i]],
                    trait2: traitNames[traits[j]],
                    correlation: r,
                    strength: strength > 0.6 ? 'Strong' : strength > 0.4 ? 'Moderate' : 'Weak',
                    direction: r > 0 ? 'Positive' : 'Negative',
                });
            }
        }
    }

    return {
        dimensionalMap,
        coherenceMatrix,
        stabilityRatios,
        crossTraitInteractions: interactions,
        traitOrder: traits,
        traitNames,
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

function getTraitResponses(attempt, trait) {
    // OCEAN trait mapping: questions are typically grouped by domain
    // Approximate: O=1-6, C=7-12, E=13-18, A=19-24, N=25-30
    const ranges = { O: [1, 6], C: [7, 12], E: [13, 18], A: [19, 24], N: [25, 30] };
    const [start, end] = ranges[trait] || [1, 6];
    const responses = [];
    for (let q = start; q <= end; q++) {
        const key = `q${q}`;
        if (attempt.responses && attempt.responses[key] != null) {
            responses.push(Number(attempt.responses[key]));
        }
    }
    return responses;
}

function pearson(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const xS = x.slice(0, n), yS = y.slice(0, n);
    const mX = xS.reduce((a, b) => a + b, 0) / n;
    const mY = yS.reduce((a, b) => a + b, 0) / n;
    let num = 0, dX = 0, dY = 0;
    for (let i = 0; i < n; i++) {
        const dx = xS[i] - mX, dy = yS[i] - mY;
        num += dx * dy; dX += dx * dx; dY += dy * dy;
    }
    const den = Math.sqrt(dX * dY);
    return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}

function normalCDF(z) {
    // Approximation of the standard normal CDF
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.SQRT2;
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
}

function computeVolatility(values) {
    if (values.length < 3) return 0;
    const changes = [];
    for (let i = 1; i < values.length; i++) {
        changes.push(Math.abs(values[i] - values[i - 1]));
    }
    return changes.reduce((a, b) => a + b, 0) / changes.length;
}

// ── Export ──
if (typeof window !== 'undefined') {
    window.computePsychometricMapping = computePsychometricMapping;
}
