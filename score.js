/* ================================================================
   Saakh Score Logic (with Supabase History)
================================================================ */

let activeUser = null;

document.addEventListener('saakh-auth-initialized', async (e) => {
  const { session, user } = e.detail;
  if (!user) return;
  activeUser = user;
  
  // Load history on init
  loadHistory();
});

document.getElementById('calc-score-btn')?.addEventListener('click', () => {
  const user = activeUser || window.currentUser;
  if (!user) return;
  
  const btn = document.getElementById('calc-score-btn');
  btn.disabled = true;
  btn.innerText = "Calculating...";
  
  // Fake slight delay for UX
  setTimeout(() => {
    document.getElementById('calculate-section').style.display = 'none';
    document.getElementById('score-results').style.display = 'block';
    
    // Retrieve data
    const vaultRaw = localStorage.getItem(`saakh_vault_${user.id}`);
    const forecastRaw = localStorage.getItem(`saakh_last_forecast_${user.id}`);
    
    let vault = [];
    let forecast = null;
    try {
      if (vaultRaw) vault = JSON.parse(vaultRaw);
      if (forecastRaw) forecast = JSON.parse(forecastRaw);
    } catch (e) { console.error(e); }

    const finalScore = calculateAndRenderScore(vault, forecast);
    saveScore(finalScore);
  }, 800);
});

function calculateAndRenderScore(vault, forecast) {
  let score = 300; 
  let pDepth = 0, pProfit = 0, pRunway = 0, pStability = 0;

  if (vault && vault.length > 0) {
    const txCount = vault.reduce((sum, item) => sum + (item.parsedData?.transactions?.length || 0), 0);
    pDepth = Math.min(150, txCount * 5); 
  }

  let netProfit = 0;
  if (vault && vault.length > 0) {
    vault.forEach(item => {
      const txs = item.parsedData?.transactions || [];
      txs.forEach(tx => {
        if (tx.type === 'income') netProfit += tx.amount;
        if (tx.type === 'expense') netProfit -= tx.amount;
      });
    });
    if (netProfit > 50000) pProfit = 150;
    else if (netProfit > 10000) pProfit = 100;
    else if (netProfit > 0) pProfit = 50;
  }

  if (forecast && forecast.forecast) {
    const runwayDays = forecast.forecast.metrics?.cash_runway_days || 0;
    if (runwayDays > 90) pRunway = 150;
    else if (runwayDays > 30) pRunway = 100;
    else if (runwayDays > 15) pRunway = 50;
  }

  if (forecast) {
    pStability = 100;
    if (netProfit > 0 && forecast.forecast.metrics?.cash_runway_days > 30) {
        pStability = 150;
    }
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
  
  // 2. Try Supabase (Will fail silently if table 'saakh_scores' doesn't exist yet, avoiding crashes)
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
  document.getElementById('history-section').style.display = 'block';
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
