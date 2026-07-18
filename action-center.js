/* ================================================================
   Saakh — Action Center UI Logic
   Handles the Chat-to-Action input -> Gemma -> dynamic card rendering
   Syncs tasks to Supabase with local storage fallback.
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

  let activeUser = null;
  let localTasks = []; // Offline fallback

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
        '<div style="position: relative;">' +
          '<button class="acard-menu" title="Set Priority">' + SETTINGS_ICON + '</button>' +
          '<div class="priority-dropdown" style="display:none; position:absolute; right:0; top:32px; background:#fff; border:1px solid #E2E8F0; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:10; padding:4px; min-width:120px;">' +
            '<div class="dropdown-item" data-priority="high" style="padding:8px 10px; font-size:12px; font-weight:600; color:#DC2626; cursor:pointer; border-radius:6px; transition:background 0.15s; font-family:inherit;">High Priority</div>' +
            '<div class="dropdown-item" data-priority="medium" style="padding:8px 10px; font-size:12px; font-weight:600; color:#D97706; cursor:pointer; border-radius:6px; transition:background 0.15s; font-family:inherit;">Medium Priority</div>' +
            '<div class="dropdown-item" data-priority="low" style="padding:8px 10px; font-size:12px; font-weight:600; color:#64748B; cursor:pointer; border-radius:6px; transition:background 0.15s; font-family:inherit;">Low Priority</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="acard-title">' + escapeHtml(action.title || 'Action') + '</div>' +
      '<div class="acard-desc">' + escapeHtml(action.desc || '') + '</div>' +
      '<div class="acard-insight">' + INSIGHT_ICON + '<span>' + escapeHtml(action.insight || 'Take action now') + '</span></div>' +
      '<button class="acard-btn">' + escapeHtml(action.button || 'Act Now') + '</button>';

    // -- Attach Dropdown Event Handlers --
    const menuBtn = card.querySelector('.acard-menu');
    const dropdown = card.querySelector('.priority-dropdown');
    
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close any other open dropdowns first
      document.querySelectorAll('.priority-dropdown').forEach(d => {
        if (d !== dropdown) d.style.display = 'none';
      });
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Handle priority selection
    const items = card.querySelectorAll('.dropdown-item');
    items.forEach(item => {
      item.addEventListener('mouseenter', () => { item.style.background = '#F1F5F9'; });
      item.addEventListener('mouseleave', () => { item.style.background = ''; });
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown.style.display = 'none';
        const newPriority = item.getAttribute('data-priority');
        await updateTaskPriority(action.id, newPriority);
      });
    });

    // Close dropdown on click outside
    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
    });

    // -- Attach CTA click to complete task --
    const ctaBtn = card.querySelector('.acard-btn');
    ctaBtn.addEventListener('click', async () => {
      ctaBtn.disabled = true;
      ctaBtn.textContent = 'Completing...';
      await completeTask(action.id);
    });

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

  // ── Database Operations ──────────────────────────────────────────
  
  async function loadTasks() {
    const user = activeUser || window.currentUser;
    if (!user) return;
    const userId = user.id;

    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('saakh_tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('completed', false)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const actions = (data || []).map(row => ({
          id: row.id,
          title: row.title,
          desc: row.description,
          priority: row.priority,
          insight: row.insight,
          button: row.button_text
        }));
        localTasks = actions;
        renderCards(actions);
        return;
      } catch (err) {
        console.warn("Supabase load tasks failed, falling back to local storage", err);
      }
    }

    // Local Storage Fallback
    try {
      const raw = localStorage.getItem('saakh_tasks_' + userId);
      localTasks = raw ? JSON.parse(raw) : [];
      renderCards(localTasks);
    } catch (_) {}
  }

  async function syncLocalTasksToSupabase(userId) {
    // Write local state to localStorage
    localStorage.setItem('saakh_tasks_' + userId, JSON.stringify(localTasks));
  }

  async function saveNewTasks(newActions) {
    const user = activeUser || window.currentUser;
    if (!user) return;
    const userId = user.id;

    const formattedTasks = newActions.map(action => ({
      user_id: userId,
      title: action.title,
      description: action.desc,
      priority: (action.priority || 'low').toLowerCase(),
      insight: action.insight,
      button_text: action.button || 'Act Now',
      completed: false
    }));

    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('saakh_tasks')
          .insert(formattedTasks)
          .select();

        if (error) throw error;

        // Refresh UI
        await loadTasks();
        return;
      } catch (err) {
        console.warn("Failed to sync new tasks to Supabase, saving locally", err);
      }
    }

    // Local Storage Fallback
    const localFormatted = formattedTasks.map((t, index) => ({
      id: 'local_' + Date.now() + '_' + index,
      title: t.title,
      desc: t.description,
      priority: t.priority,
      insight: t.insight,
      button: t.button_text
    }));

    localTasks = [...localFormatted, ...localTasks];
    await syncLocalTasksToSupabase(userId);
    renderCards(localTasks);
  }

  async function updateTaskPriority(taskId, newPriority) {
    const user = activeUser || window.currentUser;
    const userId = user ? user.id : '';

    if (window.supabaseClient && !String(taskId).startsWith('local_')) {
      try {
        const { error } = await window.supabaseClient
          .from('saakh_tasks')
          .update({ priority: newPriority })
          .eq('id', taskId);

        if (error) throw error;
        await loadTasks();
        return;
      } catch (err) {
        console.warn("Failed to update task priority on Supabase", err);
      }
    }

    // Local Storage update
    localTasks = localTasks.map(t => {
      if (t.id === taskId) {
        t.priority = newPriority;
      }
      return t;
    });
    if (userId) await syncLocalTasksToSupabase(userId);
    renderCards(localTasks);
  }

  async function completeTask(taskId) {
    const user = activeUser || window.currentUser;
    const userId = user ? user.id : '';

    if (window.supabaseClient && !String(taskId).startsWith('local_')) {
      try {
        const { error } = await window.supabaseClient
          .from('saakh_tasks')
          .update({ completed: true })
          .eq('id', taskId);

        if (error) throw error;
        await loadTasks();
        return;
      } catch (err) {
        console.warn("Failed to complete task on Supabase", err);
      }
    }

    // Local Storage complete
    localTasks = localTasks.filter(t => t.id !== taskId);
    if (userId) await syncLocalTasksToSupabase(userId);
    renderCards(localTasks);
  }

  // ── Main handlers & initialization ───────────────────────────────

  analyseBtn.addEventListener('click', async function() {
    var text = textarea.value.trim();
    console.log("action-center.js: Clicked Generate Actions. Input text:", text);
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
      console.log("action-center.js: Calling Gemma generateActionCards...");
      var actions = await window.SaakhGemma.generateActionCards(text);
      console.log("action-center.js: Gemma returned actions:", JSON.stringify(actions));
      await saveNewTasks(actions);
      textarea.value = ''; // Clear input on success
    } catch (err) {
      console.error("action-center.js: Error in Generate Actions:", err);
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { analyseBtn.click(); }
  });

  async function init() {
    activeUser = window.currentUser;
    if (!activeUser) return;
    await loadTasks();
  }

  window.addEventListener('saakh-auth-changed', init);

  if (window.saakhAuthInitialized) {
    init();
  } else {
    window.addEventListener('saakh-auth-initialized', init);
  }

})();
 