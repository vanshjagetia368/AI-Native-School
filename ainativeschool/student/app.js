/* ═══════════════════════════════════════════════════════════════
   AI Native Schools — Student Dashboard App Controller
   SPA router, state management, section registry, event bindings.
   ═══════════════════════════════════════════════════════════════ */

import { getSchool } from '../js/storage.js';
import { initThemeToggle } from '../js/ui.js';
import { validateSession, destroySession } from '../js/session-utils.js';
import { showToast } from '../js/toast.js';
import { computeBehavioralRisk, generateInterventionPlan, computeRiskHistory } from '../core/behavioral-risk-engine.js';

// ─── Section Registry ──────────────────────────────────────────
const SECTIONS = [
    {
        id: 'home',
        label: 'Overview',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        navGroup: 'platform',
    },
    {
        id: 'assessment',
        label: 'Personal Assessment',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
        emoji: '🧠',
        desc: 'Map your psychological architecture across 8 deep insight dimensions.',
        navGroup: 'platform',
        active: true,
    },
    {
        id: 'cognitive-growth',
        label: 'Cognitive Growth',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
        emoji: '📈',
        desc: 'Track the evolution of your deep cognitive traits over time and multiple assessments.',
        navGroup: 'platform',
        active: true,
    },
    {
        id: 'skill-mapping',
        label: 'Skill Correlation',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        emoji: '🎯',
        desc: 'Discover how your personality correlates with academic performance and professional skills.',
        navGroup: 'platform',
        active: true,
    },
    {
        id: 'research-insights',
        label: 'AI Insights',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
        emoji: '🔬',
        desc: 'AI-generated narrative insights tailored for you, your teachers, and your parents.',
        navGroup: 'platform',
        active: true,
    },
    {
        id: 'emotional-intelligence',
        label: 'Emotional Intelligence',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
        emoji: '💡',
        desc: 'Understand and develop your emotional awareness, empathy, and interpersonal skills.',
        navGroup: 'intelligence',
        comingSoon: true,
    },
    {
        id: 'learning-behavior',
        label: 'Learning Behavior',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
        emoji: '📚',
        desc: 'Analyze your learning patterns, study habits, and knowledge absorption style.',
        navGroup: 'intelligence',
        comingSoon: true,
    },
    {
        id: 'vocational-development',
        label: 'Vocational Development',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
        emoji: '💼',
        desc: 'Explore career pathways aligned with your cognitive profile and aptitudes.',
        navGroup: 'intelligence',
        comingSoon: true,
    },
    {
        id: 'project-learning',
        label: 'Project-Based Learning',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
        emoji: '🧩',
        desc: 'Hands-on project suggestions tailored to your strengths and interests.',
        navGroup: 'growth',
        comingSoon: true,
    },
    {
        id: 'behavioral-intelligence',
        label: 'Behavioral Intelligence',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
        emoji: '🧬',
        desc: 'Composite behavioral risk analysis with predictive intervention recommendations.',
        navGroup: 'growth',
        active: true,
    },
    {
        id: 'exam-insights',
        label: 'Examination Insights',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
        emoji: '📊',
        desc: 'Performance analytics and cognitive patterns from your academic history.',
        navGroup: 'growth',
        comingSoon: true,
    },
    {
        id: 'documents',
        label: 'Documents & Certificates',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
        emoji: '📁',
        desc: 'Your assessment reports, certificates, and official documents in one place.',
        navGroup: 'growth',
        comingSoon: true,
    },
];

const NAV_GROUPS = {
    platform: 'Core Platform',
    intelligence: 'Intelligence Modules',
    growth: 'Growth & Records',
};

// ─── App State ─────────────────────────────────────────────────
const AppState = {
    session: null,
    currentSection: 'home',
    student: null,
};

// ─── Initialization ────────────────────────────────────────────
export function initApp() {
    // 1. Validate session
    const session = validateSession('student');
    if (!session) {
        throw new Error('Unauthorized or expired session');
    }
    AppState.session = session;

    // 2. Load student data
    const school = getSchool(session.schoolCode);
    if (school && school.classes) {
        for (const cls of school.classes) {
            const s = (cls.students || []).find(st => st.studentId === session.studentId);
            if (s) { AppState.student = { ...s, className: cls.className }; break; }
        }
    }

    // 3. Initialize UI
    initThemeToggle();
    renderUserInfo();
    renderSidebar();
    bindGlobalEvents();

    // 4. Route to initial section
    navigateTo('home');
}

// ─── Render User Info ──────────────────────────────────────────
function renderUserInfo() {
    // Use canonical student data from school tree, with session as fallback
    const student = AppState.student;
    const session = AppState.session;
    const name = (student && student.name) || session.name || 'Student';
    const className = (student && student.className) || session.className || 'Class';
    const firstName = name.split(' ')[0];

    // Warn if student data is missing
    if (!student || !student.name) {
        console.warn('[Dashboard] Student data incomplete:', student);
    }

    document.getElementById('welcome-text').textContent = `Welcome, ${firstName}`;
    document.getElementById('user-initial').textContent = name.charAt(0).toUpperCase();
    document.getElementById('user-name-display').textContent = name;
    document.getElementById('user-class-display').textContent = className;
}

