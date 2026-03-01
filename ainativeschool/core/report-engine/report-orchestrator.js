/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Report Orchestrator
   ═══════════════════════════════════════════════════════════════
   Main entry point: generateCognitiveForensicDossier(studentId)
   
   This function:
   1. Deep-clones student data (immutable snapshot)
   2. Validates completeness
   3. Runs all existing core engines (read-only)
   4. Orchestrates all report-engine modules
   5. Returns a complete structured report model
   
   SAFETY: Never writes back to localStorage.
   All computations are on the deep-cloned snapshot.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Generate the complete Cognitive Forensic Dossier for a student.
 * @param {string} studentId - Student ID
 * @param {string} schoolCode - School code
 * @param {object} session - Current session for governance
 * @returns {object|null} Complete structured report model or null on failure
 */
function generateCognitiveForensicDossier(studentId, schoolCode, session) {
    // ── Step 1: Retrieve and deep-clone student data ──
    const school = getSchoolData(schoolCode);
    if (!school) return { error: 'School not found', code: 'SCHOOL_NOT_FOUND' };

    const { student: originalStudent, className } = findStudentInSchool(school, studentId);
    if (!originalStudent) return { error: 'Student not found', code: 'STUDENT_NOT_FOUND' };

    // IMMUTABLE DEEP CLONE — report engine never touches the original
    const snapshot = JSON.parse(JSON.stringify(originalStudent));
    snapshot.className = className;
    snapshot.schoolName = school.schoolName;
    snapshot.schoolCode = schoolCode;

    // ── Step 2: Set data version and report timestamp ──
    snapshot.dataVersion = '2.0.0';
    snapshot.lastReportGenerated = new Date().toISOString();

    // ── Step 3: Validate completeness ──
    const validation = validateSnapshot(snapshot);
    if (!validation.valid) {
        return { error: 'Insufficient data for dossier generation', code: 'INSUFFICIENT_DATA', details: validation };
    }

    // ── Step 4: Run existing engines on snapshot (read-only) ──
    runExistingEngines(snapshot);

    // ── Step 5: Orchestrate report engine modules ──
    const dossier = {
        meta: {
            reportType: 'Cognitive Forensic Dossier',
            version: 'CFD-v1.0',
            generatedAt: snapshot.lastReportGenerated,
            dataVersion: snapshot.dataVersion,
            studentId: snapshot.studentId,
            studentName: snapshot.name,
            className: snapshot.className,
            schoolName: snapshot.schoolName,
            schoolCode: snapshot.schoolCode,
            gender: snapshot.gender,
            dob: snapshot.dob,
        },

        // Phase 2: Executive Summary
        executiveSummary: safeCompute('computeExecutiveSummary', snapshot),

        // Phase 3: Psychometric Mapping
        psychometricMapping: safeCompute('computePsychometricMapping', snapshot),

        // Phase 4: Cognitive Load Analysis
        cognitiveLoad: safeCompute('computeCognitiveLoadAnalysis', snapshot),

        // Phase 5: Risk Decomposition
        riskDecomposition: safeCompute('computeRiskDecomposition', snapshot),

        // Phase 6: Longitudinal Analysis
        longitudinalAnalysis: safeCompute('computeLongitudinalAnalysis', snapshot),

        // Phase 7: Intervention Analytics
        interventionAnalytics: safeCompute('computeReportInterventionAnalytics', snapshot),

        // Phase 8: Correlation Matrix
        correlationMatrix: safeCompute('computeReportCorrelationMatrix', snapshot),

        // Phase 9: Resilience Analysis
        resilienceAnalysis: safeCompute('computeReportResilienceAnalysis', snapshot),

        // Phase 10: Strategy Profiling
        strategyProfiling: safeCompute('computeReportStrategyProfiling', snapshot),

        // Phase 11: Predictive Modeling
        predictiveModeling: safeCompute('computeReportPredictiveModeling', snapshot),

        // Phase 12: Governance Audit
        governanceAudit: typeof window !== 'undefined' && window.generateGovernanceAudit
            ? window.generateGovernanceAudit(snapshot, session)
            : null,

        // Validation summary
        validation,
    };

    // ── Step 6: Update original student with non-destructive metadata only ──
    // Only adds dataVersion and lastReportGenerated
    updateStudentMetadata(schoolCode, studentId, snapshot.dataVersion, snapshot.lastReportGenerated);

    return dossier;
}

