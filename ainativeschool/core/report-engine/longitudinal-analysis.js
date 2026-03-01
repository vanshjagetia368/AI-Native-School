/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Longitudinal Cognitive Growth Analytics
   ═══════════════════════════════════════════════════════════════
   Computes year-over-year CGI delta, growth momentum, acceleration
   detection, and improvement elasticity ratios.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute longitudinal growth analytics.
 * @param {object} snapshot - Deep-cloned student data
 * @returns {object|null} Longitudinal analysis model
 */
function computeLongitudinalAnalysis(snapshot) {
    const attempts = getSortedAttempts(snapshot);
    if (attempts.length < 2) return null;

    // ── Compute CGI series across attempts ──
    const cgiSeries = computeCGISeries(snapshot, attempts);

    // ── Year-over-Year Delta ──
    const yoyDelta = computeYoYDelta(cgiSeries);

    // ── Acceleration vs Stagnation ──
    const accelerationAnalysis = detectAcceleration(cgiSeries);

    // ── Growth Momentum Index ──
    const momentum = computeMomentumIndex(cgiSeries);

    // ── Improvement Elasticity Ratio ──
    const elasticity = computeElasticity(cgiSeries, attempts);

    // ── Per-trait growth trajectories ──
    const traitGrowth = computeTraitGrowth(attempts);

    return {
        cgiSeries,
        yoyDelta,
        accelerationAnalysis,
        momentumIndex: momentum,
        elasticity,
        traitGrowth,
        totalAttempts: attempts.length,
        timeSpan: computeTimeSpan(attempts),
    };
}

// ── Analysis Functions ──

function computeCGISeries(snapshot, attempts) {
    const series = [];
    for (let i = 0; i < attempts.length; i++) {
        const att = attempts[i];
        const traits = att.traitScores || {};
        const pi = att.computedInsights?.predictiveIndices || {};

        // Compute a simplified CGI proxy per attempt
        const traitAvg = Object.values(traits).length > 0
            ? Object.values(traits).reduce((a, b) => a + b, 0) / Object.values(traits).length
            : 50;
        const stability = pi.academicStability || traitAvg;
        const burnout = pi.burnoutRisk || 50;
        const cgiProxy = clamp(traitAvg * 0.3 + stability * 0.3 + (100 - burnout) * 0.2 + traitAvg * 0.2);

        series.push({
            attempt: i + 1,
            date: att.completedAt || att.startedAt,
            cgi: cgiProxy,
            traitAvg: Math.round(traitAvg * 10) / 10,
            stability: Math.round(stability * 10) / 10,
        });
    }
    return series;
}

function computeYoYDelta(series) {
    if (series.length < 2) return { delta: 0, direction: 'stable' };
    const first = series[0].cgi;
    const last = series[series.length - 1].cgi;
    const delta = last - first;
    return {
        delta: Math.round(delta * 10) / 10,
        firstScore: first,
        lastScore: last,
        direction: delta > 5 ? 'improving' : delta < -5 ? 'declining' : 'stable',
        percentChange: first > 0 ? Math.round((delta / first) * 100 * 10) / 10 : 0,
    };
}

function detectAcceleration(series) {
    if (series.length < 3) return { type: 'insufficient_data', rate: 0 };
    const deltas = [];
    for (let i = 1; i < series.length; i++) {
        deltas.push(series[i].cgi - series[i - 1].cgi);
    }
    // Acceleration = change in deltas
    const accelValues = [];
    for (let i = 1; i < deltas.length; i++) {
        accelValues.push(deltas[i] - deltas[i - 1]);
    }
    const avgAccel = accelValues.length > 0
        ? accelValues.reduce((a, b) => a + b, 0) / accelValues.length
        : 0;

    return {
        type: avgAccel > 2 ? 'accelerating' : avgAccel < -2 ? 'decelerating' : 'linear',
        rate: Math.round(avgAccel * 100) / 100,
        deltas: deltas.map((d, i) => ({
            from: i + 1,
            to: i + 2,
            delta: Math.round(d * 10) / 10,
        })),
    };
}

function computeMomentumIndex(series) {
    if (series.length < 2) return { index: 50, label: 'Neutral' };
    // Weighted recent deltas (recent changes matter more)
    const deltas = [];
    for (let i = 1; i < series.length; i++) {
        const weight = (i / series.length);
        deltas.push((series[i].cgi - series[i - 1].cgi) * weight);
    }
    const totalWeight = deltas.length * (deltas.length + 1) / (2 * deltas.length);
    const momentumRaw = deltas.reduce((a, b) => a + b, 0) / (totalWeight || 1);
    const index = clamp(50 + momentumRaw * 5);

    return {
        index,
        label: index > 65 ? 'Strong Positive' : index > 55 ? 'Positive' : index > 45 ? 'Neutral' : index > 35 ? 'Negative' : 'Concerning',
        rawMomentum: Math.round(momentumRaw * 100) / 100,
    };
}

function computeElasticity(series, attempts) {
    if (series.length < 2) return { ratio: 0 };
    // Elasticity: responsiveness to time investment
    // (% change in CGI) / (normalized time between attempts)
    const cgiChange = Math.abs(series[series.length - 1].cgi - series[0].cgi);
    const firstDate = new Date(attempts[0].startedAt);
    const lastDate = new Date(attempts[attempts.length - 1].startedAt);
    const daysBetween = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const attemptsPerDay = attempts.length / daysBetween;

    return {
        ratio: Math.round((cgiChange / (daysBetween / 30)) * 100) / 100, // Points per month
        cgiChange: Math.round(cgiChange * 10) / 10,
        daysSpan: Math.round(daysBetween),
        attemptsPerMonth: Math.round(attemptsPerDay * 30 * 10) / 10,
    };
}

function computeTraitGrowth(attempts) {
    const traits = ['O', 'C', 'E', 'A', 'N'];
    const traitNames = { O: 'Openness', C: 'Conscientiousness', E: 'Extraversion', A: 'Agreeableness', N: 'Neuroticism' };
    const growth = {};
    for (const t of traits) {
        const values = attempts.map(a => a.traitScores?.[t]).filter(v => v != null);
        if (values.length < 2) {
            growth[t] = { name: traitNames[t], values, delta: 0, direction: 'stable' };
            continue;
        }
        const delta = values[values.length - 1] - values[0];
        growth[t] = {
            name: traitNames[t],
            values,
            delta: Math.round(delta * 10) / 10,
            direction: delta > 3 ? 'growing' : delta < -3 ? 'declining' : 'stable',
            first: values[0],
            last: values[values.length - 1],
        };
    }
    return growth;
}

function computeTimeSpan(attempts) {
    if (attempts.length < 2) return { days: 0, label: 'Single assessment' };
    const first = new Date(attempts[0].startedAt);
    const last = new Date(attempts[attempts.length - 1].startedAt);
    const days = Math.round((last - first) / (1000 * 60 * 60 * 24));
    return {
        days,
        label: days > 365 ? `${Math.round(days / 365)} year(s)` : days > 30 ? `${Math.round(days / 30)} month(s)` : `${days} day(s)`,
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

// ── Export ──
if (typeof window !== 'undefined') {
    window.computeLongitudinalAnalysis = computeLongitudinalAnalysis;
}
