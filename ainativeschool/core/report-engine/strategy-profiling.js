/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Strategic Academic Profiling
   ═══════════════════════════════════════════════════════════════
   Classifies student cognitive tempo, decision risk pattern,
   strategic exam archetype, and generates performance quadrant
   and cluster mapping data.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Compute strategic academic profiling for a student snapshot.
 * @param {object} snapshot - Deep-cloned student data
 * @returns {object|null} Strategy profiling model
 */
function computeReportStrategyProfiling(snapshot) {
    const attempts = getSortedAttempts(snapshot);
    if (attempts.length === 0) return null;

    const latest = attempts[attempts.length - 1];
    const traits = latest.traitScores || { O: 50, C: 50, E: 50, A: 50, N: 50 };
    const tVals = getTimingValues(latest);
    const rVals = Object.values(latest.responses || {}).map(Number);

    // ── Cognitive Tempo Profile ──
    const tempoProfile = classifyCognitiveTempo(tVals, rVals);

    // ── Decision Risk Pattern ──
    const decisionRisk = classifyDecisionRisk(rVals, traits, latest);

    // ── Strategic Exam Archetype ──
    const archetype = classifyArchetype(tempoProfile, decisionRisk, traits, snapshot);

    // ── Performance Quadrant ──
    const quadrant = computePerformanceQuadrant(tVals, rVals, traits);

    // ── Risk vs Accuracy Scatter Data ──
    const scatterData = computeRiskAccuracyScatter(attempts);

    // ── Strategy Cluster Mapping ──
    const clusterMap = computeClusterMapping(tempoProfile, decisionRisk, archetype);

    // ── Existing strategy profile data ──
    const existingProfile = snapshot.strategyProfile || {};

    return {
        tempoProfile,
        decisionRisk,
        archetype,
        quadrant,
        scatterData,
        clusterMap,
        existingProfile: {
            type: existingProfile.type || null,
            strengths: existingProfile.strengths || [],
            weaknesses: existingProfile.weaknesses || [],
        },
    };
}

function classifyCognitiveTempo(tVals, rVals) {
    if (tVals.length === 0) return { type: 'Unknown', speed: 50, consistency: 50 };

    const avgTime = tVals.reduce((a, b) => a + b, 0) / tVals.length;
    const sd = stdDev(tVals);
    const cv = avgTime > 0 ? sd / avgTime : 0;
    const speed = clamp(100 - (avgTime / 30) * 100);
    const consistency = clamp(100 - cv * 100);

    let type;
    if (speed > 65 && consistency > 60) type = 'Rapid-Consistent';
    else if (speed > 65 && consistency <= 60) type = 'Rapid-Variable';
    else if (speed <= 35 && consistency > 60) type = 'Deliberate-Consistent';
    else if (speed <= 35 && consistency <= 60) type = 'Deliberate-Variable';
    else if (consistency > 70) type = 'Methodical';
    else type = 'Adaptive';

    return {
        type,
        speed,
        consistency,
        avgResponseTime: Math.round(avgTime * 100) / 100,
        timeVariability: Math.round(cv * 100) / 100,
        description: getTempoDescription(type),
    };
}

function getTempoDescription(type) {
    const descs = {
        'Rapid-Consistent': 'Fast processor with stable timing — high cognitive throughput.',
        'Rapid-Variable': 'Fast but erratic timing — may indicate selective engagement.',
        'Deliberate-Consistent': 'Thoughtful, steady approach — values accuracy over speed.',
        'Deliberate-Variable': 'Slow with variable pacing — possible engagement difficulties.',
        'Methodical': 'Highly consistent pacing — strong self-regulation.',
        'Adaptive': 'Flexible pacing that adjusts to question difficulty.',
    };
    return descs[type] || 'Standard cognitive tempo pattern.';
}

function classifyDecisionRisk(rVals, traits, attempt) {
    const conf = attempt.confidenceScore || 50;
    const avgResponse = rVals.length > 0 ? rVals.reduce((a, b) => a + b, 0) / rVals.length : 3;
    const responseSpread = rVals.length > 1 ? stdDev(rVals) : 0;

    // High confidence + high spread = risk-taking
    // Low confidence + low spread = risk-averse
    const riskTaking = clamp(conf * 0.4 + responseSpread * 30 + (100 - traits.N) * 0.2);

    let pattern;
    if (riskTaking > 70) pattern = 'Risk-Seeking';
    else if (riskTaking > 55) pattern = 'Moderate Risk';
    else if (riskTaking > 40) pattern = 'Risk-Neutral';
    else pattern = 'Risk-Averse';

    return {
        pattern,
        riskScore: riskTaking,
        confidenceLevel: conf,
        responseVariability: Math.round(responseSpread * 100) / 100,
        description: getDecisionDescription(pattern),
    };
}