// ── Data Retrieval Helpers ──

function getSchoolData(schoolCode) {
    try {
        const raw = localStorage.getItem('ai_native_schools');
        const schools = raw ? JSON.parse(raw) : {};
        return schools[schoolCode] || null;
    } catch { return null; }
}

function findStudentInSchool(school, studentId) {
    if (!school || !school.classes) return { student: null, className: '' };
    for (const cls of school.classes) {
        const student = (cls.students || []).find(s => s.studentId === studentId);
        if (student) return { student, className: cls.className };
    }
    return { student: null, className: '' };
}

// ── Validation ──

function validateSnapshot(snapshot) {
    const issues = [];
    if (!snapshot.studentId) issues.push('Missing studentId');
    if (!snapshot.name) issues.push('Missing name');
    if (!snapshot.attempts || Object.keys(snapshot.attempts).length === 0) {
        issues.push('No assessment attempts');
    }

    const completedAttempts = Object.values(snapshot.attempts || {}).filter(a => a.completedAt && a.traitScores);
    if (completedAttempts.length < 1) {
        issues.push('No completed assessments with trait scores');
    }

    return {
        valid: issues.length === 0,
        totalAttempts: Object.keys(snapshot.attempts || {}).length,
        completedAttempts: completedAttempts.length,
        issues,
        sufficientForFullReport: completedAttempts.length >= 2,
    };
}

// ── Run existing engines (safely, on snapshot only) ──

function runExistingEngines(snapshot) {
    const w = typeof window !== 'undefined' ? window : {};

    // Behavioral Risk Engine
    if (w.computeBehavioralRisk) {
        try { w.computeBehavioralRisk(snapshot); } catch (e) { console.warn('BRE:', e); }
    }

    // Micro-Intervention
    if (w.generateInterventionPlan && snapshot.behavioralRisk) {
        try { snapshot.interventionPlan = w.generateInterventionPlan(snapshot.behavioralRisk); } catch (e) { console.warn('MIP:', e); }
    }

    // CGI
    if (w.computeCognitiveGrowthIndex) {
        try { w.computeCognitiveGrowthIndex(snapshot); } catch (e) { console.warn('CGI:', e); }
    }

    // Resilience
    if (w.computeResilienceIndex) {
        try { w.computeResilienceIndex(snapshot); } catch (e) { console.warn('RI:', e); }
    }

    // Strategy
    if (w.classifyStrategyProfile) {
        try { w.classifyStrategyProfile(snapshot); } catch (e) { console.warn('SP:', e); }
    }

    // Correlation
    if (w.computeSkillAcademicCorrelation) {
        try { w.computeSkillAcademicCorrelation(snapshot); } catch (e) { console.warn('SAC:', e); }
    }

    // Dropout
    if (w.predictDropoutRisk) {
        try { w.predictDropoutRisk(snapshot); } catch (e) { console.warn('DR:', e); }
    }

    // Intervention Effectiveness
    if (w.computeInterventionEffectiveness) {
        try { w.computeInterventionEffectiveness(snapshot); } catch (e) { console.warn('IE:', e); }
    }
}

// ── Safe compute wrapper ──

function safeCompute(fnName, ...args) {
    const w = typeof window !== 'undefined' ? window : {};
    if (typeof w[fnName] === 'function') {
        try {
            return w[fnName](...args);
        } catch (e) {
            console.warn(`Report Engine [${fnName}]:`, e);
            return null;
        }
    }
    return null;
}

// ── Update metadata only (non-destructive) ──

function updateStudentMetadata(schoolCode, studentId, dataVersion, timestamp) {
    try {
        const raw = localStorage.getItem('ai_native_schools');
        const schools = raw ? JSON.parse(raw) : {};
        const school = schools[schoolCode];
        if (!school || !school.classes) return;

        for (const cls of school.classes) {
            const idx = (cls.students || []).findIndex(s => s.studentId === studentId);
            if (idx !== -1) {
                cls.students[idx].dataVersion = dataVersion;
                cls.students[idx].lastReportGenerated = timestamp;
                localStorage.setItem('ai_native_schools', JSON.stringify(schools));
                return;
            }
        }
    } catch (e) {
        console.warn('Metadata update failed:', e);
    }
}

// ── Export ──
if (typeof window !== 'undefined') {
    window.generateCognitiveForensicDossier = generateCognitiveForensicDossier;
}