// ─── Render Sidebar Nav ────────────────────────────────────────
function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    let html = '';
    let lastGroup = '';

    for (const sec of SECTIONS) {
        // Group label
        if (sec.navGroup !== lastGroup) {
            html += `<div class="snav-label">${NAV_GROUPS[sec.navGroup]}</div>`;
            lastGroup = sec.navGroup;
        }

        html += `
            <button class="snav-item${sec.id === AppState.currentSection ? ' active' : ''}"
                    data-section="${sec.id}">
                ${sec.icon}
                <span>${sec.label}</span>
            </button>
        `;
    }

    nav.innerHTML = html;

    // Event delegation — handles clicks on SVG children inside buttons
    nav.addEventListener('click', (e) => {
        const btn = e.target.closest('.snav-item');
        if (btn && btn.dataset.section) {
            navigateTo(btn.dataset.section);
            closeMobileSidebar();
        }
    });
}

// ─── SPA Router ────────────────────────────────────────────────
export function navigateTo(sectionId) {
    AppState.currentSection = sectionId;
    const container = document.getElementById('section-container');

    // Update nav active state
    document.querySelectorAll('.snav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionId);
    });

    // Render section
    if (sectionId === 'home') {
        container.innerHTML = renderHomeSection();
        bindHomeEvents();
    } else if (sectionId === 'assessment') {
        container.innerHTML = renderHomeSection();
        bindHomeEvents();
        // Open the assessment modal directly
        setTimeout(() => openAssessmentModal(), 100);
    } else if (sectionId === 'behavioral-intelligence') {
        container.innerHTML = renderBehavioralIntelligence();
        initBehavioralCharts();
    } else if (sectionId === 'cognitive-growth') {
        container.innerHTML = renderCognitiveGrowthSection();
        initCGICharts();
    } else if (sectionId === 'skill-mapping') {
        container.innerHTML = renderSkillCorrelationSection();
        initCorrelationChart();
    } else if (sectionId === 'research-insights') {
        container.innerHTML = renderNarrativeInsightsSection();
    } else {
        const sec = SECTIONS.find(s => s.id === sectionId);
        if (sec && sec.comingSoon) {
            container.innerHTML = renderComingSoonSection(sec);
        }
    }
}

// ─── Home Section (Dashboard Grid) ─────────────────────────────
function renderHomeSection() {
    // Build "coming soon" cards for the first few feature sections
    const featureCards = SECTIONS
        .filter(s => s.comingSoon && s.navGroup === 'platform')
        .slice(0, 3)
        .map(s => `
            <div class="feature-card card-soon" data-section="${s.id}">
                <div class="soon-icon">${s.emoji}</div>
                <h3 class="soon-title">${s.label}</h3>
                <p class="soon-desc">${s.desc}</p>
                <span class="soon-badge">Coming Soon</span>
            </div>
        `).join('');

    return `
        <div class="dashboard-grid">
            <div class="feature-card card-hero" id="open-assessment-btn">
                <div class="hero-content">
                    <span class="hero-tag">Core Module</span>
                    <h2 class="hero-title">Personal Assessment</h2>
                    <p class="hero-sub">Map your psychological architecture across 8 deep insight dimensions. This forms the foundation of your personalized learning journey.</p>
                    <div class="hero-action">
                        Enter Assessment Module
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </div>
                </div>
                <div class="hero-art">🧠</div>
            </div>
            ${featureCards}
        </div>
    `;
}

function bindHomeEvents() {
    // Hero card click → open assessment modal
    const heroBtn = document.getElementById('open-assessment-btn');
    if (heroBtn) {
        heroBtn.addEventListener('click', () => openAssessmentModal());
    }

    // Coming soon card clicks → navigate to section
    document.querySelectorAll('.card-soon[data-section]').forEach(card => {
        card.addEventListener('click', () => navigateTo(card.dataset.section));
    });
}

// ─── Coming Soon Section ───────────────────────────────────────
function renderComingSoonSection(sec) {
    return `
        <div class="section-view section-coming-soon-view">
            <div class="section-header">
                <div class="section-header-icon">${sec.emoji}</div>
                <div>
                    <h2 class="section-header-title">${sec.label}</h2>
                    <p class="section-header-sub">${sec.desc}</p>
                </div>
            </div>
            <div class="section-coming-soon">
                <div class="cs-icon">🚧</div>
                <h3>Under Development</h3>
                <p>The AI Native Research Division is building something extraordinary for this module. Stay tuned for updates.</p>
            </div>
        </div>
    `;
}

// ─── Assessment Modal ──────────────────────────────────────────
function openAssessmentModal() {
    const overlay = document.getElementById('assessment-modal');
    const s = AppState.session;
    const firstName = s.name ? s.name.split(' ')[0] : 'Student';

    document.getElementById('modal-welcome').innerHTML = `Hello ${firstName} 👋<br/>Welcome to your Cognitive Journey.`;

    // Attempt info
    const info = getAttemptInfo();
    document.getElementById('modal-attempt-count').textContent = info.count;
    document.getElementById('modal-last-date').textContent = info.lastDate || 'Not started';

    createParticles();
    overlay.classList.add('open');
}

function closeAssessmentModal() {
    const overlay = document.getElementById('assessment-modal');
    overlay.classList.remove('open');
    setTimeout(() => {
        const pc = document.getElementById('particles-container');
        if (pc) pc.innerHTML = '';
    }, 500);
}

function getAttemptInfo() {
    const school = getSchool(AppState.session.schoolCode);
    if (!school) return { count: 0, lastDate: null };

    let student = null;
    for (const cls of school.classes) {
        const s = cls.students.find(st => st.studentId === AppState.session.studentId);
        if (s) { student = s; break; }
    }

    if (!student || !student.attempts || Object.keys(student.attempts).length === 0) {
        return { count: 0, lastDate: null };
    }

    const attempts = Object.values(student.attempts).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    return {
        count: attempts.length,
        lastDate: attempts[0].completedAt ? new Date(attempts[0].completedAt).toLocaleDateString() : 'Incomplete',
    };
}

function createParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 6 + 2;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDuration = `${Math.random() * 10 + 10}s`;
        p.style.animationDelay = `-${Math.random() * 10}s`;
        container.appendChild(p);
    }
}

// ─── Global Event Bindings ─────────────────────────────────────
function bindGlobalEvents() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => destroySession());

    // Mobile menu
    const sidebar = document.getElementById('student-sidebar');
    const overlay = document.getElementById('mobile-overlay');
    const menuBtn = document.getElementById('mobile-menu-btn');

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            overlay.classList.add('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => closeMobileSidebar());
    }

    // Assessment modal close
    document.getElementById('close-assessment-modal').addEventListener('click', () => closeAssessmentModal());
    document.getElementById('assessment-modal').addEventListener('click', (e) => {
        if (e.target.id === 'assessment-modal') closeAssessmentModal();
    });

    // Start test button
    document.getElementById('start-test-btn').addEventListener('click', () => {
        const btn = document.getElementById('start-test-btn');
        btn.innerHTML = '<div class="spinner" style="border-width:2px;width:20px;height:20px;border-top-color:var(--accent)"></div> Redirecting...';
        btn.disabled = true;
        setTimeout(() => { window.location.href = '../test.html'; }, 800);
    });

    // ESC key closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAssessmentModal();
            closeMobileSidebar();
        }
    });
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('student-sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
}

// ─── Behavioral Intelligence Section ───────────────────────────
function renderBehavioralIntelligence() {
    // Re-read student data from storage for freshness
    const school = getSchool(AppState.session.schoolCode);
    let student = null;
    if (school && school.classes) {
        for (const cls of school.classes) {
            const s = (cls.students || []).find(st => st.studentId === AppState.session.studentId);
            if (s) { student = s; break; }
        }
    }

    const risk = student ? computeBehavioralRisk(student) : null;
    const interventions = risk ? generateInterventionPlan(risk) : null;
    const history = student ? computeRiskHistory(student) : [];

    // Insufficient data state
    if (!risk) {
        return `
            <div class="section-view">
                <div class="section-header">
                    <div class="section-header-icon">🧬</div>
                    <div>
                        <h2 class="section-header-title">Behavioral Intelligence</h2>
                        <p class="section-header-sub">Composite behavioral risk analysis with predictive intervention recommendations.</p>
                    </div>
                </div>
                <div class="bi-insufficient">
                    <div class="bi-insuff-icon">📊</div>
                    <h3>Insufficient Data for Risk Modeling</h3>
                    <p>Complete at least 2 assessments to unlock your behavioral risk analysis. Each assessment adds deeper insight into your cognitive patterns.</p>
                    <button class="bi-start-btn" onclick="document.querySelector('[data-section=assessment]')?.click()">Take Assessment →</button>
                </div>
            </div>`;
    }

    // Risk color and emoji mapping
    const riskColor = risk.score <= 40 ? '#e85c7a' : risk.score <= 70 ? '#e8924a' : '#4acea0';
    const riskEmoji = risk.score <= 40 ? '🔴' : risk.score <= 70 ? '🟡' : '🟢';

    // Component labels for display
    const componentMeta = {
        accuracy: { label: 'Accuracy', icon: '🎯', color: '#4acea0' },
        timeVariance: { label: 'Time Variance', icon: '⏱️', color: '#7b9cf5' },
        dropOff: { label: 'Drop-off', icon: '📉', color: '#e8924a' },
        confidenceGap: { label: 'Confidence Gap', icon: '🔮', color: '#b07cf5' },
    };

    // Build component bars HTML
    const componentBarsHTML = Object.entries(risk.components).map(([key, val]) => {
        const meta = componentMeta[key];
        const barColor = val <= 40 ? '#e85c7a' : val <= 70 ? '#e8924a' : '#4acea0';
        return `
            <div class="bi-comp-row">
                <div class="bi-comp-label">
                    <span class="bi-comp-icon">${meta.icon}</span>
                    <span>${meta.label}</span>
                </div>
                <div class="bi-comp-bar-track">
                    <div class="bi-comp-bar-fill" style="width:${val}%;background:${barColor}"></div>
                </div>
                <span class="bi-comp-val">${val}</span>
            </div>`;
    }).join('');

    // Build intervention cards HTML
    let interventionHTML = '';
    if (interventions && interventions.recommendedLoops.length > 0) {
        interventionHTML = interventions.recommendedLoops.map(loop => `
            <div class="bi-intervention-card">
                <div class="bi-intv-header">
                    <span class="bi-intv-type">${loop.type}</span>
                    <span class="bi-intv-dur">${loop.durationMinutes} min</span>
                </div>
                <p class="bi-intv-desc">${loop.description}</p>
                <div class="bi-intv-meta">
                    <span class="bi-intv-diff">Difficulty: ${loop.difficulty}</span>
                </div>
            </div>
        `).join('');
    } else {
        interventionHTML = `<div class="bi-no-intv">✅ No interventions needed — all behavioral components are within healthy range.</div>`;
    }

    // Build the stroke-dasharray values for the circular progress
    const circumference = 2 * Math.PI * 54; // radius = 54
    const strokeDash = (risk.score / 100) * circumference;

    return `
        <div class="section-view">
            <div class="section-header">
                <div class="section-header-icon">🧬</div>
                <div>
                    <h2 class="section-header-title">Behavioral Intelligence</h2>
                    <p class="section-header-sub">Composite behavioral risk analysis with predictive intervention recommendations.</p>
                </div>
            </div>

            <div class="bi-grid">
                <!-- Composite Score Card -->
                <div class="bi-card bi-score-card">
                    <div class="bi-card-title">Composite Risk Score</div>
                    <div class="bi-score-content">
                        <div class="bi-circle-wrap">
                            <svg class="bi-circle-svg" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" stroke-width="8"/>
                                <circle cx="60" cy="60" r="54" fill="none" stroke="${riskColor}" stroke-width="8"
                                    stroke-dasharray="${strokeDash} ${circumference}"
                                    stroke-linecap="round" transform="rotate(-90 60 60)" class="bi-circle-progress"/>
                            </svg>
                            <div class="bi-circle-center">
                                <span class="bi-circle-val">${risk.score}</span>
                                <span class="bi-circle-label">/ 100</span>
                            </div>
                        </div>
                        <div class="bi-score-meta">
                            <span class="bi-risk-badge" style="background:${riskColor}20;color:${riskColor};border:1px solid ${riskColor}40">
                                ${riskEmoji} ${risk.classification}
                            </span>
                            <span class="bi-updated">Updated ${new Date(risk.lastUpdated).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <!-- Component Breakdown Card -->
                <div class="bi-card bi-components-card">
                    <div class="bi-card-title">Component Breakdown</div>
                    <div class="bi-comp-list">
                        ${componentBarsHTML}
                    </div>
                </div>

                <!-- Trend Chart Card -->
                <div class="bi-card bi-trend-card">
                    <div class="bi-card-title">Risk Evolution Trend</div>
                    <div class="bi-trend-canvas-wrap">
                        <canvas id="bi-trend-canvas"></canvas>
                    </div>
                </div>

                <!-- Intervention Plan Card -->
                <div class="bi-card bi-interventions-card">
                    <div class="bi-card-title">🎯 Micro-Intervention Plan</div>
                    <div class="bi-intv-list">
                        ${interventionHTML}
                    </div>
                </div>
            </div>
        </div>`;
}

