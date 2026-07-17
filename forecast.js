/* ================================================================
   Saakh — AI Forecast Page Logic
   Cashflow Projector · Stress Test · Restock & Bills Forecast
================================================================ */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────
  let activeUser = null;
  let userDocuments = [];
  let forecastData = null;          // Gemma's parsed forecast
  let baseAvgIncome = 0;
  let baseAvgExpense = 0;
  let currentBalance = 0;
  let stressIncomePct = 0;          // Slider value (-50 to +50)
  let stressExtraExpense = 0;       // Extra one-off expense amount
  let stressExtraExpenseDay = 15;   // Day 1-30 the extra expense hits
  let isSandbox = false;

  // ── DOM refs ──────────────────────────────────────────────────
  const loadingOverlay   = document.getElementById('fc-loading');
  const loadingStatus    = document.getElementById('fc-loading-status');
  const sandboxBanner    = document.getElementById('fc-sandbox-banner');
  const sandboxBtn       = document.getElementById('fc-sandbox-btn');
  const chartContainer   = document.getElementById('fc-chart-container');
  const svgChart         = document.getElementById('fc-svg-chart');
  const runwayBadge      = document.getElementById('fc-runway-badge');
  const runwayLabel      = document.getElementById('fc-runway-label');
  const avgIncomeEl      = document.getElementById('fc-avg-income');
  const avgExpenseEl     = document.getElementById('fc-avg-expense');
  const balanceEl        = document.getElementById('fc-balance');
  const billsList        = document.getElementById('fc-bills-list');
  const restockList      = document.getElementById('fc-restock-list');
  const warningsList     = document.getElementById('fc-warnings-list');
  const stressSlider     = document.getElementById('fc-stress-slider');
  const stressSliderVal  = document.getElementById('fc-stress-value');
  const stressExpInput   = document.getElementById('fc-stress-expense');
  const stressExpDay     = document.getElementById('fc-stress-day');
  const stressApplyBtn   = document.getElementById('fc-stress-apply');
  const resetStressBtn   = document.getElementById('fc-reset-stress');

  // ── SANDBOX DATA: realistic Kirana store ──────────────────────
  const SANDBOX_SUMMARY = {
    businessName: 'Demo Kirana Store',
    totalDocuments: 3,
    totalIncome: 127500,
    totalExpense: 96800,
    netProfit: 30700,
    avgTransactionSize: 320,
    incomeItems: [
      { label: 'Daily Sales (groceries)', amount: 82000 },
      { label: 'UPI Payments', amount: 31000 },
      { label: 'Wholesale supply', amount: 14500 },
    ],
    expenseItems: [
      { label: 'Inventory restocking (rice, oil, dal)', amount: 54000 },
      { label: 'Rent', amount: 8000 },
      { label: 'Electricity', amount: 2100 },
      { label: 'Labour', amount: 12000 },
      { label: 'Transport', amount: 6200 },
      { label: 'Misc (packaging)', amount: 14500 },
    ],
    transactionDescriptions: [
      'sold 20kg rice', 'bought 50kg rice bags', 'electricity bill paid',
      'rent August 1st', 'UPI sale cooking oil 5L', 'dal purchase 20kg',
      'sold 10kg sugar', 'transport to market', 'labour weekly payment',
    ],
    periodCovered: 'June–July 2026',
  };

  // ── Auth flow ─────────────────────────────────────────────────
  window.addEventListener('saakh-auth-initialized', init);
  window.addEventListener('saakh-auth-changed', init);

  async function init() {
    activeUser = window.currentUser;
    if (!activeUser) return;
    loadVaultAndForecast();
  }

  // ── Load vault docs ───────────────────────────────────────────
  function loadVaultDocs() {
    if (!activeUser) return [];
    const userId = activeUser.id;
    try {
      const raw = localStorage.getItem('saakh_vault_' + userId);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  // ── Aggregate summary from vault docs ─────────────────────────
  function aggregateSummary(docs) {
    let totalIncome = 0, totalExpense = 0;
    const incomeItems = [], expenseItems = [], descriptions = [];

    docs.forEach(doc => {
      const d = doc.extractedData || {};
      (Array.isArray(d.income) ? d.income : []).forEach(x => {
        incomeItems.push(x);
        totalIncome += Number(x.amount) || 0;
      });
      (Array.isArray(d.expenses) ? d.expenses : []).forEach(x => {
        expenseItems.push(x);
        totalExpense += Number(x.amount) || 0;
      });
      if (d.ratingSummary) descriptions.push(d.ratingSummary);
    });

    return {
      businessName: activeUser?.user_metadata?.shop_name || 'My Business',
      totalDocuments: docs.length,
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      incomeItems,
      expenseItems,
      transactionDescriptions: descriptions,
      periodCovered: 'Vault documents',
    };
  }

  // ── Main loader ───────────────────────────────────────────────
  async function loadVaultAndForecast() {
    userDocuments = loadVaultDocs();

    if (userDocuments.length === 0) {
      // No vault data — show sandbox banner
      sandboxBanner.style.display = 'flex';
      return;
    }

    await runForecast(aggregateSummary(userDocuments));
  }

  async function runForecast(summaryData, sandbox = false) {
    isSandbox = sandbox;
    sandboxBanner.style.display = 'none';
    loadingOverlay.style.display = 'flex';
    loadingStatus.textContent = sandbox
      ? 'Loading sandbox data into Gemma...'
      : 'Gemma is analyzing your vault...';

    try {
      forecastData = await window.SaakhGemma.generateSaakhForecast(summaryData);
      if (!forecastData || !forecastData.avgDailyIncome) throw new Error('Empty forecast');

      baseAvgIncome  = Number(forecastData.avgDailyIncome)  || 3000;
      baseAvgExpense = Number(forecastData.avgDailyExpense) || 2500;
      currentBalance = Number(forecastData.currentBalance)  || summaryData.netProfit || 30000;

      renderAll();
    } catch (err) {
      loadingStatus.textContent = 'Analysis failed: ' + err.message;
      setTimeout(() => { loadingOverlay.style.display = 'none'; }, 3000);
    } finally {
      if (forecastData) loadingOverlay.style.display = 'none';
    }
  }

  // ── Render everything ─────────────────────────────────────────
  function renderAll() {
    const proj = buildProjection();
    renderKPIs(proj);
    renderChart(proj);
    renderBills();
    renderRestock();
    renderWarnings(proj);
    chartContainer.style.display = 'block';
  }

  // ── Build 30-day projection array ─────────────────────────────
  function buildProjection() {
    const adjustedIncome  = baseAvgIncome  * (1 + stressIncomePct / 100);
    const adjustedExpense = baseAvgExpense;
    const dailyNet = adjustedIncome - adjustedExpense;
    const proj = [];

    let bal = currentBalance;
    const bills = Array.isArray(forecastData.recurringBills) ? forecastData.recurringBills : [];

    for (let d = 0; d < 30; d++) {
      // Add daily net
      bal += dailyNet;

      // Apply recurring bills that fall on this day-of-month
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + d + 1);
      const dom = targetDate.getDate();
      bills.forEach(bill => {
        if (Number(bill.dayOfMonth) === dom) {
          bal -= Number(bill.amount) || 0;
        }
      });

      // Apply one-off stress expense on stress day
      if (stressExtraExpense > 0 && d + 1 === stressExtraExpenseDay) {
        bal -= stressExtraExpense;
      }

      proj.push(Math.round(bal));
    }
    return proj;
  }

  // ── KPIs ──────────────────────────────────────────────────────
  function renderKPIs(proj) {
    const runway = Number(forecastData.projectedRunwayDays) || 30;
    runwayBadge.textContent = runway + (runway >= 30 ? '+ days' : ' days');
    runwayBadge.className = 'runway-badge ' + (runway >= 20 ? 'healthy' : runway >= 10 ? 'warning' : 'danger');
    runwayLabel.textContent = runway >= 30 ? 'Strong Runway' : runway >= 10 ? 'Moderate Runway' : 'Low Cash Warning';
    avgIncomeEl.textContent  = fmtInr(baseAvgIncome * (1 + stressIncomePct / 100));
    avgExpenseEl.textContent = fmtInr(baseAvgExpense);
    balanceEl.textContent    = fmtInr(proj[0] || currentBalance);
  }

  // ── Chart renderer ────────────────────────────────────────────
  function renderChart(proj) {
    const W = svgChart.clientWidth  || 700;
    const H = svgChart.clientHeight || 260;
    const pad = { top: 20, right: 24, bottom: 40, left: 72 };
    const iW = W - pad.left - pad.right;
    const iH = H - pad.top  - pad.bottom;

    // Historical: reconstruct last 30 days of balance from currentBalance
    const hist = [];
    let bal = currentBalance;
    for (let d = 29; d >= 0; d--) {
      hist.unshift(Math.round(bal));
      bal -= (baseAvgIncome - baseAvgExpense);
    }

    const allVals = [...hist, ...proj];
    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const range = maxV - minV || 1;

    function toX(idx, total) {
      return pad.left + (idx / (total - 1)) * iW;
    }
    function toY(val) {
      return pad.top + iH - ((val - minV) / range) * iH;
    }

    // Build paths
    const histPts = hist.map((v, i) => `${toX(i, 60)},${toY(v)}`).join(' ');
    const projPts = proj.map((v, i) => `${toX(i + 30, 60)},${toY(v)}`).join(' ');

    // Y-axis gridlines (5 lines)
    let gridLines = '';
    let yLabels = '';
    for (let i = 0; i <= 4; i++) {
      const val = minV + (range / 4) * i;
      const y = toY(val);
      gridLines += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="#F1F5F9" stroke-width="1"/>`;
      yLabels += `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" fill="#94A3B8" font-size="11">${fmtInrShort(val)}</text>`;
    }

    // X-axis date labels (every 10 days)
    let xLabels = '';
    const today = new Date();
    for (let i = 0; i < 60; i += 10) {
      const d = new Date(today);
      d.setDate(d.getDate() + i - 29);
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      xLabels += `<text x="${toX(i, 60)}" y="${H - 8}" text-anchor="middle" fill="#94A3B8" font-size="11">${label}</text>`;
    }

    // Zero line if visible
    let zeroLine = '';
    if (minV < 0 && maxV > 0) {
      const y0 = toY(0);
      zeroLine = `<line x1="${pad.left}" y1="${y0}" x2="${W - pad.right}" y2="${y0}" stroke="#FECACA" stroke-width="1.5" stroke-dasharray="4,3"/>
      <text x="${pad.left - 8}" y="${y0 + 4}" text-anchor="end" fill="#DC2626" font-size="10">₹0</text>`;
    }

    // Divider between history and projection
    const divX = toX(30, 60);

    svgChart.innerHTML = `
      ${gridLines}
      ${zeroLine}
      ${yLabels}
      ${xLabels}
      <line x1="${divX}" y1="${pad.top}" x2="${divX}" y2="${H - pad.bottom}" stroke="#E2E8F0" stroke-width="1.5" stroke-dasharray="4,3"/>
      <text x="${divX + 4}" y="${pad.top + 12}" fill="#94A3B8" font-size="10" font-weight="600">Today</text>
      <!-- History area fill -->
      <defs>
        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10B981" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#10B981" stop-opacity="0.01"/>
        </linearGradient>
        <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#D97706" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#D97706" stop-opacity="0.01"/>
        </linearGradient>
      </defs>
      <!-- History line -->
      <polyline points="${histPts}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <!-- Projection line (dashed gold) -->
      <polyline points="${projPts}" fill="none" stroke="#D97706" stroke-width="2.5" stroke-dasharray="6,4" stroke-linejoin="round" stroke-linecap="round"/>
      <!-- Dots at key points -->
      <circle cx="${toX(29, 60)}" cy="${toY(hist[29])}" r="5" fill="#10B981" stroke="#fff" stroke-width="2"/>
      <circle cx="${toX(59, 60)}" cy="${toY(proj[29])}" r="5" fill="#D97706" stroke="#fff" stroke-width="2"/>
      <!-- Legend -->
      <line x1="${pad.left}" y1="${H - pad.bottom + 24}" x2="${pad.left + 18}" y2="${H - pad.bottom + 24}" stroke="#10B981" stroke-width="2.5"/>
      <text x="${pad.left + 22}" y="${H - pad.bottom + 28}" fill="#64748B" font-size="11">Historical</text>
      <line x1="${pad.left + 90}" y1="${H - pad.bottom + 24}" x2="${pad.left + 108}" y2="${H - pad.bottom + 24}" stroke="#D97706" stroke-width="2.5" stroke-dasharray="5,3"/>
      <text x="${pad.left + 112}" y="${H - pad.bottom + 28}" fill="#64748B" font-size="11">AI Projection (30d)</text>
    `;
  }

  // ── Bills ─────────────────────────────────────────────────────
  function renderBills() {
    const bills = Array.isArray(forecastData.recurringBills) ? forecastData.recurringBills : [];
    if (!bills.length) {
      billsList.innerHTML = '<p style="color:#94A3B8;font-size:13px;padding:8px 0;">No recurring bills identified.</p>';
      return;
    }
    billsList.innerHTML = bills.map(b => {
      const urgency = daysUntil(b.nextDueDate);
      const cls = urgency <= 3 ? 'alert-danger' : urgency <= 7 ? 'alert-warn' : 'alert-ok';
      return `<div class="alert-item ${cls}">
        <div class="alert-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        </div>
        <div class="alert-body">
          <div class="alert-title">${esc(b.name)}</div>
          <div class="alert-sub">Due ${esc(b.nextDueDate || 'Day ' + b.dayOfMonth)} · Rs ${Number(b.amount).toLocaleString('en-IN')}</div>
        </div>
        <div class="alert-badge">${urgency <= 0 ? 'Overdue' : urgency + 'd'}</div>
      </div>`;
    }).join('');
  }

  // ── Restock ───────────────────────────────────────────────────
  function renderRestock() {
    const items = Array.isArray(forecastData.restockAlerts) ? forecastData.restockAlerts : [];
    if (!items.length) {
      restockList.innerHTML = '<p style="color:#94A3B8;font-size:13px;padding:8px 0;">No restock alerts. Upload more ledger documents for inventory tracking.</p>';
      return;
    }
    restockList.innerHTML = items.map(r => {
      const cls = r.urgency === 'high' ? 'alert-danger' : r.urgency === 'medium' ? 'alert-warn' : 'alert-ok';
      return `<div class="alert-item ${cls}">
        <div class="alert-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        </div>
        <div class="alert-body">
          <div class="alert-title">${esc(r.item)}</div>
          <div class="alert-sub">Restock by ${esc(r.restockBy || 'soon')} · ${r.daysLeft} days left</div>
        </div>
        <div class="alert-badge">${r.daysLeft}d left</div>
      </div>`;
    }).join('');
  }

  // ── Warnings ──────────────────────────────────────────────────
  function renderWarnings(proj) {
    // Find days where proj drops below 0
    const deficits = [];
    proj.forEach((bal, i) => {
      if (bal < 0) {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        deficits.push({ day: i + 1, date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), bal });
      }
    });

    const gemmaWarnings = Array.isArray(forecastData.warnings) ? forecastData.warnings : [];
    const allWarnings = [...deficits.map(df => ({
      date: df.date, message: `Cash deficit projected: Rs ${Math.abs(df.bal).toLocaleString('en-IN')} shortfall`, type: 'deficit'
    })), ...gemmaWarnings];

    if (!allWarnings.length) {
      warningsList.innerHTML = '<div class="no-warnings"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> No critical warnings for the next 30 days!</div>';
      return;
    }
    warningsList.innerHTML = allWarnings.slice(0, 5).map(w => {
      const typeIcon = w.type === 'deficit'
        ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
        : '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>';
      return `<div class="warning-item ${w.type === 'deficit' ? 'is-deficit' : ''}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${typeIcon}</svg>
        <div>
          <div class="warning-date">${esc(String(w.date || ''))}</div>
          <div class="warning-msg">${esc(w.message)}</div>
        </div>
      </div>`;
    }).join('');
  }

  // ── Stress test controls ──────────────────────────────────────
  stressSlider.addEventListener('input', () => {
    stressIncomePct = parseInt(stressSlider.value, 10);
    const sign = stressIncomePct >= 0 ? '+' : '';
    stressSliderVal.textContent = sign + stressIncomePct + '%';
    stressSliderVal.style.color = stressIncomePct >= 0 ? '#059669' : '#DC2626';
    if (forecastData) renderAll();
  });

  stressApplyBtn.addEventListener('click', () => {
    stressExtraExpense = Math.abs(parseInt(stressExpInput.value, 10) || 0);
    stressExtraExpenseDay = Math.min(30, Math.max(1, parseInt(stressExpDay.value, 10) || 15));
    if (forecastData) renderAll();
  });

  resetStressBtn.addEventListener('click', () => {
    stressIncomePct = 0;
    stressExtraExpense = 0;
    stressExtraExpenseDay = 15;
    stressSlider.value = 0;
    stressSliderVal.textContent = '+0%';
    stressSliderVal.style.color = '#64748B';
    stressExpInput.value = '';
    stressExpDay.value = '15';
    if (forecastData) renderAll();
  });

  // ── Sandbox button ────────────────────────────────────────────
  sandboxBtn.addEventListener('click', () => runForecast(SANDBOX_SUMMARY, true));

  // ── Helpers ───────────────────────────────────────────────────
  function fmtInr(n) {
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }
  function fmtInrShort(n) {
    if (Math.abs(n) >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (Math.abs(n) >= 1000)   return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + Math.round(n);
  }
  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function daysUntil(dateStr) {
    if (!dateStr) return 99;
    const ms = new Date(dateStr) - new Date();
    return Math.ceil(ms / 86400000);
  }

  // Redraw chart on window resize
  window.addEventListener('resize', () => {
    if (forecastData) renderChart(buildProjection());
  });

})();
