/* ================================================================
   Saakh — AI Copilot Chat Interface
   Handles conversational AI flow and injects business context.
================================================================ */

(function () {
  'use strict';

  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send');
  const chatMessages = document.getElementById('chat-messages');
  const emptyState = document.getElementById('chat-empty-state');

  let activeUser = null;
  let userDocuments = [];
  let forecastData = null;
  let messageHistory = [];
  let listenersSetup = false;
  
  // Context String built from Vault & Forecast
  let businessContextString = "";

  if (window.saakhAuthInitialized) {
    init();
  } else {
    window.addEventListener('saakh-auth-initialized', init);
  }
  window.addEventListener('saakh-auth-changed', init);

  async function init() {
    activeUser = window.currentUser;
    if (!activeUser) return;
    
    await loadContextData();
    
    if (!listenersSetup) {
      setupEventListeners();
      listenersSetup = true;
    }
    
    // Check for deep link query
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q) {
      chatInput.value = q;
      sendMessage();
      // Remove the query param from URL so refresh doesn't resend
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // ── Load Context Data ─────────────────────────────────────────
  async function loadContextData() {
    const userId = activeUser.id;
    let docs = [];
    let forecast = null;
    
    // 1. Load Docs from LocalStorage (Fallback)
    try {
      const raw = localStorage.getItem('saakh_vault_' + userId);
      docs = raw ? JSON.parse(raw) : [];
    } catch (_) {}
    
    // 2. Load Docs from Supabase (if available)
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('saakh_documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          docs = data.map(row => {
            let ext = row.extracted_data;
            if (typeof ext === 'string') {
              try { ext = JSON.parse(ext); } catch(e){}
            }
            return {
              id: row.id,
              fileName: row.file_name,
              fileType: row.file_type,
              uploadedAt: row.created_at,
              extractedData: ext
            };
          });
        }
      } catch (_) {}
    }
    userDocuments = docs;

    // 3. Load Forecast from LocalStorage (Fallback)
    try {
      const localF = localStorage.getItem('saakh_forecast_' + userId);
      if (localF) {
        forecast = JSON.parse(localF);
      }
    } catch (_) {}

    // 4. Load Forecast from Supabase (if available)
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('saakh_forecasts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          let fd = data[0].forecast_data;
          if (typeof fd === 'string') {
            try { fd = JSON.parse(fd); } catch(e){}
          }
          forecast = fd;
        }
      } catch (_) {}
    }
    forecastData = forecast;

    buildContextString();
  }

  // ── Build Context String ──────────────────────────────────────
  function buildContextString() {
    const name = activeUser?.user_metadata?.shop_name || 'The Business';
    
    let docsSummary = "No uploaded ledger documents available.";
    if (userDocuments.length > 0) {
      let totalIn = 0, totalOut = 0;
      userDocuments.forEach(d => {
        const ext = d.extractedData || {};
        (ext.income || []).forEach(i => totalIn += Number(i.amount) || 0);
        (ext.expenses || []).forEach(e => totalOut += Number(e.amount) || 0);
      });
      docsSummary = `Uploaded Documents: ${userDocuments.length}
Total Extracted Income: Rs. ${totalIn}
Total Extracted Expenses: Rs. ${totalOut}
Net Profit (from docs): Rs. ${totalIn - totalOut}`;
    }

    let forecastSummary = "No generated forecast available.";
    if (forecastData) {
      forecastSummary = `Current Cash Balance: Rs. ${forecastData.currentBalance || 'N/A'}
Avg Daily Income: Rs. ${forecastData.avgDailyIncome || 0}
Avg Daily Expense: Rs. ${forecastData.avgDailyExpense || 0}
Projected Runway: ${forecastData.projectedRunwayDays || 0} days
Recurring Bills: ${JSON.stringify(forecastData.recurringBills || [])}
Restock Alerts: ${JSON.stringify(forecastData.restockAlerts || [])}
Warnings: ${JSON.stringify(forecastData.warnings || [])}`;
    }

    businessContextString = `
Business Name: ${name}
---
[VAULT LEDGER SUMMARY]
${docsSummary}
---
[30-DAY FORECAST SUMMARY]
${forecastSummary}
    `;
  }

  // ── Chat Interaction ──────────────────────────────────────────
  function setupEventListeners() {
    chatInput.addEventListener('input', () => {
      chatSendBtn.disabled = chatInput.value.trim().length === 0;
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    chatSendBtn.addEventListener('click', sendMessage);

    // ── Voice Input (Web Speech API) ────────────────────────────────
    const micBtn = document.getElementById('chat-mic');
    if (micBtn) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        const langSelect = document.querySelector('.lang-selector');
        let isRecording = false;

        micBtn.addEventListener('click', () => {
          if (isRecording) {
            recognition.stop();
            return;
          }
          
          let lang = 'en-IN';
          if (langSelect) {
            const val = langSelect.value;
            if (val === 'hi' || val === 'hinglish') lang = 'hi-IN';
            else if (val === 'ta') lang = 'ta-IN';
            else if (val === 'te') lang = 'te-IN';
            else if (val === 'kn') lang = 'kn-IN';
            else if (val === 'mr') lang = 'mr-IN';
          }
          recognition.lang = lang;
          recognition.start();
        });

        recognition.onstart = () => {
          isRecording = true;
          micBtn.classList.add('recording');
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          chatInput.value = (chatInput.value + ' ' + transcript).trim();
          chatSendBtn.disabled = false;
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error", event.error);
        };

        recognition.onend = () => {
          isRecording = false;
          micBtn.classList.remove('recording');
        };
      } else {
        micBtn.style.display = 'none';
      }
    }
  }

  let isSending = false;

  async function sendMessage() {
    if (isSending) return;
    const text = chatInput.value.trim();
    if (!text) return;
    
    isSending = true;

    if (emptyState && emptyState.style.display !== 'none') {
      emptyState.style.display = 'none';
    }

    // 1. Add User Message to UI
    appendMessage('user', text);
    
    // 2. Clear input
    chatInput.value = '';
    chatInput.style.height = '56px';
    chatSendBtn.disabled = true;

    // 3. Add to history
    messageHistory.push({ role: 'user', parts: [{ text }] });

    // 4. Show Typing Indicator
    const typingId = showTypingIndicator();

    // 5. Call Gemma Copilot
    try {
      const response = await window.SaakhGemma.chatWithCopilot(businessContextString, messageHistory);
      removeTypingIndicator(typingId);
      
      // 6. Add Model Message to UI
      appendMessage('bot', response);
      messageHistory.push({ role: 'model', parts: [{ text: response }] });
      isSending = false;
    } catch (err) {
      removeTypingIndicator(typingId);
      appendMessage('bot', `*Error: ${err.message}*`);
      messageHistory.pop();
      isSending = false;
    }
  }

  // ── UI Helpers ────────────────────────────────────────────────
  function appendMessage(sender, text) {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    
    const isBot = sender === 'bot';
    const icon = isBot 
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`
      : (activeUser?.user_metadata?.shop_name?.charAt(0)?.toUpperCase() || 'U');

    div.innerHTML = `
      <div class="msg-icon ${isBot ? 'bot' : 'user'}">${icon}</div>
      <div class="msg-content">
        <div class="msg-sender">${isBot ? '<div class="bot-name"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> Saakh Copilot</div>' : 'You'}</div>
        ${parseMarkdown(text)}
      </div>
    `;
    
    chatMessages.appendChild(div);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.id = id;
    
    div.innerHTML = `
      <div class="msg-icon bot">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
      </div>
      <div class="msg-content">
        <div class="msg-sender"><div class="bot-name"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> Saakh Copilot</div></div>
        <div class="typing-dots">
          <div class="dot"></div><div class="dot"></div><div class="dot"></div>
        </div>
      </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
    return id;
  }

  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function parseMarkdown(text) {
    let html = String(text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Bullet lists
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>'); 

    // Line breaks
    html = html.replace(/\n/g, '<br/>');
    
    // Cleanup nested list linebreaks
    html = html.replace(/<\/li><br\/>/g, '</li>');
    html = html.replace(/<ul><br\/>/g, '<ul>');
    
    return `<p>${html}</p>`;
  }

})();