function getDecisionDescription(pattern) {
    const descs = {
        'Risk-Seeking': 'Tends toward bold decisions with high variability — may benefit from calibration exercises.',
        'Moderate Risk': 'Balanced risk tolerance — adapts decision-making to context.',
        'Risk-Neutral': 'Consistent, measured decision-making — neither aggressive nor cautious.',
        'Risk-Averse': 'Conservative approach — prioritizes safety over potential gains.',
    };
    return descs[pattern] || 'Standard decision-making pattern.';
}

function classifyArchetype(tempo, risk, traits, snapshot) {
    const cgi = snapshot.cognitiveGrowthIndex?.composite ?? 50;
    const resilience = snapshot.resilienceIndex?.composite ?? 50;

    let archetype, description;
    if (tempo.speed > 60 && risk.riskScore > 60 && cgi > 60) {
        archetype = 'High-Performance Sprinter';
        description = 'Combines rapid processing with risk tolerance — thrives in competitive, time-pressured environments.';
    } else if (tempo.consistency > 70 && traits.C > 65 && resilience > 60) {
        archetype = 'Systematic Strategist';
        description = 'Methodical, disciplined approach with strong resilience — excels in structured, long-form assessments.';
    } else if (traits.O > 65 && risk.riskScore > 55) {
        archetype = 'Creative Explorer';
        description = 'High openness with moderate risk tolerance — suited for open-ended, creative problem-solving.';
    } else if (traits.A > 65 && tempo.consistency > 60) {
        archetype = 'Collaborative Learner';
        description = 'Strong agreeableness with consistent pacing — thrives in group learning environments.';
    } else if (risk.riskScore < 40 && tempo.speed < 40) {
        archetype = 'Careful Analyst';
        description = 'Deliberate and cautious — deep thinker who benefits from extended time and low-pressure contexts.';
    } else {
        archetype = 'Adaptive Generalist';
        description = 'Balanced profile across dimensions — versatile learner with no extreme specialization.';
    }

    return { archetype, description, confidenceFactors: { tempo: tempo.type, risk: risk.pattern, cgi, resilience } };
}

function computePerformanceQuadrant(tVals, rVals, traits) {
    const speed = tVals.length > 0
        ? clamp(100 - (tVals.reduce((a, b) => a + b, 0) / tVals.length / 30) * 100)
        : 50;
    const accuracy = rVals.length > 0
        ? clamp((rVals.reduce((a, b) => a + b, 0) / rVals.length / 5) * 100)
        : 50;

    let quadrant;
    if (speed > 55 && accuracy > 55) quadrant = 'High Speed — High Accuracy';
    else if (speed > 55 && accuracy <= 55) quadrant = 'High Speed — Low Accuracy';
    else if (speed <= 55 && accuracy > 55) quadrant = 'Low Speed — High Accuracy';
    else quadrant = 'Low Speed — Low Accuracy';

    return { speed, accuracy, quadrant };
}

function computeRiskAccuracyScatter(attempts) {
    return attempts.map((att, idx) => {
        const riskScore = att.computedInsights?.predictiveIndices?.burnoutRisk ?? 50;
        const rVals = Object.values(att.responses || {}).map(Number);
        const accuracy = rVals.length > 0
            ? clamp((rVals.reduce((a, b) => a + b, 0) / rVals.length / 5) * 100)
            : 50;
        return { attempt: idx + 1, risk: riskScore, accuracy, date: att.completedAt || att.startedAt };
    });
}

function computeClusterMapping(tempo, risk, archetype) {
    // Simplified 2D cluster map data
    return {
        x: tempo.speed,
        y: risk.riskScore,
        label: archetype.archetype,
        clusters: [
            { name: 'High-Performance Sprinter', cx: 75, cy: 70, radius: 15 },
            { name: 'Systematic Strategist', cx: 35, cy: 35, radius: 15 },
            { name: 'Creative Explorer', cx: 60, cy: 60, radius: 15 },
            { name: 'Careful Analyst', cx: 25, cy: 25, radius: 15 },
            { name: 'Adaptive Generalist', cx: 50, cy: 50, radius: 20 },
        ],
    };
}

// ── Helpers ──
function clamp(val) { return Math.max(0, Math.min(100, Math.round(val))); }

function stdDev(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

function getSortedAttempts(student) {
    if (!student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt && a.traitScores)
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

function getTimingValues(attempt) {
    return Object.values(attempt.timePerQuestion || {}).map(Number).filter(v => !isNaN(v));
}

// ── Export ──
if (typeof window !== 'undefined') {
    window.computeReportStrategyProfiling = computeReportStrategyProfiling;
}
