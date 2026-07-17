/* ================================================================
   Saakh — Action Center UI Logic
   Handles the Chat-to-Action input -> Gemma -> dynamic card rendering
================================================================ */

(function () {
  'use strict';

  // -- DOM refs --
  const textarea    = document.getElementById('ac-input');
  const analyseBtn  = document.getElementById('ac-analyse-btn');
  const skeleton    = document.getElementById('ac-skeleton');
  const cardsGrid   = document.getElementById('ac-cards-grid');
  const errorBanner = document.getElementById('ac-error');
  const emptyState  = document.getElementById('ac-empty');

  if (!textarea || !analyseBtn) return;

  // -- Helpers --
  function setLoading(on) {
    analyseBtn.disabled = on;
    analyseBtn.innerHTML = on
      ? '<svg class="ac-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Analysing...'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> Generate Actions';
    skeleton.style.display  = on  ? 'grid' : 'none';
    cardsGrid.style.display = on  ? 'none' : 'grid';
    errorBanner.hidden = true;
  }

  function showError(msg) {
    errorBanner.textContent = 'Warning: ' + msg;
    errorBanner.hidden = false;
    skeleton.style.display  = 'none';
    cardsGrid.style.display = 'grid';
    analyseBtn.disabled = false;
    analyseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> Generate Actions';
  }

  // -- Card renderer --
  const BADGE = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
  const PRIORITY_LABEL = { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };
  const SETTINGS_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
  const INSIGHT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

  function buildCard(action, index) {
    const priority = (action.priority || 'low').toLowerCase();
    const badgeClass = BADGE[priority] || 'badge-low';
    const label = PRIORITY_LABEL[priority] || 'Low Priority';
    const card = document.createElement('div');
    card.className = 'acard';
    card.style.cssText = 'opacity:0; transform:translateY(12px); animation: cardFadeIn 0.4s ease forwards; animation-delay:' + (index * 80) + 'ms;';
    card.innerHTML =
      '<div class="acard-top">' +
        '<span class="badge ' + badgeClass + '">' + label + '</span>' +
        '<button class="acard-menu" title="Options">' + SETTINGS_ICON + '</button>' +
      '</div>' +
      '<div class="acard-title">' + escapeHtml(action.title || 'Action') + '</div>' +
      '<div class="acard-desc">' + escapeHtml(action.desc || '') + '</div>' +
      '<div class="acard-insight">' + INSIGHT_ICON + '<span>' + escapeHtml(action.insight || 'Take action now') + '</span></div>' +
      '<button class="acard-btn">' + escapeHtml(action.button || 'Act Now') + '</button>';
    return card;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderCards(actions) {
    cardsGrid.innerHTML = '';
    emptyState.hidden = actions.length > 0;
    actions.forEach(function(action, i) { cardsGrid.appendChild(buildCard(action, i)); });
    cardsGrid.style.display = 'grid';
  }

  // -- Main handler --
  analyseBtn.addEventListener('click', async function() {
    var text = textarea.value.trim();
    if (!text) {
      textarea.focus();
      textarea.style.borderColor = '#DC2626';
      setTimeout(function() { textarea.style.borderColor = ''; }, 1500);
      return;
    }
    if (!window.SaakhGemma || !window.SaakhGemma.generateActionCards) {
      showError('Gemma is not loaded. Please refresh the page.');
      return;
    }
    try {
      setLoading(true);
      var actions = await window.SaakhGemma.generateActionCards(text);
      renderCards(actions);
    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { analyseBtn.click(); }
  });

})();
