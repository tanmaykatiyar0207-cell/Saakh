/* ================================================================
   Saakh Score Logic (with Supabase History)
   Calculates trust score dynamically to match PDF statements.
================================================================ */

(function () {
  'use strict';

  let activeUser = null;

  // -- Event Listeners for Auth --
  window.addEventListener('saakh-auth-changed', (e) => {
    activeUser = e.detail.user;
    if (activeUser) loadHistory();
  });

  async function init() {
    activeUser = window.currentUser;
    if (!activeUser) return;
    await loadHistory();
  }

  if (window.saakhAuthInitialized) {
    init();
  } else {
    window.addEventListener('saakh-auth-initialized', init);
  }

  // -- Calculate Button Listener --
  document.getElementById('calc-score-btn')?.addEventListener('click', async () => {
    const user = activeUser || window.currentUser;
    if (!user) return;
    
    const btn = document.getElementById('calc-score-btn');
    btn.disabled = true;
    btn.innerText = "Calculating...";

    let vault = [];
    let forecast = null;

    // Fetch live data directly from Supabase
    if (window.supabaseClient) {
      try {
        const [docsRes, forecastRes] = await Promise.all([
          window.supabaseClient.from('saakh_documents').select('*').eq('user_id', user.id),
          window.supabaseClient.from('saakh_forecasts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
        ]);

        if (!docsRes.error && docsRes.data) {
          vault = docsRes.data.map(row => ({
            extractedData: typeof row.extracted_data === 'string' ? JSON.parse(row.extracted_data) : row.extracted_data
          }));
        }
        if (!forecastRes.error && forecastRes.data && forecastRes.data.length > 0) {
          const row = forecastRes.data[0];
          forecast = typeof row.forecast_data === 'string' ? JSON.parse(row.forecast_data) : row.forecast_data;
        }
      } catch (err) {
        console.warn("Supabase fetch failed during calculation, using local storage fallback", err);
      }
    }

    // Fallback to localStorage if Supabase didn't yield data
    if (vault.length === 0) {
      try {
        const vaultRaw = localStorage.getItem(`saakh_vault_${user.id}`);
        if (vaultRaw) vault = JSON.parse(vaultRaw);
      } catch(e){}
    }
    if (!forecast) {
      try {
        const forecastRaw = localStorage.getItem(`saakh_forecast_${user.id}`);
        if (forecastRaw) forecast = JSON.parse(forecastRaw);
      } catch(e){}
    }
    
    // Fake slight delay for UX
    setTimeout(() => {
      document.getElementById('calculate-section').style.display = 'none';
      document.getElementById('score-results').style.display = 'block';
      
      const finalScore = calculateAndRenderScore(vault, forecast);
      saveScore(finalScore);
    }, 800);
  });

  function calculateAndRenderScore(vault, forecast) {
    let score = 300; 
    let pDepth = 0, pProfit = 0, pRunway = 0, pStability = 0;

    // 1. Calculate Data Depth based on number of income & expense transactions
    let allIncome = [];
    let allExpenses = [];
    
    if (vault && vault.length > 0) {
      vault.forEach(item => {
        const data = item.extractedData || {};
        (Array.isArray(data.income) ? data.income : []).forEach(x => allIncome.push(x));
        (Array.isArray(data.expenses) ? data.expenses : []).forEach(x => allExpenses.push(x));
      });
      pDepth = Math.min(150, (allIncome.length + allExpenses.length) * 5);
    }

    // 2. Calculate Profitability factor
    let totalIncome = allIncome.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
    let totalExpense = allExpenses.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
    const netProfit = totalIncome - totalExpense;

    if (netProfit > 50000) pProfit = 150;
    else if (netProfit > 10000) pProfit = 100;
    else if (netProfit > 0) pProfit = 50;

    // 3. Calculate Runway factor from forecast
    const runwayDays = forecast ? (forecast.projectedRunwayDays || 0) : 0;
    if (forecast) {
      if (runwayDays > 90) pRunway = 150;
      else if (runwayDays > 30) pRunway = 100;
      else if (runwayDays > 15) pRunway = 50;
    } else {
      pRunway = 100; // Baseline if no forecast
    }

    // 4. Calculate Stability factor
    if (forecast) {
      pStability = 100;
      if (netProfit > 0 && runwayDays > 30) {
        pStability = 150;
      }
    } else {
      pStability = netProfit > 0 ? 100 : 50; // Baseline if no forecast
    }

    score = Math.min(900, score + pDepth + pProfit + pRunway + pStability);
    
    renderGauge(score);
    
    document.getElementById('factor-1-points').innerText = `+${pDepth} pts`;
    document.getElementById('factor-2-points').innerText = `+${pProfit} pts`;
    document.getElementById('factor-3-points').innerText = `+${pRunway} pts`;
    document.getElementById('factor-4-points').innerText = `+${pStability} pts`;
    
    return score;
  }

  function renderGauge(score) {
    const scoreVal = document.getElementById('score-value-text');
    const scoreLbl = document.getElementById('score-label-text');
    const gaugeFill = document.getElementById('score-gauge');
    
    let current = 300;
    const inc = Math.max(1, Math.floor((score - 300) / 30));
    const timer = setInterval(() => {
      current += inc;
      if (current >= score) {
        current = score;
        clearInterval(timer);
        
        let lbl = "Needs Work";
        let color = "#EF4444";
        if (score >= 750) { lbl = "Excellent"; color = "#10B981"; }
        else if (score >= 600) { lbl = "Good"; color = "#F59E0B"; }
        
        scoreLbl.innerText = lbl;
        scoreLbl.style.color = color;
        
        if (score >= 750) scoreLbl.setAttribute('data-i18n', 'score_excellent');
        else if (score >= 600) scoreLbl.setAttribute('data-i18n', 'score_good');
        else scoreLbl.setAttribute('data-i18n', 'score_needs_work');
        
        if (window.getLanguage) window.setLanguage(window.getLanguage());
      }
      scoreVal.innerText = current;
    }, 30);
    
    const percent = (score - 300) / 600;
    const rotation = -45 + (percent * 180);
    setTimeout(() => {
      gaugeFill.style.transform = `rotate(${rotation}deg)`;
      if (score >= 750) gaugeFill.style.borderColor = "#10B981 transparent transparent #10B981";
      else if (score >= 600) gaugeFill.style.borderColor = "#F59E0B transparent transparent #F59E0B";
      else gaugeFill.style.borderColor = "#EF4444 transparent transparent #EF4444";
    }, 100);
  }

  // ── Supabase History ──────────────────────────────────────────────
  async function saveScore(score) {
    const user = activeUser || window.currentUser;
    if (!user) return;
    const record = {
      id: Date.now().toString(),
      user_id: user.id,
      score: score,
      created_at: new Date().toISOString()
    };
    
    // 1. Fallback to LocalStorage first
    let history = JSON.parse(localStorage.getItem(`saakh_score_history_${user.id}`) || '[]');
    history.unshift(record);
    localStorage.setItem(`saakh_score_history_${user.id}`, JSON.stringify(history));
    
    // 2. Try Supabase
    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('saakh_scores').insert([
          { user_id: user.id, score: score }
        ]);
      } catch (e) {
        console.log("Supabase saakh_scores table not ready, using local storage.", e);
      }
    }
    
    loadHistory();
  }

  async function loadHistory() {
    const user = activeUser || window.currentUser;
    if (!user) return;
    
    const histSection = document.getElementById('history-section');
    if (histSection) histSection.style.display = 'block';
    
    let history = [];
    
    // Try Supabase first
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('saakh_scores')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (!error && data && data.length > 0) {
          history = data;
        }
      } catch(e) { }
    }
    
    // Fallback to LocalStorage if Supabase returned nothing or errored
    if (history.length === 0) {
      history = JSON.parse(localStorage.getItem(`saakh_score_history_${user.id}`) || '[]');
    }
    
    renderHistory(history);
  }

  function renderHistory(history) {
    const list = document.getElementById('history-list');
    if (!list) return;
    
    if (!history || history.length === 0) {
      list.innerHTML = `<div style="color: #94A3B8; font-size: 14px; text-align: center; padding: 20px 0;">No history yet.</div>`;
      return;
    }
    
    list.innerHTML = '';
    history.forEach(item => {
      let lbl = item.score >= 750 ? 'Excellent' : item.score >= 600 ? 'Good' : 'Needs Work';
      let col = item.score >= 750 ? '#10B981' : item.score >= 600 ? '#F59E0B' : '#EF4444';
      let date = new Date(item.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
      
      const div = document.createElement('div');
      div.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;";
      div.innerHTML = `
        <div>
          <div style="font-weight: 600; color: #0F172A; font-family: 'Space Grotesk', sans-serif; font-size: 16px;">${item.score} <span style="font-size: 12px; font-family: 'Inter', sans-serif; color: ${col}; margin-left: 8px;">${lbl}</span></div>
          <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Calculated on ${date}</div>
        </div>
        <div style="color: #94A3B8;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
        </div>
      `;
      list.appendChild(div);
    });
  }

})();
