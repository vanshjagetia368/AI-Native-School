/* ═══════════════════════════════════════════════════════════════
   Cognitive Forensic Dossier — Renderer
   ═══════════════════════════════════════════════════════════════
   Renders all 14 sections of the dossier and initializes charts.
   This file is loaded by cognitive-dossier.html after all engines.
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── RBAC + Session Guard ──
    const SESSION_KEY = 'currentSession';
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    const adminRoles = ['super_admin', 'admin', 'teacher', 'counselor'];

    if (!session || !session.loggedIn || !adminRoles.includes(session.role)) {
        // Log blocked access
        if (typeof logAuditEvent === 'function') {
            logAuditEvent(session?.role || 'unknown', 'REPORT_ACCESS_BLOCKED', { page: 'cognitive-dossier', reason: 'Unauthorized role' });
        }
        window.location.replace('../index.html');
        return;
    }
    if (session.role === 'student') {
        if (typeof logAuditEvent === 'function') logAuditEvent('student', 'REPORT_ACCESS_BLOCKED', { page: 'cognitive-dossier' });
        window.location.replace('../index.html');
        return;
    }

    // Log access
    if (typeof logAuditEvent === 'function') {
        logAuditEvent(session.role, 'DOSSIER_PAGE_ACCESSED', { page: 'cognitive-dossier', studentId: new URLSearchParams(window.location.search).get('studentId') });
    }
    if (typeof trackAccess === 'function') trackAccess(session.role, 'cognitive-dossier');

    // ── Get student ID ──
    const studentId = new URLSearchParams(window.location.search).get('studentId');
    if (!studentId) { showError('Missing studentId parameter.'); return; }

    // ── Generate dossier ──
    const dossier = generateCognitiveForensicDossier(studentId, session.schoolCode, session);
    if (!dossier || dossier.error) {
        showError(dossier?.error || 'Failed to generate dossier. Ensure the student has completed assessments.');
        return;
    }

    renderDossier(dossier);

    function showError(msg) {
        document.getElementById('loading').innerHTML = `<p style="color:var(--danger);font-size:15px;font-weight:600">${msg}</p><a href="../reports.html" style="color:var(--accent);margin-top:12px;font-size:13px">← Back to Reports</a>`;
    }

    // ═══════════════════════════════════════════════════════════
    // MAIN RENDER
    // ═══════════════════════════════════════════════════════════
    function renderDossier(D) {
        const root = document.getElementById('dossier-root');
        const m = D.meta;
        const es = D.executiveSummary || {};
        const pm = D.psychometricMapping;
        const cl = D.cognitiveLoad;
        const rd = D.riskDecomposition;
        const la = D.longitudinalAnalysis;
        const ia = D.interventionAnalytics;
        const cm = D.correlationMatrix;
        const ra = D.resilienceAnalysis;
        const sp = D.strategyProfiling;
        const pred = D.predictiveModeling;
        const gov = D.governanceAudit;

        root.innerHTML = `
        <!-- HEADER -->
        <div class="dossier-header">
            <div>
                <a href="../reports.html" class="dossier-back">← Back to Reports</a>
                <div class="dossier-title"><h1>Cognitive Forensic Dossier</h1><p>CFD • Neuro-Analytical Intelligence Audit v1.0</p></div>
            </div>
            <div class="header-actions">
                <button class="btn-action" onclick="window.print()">🖨 Print</button>
                <button class="btn-action primary" id="pdf-btn">📥 Export PDF</button>
            </div>
        </div>

        <!-- META BAR -->
        <div class="meta-bar">
            <div class="meta-chip"><span class="lbl">Subject</span><span class="val">${m.studentName}</span></div>
            <div class="meta-chip"><span class="lbl">ID</span><span class="val">${m.studentId}</span></div>
            <div class="meta-chip"><span class="lbl">Class</span><span class="val">${m.className}</span></div>
            <div class="meta-chip"><span class="lbl">School</span><span class="val">${m.schoolName}</span></div>
            <div class="meta-chip"><span class="lbl">Data Version</span><span class="val">${m.dataVersion}</span></div>
            <div class="meta-chip"><span class="lbl">Generated</span><span class="val">${new Date(m.generatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
        </div>

        <!-- SECTION 1: EXECUTIVE SUMMARY -->
        <div class="section" id="sec-executive">
            <div class="sec-title"><span class="sec-num">01</span> Executive Intelligence Dashboard</div>
            <div style="text-align:center;margin-bottom:20px">
                <div class="tier-badge">🧬 ${es.overallTier || 'N/A'} — CIV ${es.civ?.weightedScore ?? 'N/A'}</div>
            </div>
            <div class="grid-4" id="civ-kpis"></div>
            <div class="grid-2" style="margin-top:20px">
                <div class="card"><h3>🎯 CIV Radar Projection</h3><canvas id="ch-civ-radar"></canvas></div>
                <div class="card"><h3>📊 Executive Metrics</h3><div class="grid-3" id="exec-metrics"></div></div>
            </div>
        </div>

        <!-- SECTION 2: PSYCHOMETRIC MAPPING -->
        <div class="section" id="sec-psychometric">
            <div class="sec-title"><span class="sec-num">02</span> Psychometric Architecture Decomposition</div>
            <div class="card" style="margin-bottom:20px;overflow-x:auto"><table class="data-table" id="trait-table"></table></div>
            <div class="grid-2">
                <div class="card"><h3>🧠 Multi-Axis Trait Radar</h3><canvas id="ch-trait-radar"></canvas></div>
                <div class="card"><h3>📊 Trait Dispersion</h3><canvas id="ch-trait-bar"></canvas></div>
            </div>
            <div class="grid-2" style="margin-top:20px">
                <div class="card"><h3>📈 Volatility Deviation</h3><canvas id="ch-volatility"></canvas></div>
                <div class="card"><h3>📉 Percentile Band</h3><canvas id="ch-percentile"></canvas></div>
            </div>
        </div>

        <!-- SECTION 3: COGNITIVE LOAD -->
        <div class="section" id="sec-cognitive-load">
            <div class="sec-title"><span class="sec-num">03</span> Cognitive Load & Temporal Performance Analysis</div>
            <div class="grid-2">
                <div class="card"><h3>⏱ Response Latency Histogram</h3><canvas id="ch-latency"></canvas></div>
                <div class="card"><h3>🎯 Accuracy vs Time Regression</h3><canvas id="ch-acc-time"></canvas></div>
            </div>
            <div class="grid-2" style="margin-top:20px">
                <div class="card"><h3>🌡 Performance Entropy Curve</h3><canvas id="ch-entropy"></canvas></div>
                <div class="card"><h3>🔥 Sequential Performance Heatmap</h3><canvas id="ch-heatmap"></canvas></div>
            </div>
        </div>

        <!-- SECTION 4: RISK DECOMPOSITION -->
        <div class="section" id="sec-risk">
            <div class="sec-title"><span class="sec-num">04</span> Behavioral Risk Score Forensic Decomposition</div>
            <div class="grid-2">
                <div class="card"><h3>⚖️ Weighted Impact Decomposition</h3><canvas id="ch-risk-impact"></canvas></div>
                <div class="card"><h3>📉 Risk Sensitivity Curve</h3><canvas id="ch-risk-sensitivity"></canvas></div>
            </div>
            <div class="grid-2" style="margin-top:20px">
                <div class="card"><h3>🚨 Threshold Boundary Map</h3><canvas id="ch-threshold"></canvas></div>
                <div class="card"><h3>🔮 Predictive Risk Trajectory</h3><canvas id="ch-risk-trajectory"></canvas></div>
            </div>
        </div>

        <!-- SECTION 5: LONGITUDINAL GROWTH -->
        <div class="section" id="sec-longitudinal">
            <div class="sec-title"><span class="sec-num">05</span> Longitudinal Cognitive Growth Analytics</div>
            <div class="grid-5" id="longi-kpis"></div>
            <div class="grid-2" style="margin-top:20px">
                <div class="card"><h3>📈 CGI Time-Series</h3><canvas id="ch-cgi-series"></canvas></div>
                <div class="card"><h3>🚀 Growth Acceleration</h3><canvas id="ch-growth-accel"></canvas></div>
            </div>
        </div>

        <!-- SECTION 6: INTERVENTION ANALYTICS -->
        <div class="section" id="sec-intervention">
            <div class="sec-title"><span class="sec-num">06</span> Intervention Effectiveness Analytics</div>
            <div class="grid-2">
                <div class="card"><h3>📊 Pre vs Post Risk Delta</h3><canvas id="ch-int-delta"></canvas></div>
                <div class="card"><h3>📈 Improvement Trajectory</h3><canvas id="ch-int-trajectory"></canvas></div>
            </div>
        </div>

        <!-- SECTION 7: CORRELATION ENGINE -->
        <div class="section" id="sec-correlation">
            <div class="sec-title"><span class="sec-num">07</span> Skill-Academic Correlation Engine</div>
            <div class="grid-2">
                <div class="card"><h3>🔗 Correlation Heatmap Matrix</h3><canvas id="ch-corr-heat"></canvas></div>
                <div class="card"><h3>📋 Key Correlations</h3><div id="corr-table-wrap" style="overflow-x:auto"></div></div>
            </div>
        </div>

        <!-- SECTION 8: RESILIENCE -->
        <div class="section" id="sec-resilience">
            <div class="sec-title"><span class="sec-num">08</span> Resilience Index Forensic Analysis</div>
            <div class="grid-2">
                <div class="card"><h3>💪 Recovery Spline</h3><canvas id="ch-recovery"></canvas></div>
                <div class="card"><h3>🧘 Emotional Stabilization</h3><canvas id="ch-emotional-stab"></canvas></div>
            </div>
            <div class="grid-2" style="margin-top:20px">
                <div class="card"><h3>🎯 Confidence Recalibration</h3><canvas id="ch-conf-recal"></canvas></div>
                <div class="card gauge-wrap" style="text-align:center;padding:40px">
                    <div class="gauge-label">Resilience Index</div>
                    <div class="gauge-value c3" id="resilience-gauge">--</div>
                    <div class="gauge-label" id="resilience-label"></div>
                </div>
            </div>
        </div>

        <!-- SECTION 9: STRATEGY PROFILING -->
        <div class="section" id="sec-strategy">
            <div class="sec-title"><span class="sec-num">09</span> Strategic Academic Profiling</div>
            <div class="grid-2">
                <div class="card"><h3>🎯 Performance Quadrant</h3><canvas id="ch-quadrant"></canvas></div>
                <div class="card"><h3>⚡ Risk vs Accuracy Scatter</h3><canvas id="ch-risk-acc"></canvas></div>
            </div>
            <div class="card" style="margin-top:20px" id="strategy-summary"></div>
        </div>

        <!-- SECTION 10: DROPOUT PREDICTION -->
        <div class="section" id="sec-dropout">
            <div class="sec-title"><span class="sec-num">10</span> Dropout Risk Predictive Model</div>
            <div class="grid-2">
                <div class="card gauge-wrap" style="padding:40px;text-align:center">
                    <div class="gauge-label">Dropout Probability</div>
                    <div class="gauge-value" id="dropout-gauge" style="color:var(--danger)">--</div>
                    <div class="gauge-label" id="dropout-label"></div>
                    <div id="dropout-ci" style="margin-top:8px;font-size:11px;color:var(--muted)"></div>
                </div>
                <div class="card"><h3>📉 Predictive Decay Projection</h3><canvas id="ch-dropout-proj"></canvas></div>
            </div>
            <div class="card" style="margin-top:20px;overflow-x:auto" id="dropout-factors-wrap"></div>
        </div>

        <!-- SECTION 11: GOVERNANCE -->
        <div class="section" id="sec-governance">
            <div class="sec-title"><span class="sec-num">11</span> Data Integrity & Governance Compliance</div>
            <div class="grid-2" id="governance-panels"></div>
        </div>

        <!-- FOOTER -->
        <div class="dossier-footer">
            <p>AI Native Schools — Cognitive Intelligence Infrastructure</p>
            <p style="margin-top:4px">Report generated ${new Date().toLocaleString('en-GB')} • CFD v1.0 • Data v${m.dataVersion}</p>
            <p style="margin-top:2px">This document is confidential and intended for authorized institutional use only.</p>
        </div>`;

        // ── Render dynamic content ──
        setTimeout(() => {
            renderCIVKpis(es);
            renderExecMetrics(es);
            renderTraitTable(pm);
            renderLongiKpis(la);
            renderStrategySummary(sp);
            renderDropoutGauge(pred);
            renderDropoutFactors(pred);
            renderResilienceGauge(ra);
            renderGovernancePanels(gov);
            renderCorrelationTable(cm);
            initAllCharts(D);
            initPDFExport(m);
        }, 100);
    }

    // ═══════════════════════════════════════════════════════════
    // DYNAMIC RENDERERS
    // ═══════════════════════════════════════════════════════════

    function renderCIVKpis(es) {
        if (!es?.civ) return;
        const d = es.civ.dimensions;
        const labels = { logicalProcessing: 'Logical Processing', numericalProcessing: 'Numerical Processing', abstractReasoning: 'Abstract Reasoning', emotionalRegulation: 'Emotional Regulation', cognitiveSpeed: 'Cognitive Speed', responseConsistency: 'Response Consistency', behavioralRiskInversion: 'Risk Inversion', resilienceQuotient: 'Resilience Quotient' };
        const colors = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
        const el = document.getElementById('civ-kpis');
        el.innerHTML = Object.entries(d).map(([k, v], i) => `<div class="kpi"><div class="kpi-label">${labels[k] || k}</div><div class="kpi-value ${colors[i]}">${v}</div><div class="kpi-sub">${v > 70 ? 'Strong' : v > 50 ? 'Adequate' : 'Developing'}</div></div>`).join('');
    }

    function renderExecMetrics(es) {
        if (!es?.executiveMetrics) return;
        const em = es.executiveMetrics;
        const el = document.getElementById('exec-metrics');
        const items = [
            { l: 'Stability Coefficient', v: em.stabilityCoefficient, c: 'c1' },
            { l: 'Cognitive Entropy', v: em.cognitiveEntropy, c: 'c2' },
            { l: 'Risk Gradient', v: em.riskGradient, c: em.riskGradient > 0 ? 'c5' : 'c3' },
            { l: 'Longi. Acceleration', v: em.longitudinalAcceleration, c: 'c4' },
            { l: 'Predictive Confidence', v: em.predictiveConfidence + '%', c: 'c6' },
        ];
        el.innerHTML = items.map(i => `<div style="text-align:center;padding:16px"><div class="kpi-label">${i.l}</div><div style="font-size:24px;font-weight:900" class="${i.c}">${i.v}</div></div>`).join('');
    }

    function renderTraitTable(pm) {
        if (!pm) return;
        const el = document.getElementById('trait-table');
        el.innerHTML = `<thead><tr><th>Trait</th><th>Mean</th><th>Std Dev</th><th>Intra-Var</th><th>Z-Score</th><th>Percentile</th><th>Stability</th><th>Volatility</th></tr></thead><tbody>${pm.traitOrder.map(t => { const d = pm.dimensionalMap[t]; return `<tr><td><strong>${d.name}</strong></td><td>${d.mean}</td><td>${d.standardDeviation}</td><td>${d.intraAttemptVariance}</td><td>${d.zScore}</td><td><span class="badge ${d.percentile > 70 ? 'badge-green' : d.percentile > 40 ? 'badge-cyan' : 'badge-amber'}">${d.percentile}%</span></td><td>${d.stabilityIndex}</td><td>${d.volatilityCoefficient}</td></tr>`; }).join('')}</tbody>`;
    }

    function renderLongiKpis(la) {
        if (!la) return;
        const el = document.getElementById('longi-kpis');
        const yoy = la.yoyDelta || {};
        const mom = la.momentumIndex || {};
        const elas = la.elasticity || {};
        el.innerHTML = [
            { l: 'CGI Delta', v: (yoy.delta > 0 ? '+' : '') + yoy.delta, c: yoy.delta > 0 ? 'c3' : 'c5' },
            { l: 'Direction', v: yoy.direction || '--', c: 'c1' },
            { l: 'Momentum', v: mom.label || '--', c: 'c2' },
            { l: 'Elasticity', v: elas.ratio || '--', c: 'c4' },
            { l: 'Span', v: la.timeSpan?.label || '--', c: 'c6' },
        ].map(i => `<div class="kpi"><div class="kpi-label">${i.l}</div><div class="kpi-value ${i.c}" style="font-size:20px">${i.v}</div></div>`).join('');
    }

    function renderStrategySummary(sp) {
        if (!sp) return;
        const el = document.getElementById('strategy-summary');
        const t = sp.tempoProfile || {}, r = sp.decisionRisk || {}, a = sp.archetype || {};
        el.innerHTML = `<h3>🎓 Strategy Classification</h3>
        <div class="grid-3" style="margin-top:12px">
            <div><div class="kpi-label">Cognitive Tempo</div><div style="font-size:15px;font-weight:700;margin-top:4px">${t.type || '--'}</div><div style="font-size:11px;color:var(--muted);margin-top:4px">${t.description || ''}</div></div>
            <div><div class="kpi-label">Decision Risk</div><div style="font-size:15px;font-weight:700;margin-top:4px">${r.pattern || '--'}</div><div style="font-size:11px;color:var(--muted);margin-top:4px">${r.description || ''}</div></div>
            <div><div class="kpi-label">Exam Archetype</div><div style="font-size:15px;font-weight:700;margin-top:4px;color:var(--accent)">${a.archetype || '--'}</div><div style="font-size:11px;color:var(--muted);margin-top:4px">${a.description || ''}</div></div>
        </div>`;
    }

    function renderDropoutGauge(pred) {
        if (!pred) return;
        const g = document.getElementById('dropout-gauge');
        const l = document.getElementById('dropout-label');
        const ci = document.getElementById('dropout-ci');
        g.textContent = pred.probability + '%';
        g.style.color = pred.riskColor;
        l.textContent = pred.riskLabel;
        ci.textContent = `95% CI: ${pred.confidenceInterval?.lower}% – ${pred.confidenceInterval?.upper}% | Model Confidence: ${pred.modelConfidence}%`;
    }

    function renderDropoutFactors(pred) {
        if (!pred) return;
        const el = document.getElementById('dropout-factors-wrap');
        const f = pred.factors || {};
        el.innerHTML = `<h3 style="margin-bottom:12px">Factor Contribution Analysis</h3><table class="data-table"><thead><tr><th>Factor</th><th>Score</th><th>Weight</th><th>Contribution</th></tr></thead><tbody>${Object.values(f).map(v => `<tr><td>${v.label}</td><td>${v.score}</td><td>${(v.weight * 100).toFixed(0)}%</td><td>${v.contribution}</td></tr>`).join('')}</tbody></table>`;
    }

    function renderResilienceGauge(ra) {
        if (!ra) return;
        const g = document.getElementById('resilience-gauge');
        const l = document.getElementById('resilience-label');
        const score = ra.existingComposite ?? '--';
        g.textContent = score;
        l.textContent = ra.overallLabel || '';
    }

    function renderGovernancePanels(gov) {
        if (!gov) return;
        const el = document.getElementById('governance-panels');
        const rm = gov.reportMetadata || {};
        const di = gov.dataIntegrity || {};
        const ar = gov.accessRecord || {};
        const comp = gov.compliance || {};
        el.innerHTML = `
        <div class="card"><h3>🔐 Report Metadata</h3><table class="data-table"><tbody>
            <tr><td>Generated At</td><td>${rm.generatedAtFormatted}</td></tr>
            <tr><td>Data Version</td><td>${rm.dataVersion}</td></tr>
            <tr><td>Report Type</td><td>${rm.reportType}</td></tr>
            <tr><td>Snapshot Hash</td><td style="font-family:monospace;font-size:11px">${rm.snapshotHash}</td></tr>
        </tbody></table></div>
        <div class="card"><h3>🛡️ Compliance Status</h3><table class="data-table"><tbody>
            ${Object.entries(comp).map(([k, v]) => `<tr><td>${k.replace(/([A-Z])/g, ' $1').trim()}</td><td><span class="badge ${v === true ? 'badge-green' : v === false ? 'badge-red' : 'badge-cyan'}">${v === true ? '✓' : v === false ? '✗' : v}</span></td></tr>`).join('')}
        </tbody></table></div>`;
    }

    function renderCorrelationTable(cm) {
        if (!cm) return;
        const el = document.getElementById('corr-table-wrap');
        const kc = cm.keyCorrelations || [];
        el.innerHTML = `<table class="data-table"><thead><tr><th>Trait</th><th>Metric</th><th>r</th><th>Strength</th><th>Direction</th></tr></thead><tbody>${kc.slice(0, 8).map(c => `<tr><td>${c.trait}</td><td>${c.metric}</td><td style="font-weight:700">${c.r}</td><td><span class="badge ${c.strength === 'Strong' ? 'badge-green' : c.strength === 'Moderate' ? 'badge-cyan' : 'badge-amber'}">${c.strength}</span></td><td>${c.direction}</td></tr>`).join('')}</tbody></table>`;
    }

    // ═══════════════════════════════════════════════════════════
    // CHART INITIALIZATION
    // ═══════════════════════════════════════════════════════════

    function initAllCharts(D) {
        const chartDefaults = { responsive: true, animation: { duration: 1200, easing: 'easeOutQuart' }, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } } };
        const gridColor = 'rgba(100,116,139,0.1)';
        const tickColor = '#64748b';
        const axOpts = { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } };

        // 1. CIV Radar
        if (D.executiveSummary?.civ) {
            const d = D.executiveSummary.civ.dimensions;
            createChart('ch-civ-radar', 'radar', { labels: ['Logical', 'Numerical', 'Abstract', 'Emotional', 'Speed', 'Consistency', 'Risk Inv.', 'Resilience'], datasets: [{ data: Object.values(d), backgroundColor: 'rgba(34,211,238,0.12)', borderColor: '#22d3ee', borderWidth: 2, pointBackgroundColor: '#22d3ee', pointRadius: 4 }] }, { scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20, color: tickColor, backdropColor: 'transparent' }, grid: { color: gridColor }, pointLabels: { color: '#e2e8f0', font: { size: 10, weight: '600' } } } }, plugins: { legend: { display: false } } });
        }

        // 2. Trait Radar
        if (D.psychometricMapping) {
            const pm = D.psychometricMapping;
            createChart('ch-trait-radar', 'radar', { labels: pm.traitOrder.map(t => pm.traitNames[t]), datasets: [{ label: 'Mean Score', data: pm.traitOrder.map(t => pm.dimensionalMap[t].mean), backgroundColor: 'rgba(167,139,250,0.12)', borderColor: '#a78bfa', borderWidth: 2, pointBackgroundColor: '#a78bfa', pointRadius: 4 }] }, { scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20, color: tickColor, backdropColor: 'transparent' }, grid: { color: gridColor }, pointLabels: { color: '#e2e8f0', font: { size: 11, weight: '600' } } } }, plugins: { legend: { display: false } } });
        }

        // 3. Trait Bar
        if (D.psychometricMapping) {
            const pm = D.psychometricMapping;
            createChart('ch-trait-bar', 'bar', { labels: pm.traitOrder.map(t => pm.traitNames[t]), datasets: [{ data: pm.traitOrder.map(t => pm.dimensionalMap[t].mean), backgroundColor: ['#fb923c', '#34d399', '#f472b6', '#38bdf8', '#a78bfa'], borderRadius: 6, barThickness: 28 }] }, { indexAxis: 'y', scales: { x: { max: 100, ...axOpts }, y: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { weight: '600' } } } }, plugins: { legend: { display: false } } });
        }

        // 4. Volatility
        if (D.psychometricMapping) {
            const pm = D.psychometricMapping;
            createChart('ch-volatility', 'line', { labels: pm.traitOrder.map(t => pm.traitNames[t]), datasets: [{ label: 'Volatility', data: pm.traitOrder.map(t => pm.dimensionalMap[t].volatilityCoefficient), borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,0.1)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#f472b6' }] }, { scales: { x: axOpts, y: { ...axOpts, title: { display: true, text: 'Volatility', color: tickColor } } }, plugins: { legend: { display: false } } });
        }

        // 5. Percentile Band
        if (D.psychometricMapping) {
            const pm = D.psychometricMapping;
            createChart('ch-percentile', 'bar', { labels: pm.traitOrder.map(t => pm.traitNames[t]), datasets: [{ label: 'Percentile', data: pm.traitOrder.map(t => pm.dimensionalMap[t].percentile), backgroundColor: pm.traitOrder.map(t => { const p = pm.dimensionalMap[t].percentile; return p > 70 ? 'rgba(52,211,153,0.6)' : p > 40 ? 'rgba(34,211,238,0.6)' : 'rgba(251,146,60,0.6)'; }), borderRadius: 6, barThickness: 28 }] }, { scales: { x: axOpts, y: { max: 100, ...axOpts, title: { display: true, text: 'Percentile', color: tickColor } } }, plugins: { legend: { display: false } } });
        }

        // 6. Latency Histogram
        if (D.cognitiveLoad?.latencyDistribution?.bins) {
            const bins = D.cognitiveLoad.latencyDistribution.bins;
            createChart('ch-latency', 'bar', { labels: bins.map(b => `${b.lo}-${b.hi}s`), datasets: [{ data: bins.map(b => b.count), backgroundColor: bins.map((_, i) => ['#22d3ee', '#34d399', '#a78bfa', '#fb923c', '#ef4444'][i] || '#22d3ee'), borderRadius: 4, barThickness: 24 }] }, { scales: { x: axOpts, y: { ...axOpts, title: { display: true, text: 'Frequency', color: tickColor } } }, plugins: { legend: { display: false } } });
        }

        // 7. Accuracy vs Time
        if (D.cognitiveLoad?.timeNormalizedAccuracy?.length) {
            const tna = D.cognitiveLoad.timeNormalizedAccuracy;
            createChart('ch-acc-time', 'scatter', { datasets: [{ label: 'Accuracy vs Time', data: tna.map(p => ({ x: p.time, y: p.accuracy })), backgroundColor: 'rgba(34,211,238,0.6)', borderColor: '#22d3ee', pointRadius: 5 }] }, { scales: { x: { ...axOpts, title: { display: true, text: 'Time (s)', color: tickColor } }, y: { ...axOpts, title: { display: true, text: 'Response Value', color: tickColor } } }, plugins: { legend: { display: false } } });
        }

        // 8. Entropy Curve
        if (D.cognitiveLoad?.attemptDynamics?.length) {
            const ad = D.cognitiveLoad.attemptDynamics;
            createChart('ch-entropy', 'line', { labels: ad.map(a => `Att ${a.attempt}`), datasets: [{ label: 'Performance Entropy', data: ad.map(a => a.entropy), borderColor: '#fb923c', backgroundColor: 'rgba(251,146,60,0.08)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#fb923c' }] }, { scales: { x: axOpts, y: axOpts }, plugins: { legend: { display: false } } });
        }

        // 9. Heatmap (as colored bar)
        if (D.cognitiveLoad?.heatmapData?.length) {
            const hd = D.cognitiveLoad.heatmapData;
            createChart('ch-heatmap', 'bar', { labels: hd.map(h => `Q${h.question}`), datasets: [{ data: hd.map(h => h.time), backgroundColor: hd.map(h => { const n = h.normalized; return n > 80 ? '#ef4444' : n > 60 ? '#f59e0b' : n > 30 ? '#22d3ee' : '#34d399'; }), borderRadius: 2, barThickness: 10 }] }, { scales: { x: { ...axOpts, ticks: { ...axOpts.ticks, font: { size: 8 } } }, y: { ...axOpts, title: { display: true, text: 'Seconds', color: tickColor } } }, plugins: { legend: { display: false } } });
        }

        // 10. Risk Impact (stacked bar)
        if (D.riskDecomposition?.weightedImpact) {
            const wi = D.riskDecomposition.weightedImpact;
            const labels = D.riskDecomposition.componentLabels;
            createChart('ch-risk-impact', 'bar', { labels: Object.keys(wi).map(k => labels[k] || k), datasets: [{ label: 'Weighted Contribution', data: Object.values(wi).map(v => v.weightedContribution), backgroundColor: ['#22d3ee', '#a78bfa', '#fb923c', '#f472b6'], borderRadius: 6, barThickness: 28 }] }, { scales: { x: axOpts, y: axOpts }, plugins: { legend: { display: false } } });
        }

        // 11. Risk Sensitivity
        if (D.riskDecomposition?.sensitivityCurve) {
            const sc = D.riskDecomposition.sensitivityCurve;
            const keys = Object.keys(sc);
            const colors = ['#22d3ee', '#a78bfa', '#fb923c', '#f472b6'];
            createChart('ch-risk-sensitivity', 'line', { labels: sc[keys[0]].map(p => `${p.delta > 0 ? '+' : ''}${p.delta}`), datasets: keys.map((k, i) => ({ label: D.riskDecomposition.componentLabels[k], data: sc[k].map(p => p.compositeScore), borderColor: colors[i], tension: 0.4, pointRadius: 3, borderWidth: 2 })) }, { scales: { x: { ...axOpts, title: { display: true, text: 'Component Delta', color: tickColor } }, y: { ...axOpts, title: { display: true, text: 'Composite Score', color: tickColor } } } });
        }

        // 12. Threshold Boundary
        if (D.riskDecomposition) {
            const rd = D.riskDecomposition;
            createChart('ch-threshold', 'doughnut', { labels: ['Current Score', 'Distance to Next', 'Remaining'], datasets: [{ data: [rd.compositeScore, rd.thresholdBoundary.distanceToNextThreshold, Math.max(0, 100 - rd.compositeScore - rd.thresholdBoundary.distanceToNextThreshold)], backgroundColor: ['#22d3ee', '#f59e0b', '#1e293b'], borderColor: '#111b2e', borderWidth: 3 }] }, { cutout: '65%', plugins: { legend: { position: 'bottom' } } });
        }

        // 13. Risk Trajectory
        if (D.riskDecomposition?.riskHistory?.length) {
            const rh = D.riskDecomposition.riskHistory;
            const noInt = D.riskDecomposition.projectedNoIntervention || [];
            const wInt = D.riskDecomposition.projectedWithIntervention || [];
            const labels = [...rh.map(r => `Att ${r.attempt}`), ...noInt.map(p => `Proj ${p.futureAttempt}`)];
            createChart('ch-risk-trajectory', 'line', { labels, datasets: [{ label: 'Actual', data: [...rh.map(r => r.score), ...noInt.map(() => null)], borderColor: '#22d3ee', tension: 0.3, pointRadius: 4, borderWidth: 2 }, { label: 'No Intervention', data: [...rh.map(() => null), ...noInt.map(p => p.projectedScore)], borderColor: '#ef4444', borderDash: [6, 4], tension: 0.3, pointRadius: 3, borderWidth: 2 }, { label: 'With Intervention', data: [...rh.map(() => null), ...wInt.map(p => p.projectedScore)], borderColor: '#34d399', borderDash: [6, 4], tension: 0.3, pointRadius: 3, borderWidth: 2 }] }, { scales: { x: axOpts, y: { ...axOpts, title: { display: true, text: 'Risk Score', color: tickColor } } } });
        }

        // 14. CGI Time-Series
        if (D.longitudinalAnalysis?.cgiSeries?.length) {
            const cs = D.longitudinalAnalysis.cgiSeries;
            createChart('ch-cgi-series', 'line', { labels: cs.map(c => `Att ${c.attempt}`), datasets: [{ label: 'CGI', data: cs.map(c => c.cgi), borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.08)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#22d3ee', borderWidth: 2 }] }, { scales: { x: axOpts, y: { max: 100, ...axOpts, title: { display: true, text: 'CGI Score', color: tickColor } } } });
        }

        // 15. Growth Acceleration
        if (D.longitudinalAnalysis?.accelerationAnalysis?.deltas?.length) {
            const del = D.longitudinalAnalysis.accelerationAnalysis.deltas;
            createChart('ch-growth-accel', 'bar', { labels: del.map(d => `${d.from}→${d.to}`), datasets: [{ data: del.map(d => d.delta), backgroundColor: del.map(d => d.delta >= 0 ? 'rgba(52,211,153,0.6)' : 'rgba(239,68,68,0.6)'), borderRadius: 4, barThickness: 20 }] }, { scales: { x: axOpts, y: { ...axOpts, title: { display: true, text: 'Delta', color: tickColor } } }, plugins: { legend: { display: false } } });
        }

        // 16. Intervention Delta
        if (D.interventionAnalytics?.prePostComparison) {
            const pp = D.interventionAnalytics.prePostComparison;
            const keys = Object.keys(pp);
            createChart('ch-int-delta', 'bar', { labels: keys.map(k => k.replace(/([A-Z])/g, ' $1').trim()), datasets: [{ label: 'Pre', data: keys.map(k => pp[k].pre), backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 4 }, { label: 'Post', data: keys.map(k => pp[k].post), backgroundColor: 'rgba(52,211,153,0.5)', borderRadius: 4 }] }, { scales: { x: axOpts, y: { max: 100, ...axOpts } } });
        }

        // 17. Intervention Trajectory
        if (D.interventionAnalytics?.cycles?.length) {
            const cy = D.interventionAnalytics.cycles;
            createChart('ch-int-trajectory', 'line', { labels: cy.map(c => `Cycle ${c.cycle}`), datasets: [{ label: 'Avg Improvement', data: cy.map(c => c.avgImprovement), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 }] }, { scales: { x: axOpts, y: { ...axOpts, title: { display: true, text: 'Improvement', color: tickColor } } } });
        }

        // 18. Correlation Heatmap (matrix as grouped bars)
        if (D.correlationMatrix?.traitMetricMatrix) {
            const mx = D.correlationMatrix;
            const colors = ['#22d3ee', '#a78bfa', '#34d399', '#f472b6', '#fb923c'];
            createChart('ch-corr-heat', 'bar', { labels: mx.metrics.map(m => mx.metricNames[m]), datasets: mx.traits.map((t, i) => ({ label: mx.traitNames[t], data: mx.metrics.map(m => mx.traitMetricMatrix[t][m]), backgroundColor: colors[i] + '99', borderRadius: 3, barThickness: 8 })) }, { scales: { x: axOpts, y: { min: -1, max: 1, ...axOpts, title: { display: true, text: 'Pearson r', color: tickColor } } }, plugins: { legend: { position: 'bottom' } } });
        }

        // 19. Recovery Spline
        if (D.resilienceAnalysis?.recoverySpeed?.details?.length) {
            const det = D.resilienceAnalysis.recoverySpeed.details;
            createChart('ch-recovery', 'bar', { labels: det.map(d => `${d.trait} Att${d.dipAtAttempt}`), datasets: [{ label: 'Dip', data: det.map(d => -d.dipMagnitude), backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 4 }, { label: 'Recovery', data: det.map(d => d.recovery), backgroundColor: 'rgba(52,211,153,0.5)', borderRadius: 4 }] }, { scales: { x: axOpts, y: { ...axOpts, title: { display: true, text: 'Score Change', color: tickColor } } } });
        } else { fillEmpty('ch-recovery'); }

        // 20. Emotional Stabilization
        if (D.resilienceAnalysis?.emotionalStabilizationCurve?.dataPoints?.length) {
            const dp = D.resilienceAnalysis.emotionalStabilizationCurve.dataPoints;
            createChart('ch-emotional-stab', 'line', { labels: dp.map(d => `Att ${d.attempt}`), datasets: [{ label: 'Stability Score', data: dp.map(d => d.stabilityScore), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 }] }, { scales: { x: axOpts, y: { max: 100, ...axOpts } } });
        }

        // 21. Confidence Recalibration
        if (D.resilienceAnalysis?.confidenceRecalibration?.series?.length) {
            const s = D.resilienceAnalysis.confidenceRecalibration.series;
            createChart('ch-conf-recal', 'line', { labels: s.map(d => `Att ${d.attempt}`), datasets: [{ label: 'Confidence', data: s.map(d => d.confidence), borderColor: '#a78bfa', tension: 0.3, pointRadius: 4, borderWidth: 2 }, { label: 'Actual', data: s.map(d => d.actual), borderColor: '#22d3ee', tension: 0.3, pointRadius: 4, borderWidth: 2 }, { label: 'Gap', data: s.map(d => d.gap), borderColor: '#f59e0b', borderDash: [4, 4], tension: 0.3, pointRadius: 3, borderWidth: 1.5 }] }, { scales: { x: axOpts, y: { max: 100, ...axOpts } } });
        }

        // 22. Performance Quadrant
        if (D.strategyProfiling?.scatterData?.length) {
            const sd = D.strategyProfiling.scatterData;
            createChart('ch-quadrant', 'scatter', { datasets: [{ label: 'Risk vs Accuracy', data: sd.map(p => ({ x: p.risk, y: p.accuracy })), backgroundColor: 'rgba(167,139,250,0.7)', borderColor: '#a78bfa', pointRadius: 7 }] }, { scales: { x: { min: 0, max: 100, ...axOpts, title: { display: true, text: 'Risk Score', color: tickColor } }, y: { min: 0, max: 100, ...axOpts, title: { display: true, text: 'Accuracy', color: tickColor } } }, plugins: { legend: { display: false } } });
        }

        // 23. Risk vs Accuracy line
        if (D.strategyProfiling?.scatterData?.length) {
            const sd = D.strategyProfiling.scatterData;
            createChart('ch-risk-acc', 'line', { labels: sd.map(p => `Att ${p.attempt}`), datasets: [{ label: 'Risk', data: sd.map(p => p.risk), borderColor: '#ef4444', tension: 0.3, pointRadius: 4, borderWidth: 2 }, { label: 'Accuracy', data: sd.map(p => p.accuracy), borderColor: '#34d399', tension: 0.3, pointRadius: 4, borderWidth: 2 }] }, { scales: { x: axOpts, y: { max: 100, ...axOpts } } });
        }

        // 24. Dropout Projection
        if (D.predictiveModeling?.trajectory?.length) {
            const tr = D.predictiveModeling.trajectory;
            createChart('ch-dropout-proj', 'line', { labels: tr.map(p => p.month === 0 ? 'Now' : `+${p.month}mo`), datasets: [{ label: 'Projected Probability', data: tr.map(p => p.probability), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#ef4444', borderWidth: 2 }] }, { scales: { x: axOpts, y: { max: 100, ...axOpts, title: { display: true, text: 'Probability %', color: tickColor } } } });
        }
    }

    function createChart(id, type, data, options) {
        const el = document.getElementById(id);
        if (!el) return;
        try {
            new Chart(el, { type, data, options: { responsive: true, animation: { duration: 1200, easing: 'easeOutQuart' }, ...options } });
        } catch (e) { console.warn(`Chart [${id}]:`, e); }
    }

    function fillEmpty(id) {
        const el = document.getElementById(id);
        if (el) el.parentElement.innerHTML += '<p style="color:var(--muted);text-align:center;padding:30px;font-size:12px">Insufficient data for this visualization.</p>';
    }

    // ═══════════════════════════════════════════════════════════
    // PDF EXPORT
    // ═══════════════════════════════════════════════════════════

    function initPDFExport(meta) {
        document.getElementById('pdf-btn')?.addEventListener('click', async () => {
            const btn = document.getElementById('pdf-btn');
            btn.textContent = '⏳ Generating...'; btn.disabled = true;
            try {
                const el = document.getElementById('dossier-root');
                const canvas = await html2canvas(el, { backgroundColor: '#060a12', scale: 1.5, useCORS: true, logging: false });
                const { jsPDF } = window.jspdf;
                const imgW = 210, pageH = 297;
                const imgH = (canvas.height * imgW) / canvas.width;
                const pdf = new jsPDF('p', 'mm', 'a4');
                let pos = 0;
                while (pos < imgH) {
                    if (pos > 0) pdf.addPage();
                    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -pos, imgW, imgH);
                    // Watermark
                    pdf.setFontSize(50);
                    pdf.setTextColor(200, 200, 200);
                    pdf.setGState(new pdf.GState({ opacity: 0.06 }));
                    pdf.text('CONFIDENTIAL', 105, 150, { align: 'center', angle: 35 });
                    pdf.setGState(new pdf.GState({ opacity: 1 }));
                    // Footer
                    pdf.setFontSize(8);
                    pdf.setTextColor(120);
                    pdf.text(`AI Native Schools — CFD v1.0 | Data v${meta.dataVersion} | Generated: ${new Date().toLocaleString('en-GB')} | Page ${Math.floor(pos / pageH) + 1}`, 105, 292, { align: 'center' });
                    pos += pageH;
                }
                pdf.save(`CFD_${meta.studentId}_${new Date().toISOString().slice(0, 10)}.pdf`);
            } catch (e) { console.error('PDF export failed:', e); }
            btn.textContent = '📥 Export PDF'; btn.disabled = false;
        });
    }
})();