// ─── Helper: Get Fresh Student Data ───────────────────────────
function getStudentFresh() {
    const school = getSchool(AppState.session.schoolCode);
    if (!school || !school.classes) return null;
    for (const cls of school.classes) {
        const s = (cls.students || []).find(st => st.studentId === AppState.session.studentId);
        if (s) return s;
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// COGNITIVE GROWTH INDEX SECTION
// ═══════════════════════════════════════════════════════════════

function renderCognitiveGrowthSection() {
    const student = getStudentFresh();

    // No CGI data yet
    if (!student || !student.longitudinal || student.longitudinal.yearlyIndex.length === 0) {
        return `
            <div class="section-view">
                <div class="section-header">
                    <div class="section-header-icon">📈</div>
                    <div>
                        <h2 class="section-header-title">Cognitive Growth Index</h2>
                        <p class="section-header-sub">Longitudinal cognitive evolution across multiple assessments.</p>
                    </div>
                </div>
                <div class="bi-insufficient">
                    <div class="bi-insuff-icon">📊</div>
                    <h3>Growth Data Unavailable</h3>
                    <p>Complete at least one assessment to begin tracking your cognitive growth trajectory.</p>
                    <button class="bi-start-btn" onclick="document.querySelector('[data-section=assessment]')?.click()">Take Assessment →</button>
                </div>
            </div>`;
    }

    const latest = student.longitudinal.yearlyIndex[student.longitudinal.yearlyIndex.length - 1];
    const cgiScore = latest.score;
    const delta = student.longitudinal.delta;
    const deltaSign = delta >= 0 ? '+' : '';
    const deltaColor = delta > 0 ? '#4acea0' : delta < 0 ? '#e85c7a' : '#7070a0';

    // Score ring params
    const circumference = 2 * Math.PI * 54;
    const strokeDash = (cgiScore / 100) * circumference;
    const cgiColor = cgiScore >= 70 ? '#4acea0' : cgiScore >= 45 ? '#e8924a' : '#e85c7a';

    // Component bars (if available from latest attempt)
    const attempts = student.attempts ? Object.values(student.attempts).filter(a => a.completedAt) : [];
    const latestAttempt = attempts.length > 0 ? attempts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0] : null;

    // Resilience data
    const ri = student.resilienceIndex;
    const riScore = ri ? ri.score : null;
    const riTrend = ri ? ri.trend : 'stable';
    const riColor = riScore >= 60 ? '#4acea0' : riScore >= 40 ? '#e8924a' : '#e85c7a';
    const trendIcon = riTrend === 'improving' ? '↑' : riTrend === 'declining' ? '↓' : '→';

    // Strategy profile
    const sp = student.strategyProfile;

    // Dropout prediction
    const dp = student.dropoutPrediction;

    return `
        <div class="section-view">
            <div class="section-header">
                <div class="section-header-icon">📈</div>
                <div>
                    <h2 class="section-header-title">Cognitive Growth Index</h2>
                    <p class="section-header-sub">Longitudinal cognitive evolution across multiple assessments.</p>
                </div>
            </div>

            <div class="bi-grid">
                <!-- CGI Score Ring -->
                <div class="bi-card bi-score-card">
                    <div class="bi-card-title">Growth Index</div>
                    <div class="bi-score-content">
                        <div class="bi-circle-wrap">
                            <svg class="bi-circle-svg" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" stroke-width="8"/>
                                <circle cx="60" cy="60" r="54" fill="none" stroke="${cgiColor}" stroke-width="8"
                                    stroke-dasharray="${strokeDash} ${circumference}"
                                    stroke-linecap="round" transform="rotate(-90 60 60)" class="bi-circle-progress"/>
                            </svg>
                            <div class="bi-circle-center">
                                <span class="bi-circle-val">${cgiScore}</span>
                                <span class="bi-circle-label">/ 100</span>
                            </div>
                        </div>
                        <div class="bi-score-meta">
                            <span class="bi-risk-badge" style="background:${deltaColor}20;color:${deltaColor};border:1px solid ${deltaColor}40">
                                ${deltaSign}${delta} pts
                            </span>
                            <span class="bi-updated">Updated ${new Date(student.longitudinal.lastUpdated).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <!-- Longitudinal Trend -->
                <div class="bi-card bi-trend-card">
                    <div class="bi-card-title">Year-over-Year Trend</div>
                    <div class="bi-trend-canvas-wrap">
                        <canvas id="cgi-trend-canvas"></canvas>
                    </div>
                </div>

                <!-- Resilience Index -->
                <div class="bi-card">
                    <div class="bi-card-title">🛡️ Resilience Index</div>
                    ${riScore != null ? `
                        <div class="bi-score-content" style="text-align:center">
                            <div style="font-size:3rem;font-weight:700;color:${riColor}">${riScore}</div>
                            <div style="font-size:.85rem;color:var(--text-muted);margin-top:4px">out of 100</div>
                            <div style="margin-top:12px">
                                <span class="bi-risk-badge" style="background:${riColor}20;color:${riColor};border:1px solid ${riColor}40">
                                    ${trendIcon} ${riTrend.charAt(0).toUpperCase() + riTrend.slice(1)}
                                </span>
                            </div>
                            ${ri.recoverySpeed != null ? `
                            <div class="bi-comp-list" style="margin-top:20px">
                                <div class="bi-comp-row">
                                    <div class="bi-comp-label"><span class="bi-comp-icon">⚡</span><span>Recovery Speed</span></div>
                                    <div class="bi-comp-bar-track"><div class="bi-comp-bar-fill" style="width:${ri.recoverySpeed}%;background:#7b9cf5"></div></div>
                                    <span class="bi-comp-val">${ri.recoverySpeed}</span>
                                </div>
                                <div class="bi-comp-row">
                                    <div class="bi-comp-label"><span class="bi-comp-icon">🧘</span><span>Stability</span></div>
                                    <div class="bi-comp-bar-track"><div class="bi-comp-bar-fill" style="width:${ri.volatilityStability}%;background:#b07cf5"></div></div>
                                    <span class="bi-comp-val">${ri.volatilityStability}</span>
                                </div>
                            </div>` : ''}
                        </div>
                    ` : `<div class="bi-no-trend">Complete more assessments to compute your resilience index.</div>`}
                </div>

                <!-- Strategy Profile -->
                <div class="bi-card">
                    <div class="bi-card-title">🎯 Strategy Profile</div>
                    ${sp ? `
                        <div style="padding:4px 0">
                            <div style="text-align:center;margin-bottom:16px">
                                <span style="font-size:1.3rem;font-weight:600;color:var(--text)">${sp.type}</span>
                            </div>
                            <div style="margin-bottom:12px">
                                <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px;font-weight:600">Strengths</div>
                                ${sp.strengths.map(s => `<div style="font-size:.85rem;color:#4acea0;padding:2px 0">✦ ${s}</div>`).join('')}
                            </div>
                            <div style="margin-bottom:12px">
                                <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px;font-weight:600">Growth Areas</div>
                                ${sp.weaknesses.map(w => `<div style="font-size:.85rem;color:#e8924a;padding:2px 0">△ ${w}</div>`).join('')}
                            </div>
                            <div>
                                <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px;font-weight:600">Exam Tips</div>
                                ${sp.examRecommendations.map(r => `<div style="font-size:.85rem;color:var(--text);padding:2px 0">→ ${r}</div>`).join('')}
                            </div>
                        </div>
                    ` : `<div class="bi-no-trend">Complete an assessment to identify your academic strategy profile.</div>`}
                </div>
            </div>
        </div>`;
}

function initCGICharts() {
    const canvas = document.getElementById('cgi-trend-canvas');
    if (!canvas) return;

    const student = getStudentFresh();
    if (!student || !student.longitudinal || student.longitudinal.yearlyIndex.length === 0) {
        canvas.parentElement.innerHTML = '<div class="bi-no-trend">More data needed for trend visualization.</div>';
        return;
    }

    const data = student.longitudinal.yearlyIndex;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '200px';
    ctx.scale(dpr, dpr);

    const w = rect.width, h = 200;
    const pad = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#ededf5' : '#1e293b';
    const mutedColor = isDark ? '#7070a0' : '#94a3b8';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // Grid
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
        ctx.fillStyle = mutedColor; ctx.font = '11px Outfit, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(100 - i * 25, pad.left - 8, y + 4);
    }

    // Points
    const points = data.map((d, i) => ({
        x: pad.left + (i / Math.max(data.length - 1, 1)) * chartW,
        y: pad.top + (1 - d.score / 100) * chartH,
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, isDark ? 'rgba(123,156,245,0.25)' : 'rgba(123,156,245,0.15)');
    grad.addColorStop(1, 'rgba(123,156,245,0)');
    ctx.beginPath(); ctx.moveTo(points[0].x, h - pad.bottom);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(points[points.length - 1].x, h - pad.bottom);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i - 1].x) / 2;
        const yc = (points[i].y + points[i - 1].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = '#7b9cf5'; ctx.lineWidth = 2.5; ctx.stroke();

    // Data points
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const color = data[i].score >= 70 ? '#4acea0' : data[i].score >= 45 ? '#e8924a' : '#e85c7a';
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = isDark ? '#13131c' : '#fff'; ctx.lineWidth = 2; ctx.stroke();

        ctx.fillStyle = mutedColor; ctx.font = '11px Outfit, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(String(data[i].year), p.x, h - pad.bottom + 18);
    }
}

