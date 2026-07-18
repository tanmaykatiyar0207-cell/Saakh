console.log("FORECAST SCRIPT HELLO");
/* ================================================================
   Saakh — AI Forecast Page Logic
   Cashflow Projector · Stress Test · Restock & Bills Forecast
   Persists and loads previous forecasts via Supabase or localStorage.
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
  let useLocalStorageOnly = true;

  // ── DOM refs ──────────────────────────────────────────────────
  const loadingOverlay   = document.getElementById('fc-loading');
  const loadingStatus    = document.getElementById('fc-loading-status');
  
  const sandboxBanner    = document.getElementById('fc-sandbox-banner');
  const sandboxBtn       = document.getElementById('fc-sandbox-btn');
  const emptyBanner      = document.getElementById('fc-empty-banner');
  const forecastNowBtn   = document.getElementById('fc-now-btn');
  const timestampLabel   = document.getElementById('fc-timestamp');

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
  const suggestionCard   = document.getElementById('fc-suggestion-card');
  const suggestionText   = document.getElementById('fc-suggestion-text');

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
    gemmaSuggestion: "Your counter sales are strong, but the bulk purchase of dal/rice on Day 5 will temporarily reduce your runway. Consider delaying the misc packaging purchase to Day 15 to maintain a healthier cash buffer.",
  };

  let initialized = false;

  // ── Auth flow ─────────────────────────────────────────────────
  window.addEventListener('saakh-auth-changed', init);

  if (window.saakhAuthInitialized) {
    init();
  } else {
    window.addEventListener('saakh-auth-initialized', init);
  }

  async function init() {
    if (initialized) return;
    activeUser = window.currentUser;
    console.log("forecast.js: Initializing for user:", activeUser?.id);
    if (!activeUser) return;
    initialized = true;
    
    // Load documents list from LocalStorage synchronously first so UI updates immediately
    loadVaultDocs();
    console.log("forecast.js: Vault documents loaded:", userDocuments.length);
    
    // Check if saakh_forecasts table exists in Supabase
    await checkDatabaseConnection();
    console.log("forecast.js: Database connection checked. useLocalStorageOnly =", useLocalStorageOnly);
    
    // Load previously generated forecast
    await loadPreviousForecast();
  }

  // ── STORAGE: Check connection ──────────────────────────────────
  async function checkDatabaseConnection() {
    if (!window.supabaseClient) {
      useLocalStorageOnly = true;
      return;
    }
    try {
      const { error } = await window.supabaseClient
        .from('saakh_forecasts')
        .select('id')
        .limit(1);
      
      if (error && (error.code === 'PGRST116' || error.message.includes('does not exist'))) {
        useLocalStorageOnly = true;
      } else {
        useLocalStorageOnly = false;
      }
    } catch (_) {
      useLocalStorageOnly = true;
    }
  }

  // ── Load vault docs list ──────────────────────────────────────
  function loadVaultDocs() {
    const userId = activeUser.id;
    try {
      const raw = localStorage.getItem('saakh_vault_' + userId);
      userDocuments = raw ? JSON.parse(raw) : [];
    } catch (_) {
      userDocuments = [];
    }
    
    // Fetch from Supabase as well
    if (window.supabaseClient) {
      console.log("forecast.js: Querying Supabase saakh_documents for user:", userId);
      window.supabaseClient
        .from('saakh_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error("forecast.js: Supabase saakh_documents query error:", error);
            return;
          }
          console.log("forecast.js: Supabase returned documents:", data ? data.length : 0);
          if (data && data.length > 0) {
            userDocuments = data.map(row => ({
              id: row.id,
              fileName: row.file_name,
              fileType: row.file_type,
              uploadedAt: row.created_at,
              extractedData: typeof row.extracted_data === 'string' ? JSON.parse(row.extracted_data) : row.extracted_data
            }));
            updateUIVisibility();
          }
        })
        .catch((err) => {
          console.error("forecast.js: Catch block error querying saakh_documents:", err);
        });
    }
    updateUIVisibility();
  }

  // ── Load Previous Forecast ────────────────────────────────────
  async function loadPreviousForecast() {
    const userId = activeUser.id;

    // Try Supabase first if online
    if (!useLocalStorageOnly) {
      try {
        console.log("forecast.js: Loading forecast from Supabase...");
        const { data, error } = await window.supabaseClient
          .from('saakh_forecasts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const row = data[0];
          forecastData = typeof row.forecast_data === 'string' ? JSON.parse(row.forecast_data) : row.forecast_data;
          console.log("forecast.js: Loaded forecast from Supabase:", JSON.stringify(forecastData));
          baseAvgIncome  = Number(forecastData.avgDailyIncome)  || 3000;
          baseAvgExpense = Number(forecastData.avgDailyExpense) || 2500;
          currentBalance = Number(forecastData.currentBalance)  || 30000;
          isSandbox = false;
          
          showForecastTimestamp(row.created_at);
          renderAll();
          return;
        } else {
          console.log("forecast.js: No forecast found in Supabase or error occurred. Error:", error);
        }
      } catch (err) {
        console.warn('[Saakh] Failed to load forecast from Supabase:', err);
      }
    }

    // Fallback to localStorage
    try {
      const local = localStorage.getItem('saakh_last_forecast_' + userId);
      if (local) {
        const parsed = JSON.parse(local);
        forecastData = parsed.forecast_data;
        baseAvgIncome  = Number(forecastData.avgDailyIncome)  || 3000;
        baseAvgExpense = Number(forecastData.avgDailyExpense) || 2500;
        currentBalance = Number(forecastData.currentBalance)  || 30000;
        isSandbox = false;
        
        showForecastTimestamp(parsed.created_at);
        renderAll();
      } else {
        updateUIVisibility();
      }
    } catch (_) {
      updateUIVisibility();
    }
  }

  // ── Save Forecast ─────────────────────────────────────────────
  async function saveForecastToStorage(forecastObj) {
    const userId = activeUser.id;
    const createdAt = new Date().toISOString();
    const payload = {
      created_at: createdAt,
      forecast_data: forecastObj
    };

    // Save to LocalStorage
    try {
      localStorage.setItem('saakh_last_forecast_' + userId, JSON.stringify(payload));
    } catch (e) {
      console.warn('[Saakh] Failed to save forecast to LocalStorage:', e);
    }

    // Save to Supabase
    if (!useLocalStorageOnly) {
      try {
        await window.supabaseClient
          .from('saakh_forecasts')
          .insert({
            user_id: userId,
            forecast_data: forecastObj,
            created_at: createdAt
          });
      } catch (err) {
        console.warn('[Saakh] Failed to save forecast to Supabase:', err);
      }
    }

    showForecastTimestamp(createdAt);
  }

  // ── Timestamp formatter ────────────────────────────────────────
  function showForecastTimestamp(isoStr) {
    try {
      const d = new Date(isoStr);
      const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      timestampLabel.textContent = `Last generated: ${dateStr} at ${timeStr}`;
    } catch (_) {
      timestampLabel.textContent = '';
    }
  }

  // ── Dynamic UI Visibility Controller ──────────────────────────
  function updateUIVisibility() {
    if (userDocuments.length === 0 && !isSandbox) {
      sandboxBanner.style.display = 'flex';
      emptyBanner.style.display = 'none';
      forecastNowBtn.style.display = 'none';
      timestampLabel.style.display = 'none';
      chartContainer.style.display = 'none';
      if (suggestionCard) suggestionCard.style.display = 'none';
      return;
    }

    sandboxBanner.style.display = 'none';
    forecastNowBtn.style.display = 'inline-flex';
    timestampLabel.style.display = 'inline-block';

    if (forecastData) {
      emptyBanner.style.display = 'none';
      chartContainer.style.display = 'grid'; // showing KPIs
      if (suggestionCard) suggestionCard.style.display = 'block';
    } else {
      emptyBanner.style.display = 'flex';
      chartContainer.style.display = 'none';
      if (suggestionCard) suggestionCard.style.display = 'none';
    }
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

  // ── Forecast Generator ────────────────────────────────────────
  async function runForecast(summaryData, sandbox = false) {
    isSandbox = sandbox;
    emptyBanner.style.display = 'none';
    loadingOverlay.style.display = 'flex';
    loadingStatus.textContent = sandbox
      ? 'Loading sandbox data into Gemma...'
      : 'Gemma is analyzing your vault documents...';

    try {
      forecastData = await window.SaakhGemma.generateSaakhForecast(summaryData);
      if (!forecastData || !forecastData.avgDailyIncome) throw new Error('Empty forecast');

      baseAvgIncome  = Number(forecastData.avgDailyIncome)  || 3000;
      baseAvgExpense = Number(forecastData.avgDailyExpense) || 2500;
      currentBalance = Number(forecastData.currentBalance)  || summaryData.netProfit || 30000;

      // Save if not sandbox
      if (!sandbox) {
        await saveForecastToStorage(forecastData);
      } else {
        timestampLabel.textContent = 'Sandbox Demo Mode';
      }

      renderAll();
    } catch (err) {
      loadingStatus.textContent = 'Analysis failed: ' + err.message;
      setTimeout(() => { loadingOverlay.style.display = 'none'; }, 3000);
    } finally {
      if (forecastData) {
        loadingOverlay.style.display = 'none';
        updateUIVisibility();
      }
    }
  }

  // ── Trigger Manual Forecast ───────────────────────────────────
  forecastNowBtn.addEventListener('click', () => {
    if (userDocuments.length > 0) {
      runForecast(aggregateSummary(userDocuments), false);
    }
  });

  // ── Render everything ─────────────────────────────────────────
  function renderAll() {
    const proj = buildProjection();
    renderKPIs(proj);
    renderChart(proj);
    renderBills();
    renderRestock();
    renderWarnings(proj);

    // Render Gemma AI Cashflow Advice
    if (suggestionText) {
      suggestionText.textContent = forecastData.gemmaSuggestion || "Your cashflow is stable. Keep monitoring details.";
    }

    updateUIVisibility();
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
      bal += dailyNet;

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + d + 1);
      const dom = targetDate.getDate();
      bills.forEach(bill => {
        if (Number(bill.dayOfMonth) === dom) {
          bal -= Number(bill.amount) || 0;
        }
      });

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

    const histPts = hist.map((v, i) => `${toX(i, 60)},${toY(v)}`).join(' ');
    const projPts = proj.map((v, i) => `${toX(i + 30, 60)},${toY(v)}`).join(' ');

    let gridLines = '';
    let yLabels = '';
    for (let i = 0; i <= 4; i++) {
      const val = minV + (range / 4) * i;
      const y = toY(val);
      gridLines += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="#F1F5F9" stroke-width="1"/>`;
      yLabels += `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" fill="#94A3B8" font-size="11">${fmtInrShort(val)}</text>`;
    }

    let xLabels = '';
    const today = new Date();
    for (let i = 0; i < 60; i += 10) {
      const d = new Date(today);
      d.setDate(d.getDate() + i - 29);
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      xLabels += `<text x="${toX(i, 60)}" y="${H - 8}" text-anchor="middle" fill="#94A3B8" font-size="11">${label}</text>`;
    }

    let zeroLine = '';
    if (minV < 0 && maxV > 0) {
      const y0 = toY(0);
      zeroLine = `<line x1="${pad.left}" y1="${y0}" x2="${W - pad.right}" y2="${y0}" stroke="#FECACA" stroke-width="1.5" stroke-dasharray="4,3"/>
      <text x="${pad.left - 8}" y="${y0 + 4}" text-anchor="end" fill="#DC2626" font-size="10">₹0</text>`;
    }

    const divX = toX(30, 60);

    svgChart.innerHTML = `
      ${gridLines}
      ${zeroLine}
      ${yLabels}
      ${xLabels}
      <line x1="${divX}" y1="${pad.top}" x2="${divX}" y2="${H - pad.bottom}" stroke="#E2E8F0" stroke-width="1.5" stroke-dasharray="4,3"/>
      <text x="${divX + 4}" y="${pad.top + 12}" fill="#94A3B8" font-size="10" font-weight="600">Today</text>
      <polyline points="${histPts}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <polyline points="${projPts}" fill="none" stroke="#D97706" stroke-width="2.5" stroke-dasharray="6,4" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${toX(29, 60)}" cy="${toY(hist[29])}" r="5" fill="#10B981" stroke="#fff" stroke-width="2"/>
      <circle cx="${toX(59, 60)}" cy="${toY(proj[29])}" r="5" fill="#D97706" stroke="#fff" stroke-width="2"/>
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

  window.addEventListener('resize', () => {
    if (forecastData) renderChart(buildProjection());
  });

})();
 