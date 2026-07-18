/* ================================================================
   Saakh — Gemma multimodal extraction (Google AI Studio)
   Two-pass pipeline for better ledger reading accuracy:
   1) OCR-style line extraction from the image
   2) Structure those lines into a lender-ready credit profile
================================================================ */

(function (global) {
  const PASS1_PROMPT = `You are reading an informal Indian business record image
(khata notebook page, UPI screenshot, WhatsApp payment proof, or receipt).
Text may be Hindi, English, Hinglish, or mixed handwriting.

Task: extract EVERY visible money line / transaction you can read.

Return ONLY valid JSON (no markdown) with this shape:
{
  "documentType": "khata|upi_screenshot|receipt|whatsapp|other",
  "businessNameGuess": "string or empty",
  "periodGuess": "string or empty",
  "rawTextNotes": "short notes about unclear areas",
  "lines": [
    {
      "raw": "exact text as seen on that line",
      "date": "string or empty",
      "description": "what the line is about",
      "amount": 0,
      "direction": "in|out|unknown",
      "confidence": "high|medium|low"
    }
  ]
}

Rules:
- amount must be a number in INR (no commas/symbols)
- direction: money received by shop = "in"; money spent/paid out = "out"
- for UPI screenshots: credit/received = in; debit/sent = out
- include uncertain lines with confidence "low" rather than skipping them
- if almost nothing is readable, return lines:[] and explain in rawTextNotes`;

  const PASS2_PROMPT = `You are Saakh. Convert extracted ledger lines into a lender-ready credit profile.
Use ONLY the provided extracted lines — do not invent transactions that are not present.
You may group similar lines (e.g. multiple "Sales cash") into summary categories if helpful,
but totals must still match the extracted amounts.

Return ONLY valid JSON with this shape:
{
  "businessName": "string",
  "period": "string",
  "source": "string",
  "score": 700,
  "scoreLabel": "Excellent|Strong|Fair|Weak",
  "income": [{"label":"string","amount":0}],
  "expenses": [{"label":"string","amount":0}],
  "incomeTotal": 0,
  "expenseTotal": 0,
  "netProfit": 0,
  "profitMargin": "0%",
  "cashFlow": "Positive|Negative|Mixed",
  "narrative": [
    {"title":"Revenue Stability","body":"..."},
    {"title":"Expense Discipline","body":"..."},
    {"title":"Summary for the Lender","body":"..."}
  ],
  "gapNote": "honest documentation gap",
  "flags": [{"type":"string","amount":0,"description":"string"}],
  "ratingSummary": "1-2 sentence summary"
}

Rules:
- amounts are numbers (INR)
- incomeTotal/expenseTotal/netProfit must be mathematically consistent with income/expenses arrays
- score 300-900 from consistency, profitability, documentation quality
- put low-confidence or ambiguous lines into flags
- plain language for a bank officer`;

  function getConfig() {
    const cfg = global.SAAKH_GEMMA || {};
    if (!cfg.apiKey || !cfg.model) {
      throw new Error('Gemma is not configured. Check gemma-config.js.');
    }
    return cfg;
  }

  function formatInr(n) {
    const num = Number(n) || 0;
    const abs = Math.abs(Math.round(num));
    const formatted = abs.toLocaleString('en-IN');
    return (num < 0 ? '-₹' : '₹') + formatted;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read the uploaded file.'));
      reader.readAsDataURL(file);
    });
  }

  async function prepareImagePart(file) {
    if (!file.type.startsWith('image/')) {
      const dataUrl = await fileToDataUrl(file);
      const data = dataUrl.slice(dataUrl.indexOf(',') + 1);
      return {
        inline_data: {
          mime_type: file.type || 'application/octet-stream',
          data,
        },
      };
    }

    const dataUrl = await fileToDataUrl(file);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image. Try JPG/PNG.'));
      el.src = dataUrl;
    });

    // Prefer larger, sharper input for handwriting / UPI text
    const maxSide = 2200;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    // Light contrast boost helps faded notebook ink
    try {
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      const contrast = 1.18;
      const intercept = 128 * (1 - contrast);
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, Math.max(0, d[i] * contrast + intercept));
        d[i + 1] = Math.min(255, Math.max(0, d[i + 1] * contrast + intercept));
        d[i + 2] = Math.min(255, Math.max(0, d[i + 2] * contrast + intercept));
      }
      ctx.putImageData(imageData, 0, 0);
    } catch (_) {
      /* ignore cross-origin / security edge cases */
    }

    const jpeg = canvas.toDataURL('image/jpeg', 0.95);
    return {
      inline_data: {
        mime_type: 'image/jpeg',
        data: jpeg.slice(jpeg.indexOf(',') + 1),
      },
    };
  }

  function extractModelText(apiJson) {
    const parts = apiJson?.candidates?.[0]?.content?.parts || [];
    const texts = parts
      .filter((p) => p && p.text && !p.thought)
      .map((p) => String(p.text).trim())
      .filter(Boolean);
    if (texts.length) return texts.join('\n').trim();

    const any = parts.map((p) => p.text).filter(Boolean);
    if (!any.length) {
      const reason = apiJson?.candidates?.[0]?.finishReason || 'unknown';
      throw new Error(`Gemma returned an empty response (${reason}). Try a clearer photo.`);
    }
    return String(any[any.length - 1]).trim();
  }

  function parseJsonLoose(text) {
    let raw = String(text || '').trim();
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Gemma did not return valid JSON. Try again with a sharper image.');
    }
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (err) {
      throw new Error('Could not parse Gemma JSON. Please retry the upload.');
    }
  }

  async function callGemma({ parts, temperature = 0.1 }) {
    const cfg = getConfig();
    const url = `${cfg.endpointBase}/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        payload?.error?.message ||
        `Gemma request failed (${res.status}). Check API key / model access.`;
      throw new Error(msg);
    }

    return parseJsonLoose(extractModelText(payload));
  }

  function sumAmounts(rows) {
    return (rows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  }

  function linesToFallbackProfile(pass1, fileName) {
    const lines = Array.isArray(pass1.lines) ? pass1.lines : [];
    const income = [];
    const expenses = [];
    const flags = [];

    lines.forEach((line) => {
      const amount = Math.abs(Number(line.amount) || 0);
      if (!amount) return;
      const label = String(line.description || line.raw || 'Entry').trim();
      const row = { label, amount };
      const dir = String(line.direction || 'unknown').toLowerCase();
      if (dir === 'in') income.push(row);
      else if (dir === 'out') expenses.push(row);
      else {
        // unknown direction → flag + keep out of totals bias by putting in flags only
        flags.push({
          type: 'Classification Uncertainty',
          amount,
          description: `Unclear if income or expense: ${label}`,
        });
      }
      if (String(line.confidence).toLowerCase() === 'low') {
        flags.push({
          type: 'Unclear Description',
          amount,
          description: `Low-confidence read: ${label}`,
        });
      }
    });

    const incomeTotal = sumAmounts(income);
    const expenseTotal = sumAmounts(expenses);
    const netProfit = incomeTotal - expenseTotal;
    const profitMargin =
      incomeTotal > 0 ? ((netProfit / incomeTotal) * 100).toFixed(1) + '%' : '0%';

    return {
      businessName: pass1.businessNameGuess || 'Unknown Business',
      period: pass1.periodGuess || 'Recent period',
      source: `${pass1.documentType || 'document'} · ${fileName || 'upload'}`,
      score: incomeTotal > 0 ? 680 : 520,
      scoreLabel: incomeTotal > 0 ? 'Fair' : 'Weak',
      income,
      expenses,
      incomeTotal,
      expenseTotal,
      netProfit,
      profitMargin,
      cashFlow: netProfit >= 0 ? 'Positive' : 'Negative',
      narrative: [
        {
          title: 'Extraction Notes',
          body:
            pass1.rawTextNotes ||
            'Profile built directly from line-level extraction when structured synthesis was unavailable.',
        },
        {
          title: 'Summary for the Lender',
          body: `Extracted ${lines.length} line(s). Income ${formatInr(incomeTotal)}, expenses ${formatInr(expenseTotal)}, net ${formatInr(netProfit)}.`,
        },
      ],
      gapNote:
        pass1.rawTextNotes ||
        'Some lines may be incomplete because handwriting or screenshot text was partially unclear.',
      flags,
      ratingSummary: `Line-level Gemma extraction found ${lines.length} entries with net ${formatInr(netProfit)}.`,
    };
  }

  function normalizeProfile(raw, fileName, modelUsed) {
    const income = Array.isArray(raw.income) ? raw.income : [];
    const expenses = Array.isArray(raw.expenses) ? raw.expenses : [];

    const incomeRows = income.map((row) => ({
      label: String(row.label || 'Income'),
      amountNum: Number(row.amount) || 0,
      amount: formatInr(row.amount),
    }));
    const expenseRows = expenses.map((row) => ({
      label: String(row.label || 'Expense'),
      amountNum: Number(row.amount) || 0,
      amount: formatInr(row.amount),
    }));

    const incomeTotalNum =
      Number(raw.incomeTotal) || incomeRows.reduce((s, r) => s + r.amountNum, 0);
    const expenseTotalNum =
      Number(raw.expenseTotal) || expenseRows.reduce((s, r) => s + r.amountNum, 0);
    const netProfitNum = Number.isFinite(Number(raw.netProfit))
      ? Number(raw.netProfit)
      : incomeTotalNum - expenseTotalNum;
    const margin =
      incomeTotalNum > 0
        ? ((netProfitNum / incomeTotalNum) * 100).toFixed(1) + '%'
        : String(raw.profitMargin || '0%');

    const narrative =
      Array.isArray(raw.narrative) && raw.narrative.length
        ? raw.narrative.map((n) => ({
            title: String(n.title || 'Note'),
            body: String(n.body || ''),
          }))
        : [
            {
              title: 'Summary for the Lender',
              body: String(raw.ratingSummary || 'Insufficient data to assess creditworthiness.'),
            },
          ];

    const flags = Array.isArray(raw.flags)
      ? raw.flags.map((f) => ({
          type: String(f.type || 'Unclear Description'),
          amount: formatInr(f.amount || 0),
          description: String(f.description || ''),
        }))
      : [];

    const score = Math.max(300, Math.min(900, Math.round(Number(raw.score) || 650)));

    return {
      businessName: String(raw.businessName || 'Unknown Business'),
      period: String(raw.period || 'Recent period'),
      source: String(raw.source || fileName || 'Uploaded business record'),
      score: String(score),
      scoreLabel: String(raw.scoreLabel || 'Fair'),
      income: incomeRows,
      expenses: expenseRows,
      incomeTotal: formatInr(incomeTotalNum),
      expenseTotal: formatInr(expenseTotalNum),
      netProfit: formatInr(netProfitNum),
      profitMargin: margin,
      cashFlow: String(raw.cashFlow || (netProfitNum >= 0 ? 'Positive' : 'Negative')),
      narrative,
      gapNote: String(
        raw.gapNote ||
          'Some entries may be incomplete because the source document was informal or partially illegible.'
      ),
      flags,
      ratingSummary: String(
        raw.ratingSummary ||
          narrative[narrative.length - 1]?.body ||
          'Profile generated from informal records.'
      ),
      expenseRatio:
        incomeTotalNum > 0
          ? ((expenseTotalNum / incomeTotalNum) * 100).toFixed(1) + '%'
          : '—',
      modelUsed,
      extractedLineCount: Array.isArray(raw._lines) ? raw._lines.length : undefined,
    };
  }

  async function analyzeDocument(file, onProgress) {
    const cfg = getConfig();
    const notify = typeof onProgress === 'function' ? onProgress : () => {};

    notify('Preparing image for Gemma…');
    const imagePart = await prepareImagePart(file);

    notify('Pass 1/2 — Gemma reading every line…');
    const pass1 = await callGemma({
      parts: [{ text: PASS1_PROMPT }, imagePart],
      temperature: 0.05,
    });

    const lineCount = Array.isArray(pass1.lines) ? pass1.lines.length : 0;
    if (!lineCount) {
      throw new Error(
        pass1.rawTextNotes
          ? `Gemma could not find money lines. ${pass1.rawTextNotes}`
          : 'Gemma could not find readable money lines. Use a sharper, well-lit photo of the khata or UPI screen.'
      );
    }

    notify(`Pass 2/2 — Structuring ${lineCount} lines into a credit profile…`);
    let pass2;
    try {
      pass2 = await callGemma({
        parts: [
          {
            text:
              PASS2_PROMPT +
              '\n\nExtracted lines JSON:\n' +
              JSON.stringify(pass1),
          },
        ],
        temperature: 0.2,
      });
    } catch (err) {
      console.warn('[Saakh] Pass 2 failed, using line-level fallback:', err);
      pass2 = linesToFallbackProfile(pass1, file?.name);
    }

    // If pass2 emptied the books but pass1 had amounts, fall back
    const pass2Income = sumAmounts(pass2.income);
    const pass2Expense = sumAmounts(pass2.expenses);
    if (pass2Income === 0 && pass2Expense === 0 && lineCount > 0) {
      pass2 = linesToFallbackProfile(pass1, file?.name);
    }

    pass2._lines = pass1.lines;
    if (!pass2.businessName || pass2.businessName === 'Unknown Business') {
      if (pass1.businessNameGuess) pass2.businessName = pass1.businessNameGuess;
    }
    if (!pass2.period && pass1.periodGuess) pass2.period = pass1.periodGuess;

    const profile = normalizeProfile(pass2, file?.name, cfg.model);
    profile.extractedLineCount = lineCount;
    profile.rawLines = pass1.lines;
    return profile;
  }


  // ── ACTION CENTER: Chat-to-Action ──────────────────────────────
  // Takes raw business notes typed by the user and returns a
  // structured array of AI-generated action cards.
  const ACTION_CARDS_PROMPT = `You are Saakh, a financial advisor for small Indian businesses (kirana shops, street vendors, small traders).
The business owner has shared their daily notes below.
Analyze the notes and identify the most important financial actions they should take.

Return ONLY valid JSON with this exact shape:
{
  "actions": [
    {
      "priority": "high",
      "title": "Short action title",
      "desc": "Brief description of why this action is needed",
      "insight": "Financial impact or benefit of taking this action",
      "button": "Action label"
    }
  ]
}

Rules:
- priority must be exactly "high", "medium", or "low"
- Generate 2 to 5 actions based on what is mentioned in the notes
- Focus on: pending collections (udhaar), inventory restocking, expense tracking, cash flow
- Titles must be concise and start with a verb (e.g. "Collect ₹5,000 from Ravi")
- insight must mention the financial impact (e.g. "Improves cash flow by ₹5,000")
- button must be a short call-to-action (e.g. "Send Reminder", "Order Now", "Log Expense", "Review")
- If amounts are mentioned, include them in titles and insights
- If there are no actionable items, return: { "actions": [] }
- Do not invent information not present in the notes`;

  async function generateActionCards(inputText) {
    const cfg = getConfig();
    const url = `${cfg.endpointBase}/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

    const prompt = ACTION_CARDS_PROMPT + '\n\nBusiness owner notes:\n"""\n' + inputText + '\n"""';

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = payload?.error?.message || `Gemma request failed (${res.status}). Check your API key.`;
      throw new Error(msg);
    }

    const parsed = parseJsonLoose(extractModelText(payload));
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    return actions;
  }

  // ── EXPORT PAGE: Parse time-frame from plain chat ──────────────
  // Takes a user's plain-text request like "Export July 2026" or
  // "last 3 months" and returns structured date range JSON.
  async function parseExportQuery(userQuery) {
    const cfg = getConfig();
    const url = `${cfg.endpointBase}/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const prompt = `You are a date parser for Saakh, an Indian small business finance app.
Today's date is: ${today}

The user wants to export a financial report. Extract the time period from their request.

User request: "${userQuery}"

Return ONLY valid JSON with this exact shape:
{
  "periodLabel": "Human-readable label e.g. July 2026, Last 3 Months, Q1 2026",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "confidence": "high|medium|low"
}

Rules:
- Always return valid ISO dates (YYYY-MM-DD format)
- For "last month" use the previous full calendar month
- For "last 3 months" go back 3 full months from today
- For "this month" use the current month's start and today
- For a specific month name like "July 2026" use the full month start/end
- For "all time" or "everything" use startDate "2020-01-01" and endDate today
- confidence: "high" if month/year clearly stated, "medium" if inferred, "low" if very vague`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = payload?.error?.message || `Gemma request failed (${res.status}). Check your API key.`;
      throw new Error(msg);
    }

    return parseJsonLoose(extractModelText(payload));
  }

  // ── FORECAST: AI Cash Flow & Demand Projection ─────────────────
  // Analyzes aggregated vault document data and returns a structured
  // 30-day forward projection with recurring bills, restock alerts.
  async function generateSaakhForecast(summaryData) {
    const cfg = getConfig();
    const url = `${cfg.endpointBase}/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

    const today = new Date().toISOString().slice(0, 10);

    const prompt = `You are a financial analyst for Saakh, an AI cashflow copilot for Indian small businesses (kirana shops, street vendors, traders).

Today's date: ${today}

Analyze the following aggregated business financial summary and generate a 30-day cashflow forecast.

Business Summary:
${JSON.stringify(summaryData, null, 2)}

Based on this data, return ONLY valid JSON with this exact shape:
{
  "avgDailyIncome": number,
  "avgDailyExpense": number,
  "projectedRunwayDays": number,
  "recurringBills": [
    {
      "name": "Rent",
      "amount": 8000,
      "dayOfMonth": 1,
      "nextDueDate": "YYYY-MM-DD"
    }
  ],
  "restockAlerts": [
    {
      "item": "Rice (50kg bags)",
      "daysLeft": 4,
      "restockBy": "YYYY-MM-DD",
      "urgency": "high"
    }
  ],
  "warnings": [
    {
      "day": 15,
      "date": "YYYY-MM-DD",
      "message": "Rent payment due - ensure Rs 8,000 is available",
      "type": "bill"
    }
  ],
  "forecast30Days": [150000, 148000, 152000]
}

Rules:
- avgDailyIncome and avgDailyExpense must be realistic positive numbers in Indian Rupees
- projectedRunwayDays: how many days until cash runs out at current burn rate
- recurringBills: identify any rent, electricity, supplier, or subscription patterns (1-5 items)
- restockAlerts: extract inventory items from descriptions and estimate days left (1-5 items)
- warnings: flag days when cash may drop dangerously low, bill is due, or restock is urgent (1-5 items)
- forecast30Days: array of EXACTLY 30 numbers representing projected daily cash balance for next 30 days starting tomorrow
- forecast30Days values should reflect recurring bills hitting on their respective days
- All amounts in Indian Rupees (numbers only, no symbols)`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = payload?.error?.message || `Gemma request failed (${res.status}). Check your API key.`;
      throw new Error(msg);
    }

    return parseJsonLoose(extractModelText(payload));
  }

  // ── AI COPILOT: Conversational Interface ──────────────────────
  async function chatWithCopilot(contextData, messageHistory) {
    const cfg = getConfig();
    const url = `${cfg.endpointBase}/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

    // Build the system instructions with the business context
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const systemPrompt = `You are the Saakh AI Copilot, a brilliant, friendly financial assistant for an Indian business owner.
Today's date is: ${today}

Below is the latest financial context of their business based on their uploaded ledger documents and your recent forecasts. 
Always use this context to answer their questions accurately.

--- BUSINESS CONTEXT START ---
${contextData}
--- BUSINESS CONTEXT END ---

Rules:
1. Be concise, direct, and conversational. Do not output JSON unless asked.
2. Use markdown formatting (bolding, lists) for readability.
3. If they ask about something not in the context, politely say you don't have that information in their current documents.
4. Always speak in terms of Indian Rupees (Rs. or ₹).
5. Only answer questions related to their business, finances, accounting, or the application.
`;

    // Append language-specific instructions
    const lang = localStorage.getItem('saakh_lang') || 'en';
    let langPrompt = "";
    if (lang === 'hi') {
      langPrompt = "Important: Respond in fluent Hindi using Devanagari script. Keep numbers in standard digits (e.g. 500) for readability.";
    } else if (lang === 'hinglish') {
      langPrompt = "Important: Respond in casual Hinglish (Hindi written in Roman script, e.g. 'Aapka cash balance badh gaya hai'). Do not use Devanagari script. Keep standard digits.";
    } else if (lang === 'ta') {
      langPrompt = "Important: Respond in fluent Tamil using Tamil script. Keep numbers in standard digits (e.g. 500) for readability.";
    } else if (lang === 'te') {
      langPrompt = "Important: Respond in fluent Telugu using Telugu script. Keep numbers in standard digits (e.g. 500) for readability.";
    } else if (lang === 'kn') {
      langPrompt = "Important: Respond in fluent Kannada using Kannada script. Keep numbers in standard digits (e.g. 500) for readability.";
    } else if (lang === 'mr') {
      langPrompt = "Important: Respond in fluent Marathi using Devanagari script. Keep numbers in standard digits (e.g. 500) for readability.";
    }
    
    const finalSystemPrompt = systemPrompt + (langPrompt ? `\n6. ${langPrompt}\n` : "");

    // System instruction is supported in v1beta API as `system_instruction`
    const body = {
      system_instruction: {
        parts: [{ text: finalSystemPrompt }]
      },
      contents: messageHistory, // Array of { role: 'user'|'model', parts: [{ text: '...' }] }
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = payload?.error?.message || `Gemma request failed (${res.status}).`;
      throw new Error(msg);
    }

    return extractModelText(payload);
  }

  global.SaakhGemma = {
    analyzeDocument,
    generateActionCards,
    parseExportQuery,
    generateSaakhForecast,
    chatWithCopilot,
    formatInr,
  };
})(window);

