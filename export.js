/* ================================================================
   Saakh — Export Page Logic
   Chat-to-PDF: User types a time frame, Gemma parses it,
   vault docs are filtered, and a PDF is generated.
================================================================ */

(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────
  const queryInput   = document.getElementById('export-query-input');
  const generateBtn  = document.getElementById('export-generate-btn');
  const resultArea   = document.getElementById('export-result-area');
  const emptyState   = document.getElementById('export-empty');
  const noMatchState = document.getElementById('export-no-match');
  const matchState   = document.getElementById('export-match');
  const matchPeriod  = document.getElementById('export-match-period');
  const matchCount   = document.getElementById('export-match-count');
  const matchList    = document.getElementById('export-match-list');
  const downloadBtn  = document.getElementById('export-download-btn');
  const errorBanner  = document.getElementById('export-error');

  let activeUser = null;
  let userDocuments = [];
  let lastMatchedDocs = [];
  let lastParsedPeriod = null;

  let initialized = false;

  // ── Auth init ────────────────────────────────────────────────
  window.addEventListener('saakh-auth-changed', init);

  if (window.saakhAuthInitialized) {
    init();
  } else {
    window.addEventListener('saakh-auth-initialized', init);
  }

  function init() {
    if (initialized) return;
    activeUser = window.currentUser;
    if (!activeUser) return;
    initialized = true;
    loadVaultDocs();
  }

  function loadVaultDocs() {
    const userId = activeUser.id;
    try {
      const raw = localStorage.getItem('saakh_vault_' + userId);
      userDocuments = raw ? JSON.parse(raw) : [];
    } catch (_) {
      userDocuments = [];
    }
    // Also try Supabase if available
    if (window.supabaseClient) {
      window.supabaseClient
        .from('saakh_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            userDocuments = data.map(row => ({
              id: row.id,
              fileName: row.file_name,
              fileType: row.file_type,
              uploadedAt: row.created_at,
              extractedData: typeof row.extracted_data === 'string' ? JSON.parse(row.extracted_data) : row.extracted_data
            }));
          }
        })
        .catch(() => {});
    }
  }

  // ── Helpers ──────────────────────────────────────────────────
  function setLoading(on) {
    generateBtn.disabled = on;
    generateBtn.innerHTML = on
      ? '<svg class="export-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Analysing...'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Find & Export';
    errorBanner.hidden = true;
  }

  function showError(msg) {
    errorBanner.textContent = 'Error: ' + msg;
    errorBanner.hidden = false;
    setLoading(false);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(isoStr) {
    try {
      return new Date(isoStr).toLocaleDateString('en-IN', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch (_) { return isoStr; }
  }

  // ── Filter docs by date range ─────────────────────────────────
  function filterDocsByRange(start, end) {
    const startMs = new Date(start).getTime();
    const endMs   = new Date(end).getTime() + 86400000; // inclusive end
    return userDocuments.filter(doc => {
      const ts = new Date(doc.uploadedAt).getTime();
      return ts >= startMs && ts <= endMs;
    });
  }

  // ── Render match result ────────────────────────────────────────
  function renderMatchResult(docs, periodLabel) {
    emptyState.style.display = 'none';
    noMatchState.style.display = 'none';

    if (docs.length === 0) {
      noMatchState.querySelector('.no-match-period').textContent = periodLabel;
      noMatchState.style.display = 'flex';
      matchState.style.display = 'none';
      downloadBtn.disabled = true;
      return;
    }

    matchState.style.display = 'block';
    matchPeriod.textContent = periodLabel;
    matchCount.textContent = docs.length + ' document' + (docs.length !== 1 ? 's' : '') + ' found';

    matchList.innerHTML = '';
    docs.forEach(doc => {
      const net = doc.extractedData?.netProfit || '—';
      const isNeg = String(net).includes('-');
      const li = document.createElement('div');
      li.className = 'export-match-item';
      li.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '<div class="export-match-item-meta">' +
          '<span class="export-match-name">' + escapeHtml(doc.fileName) + '</span>' +
          '<span class="export-match-date">' + formatDate(doc.uploadedAt) + '</span>' +
        '</div>' +
        '<span class="export-match-net ' + (isNeg ? 'neg' : 'pos') + '">' + escapeHtml(net) + '</span>';
      matchList.appendChild(li);
    });

    downloadBtn.disabled = false;
    lastMatchedDocs = docs;
    lastParsedPeriod = periodLabel;
  }

  // ── Main handler ──────────────────────────────────────────────
  generateBtn.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    if (!query) {
      queryInput.focus();
      queryInput.style.outline = '2px solid #DC2626';
      setTimeout(() => { queryInput.style.outline = ''; }, 1500);
      return;
    }
    if (!window.SaakhGemma || !window.SaakhGemma.parseExportQuery) {
      showError('Gemma engine not loaded. Please refresh the page.');
      return;
    }

    setLoading(true);

    try {
      const parsed = await window.SaakhGemma.parseExportQuery(query);
      const { periodLabel, startDate, endDate } = parsed;

      if (!startDate || !endDate) {
        showError('Could not understand the time period. Try something like "July 2026" or "last 3 months".');
        return;
      }

      const matched = filterDocsByRange(startDate, endDate);
      renderMatchResult(matched, periodLabel);

    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  // Ctrl+Enter shortcut
  queryInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generateBtn.click();
  });

  // ── PDF Download ──────────────────────────────────────────────
  downloadBtn.addEventListener('click', async () => {
    if (!lastMatchedDocs.length) return;
    if (!window.SaakhExport || !window.SaakhExport.downloadSaakhStatement) {
      alert('PDF library is missing. Please reload the page.');
      return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Generating PDF...';

    try {
      // Aggregate all matched docs
      const allIncome   = [];
      const allExpenses = [];
      let totalIncome  = 0;
      let totalExpense = 0;

      lastMatchedDocs.forEach(doc => {
        const data = doc.extractedData || {};
        (Array.isArray(data.income)   ? data.income   : []).forEach(x => {
          allIncome.push(x);
          totalIncome += Number(x.amount) || 0;
        });
        (Array.isArray(data.expenses) ? data.expenses : []).forEach(x => {
          allExpenses.push(x);
          totalExpense += Number(x.amount) || 0;
        });
      });

      // Dynamic Saakh Score Calculation for the export period
      let pDepth = Math.min(150, (allIncome.length + allExpenses.length) * 5);
      let pProfit = 0;
      const netProfit = totalIncome - totalExpense;
      if (netProfit > 50000) pProfit = 150;
      else if (netProfit > 10000) pProfit = 100;
      else if (netProfit > 0) pProfit = 50;
      
      let pRunway = 100; // Estimated baseline for a period
      let pStability = netProfit > 0 ? 100 : 50; // Estimated baseline
      
      const dynamicScore = Math.min(900, 300 + pDepth + pProfit + pRunway + pStability);
      let scoreLabel = dynamicScore >= 750 ? 'Excellent' : dynamicScore >= 600 ? 'Good' : 'Needs Work';

      const margin = totalIncome > 0
        ? ((netProfit / totalIncome) * 100).toFixed(1) + '%'
        : '0%';

      const shopName = (activeUser?.user_metadata?.shop_name) || 'My Business';
      const fileNames = lastMatchedDocs.map(d => d.fileName).join(', ');

      const profile = {
        businessName: shopName,
        period: lastParsedPeriod,
        source: 'Exported from Vault: ' + fileNames,
        score: String(dynamicScore),
        scoreLabel,
        income:   allIncome.map(x => ({ label: x.label, amount: 'Rs ' + Number(x.amount).toLocaleString('en-IN') })),
        incomeTotal:   'Rs ' + totalIncome.toLocaleString('en-IN'),
        expenses: allExpenses.map(x => ({ label: x.label, amount: 'Rs ' + Number(x.amount).toLocaleString('en-IN') })),
        expenseTotal:  'Rs ' + totalExpense.toLocaleString('en-IN'),
        netProfit:     'Rs ' + netProfit.toLocaleString('en-IN'),
        profitMargin:  margin,
        narrative: [
          {
            title: 'Period Summary',
            body: `This report covers ${lastMatchedDocs.length} document(s) for the period: ${lastParsedPeriod}. Total income stands at Rs ${totalIncome.toLocaleString('en-IN')} with expenses of Rs ${totalExpense.toLocaleString('en-IN')}.`
          },
          {
            title: 'Cash Position',
            body: `Net surplus for this period is Rs ${netProfit.toLocaleString('en-IN')}, representing a ${margin} profit margin. The Saakh Credit Score for this period is ${dynamicScore} (${scoreLabel}).`
          },
          {
            title: 'Lender Note',
            body: 'This period-specific report was generated from the Saakh Document Vault. All figures are extracted by Gemma AI directly from uploaded business records.'
          }
        ],
        gapNote: 'Report generated from uploaded vault documents for the period: ' + lastParsedPeriod + '.'
      };

      await window.SaakhExport.downloadSaakhStatement(profile);

    } catch (err) {
      alert('PDF export failed: ' + (err.message || 'Unknown error.'));
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF';
    }
  });

})();
