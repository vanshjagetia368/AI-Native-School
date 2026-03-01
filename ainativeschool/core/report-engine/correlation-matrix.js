/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Correlation Matrix Engine
   ═══════════════════════════════════════════════════════════════
   Full Pearson correlation matrix with simulated p-values and
   significance markers for the forensic dossier.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute the full correlation matrix for a student snapshot.
 * @param {object} snapshot - Deep-cloned student data
 * @returns {object|null} Correlation matrix model
 */
function computeReportCorrelationMatrix(snapshot) {
    const attempts = getSortedAttempts(snapshot);
    if (attempts.length < 2) return null;

    const traits = ['O', 'C', 'E', 'A', 'N'];
    const metrics = ['academicStability', 'burnoutRisk', 'emotionalVolatility', 'persistenceQuotient'];
    const traitNames = { O: 'Openness', C: 'Conscientiousness', E: 'Extraversion', A: 'Agreeableness', N: 'Neuroticism' };
    const metricNames = {
        academicStability: 'Academic Stability',
        burnoutRisk: 'Burnout Risk',
        emotionalVolatility: 'Emotional Volatility',
        persistenceQuotient: 'Persistence',
    };

    // ── Extract time series ──
    const traitSeries = {};
    const metricSeries = {};
    for (const t of traits) traitSeries[t] = [];
    for (const m of metrics) metricSeries[m] = [];

    for (const att of attempts) {
        if (!att.traitScores) continue;
        for (const t of traits) {
            if (att.traitScores[t] != null) traitSeries[t].push(att.traitScores[t]);
        }
        const pi = att.computedInsights?.predictiveIndices;
        if (pi) {
            for (const m of metrics) {
                if (pi[m] != null) metricSeries[m].push(pi[m]);
            }
        }
    }

    // ── Full Trait × Metric correlation matrix ──
    const matrix = {};
    const significanceMatrix = {};
    for (const t of traits) {
        matrix[t] = {};
        significanceMatrix[t] = {};
        for (const m of metrics) {
            const r = pearson(traitSeries[t], metricSeries[m]);
            const n = Math.min(traitSeries[t].length, metricSeries[m].length);
            const pValue = simulatePValue(r, n);
            matrix[t][m] = r;
            significanceMatrix[t][m] = {
                r,
                pValue,
                significant: pValue < 0.05,
                strength: Math.abs(r) > 0.7 ? 'Strong' : Math.abs(r) > 0.4 ? 'Moderate' : Math.abs(r) > 0.2 ? 'Weak' : 'Negligible',
            };
        }
    }

    // ── Trait × Trait correlation matrix ──
    const traitTraitMatrix = {};
    for (const t1 of traits) {
        traitTraitMatrix[t1] = {};
        for (const t2 of traits) {
            traitTraitMatrix[t1][t2] = t1 === t2 ? 1.0 : pearson(traitSeries[t1], traitSeries[t2]);
        }
    }

    // ── Key correlations (highlighted) ──
    const keyCorrelations = [];
    for (const t of traits) {
        for (const m of metrics) {
            const s = significanceMatrix[t][m];
            if (s.strength !== 'Negligible') {
                keyCorrelations.push({
                    trait: traitNames[t],
                    metric: metricNames[m],
                    r: s.r,
                    pValue: s.pValue,
                    significant: s.significant,
                    strength: s.strength,
                    direction: s.r > 0 ? '↑ Positive' : '↓ Negative',
                });
            }
        }
    }
    keyCorrelations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    // ── Predictive Directional Indicators ──
    const directionalIndicators = traits.map(t => {
        const bestMetric = metrics.reduce((best, m) => {
            return Math.abs(matrix[t][m]) > Math.abs(matrix[t][best]) ? m : best;
        }, metrics[0]);
        return {
            trait: traitNames[t],
            strongestPredictor: metricNames[bestMetric],
            correlation: matrix[t][bestMetric],
            direction: matrix[t][bestMetric] > 0 ? 'Positive' : 'Negative',
        };
    });

    return {
        traitMetricMatrix: matrix,
        significanceMatrix,
        traitTraitMatrix,
        keyCorrelations,
        directionalIndicators,
        traits,
        metrics,
        traitNames,
        metricNames,
        sampleSize: attempts.length,
    };
}

// ── Helpers ──

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

function simulatePValue(r, n) {
    // Simulate p-value using t-distribution approximation
    if (n < 3) return 1.0;
    const t = Math.abs(r) * Math.sqrt((n - 2) / (1 - r * r + 0.0001));
    // Simple approximation: higher t → lower p-value
    const df = n - 2;
    const p = Math.exp(-0.717 * t - 0.416 * t * t / df);
    return Math.round(Math.min(1, Math.max(0.001, p)) * 1000) / 1000;
}

function getSortedAttempts(student) {
    if (!student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt && a.traitScores)
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

// ── Export ──
if (typeof window !== 'undefined') {
    window.computeReportCorrelationMatrix = computeReportCorrelationMatrix;
}
