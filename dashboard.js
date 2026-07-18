/* ================================================================
   Saakh — Dashboard Logic
   Aggregates data from Vault & Forecast to power summary widgets.
================================================================ */

(function () {
  'use strict';

  let activeUser = null;

  // DOM Elements
  const kpiProfit = document.getElementById('dash-kpi-profit');
  const kpiBalance = document.getElementById('dash-kpi-balance');
  const kpiRunway = document.getElementById('dash-kpi-runway');
  const expensesList = document.getElementById('dash-expenses-list');
  const attentionList = document.getElementById('dash-attention-list');
  
  const copilotInput = document.getElementById('dash-copilot-input');
  const copilotBtn = document.getElementById('dash-copilot-btn');

  // Format INR
  function formatInr(val) {
    if (isNaN(val)) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN');
  }

  window.addEventListener('saakh-auth-initialized', init);
  window.addEventListener('saakh-auth-changed', init);

  async function init() {
    activeUser = window.currentUser;
    if (!activeUser) return;
    
    setupCopilotWidget();
    await loadDashboardData();
  }

  // ── Quick Copilot ──────────────────────────────────────────────
  function setupCopilotWidget() {
    function submitCopilot() {
      const q = copilotInput.value.trim();
      if (!q) return;
      // Redirect to copilot with query parameter
      window.location.href = `copilot.html?q=${encodeURIComponent(q)}`;
    }

    copilotBtn.addEventListener('click', submitCopilot);
    copilotInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitCopilot();
    });
  }

  // ── Data Loading & Calculation ─────────────────────────────────
  async function loadDashboardData() {
    const user = activeUser || window.currentUser;
    if (!user) return;
    const userId = user.id;
    let docs = [];
    let forecast = null;

    // 0. Instantly load from local storage cache to eliminate the 0s flash delay (Stale-While-Revalidate)
    try {
      const rawVault = localStorage.getItem('saakh_vault_' + userId);
      const rawForecast = localStorage.getItem('saakh_forecast_' + userId);
      if (rawVault) docs = JSON.parse(rawVault);
      if (rawForecast) forecast = JSON.parse(rawForecast);
      if (docs.length > 0 || forecast) {
        renderKPIs(docs, forecast);
        renderTopExpenses(docs);
        renderNeedsAttention(forecast);
      }
    } catch (_) {}

    // 1. Fetch Fresh Vault Data from Supabase
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.from('saakh_documents').select('*').eq('user_id', userId);
        if (data && data.length > 0) {
          docs = data.map(r => {
            let parsed = r.extracted_data;
            if (typeof parsed === 'string') {
              try { parsed = JSON.parse(parsed); } catch(e){}
            }
            return { extractedData: parsed };
          });
          localStorage.setItem('saakh_vault_' + userId, JSON.stringify(docs));
        }
      } catch (err) {
        console.warn("Supabase fetch failed, keeping local storage");
      }
    }
    
    // 2. Fetch Fresh Forecast Data from Supabase
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient.from('saakh_forecasts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
        if (data && data.length > 0) {
          let parsed = data[0].forecast_data;
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch(e){}
          }
          forecast = parsed;
          localStorage.setItem('saakh_forecast_' + userId, JSON.stringify(forecast));
        }
      } catch (err) {
        console.warn("Supabase forecast fetch failed");
      }
    }

    // 3. Re-render with fresh data
    renderKPIs(docs, forecast);
    renderTopExpenses(docs);
    renderNeedsAttention(forecast);
  }

  // ── Emergency Seed Demo Data ──────────────────────────────────
  const seedBtn = document.getElementById('emergency-seed-btn');
  if (seedBtn) {
    seedBtn.addEventListener('click', async () => {
      const user = activeUser || window.currentUser;
      if (!user) return alert("Please log in first!");
      const userId = user.id;
      seedBtn.textContent = "Seeding...";
      seedBtn.disabled = true;
      try {
        // Seed documents
        await window.supabaseClient.from('saakh_documents').insert([
          { user_id: userId, file_name: 'Flour_Sugar_Invoice_March.pdf', file_type: 'application/pdf', extracted_data: { netProfit: -1500, expenses: [{ label: 'Flour and Sugar bulk purchase', amount: 1500 }] } },
          { user_id: userId, file_name: 'Daily_Sales_Report_March.csv', file_type: 'text/csv', extracted_data: { netProfit: 8000, income: [{ label: 'Daily counter sales', amount: 8000 }] } },
          { user_id: userId, file_name: 'Electricity_Bill_March.pdf', file_type: 'application/pdf', extracted_data: { netProfit: -400, expenses: [{ label: 'Electricity Bill', amount: 400 }] } }
        ]);
        
        // Seed forecast
        await window.supabaseClient.from('saakh_forecasts').insert({
          user_id: userId,
          forecast_data: { avgDailyIncome: 4500, avgDailyExpense: 1200, currentBalance: 12500, projectedRunwayDays: 145, growthRate: 5.2, predictions: [{ date: '2026-07-18', predictedBalance: 12500 }] },
          created_at: new Date().toISOString()
        });

        // Seed scores
        await window.supabaseClient.from('saakh_scores').insert([
          { user_id: userId, score: 650 }, { user_id: userId, score: 675 }, { user_id: userId, score: 710 }
        ]);
        
        alert("Success! Demo data seeded to your account. Reloading dashboard...");
        window.location.reload();
      } catch (e) {
        alert("Error seeding data: " + e.message);
        seedBtn.textContent = "Error";
      }
    });
  }

  // ── Render Helpers ────────────────────────────────────────────
  function renderKPIs(docs, forecast) {
    // Net Profit
    let totalIn = 0, totalOut = 0;
    docs.forEach(d => {
      const e = d.extractedData || {};
      (e.income || []).forEach(i => totalIn += Number(i.amount) || 0);
      (e.expenses || []).forEach(x => totalOut += Number(x.amount) || 0);
    });
    
    kpiProfit.textContent = formatInr(totalIn - totalOut);
    
    // Color code profit
    if ((totalIn - totalOut) < 0) kpiProfit.style.color = '#DC2626';

    // Forecast Balance & Runway
    if (forecast) {
      kpiBalance.textContent = formatInr(forecast.currentBalance || 0);
      kpiRunway.textContent = forecast.projectedRunwayDays || 0;
      
      // Runway styling
      const r = forecast.projectedRunwayDays || 0;
      const widget = kpiRunway.closest('.score-widget');
      if (r < 15) {
        widget.style.background = 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)';
      } else if (r < 30) {
        widget.style.background = 'linear-gradient(135deg, #B45309 0%, #D97706 100%)';
      } else {
        widget.style.background = 'linear-gradient(135deg, #047857 0%, #10B981 100%)';
      }
    } else {
      kpiBalance.textContent = '₹0';
      kpiRunway.textContent = '0';
    }
  }

  function renderTopExpenses(docs) {
    const expensesMap = {};
    let hasData = false;

    docs.forEach(d => {
      const e = d.extractedData || {};
      (e.expenses || []).forEach(x => {
        if (!x.amount) return;
        hasData = true;
        let label = (x.label || 'Other').toLowerCase();
        // Simple normalization
        if (label.includes('rent')) label = 'Rent';
        else if (label.includes('electric') || label.includes('util')) label = 'Utilities';
        else if (label.includes('salary') || label.includes('labour')) label = 'Labour';
        else if (label.includes('stock') || label.includes('inventory') || label.includes('purchase')) label = 'Inventory';
        
        expensesMap[label] = (expensesMap[label] || 0) + Number(x.amount);
      });
    });

    if (!hasData) return; // Keep empty state

    // Sort top 3
    const sorted = Object.keys(expensesMap)
      .map(k => ({ label: k, amount: expensesMap[k] }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    let html = '';
    const maxVal = sorted[0]?.amount || 1;
    
    sorted.forEach(item => {
      const pct = Math.max(5, Math.round((item.amount / maxVal) * 100));
      html += `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; text-transform: capitalize;">
            <span>${item.label}</span>
            <span>${formatInr(item.amount)}</span>
          </div>
          <div style="height: 6px; background: #F1F5F9; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: #3B82F6; border-radius: 4px;"></div>
          </div>
        </div>
      `;
    });

    expensesList.innerHTML = html;
  }

  function renderNeedsAttention(forecast) {
    if (!forecast) return; // Keep empty state

    const alerts = [];

    // Combine warnings and restock alerts
    (forecast.warnings || []).forEach(w => {
      alerts.push({
        type: 'warning',
        text: w.message || 'Warning',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        bg: '#FEF2F2'
      });
    });

    (forecast.restockAlerts || []).forEach(r => {
      alerts.push({
        type: 'restock',
        text: `Restock needed: ${r.item} (${r.daysLeft} days left)`,
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
        bg: '#FFFBEB'
      });
    });

    if (alerts.length === 0) return;

    let html = '';
    // Show top 3 or 4 alerts
    alerts.slice(0, 4).forEach(a => {
      html += `
        <div style="display: flex; gap: 12px; padding: 12px; background: ${a.bg}; border-radius: 12px;">
          <div style="width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px;">
            ${a.icon}
          </div>
          <div style="font-size: 13.5px; font-weight: 500; color: #1E293B; line-height: 1.4;">
            ${a.text}
          </div>
        </div>
      `;
    });

    attentionList.innerHTML = html;
  }

})();
