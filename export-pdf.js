/* ================================================================
   Saakh — Lender-ready statement PDF export
   Uses jsPDF text APIs (no html2canvas) so content always renders.
================================================================ */

(function (global) {
  const DEFAULT_PROFILE = {
    businessName: 'Your business',
    period: 'June 2026',
    source: 'Photographed khata notebook + UPI payment screenshots',
    score: '748',
    scoreLabel: 'Excellent',
    income: [
      { label: 'Sales Revenue', amount: 'Rs 1,24,500' },
      { label: 'Other Income (delivery charges)', amount: 'Rs 3,200' },
    ],
    incomeTotal: 'Rs 1,27,700',
    expenses: [
      { label: 'Purchase of Goods', amount: 'Rs 78,400' },
      { label: 'Rent', amount: 'Rs 8,000' },
      { label: 'Electricity', amount: 'Rs 2,100' },
      { label: 'Transport & Delivery', amount: 'Rs 3,800' },
      { label: 'Miscellaneous (includes flagged items)', amount: 'Rs 4,200' },
    ],
    expenseTotal: 'Rs 96,500',
    netProfit: 'Rs 31,200',
    profitMargin: '24.4%',
    narrative: [
      {
        title: 'Revenue Stability',
        body: 'This business shows consistent, recurring revenue across the reviewed period. Total income of Rs 1,27,700 for June 2026 reflects a stable customer base and predictable daily sales — a key signal lenders use to assess repayment capacity.',
      },
      {
        title: 'Expense Discipline',
        body: 'Costs are controlled at Rs 96,500 against Rs 1,27,700 income (75.6% expense ratio). The largest item — purchase of goods — tracks with sales activity, indicating a managed inventory cycle rather than wasteful spend.',
      },
      {
        title: 'Summary for the Lender',
        body: 'This business is creditworthy: profitable, with consistent cash inflows and basic financial discipline. Informal record-keeping is common among small traders in India and does not equal financial weakness. The reviewed records support capacity to service structured credit.',
      },
    ],
    gapNote:
      'Some cash transactions are less clearly documented than digital payments. Recording cash sales more consistently would further strengthen this credit profile.',
  };

  function getJsPdfConstructor() {
    if (global.jspdf && typeof global.jspdf.jsPDF === 'function') {
      return global.jspdf.jsPDF;
    }
    if (typeof global.jsPDF === 'function') {
      return global.jsPDF;
    }
    // html2pdf.bundle exposes jspdf on window in most CDN builds
    if (global.html2pdf && global.html2pdf().constructor) {
      // fallback: create via html2pdf worker is harder — throw clear error
    }
    return null;
  }

  function rupeeSafe(value) {
    return String(value || '').replace(/₹/g, 'Rs ');
  }

  function safeFilename(businessName, period) {
    const base = `${businessName}-${period}-Saakh-Statement`
      .replace(/[^\w\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `${base || 'Saakh-Statement'}.pdf`;
  }

  function writeWrapped(doc, text, x, y, maxWidth, lineHeight) {
    const lines = doc.splitTextToSize(String(text), maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  }

  function ensureSpace(doc, y, needed, marginBottom) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      return 20;
    }
    return y;
  }

  function buildPdf(profile) {
    const JsPDF = getJsPdfConstructor();
    if (!JsPDF) {
      throw new Error('PDF engine failed to load. Refresh the page and try again.');
    }

    const dynamicBusinessName = (window.currentUser && window.currentUser.user_metadata && window.currentUser.user_metadata.shop_name) || DEFAULT_PROFILE.businessName;
    const p = {
      ...DEFAULT_PROFILE,
      businessName: profile.businessName || dynamicBusinessName,
      ...profile,
      income: (profile.income || DEFAULT_PROFILE.income).map((row) => ({
        ...row,
        amount: rupeeSafe(row.amount),
      })),
      expenses: (profile.expenses || DEFAULT_PROFILE.expenses).map((row) => ({
        ...row,
        amount: rupeeSafe(row.amount),
      })),
      incomeTotal: rupeeSafe(profile.incomeTotal || DEFAULT_PROFILE.incomeTotal),
      expenseTotal: rupeeSafe(profile.expenseTotal || DEFAULT_PROFILE.expenseTotal),
      netProfit: rupeeSafe(profile.netProfit || DEFAULT_PROFILE.netProfit),
      narrative: profile.narrative || DEFAULT_PROFILE.narrative,
    };

    const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const left = 18;
    const right = pageWidth - 18;
    const contentWidth = right - left;
    let y = 18;

    const generatedAt = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(4, 120, 87);
    doc.text('Saakh', left, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Lender-ready credit profile', left, y);
    doc.setFontSize(9);
    doc.text(`Generated: ${generatedAt}`, right, 18, { align: 'right' });
    y += 6;
    doc.setDrawColor(4, 120, 87);
    doc.setLineWidth(0.6);
    doc.line(left, y, right, y);
    y += 10;

    // Business block
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('BUSINESS', left, y);
    doc.text('STATEMENT PERIOD', right, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(p.businessName, left, y);
    doc.setFontSize(12);
    doc.text(p.period, right, y, { align: 'right' });
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    y = writeWrapped(doc, `Source: ${p.source}`, left, y, contentWidth * 0.65, 5);
    y += 4;

    // Score box
    doc.setDrawColor(212, 160, 23);
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(right - 42, y - 2, 42, 18, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text('SAAKH SCORE', right - 21, y + 4, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(String(p.score), right - 21, y + 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(String(p.scoreLabel), right - 21, y + 15, { align: 'center' });
    y += 24;

    // P&L title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Monthly Profit & Loss Statement', left, y);
    y += 9;

    function writeSection(title, rows, totalLabel, totalValue, titleColor) {
      y = ensureSpace(doc, y, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...titleColor);
      doc.text(title, left, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      rows.forEach((row) => {
        y = ensureSpace(doc, y, 8, 20);
        doc.text(row.label, left, y);
        doc.text(rupeeSafe(row.amount), right, y, { align: 'right' });
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(left, y + 1.5, right, y + 1.5);
        y += 7;
      });

      y = ensureSpace(doc, y, 8, 20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(totalLabel, left, y);
      doc.setTextColor(...titleColor);
      doc.text(rupeeSafe(totalValue), right, y, { align: 'right' });
      y += 10;
    }

    writeSection('Income', p.income, 'Total Income', p.incomeTotal, [5, 150, 105]);
    writeSection('Expenses', p.expenses, 'Total Expenses', p.expenseTotal, [185, 28, 28]);

    // Net summary
    y = ensureSpace(doc, y, 28, 20);
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(left, y, contentWidth, 22, 2, 2, 'FD');
    const colW = contentWidth / 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(4, 120, 87);
    doc.text('NET PROFIT', left + 4, y + 7);
    doc.text('PROFIT MARGIN', left + colW + 4, y + 7);
    doc.text('CASH FLOW', left + colW * 2 + 4, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(p.netProfit, left + 4, y + 16);
    doc.text(p.profitMargin, left + colW + 4, y + 16);
    doc.text('Positive', left + colW * 2 + 4, y + 16);
    y += 30;

    // Narrative
    y = ensureSpace(doc, y, 16, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Creditworthiness Narrative', left, y);
    y += 8;

    p.narrative.forEach((section) => {
      y = ensureSpace(doc, y, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(4, 120, 87);
      doc.text(section.title.toUpperCase(), left, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      y = writeWrapped(doc, section.body, left, y, contentWidth, 5);
      y += 6;
    });

    // Gap note
    y = ensureSpace(doc, y, 28, 20);
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    const gapLines = doc.splitTextToSize(p.gapNote, contentWidth - 8);
    const gapH = 10 + gapLines.length * 5;
    doc.roundedRect(left, y, contentWidth, gapH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text('PROFILE GAP (TRANSPARENCY)', left + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 53, 15);
    doc.text(gapLines, left + 4, y + 12);
    y += gapH + 10;

    // Footer disclaimer
    y = ensureSpace(doc, y, 24, 16);
    doc.setDrawColor(226, 232, 240);
    doc.line(left, y, right, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    y = writeWrapped(
      doc,
      'Generated by Saakh from informal business records (khata / UPI / receipts). This document is an AI-assisted estimate for discussion with lenders — it is not a certified audit. Portable use: share with any bank, NBFC, or bookkeeping app. Saakh is a one-time migration bridge, not a replacement ledger.',
      left,
      y,
      contentWidth,
      4
    );

    return doc;
  }

  async function downloadSaakhStatement(profile = {}, buttonEl) {
    const originalLabel = buttonEl ? buttonEl.innerHTML : null;
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.innerHTML = 'Preparing PDF…';
    }

    const dynamicBusinessName = (window.currentUser && window.currentUser.user_metadata && window.currentUser.user_metadata.shop_name) || DEFAULT_PROFILE.businessName;
    const filename = safeFilename(
      profile.businessName || dynamicBusinessName,
      profile.period || DEFAULT_PROFILE.period
    );

    try {
      if (!getJsPdfConstructor()) {
        await loadScript(
          'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        );
      }

      if (!getJsPdfConstructor()) {
        throw new Error('PDF engine failed to load. Refresh the page and try again.');
      }

      const doc = buildPdf(profile);
      doc.save(filename);
      return filename;
    } finally {
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.innerHTML = originalLabel;
      }
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (getJsPdfConstructor()) {
        resolve();
        return;
      }
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', reject);
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load PDF library.'));
      document.head.appendChild(s);
    });
  }

  global.SaakhExport = {
    downloadSaakhStatement,
    DEFAULT_PROFILE,
  };
})(window);
