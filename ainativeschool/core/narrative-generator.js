/* ═══════════════════════════════════════════════════════════════
   AI Native Schools — AI Narrative Generator
   ═══════════════════════════════════════════════════════════════
   Generates three audience-specific narrative summaries:
   1. Student-friendly (motivational tone)
   2. Teacher action summary (strategic tone)
   3. Parent-friendly explanation (explanatory tone)
   ═══════════════════════════════════════════════════════════════ */

// ─── Helpers ───────────────────────────────────────────────────

function getSortedAttempts(student) {
    if (!student.attempts) return [];
    return Object.values(student.attempts)
        .filter(a => a.completedAt)
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

function getLatestInsights(student) {
    const attempts = getSortedAttempts(student);
    if (attempts.length === 0) return null;
    const latest = attempts[attempts.length - 1];
    return latest.computedInsights || null;
}

function getTraitLevel(score) {
    if (score >= 65) return 'high';
    if (score >= 40) return 'moderate';
    return 'low';
}

// ─── Trait Descriptors ─────────────────────────────────────────

const TRAIT_NAMES = {
    O: 'Openness', C: 'Conscientiousness', E: 'Extraversion',
    A: 'Agreeableness', N: 'Neuroticism',
};

const TRAIT_STUDENT_DESC = {
    O: { high: 'creative and curious', moderate: 'balanced in curiosity', low: 'practical and grounded' },
    C: { high: 'organized and disciplined', moderate: 'reasonably structured', low: 'flexible and spontaneous' },
    E: { high: 'energetic and social', moderate: 'adaptable socially', low: 'thoughtful and introspective' },
    A: { high: 'kind and cooperative', moderate: 'balanced in social warmth', low: 'direct and independent' },
    N: { high: 'emotionally sensitive', moderate: 'emotionally aware', low: 'emotionally resilient' },
};

// ═══════════════════════════════════════════════════════════════
// STUDENT NARRATIVE (Motivational Tone)
// ═══════════════════════════════════════════════════════════════

function generateStudentNarrative(student, insights, attempts) {
    const name = student.name ? student.name.split(' ')[0] : 'Student';
    const lines = [];

    lines.push(`Hey ${name}! 🌟 Here's what your cognitive profile reveals about you:`);
    lines.push('');

    // Personality
    if (insights.nature) {
        lines.push(`You're a **${insights.nature}** — that's your core personality type, and it's something to be proud of.`);
    }

    // Traits
    if (attempts.length > 0 && attempts[attempts.length - 1].traitScores) {
        const scores = attempts[attempts.length - 1].traitScores;
        const topTraits = Object.entries(scores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([t]) => TRAIT_STUDENT_DESC[t][getTraitLevel(scores[t])]);
        lines.push(`Your standout qualities: you're **${topTraits.join('** and **')}**.`);
    }

    // CGI & Growth
    if (student.longitudinal && student.longitudinal.yearlyIndex.length > 0) {
        const latest = student.longitudinal.yearlyIndex[student.longitudinal.yearlyIndex.length - 1];
        const delta = student.longitudinal.delta;
        lines.push('');
        lines.push(`📈 Your Cognitive Growth Index is **${latest.score}/100**.`);
        if (delta > 0) {
            lines.push(`That's a **+${delta} point improvement** — you're growing! Keep up the great work.`);
        } else if (delta < 0) {
            lines.push(`It dipped by ${Math.abs(delta)} points recently, but that's okay — growth isn't always linear. Focus on consistency.`);
        }
    }

    // Resilience
    if (student.resilienceIndex) {
        const ri = student.resilienceIndex;
        if (ri.score >= 65) {
            lines.push('');
            lines.push(`💪 Your resilience score is **${ri.score}/100** — you bounce back strongly from challenges!`);
        } else if (ri.score < 40) {
            lines.push('');
            lines.push(`Your resilience score is ${ri.score}/100. Remember: every setback is a setup for a comeback. Take it one step at a time. 🌱`);
        }
    }

    // Strategy
    if (student.strategyProfile) {
        lines.push('');
        lines.push(`🎯 Your academic strategy type: **${student.strategyProfile.type}**.`);
        if (student.strategyProfile.strengths.length > 0) {
            lines.push(`Strengths: ${student.strategyProfile.strengths.join(', ')}.`);
        }
    }

    // Encouraging close
    lines.push('');
    lines.push('Remember — this is about understanding yourself better, not about being perfect. Every step forward counts! 🚀');

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// TEACHER NARRATIVE (Strategic Tone)
// ═══════════════════════════════════════════════════════════════

function generateTeacherNarrative(student, insights, attempts) {
    const name = student.name || 'Student';
    const lines = [];

    lines.push(`**Student Analysis: ${name}** (ID: ${student.studentId})`);
    lines.push('');

    // Profile Summary
    if (insights.nature) {
        lines.push(`**Profile Type:** ${insights.nature} | **Thinking:** ${insights.thinkingPattern || 'N/A'}`);
    }
    lines.push(`**EQ:** ${insights.EQ || 'N/A'} | **Leadership:** ${insights.leadership || 'N/A'}`);
    lines.push('');

    // Risk Assessment
    lines.push('**Risk Assessment:**');
    if (student.behavioralRisk) {
        lines.push(`- Behavioral risk: ${student.behavioralRisk.classification} (score: ${student.behavioralRisk.score})`);
    }
    if (student.dropoutPrediction) {
        lines.push(`- Dropout risk: ${student.dropoutPrediction.category} (${student.dropoutPrediction.probabilityScore}%)`);
    }
    if (insights.burnoutRisk) {
        lines.push(`- Burnout risk: ${insights.burnoutRisk}`);
    }
    lines.push('');

    // CGI Trend
    if (student.longitudinal && student.longitudinal.yearlyIndex.length > 0) {
        const latest = student.longitudinal.yearlyIndex[student.longitudinal.yearlyIndex.length - 1];
        lines.push(`**Cognitive Growth Index:** ${latest.score}/100 (Δ ${student.longitudinal.delta >= 0 ? '+' : ''}${student.longitudinal.delta})`);
    }

    // Action Items
    lines.push('');
    lines.push('**Recommended Actions:**');

    if (student.interventionPlan && student.interventionPlan.recommendedLoops) {
        for (const loop of student.interventionPlan.recommendedLoops) {
            lines.push(`- ${loop.type}: ${loop.description} (${loop.durationMinutes}min)`);
        }
    }

    if (student.alerts && student.alerts.filter(a => !a.resolved).length > 0) {
        lines.push('');
        lines.push('**⚠️ Active Alerts:**');
        for (const alert of student.alerts.filter(a => !a.resolved).slice(0, 3)) {
            lines.push(`- [${alert.severity.toUpperCase()}] ${alert.message}`);
        }
    }

    // Strategy Profile
    if (student.strategyProfile) {
        lines.push('');
        lines.push(`**Strategy Profile:** ${student.strategyProfile.type}`);
        if (student.strategyProfile.examRecommendations.length > 0) {
            lines.push(`**Exam Recommendations:** ${student.strategyProfile.examRecommendations.join('; ')}`);
        }
    }

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// PARENT NARRATIVE (Explanatory Tone)
// ═══════════════════════════════════════════════════════════════

function generateParentNarrative(student, insights, attempts) {
    const name = student.name ? student.name.split(' ')[0] : 'your child';
    const lines = [];

    lines.push(`**Understanding ${name}'s Cognitive Profile**`);
    lines.push('');
    lines.push(`Dear Parent,`);
    lines.push('');
    lines.push(`Based on ${name}'s psychometric assessment, here is what we've observed about their cognitive and behavioral development.`);
    lines.push('');

    // Personality
    if (insights.nature) {
        lines.push(`**Personality Type: ${insights.nature}**`);
        lines.push('');
        lines.push(`This means ${name} tends to approach the world with a consistent set of traits. This helps us understand how to best support their learning journey.`);
    }

    // Emotional
    lines.push('');
    lines.push('**Emotional Development:**');
    if (insights.EQ === 'High EQ') {
        lines.push(`${name} shows strong emotional awareness and empathy — a wonderful foundation for both academic and social success.`);
    } else if (insights.EQ === 'Developing EQ') {
        lines.push(`${name} is developing emotional awareness. With encouragement and safe spaces for expression, this area will continue to grow.`);
    } else {
        lines.push(`${name} may benefit from additional support in understanding and managing emotions. This is very common and very improvable.`);
    }

    // Growth
    if (student.longitudinal && student.longitudinal.yearlyIndex.length > 0) {
        const latest = student.longitudinal.yearlyIndex[student.longitudinal.yearlyIndex.length - 1];
        const delta = student.longitudinal.delta;
        lines.push('');
        lines.push('**Growth Trajectory:**');
        lines.push(`${name}'s overall cognitive growth score is ${latest.score} out of 100.`);
        if (delta > 0) {
            lines.push(`This has improved by ${delta} points — ${name} is making meaningful progress.`);
        } else if (delta === 0) {
            lines.push(`This has remained stable, which indicates consistent effort.`);
        } else {
            lines.push(`We noticed a small dip of ${Math.abs(delta)} points. This can happen during growth phases and doesn't indicate a problem by itself.`);
        }
    }

    // Resilience
    if (student.resilienceIndex) {
        lines.push('');
        lines.push('**Resilience:**');
        if (student.resilienceIndex.score >= 60) {
            lines.push(`${name} demonstrates good resilience — the ability to recover from setbacks and maintain motivation.`);
        } else {
            lines.push(`${name} may sometimes struggle with bouncing back from difficulties. Consistent encouragement and a patient approach at home will help strengthen this.`);
        }
    }

    // What you can do
    lines.push('');
    lines.push('**How You Can Help:**');
    lines.push(`- Encourage ${name} to talk about their learning experiences — what felt easy, what felt hard.`);
    lines.push('- Celebrate effort and growth, not just results.');
    lines.push('- Maintain a consistent routine for studying and rest.');
    if (student.strategyProfile) {
        lines.push(`- ${name}'s learning style is "${student.strategyProfile.type}" — ask the school for specific strategies that support this style.`);
    }

    lines.push('');
    lines.push('This report is designed to help you support your child effectively. If you have questions, please reach out to the school counselor.');

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// MAIN: generateNarratives(student)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate three audience-specific narrative summaries.
 * @param {object} student - Student object from storage
 * @returns {object|null} Narratives object or null
 */
function generateNarratives(student) {
    if (!student) return null;

    const insights = getLatestInsights(student);
    if (!insights) return null;

    const attempts = getSortedAttempts(student);
    if (attempts.length === 0) return null;

    const narratives = {
        studentVersion: generateStudentNarrative(student, insights, attempts),
        teacherVersion: generateTeacherNarrative(student, insights, attempts),
        parentVersion: generateParentNarrative(student, insights, attempts),
    };

    // ── Safely extend student object ──
    student.narratives = narratives;

    return narratives;
}

// ─── Global Exports ────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.generateNarratives = generateNarratives;
}