// ═══════════════════════════════════════════════════════════════
// SKILL CORRELATION SECTION
// ═══════════════════════════════════════════════════════════════

function renderSkillCorrelationSection() {
    const student = getStudentFresh();

    if (!student || !student.skillAcademicCorrelation) {
        return `
            <div class="section-view">
                <div class="section-header">
                    <div class="section-header-icon">🎯</div>
                    <div>
                        <h2 class="section-header-title">Skill Correlation</h2>
                        <p class="section-header-sub">Personality-performance correlation mapping.</p>
                    </div>
                </div>
                <div class="bi-insufficient">
                    <div class="bi-insuff-icon">🔗</div>
                    <h3>Correlation Data Unavailable</h3>
                    <p>Complete at least 2 assessments to compute skill-academic correlations.</p>
                    <button class="bi-start-btn" onclick="document.querySelector('[data-section=assessment]')?.click()">Take Assessment →</button>
                </div>
            </div>`;
    }

    const corr = student.skillAcademicCorrelation;
    const corrItems = [
        { label: 'Openness → Academics', value: corr.opennessVsHumanities, icon: '🎨' },
        { label: 'Conscientiousness → Persistence', value: corr.conscientiousnessVsMath, icon: '📐' },
        { label: 'Risk → Performance', value: corr.riskVsPerformance, icon: '⚡' },
        { label: 'Persistence → Stability', value: corr.persistenceVsExamStability, icon: '🔄' },
    ];

    const corrBarsHTML = corrItems.map(item => {
        const barWidth = Math.abs(item.value) * 100;
        const barColor = item.value > 0.3 ? '#4acea0' : item.value < -0.3 ? '#e85c7a' : '#7b9cf5';
        const sign = item.value >= 0 ? '+' : '';
        return `
            <div class="bi-comp-row">
                <div class="bi-comp-label"><span class="bi-comp-icon">${item.icon}</span><span>${item.label}</span></div>
                <div class="bi-comp-bar-track"><div class="bi-comp-bar-fill" style="width:${barWidth}%;background:${barColor}"></div></div>
                <span class="bi-comp-val">${sign}${item.value}</span>
            </div>`;
    }).join('');

    // Dropout prediction card
    const dp = student.dropoutPrediction;
    let dropoutHTML = '';
    if (dp) {
        const dpColor = dp.category === 'Low' ? '#4acea0' : dp.category === 'Medium' ? '#e8924a' : '#e85c7a';
        dropoutHTML = `
            <div class="bi-card">
                <div class="bi-card-title">🔮 Dropout Risk Prediction</div>
                <div style="text-align:center;padding:12px 0">
                    <div style="font-size:2.5rem;font-weight:700;color:${dpColor}">${dp.probabilityScore}%</div>
                    <div style="margin-top:8px">
                        <span class="bi-risk-badge" style="background:${dpColor}20;color:${dpColor};border:1px solid ${dpColor}40">${dp.category} Risk</span>
                    </div>
                    <div style="font-size:.8rem;color:var(--text-muted);margin-top:10px">Confidence: ${dp.confidenceLevel}%</div>
                </div>
            </div>`;
    }

    return `
        <div class="section-view">
            <div class="section-header">
                <div class="section-header-icon">🎯</div>
                <div>
                    <h2 class="section-header-title">Skill Correlation</h2>
                    <p class="section-header-sub">Personality-performance correlation mapping.</p>
                </div>
            </div>

            <div class="bi-grid">
                <!-- Correlation Bars -->
                <div class="bi-card bi-components-card">
                    <div class="bi-card-title">Key Correlations</div>
                    <div class="bi-comp-list">${corrBarsHTML}</div>
                </div>

                <!-- Correlation Heatmap Canvas -->
                <div class="bi-card bi-trend-card">
                    <div class="bi-card-title">Trait × Performance Matrix</div>
                    <div class="bi-trend-canvas-wrap">
                        <canvas id="corr-heatmap-canvas"></canvas>
                    </div>
                </div>

                ${dropoutHTML}

                <!-- Pathway Suggestions -->
                <div class="bi-card">
                    <div class="bi-card-title">🧭 Pathway Suggestions</div>
                    <div style="padding:4px 0">
                        <div style="font-size:.85rem;color:var(--text);line-height:1.6">
                            Based on the correlation between your cognitive traits and academic performance, our engine suggests the following pathways:
                        </div>
                        <div style="margin-top:12px">
                            <div style="font-size:.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);font-weight:600;margin-bottom:8px">Suggested Tracks</div>
                            ${corr.opennessVsHumanities > 0.3 ? '<div style="font-size:.85rem;color:#4acea0;padding:3px 0">✦ Creative / Humanities Track — strong correlation with Openness</div>' : ''}
                            ${corr.conscientiousnessVsMath > 0.3 ? '<div style="font-size:.85rem;color:#7b9cf5;padding:3px 0">✦ STEM / Structured Track — strongly correlated with discipline</div>' : ''}
                            ${corr.riskVsPerformance < -0.3 ? '<div style="font-size:.85rem;color:#e8924a;padding:3px 0">△ Stress management needed — burnout inversely affects performance</div>' : ''}
                            <div style="font-size:.85rem;color:var(--text-muted);padding:3px 0;margin-top:4px">→ Balanced aptitude across domains — keep exploring diverse interests.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

function initCorrelationChart() {
    const canvas = document.getElementById('corr-heatmap-canvas');
    if (!canvas) return;

    const student = getStudentFresh();
    if (!student || !student.skillAcademicCorrelation) return;

    const corr = student.skillAcademicCorrelation;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 220 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '220px';
    ctx.scale(dpr, dpr);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#ededf5' : '#1e293b';
    const mutedColor = isDark ? '#7070a0' : '#94a3b8';

    const traits = ['O', 'C', 'E', 'A', 'N'];
    const traitLabels = ['Open', 'Consc', 'Extra', 'Agree', 'Neuro'];
    const metrics = ['Academics', 'Persist', 'Burnout', 'Emot.Vol'];
    const metricKeys = ['opennessVsHumanities', 'conscientiousnessVsMath', 'riskVsPerformance', 'persistenceVsExamStability'];

    const w = rect.width, h = 220;
    const padLeft = 55, padTop = 35;
    const cellW = (w - padLeft - 20) / metrics.length;
    const cellH = (h - padTop - 10) / traits.length;

    // Draw column headers
    ctx.fillStyle = mutedColor; ctx.font = '11px Outfit, sans-serif'; ctx.textAlign = 'center';
    for (let j = 0; j < metrics.length; j++) {
        ctx.fillText(metrics[j], padLeft + j * cellW + cellW / 2, padTop - 12);
    }

    // Draw structured heatmap
    const corrValues = [
        [corr.opennessVsHumanities, corr.opennessVsHumanities * 0.5, -0.2, 0.3],
        [0.3, corr.conscientiousnessVsMath, -0.4, corr.persistenceVsExamStability],
        [0.2, 0.1, -0.1, 0.1],
        [0.3, 0.2, -0.15, 0.2],
        [-0.3, -0.2, corr.riskVsPerformance, -0.3],
    ];

    for (let i = 0; i < traits.length; i++) {
        // Row label
        ctx.fillStyle = textColor; ctx.font = '12px Outfit, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(traitLabels[i], padLeft - 8, padTop + i * cellH + cellH / 2 + 4);

        for (let j = 0; j < metrics.length; j++) {
            const val = corrValues[i][j];
            const intensity = Math.abs(val);

            let r, g, b;
            if (val >= 0) {
                r = Math.round(74 + (1 - intensity) * (isDark ? 19 - 74 : 255 - 74));
                g = Math.round(206 + (1 - intensity) * (isDark ? 19 - 206 : 255 - 206));
                b = Math.round(160 + (1 - intensity) * (isDark ? 28 - 160 : 255 - 160));
            } else {
                r = Math.round(232 + (1 - intensity) * (isDark ? 19 - 232 : 255 - 232));
                g = Math.round(92 + (1 - intensity) * (isDark ? 19 - 92 : 255 - 92));
                b = Math.round(122 + (1 - intensity) * (isDark ? 28 - 122 : 255 - 122));
            }

            const x = padLeft + j * cellW;
            const y = padTop + i * cellH;

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.beginPath();
            ctx.roundRect(x + 2, y + 2, cellW - 4, cellH - 4, 4);
            ctx.fill();

            // Value text
            ctx.fillStyle = intensity > 0.3 ? '#fff' : textColor;
            ctx.font = '12px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText((val >= 0 ? '+' : '') + val.toFixed(2), x + cellW / 2, y + cellH / 2 + 4);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// AI NARRATIVE INSIGHTS SECTION
// ═══════════════════════════════════════════════════════════════

function renderNarrativeInsightsSection() {
    const student = getStudentFresh();

    if (!student || !student.narratives) {
        return `
            <div class="section-view">
                <div class="section-header">
                    <div class="section-header-icon">🔬</div>
                    <div>
                        <h2 class="section-header-title">AI Insights</h2>
                        <p class="section-header-sub">AI-generated narrative insights about your cognitive journey.</p>
                    </div>
                </div>
                <div class="bi-insufficient">
                    <div class="bi-insuff-icon">📝</div>
                    <h3>Narratives Not Generated Yet</h3>
                    <p>Complete at least one assessment to receive AI-generated insights tailored for you, your teachers, and your parents.</p>
                    <button class="bi-start-btn" onclick="document.querySelector('[data-section=assessment]')?.click()">Take Assessment →</button>
                </div>
            </div>`;
    }

    const n = student.narratives;

    // Simple markdown-like rendering: **bold**, new lines
    function renderMD(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .split('\n')
            .map(line => line.trim() ? `<p style="margin:4px 0;font-size:.9rem;line-height:1.65">${line}</p>` : '<div style="height:8px"></div>')
            .join('');
    }

    return `
        <div class="section-view">
            <div class="section-header">
                <div class="section-header-icon">🔬</div>
                <div>
                    <h2 class="section-header-title">AI Insights</h2>
                    <p class="section-header-sub">AI-generated narrative insights about your cognitive journey.</p>
                </div>
            </div>

            <div class="bi-grid" style="grid-template-columns:1fr">
                <!-- Tab Buttons -->
                <div style="display:flex;gap:8px;margin-bottom:8px">
                    <button class="bi-start-btn narr-tab active" data-tab="student" style="flex:1" onclick="switchNarrTab('student')">🎓 For You</button>
                    <button class="bi-start-btn narr-tab" data-tab="teacher" style="flex:1;background:var(--card);color:var(--text);border:1px solid var(--border)" onclick="switchNarrTab('teacher')">👨‍🏫 For Teacher</button>
                    <button class="bi-start-btn narr-tab" data-tab="parent" style="flex:1;background:var(--card);color:var(--text);border:1px solid var(--border)" onclick="switchNarrTab('parent')">👪 For Parent</button>
                </div>

                <!-- Narrative Content -->
                <div class="bi-card" style="min-height:300px">
                    <div id="narr-content-student" class="narr-panel" style="display:block">${renderMD(n.studentVersion)}</div>
                    <div id="narr-content-teacher" class="narr-panel" style="display:none">${renderMD(n.teacherVersion)}</div>
                    <div id="narr-content-parent" class="narr-panel" style="display:none">${renderMD(n.parentVersion)}</div>
                </div>

                <!-- Alerts Banner -->
                ${student.alerts && student.alerts.filter(a => !a.resolved).length > 0 ? `
                <div class="bi-card" style="border-left:3px solid #e85c7a">
                    <div class="bi-card-title">⚠️ Active Alerts</div>
                    ${student.alerts.filter(a => !a.resolved).slice(0, 3).map(a => `
                        <div style="padding:8px 0;border-bottom:1px solid var(--border)">
                            <span class="bi-risk-badge" style="background:${a.severity === 'critical' ? '#e85c7a' : a.severity === 'high' ? '#e8924a' : '#7b9cf5'}20;color:${a.severity === 'critical' ? '#e85c7a' : a.severity === 'high' ? '#e8924a' : '#7b9cf5'};border:1px solid ${a.severity === 'critical' ? '#e85c7a' : a.severity === 'high' ? '#e8924a' : '#7b9cf5'}40;text-transform:uppercase;font-size:.7rem">${a.severity}</span>
                            <span style="font-size:.85rem;margin-left:8px">${a.message}</span>
                        </div>
                    `).join('')}
                </div>` : ''}
            </div>
        </div>`;
}

// Narrative tab switcher (global scope for inline onclick)
if (typeof window !== 'undefined') {
    window.switchNarrTab = function (tab) {
        document.querySelectorAll('.narr-panel').forEach(p => p.style.display = 'none');
        document.querySelectorAll('.narr-tab').forEach(b => {
            b.style.background = 'var(--card)';
            b.style.color = 'var(--text)';
            b.style.border = '1px solid var(--border)';
            b.classList.remove('active');
        });
        const panel = document.getElementById('narr-content-' + tab);
        const btn = document.querySelector(`.narr-tab[data-tab="${tab}"]`);
        if (panel) panel.style.display = 'block';
        if (btn) {
            btn.style.background = '';
            btn.style.color = '';
            btn.style.border = '';
            btn.classList.add('active');
        }
    };
}

// ─── Behavioral Intelligence Trend Chart (inline Canvas) ──────
function initBehavioralCharts() {
    const canvas = document.getElementById('bi-trend-canvas');
    if (!canvas) return;

    const school = getSchool(AppState.session.schoolCode);
    let student = null;
    if (school && school.classes) {
        for (const cls of school.classes) {
            const s = (cls.students || []).find(st => st.studentId === AppState.session.studentId);
            if (s) { student = s; break; }
        }
    }

    const history = student ? computeRiskHistory(student) : [];
    if (history.length === 0) {
        canvas.parentElement.innerHTML = '<div class="bi-no-trend">Complete more assessments to see your risk evolution trend.</div>';
        return;
    }

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '200px';
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Determine colors based on theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#ededf5' : '#1e293b';
    const mutedColor = isDark ? '#7070a0' : '#94a3b8';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // Grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();

        // Y-axis labels
        ctx.fillStyle = mutedColor;
        ctx.font = '11px Outfit, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(100 - i * 25, padding.left - 8, y + 4);
    }

    // Plot composite score line
    const points = history.map((h, i) => ({
        x: padding.left + (i / Math.max(history.length - 1, 1)) * chartW,
        y: padding.top + (1 - h.score / 100) * chartH,
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    grad.addColorStop(0, isDark ? 'rgba(74,206,160,0.25)' : 'rgba(74,206,160,0.15)');
    grad.addColorStop(1, 'rgba(74,206,160,0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, h - padding.bottom);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(points[points.length - 1].x, h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i - 1].x) / 2;
        const yc = (points[i].y + points[i - 1].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = '#4acea0';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Points
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const score = history[i].score;
        const color = score <= 40 ? '#e85c7a' : score <= 70 ? '#e8924a' : '#4acea0';

        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isDark ? '#13131c' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // X-axis labels
        ctx.fillStyle = mutedColor;
        ctx.font = '11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Att ${history[i].attemptNumber}`, p.x, h - padding.bottom + 18);
    }

    // Risk zone bands (dashed reference lines)
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;

    // High risk threshold (40)
    const y40 = padding.top + (1 - 40 / 100) * chartH;
    ctx.strokeStyle = 'rgba(232, 92, 122, 0.4)';
    ctx.beginPath();
    ctx.moveTo(padding.left, y40);
    ctx.lineTo(w - padding.right, y40);
    ctx.stroke();

    // Moderate threshold (70)
    const y70 = padding.top + (1 - 70 / 100) * chartH;
    ctx.strokeStyle = 'rgba(232, 146, 74, 0.4)';
    ctx.beginPath();
    ctx.moveTo(padding.left, y70);
    ctx.lineTo(w - padding.right, y70);
    ctx.stroke();

    ctx.setLineDash([]);
}

// ─── Boot ──────────────────────────────────────────────────────
// ES modules are deferred by default, so DOM is ready when this runs.
// Use DOMContentLoaded only as a fallback safety net.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
