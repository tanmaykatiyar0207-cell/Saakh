/* ================================================================
   SAAKH — Frontend Interactions
   Handles: Upload flow, processing animation, results tabs,
            nav scroll, scroll reveal, drag-drop, stat counters
================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---------------------------------------------------------------
  // DOM REFERENCES
  // ---------------------------------------------------------------
  const uploadPanel     = document.getElementById('upload-panel');
  const processingPanel = document.getElementById('processing-panel');
  const resultsPanel    = document.getElementById('results-panel');

  const uploadZone      = document.getElementById('upload-zone');
  const fileInput       = document.getElementById('file-input');
  const browseBtn       = document.getElementById('browse-btn');
  const changeFileBtn   = document.getElementById('change-file-btn');
  const analyseBtn      = document.getElementById('analyse-btn');
  const newAnalysisBtn  = document.getElementById('new-analysis-btn');
  const downloadBtn     = document.getElementById('download-btn');

  const uploadIdle      = document.getElementById('upload-idle');
  const uploadPreview   = document.getElementById('upload-preview');
  const previewImg      = document.getElementById('preview-img');
  const previewFilename = document.getElementById('preview-filename');
  const previewFilesize = document.getElementById('preview-filesize');

  const processingSteps = document.querySelectorAll('.p-step');
  const resultsTabs     = document.querySelectorAll('.results-tab');
  const tabContents     = document.querySelectorAll('.tab-content');

  const nav             = document.getElementById('main-nav');

  // ---------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------
  let selectedFile = null;

  // ---------------------------------------------------------------
  // 1. NAV SCROLL EFFECT
  // ---------------------------------------------------------------
  const handleNavScroll = () => {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // ---------------------------------------------------------------
  // 2. SCROLL REVEAL
  // ---------------------------------------------------------------
  const revealEls = document.querySelectorAll(
    '.step-card, .how-it-works .section-eyebrow, .how-it-works .section-title, ' +
    '.how-it-works .section-subtitle, .tool-section .section-eyebrow, ' +
    '.tool-section .section-title, .tool-section .section-subtitle, ' +
    '.trust-item, .upload-zone, .upload-disclaimer'
  );

  revealEls.forEach((el, i) => {
    el.classList.add('reveal');
    const delay = i % 4;
    if (delay === 1) el.classList.add('reveal-delay-1');
    if (delay === 2) el.classList.add('reveal-delay-2');
    if (delay === 3) el.classList.add('reveal-delay-3');
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealEls.forEach(el => revealObserver.observe(el));

  // ---------------------------------------------------------------
  // 3. DRAG & DROP
  // ---------------------------------------------------------------
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', (e) => {
    // Only remove if leaving the zone (not a child element)
    if (!uploadZone.contains(e.relatedTarget)) {
      uploadZone.classList.remove('drag-over');
    }
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  });

  // Click on zone = open file picker (only if no file selected yet)
  uploadZone.addEventListener('click', (e) => {
    if (selectedFile) return; // Don't trigger if showing preview
    if (e.target === analyseBtn || analyseBtn.contains(e.target)) return;
    if (e.target === browseBtn) return;
    fileInput.click();
  });

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]);
    }
  });

  changeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
    fileInput.click();
  });

  // ---------------------------------------------------------------
  // 4. FILE HANDLING
  // ---------------------------------------------------------------
  function handleFileSelected(file) {
    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload an image (JPG, PNG, WebP) or PDF file.', 'error');
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('File is too large. Please upload a file under 10MB.', 'error');
      return;
    }

    selectedFile = file;

    // Show preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF — show placeholder
      previewImg.src = '';
      previewImg.style.display = 'none';
    }

    previewFilename.textContent = file.name;
    previewFilesize.textContent = formatFileSize(file.size);
    previewImg.style.display = 'block';

    // Switch to preview state
    uploadIdle.style.display = 'none';
    uploadPreview.style.display = 'flex';
    uploadZone.style.cursor = 'default';

    // Enable analyse button & update text based on authentication status
    analyseBtn.disabled = false;
    updateAnalyseButtonText();
  }

  function clearFile() {
    selectedFile = null;
    fileInput.value = '';
    previewImg.src = '';
    uploadPreview.style.display = 'none';
    uploadIdle.style.display = 'flex';
    uploadZone.style.cursor = 'pointer';
    analyseBtn.disabled = true;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ---------------------------------------------------------------
  // 4b. AUTH STATE & SUPABASE (email / password)
  // ---------------------------------------------------------------
  
  const analyseBtnText = document.getElementById('analyse-btn-text');


  window.addEventListener('saakh-auth-changed', (e) => {
    updateAnalyseButtonText();
  });

  function updateAnalyseButtonText() {
    if (!analyseBtnText) return;
    if (window.currentUser) {
      analyseBtnText.textContent = 'Generate Financial Profile';
    } else {
      analyseBtnText.textContent = 'Generate as Guest (1 Left)';
    }
  }

  // ---------------------------------------------------------------
  // 5. ANALYSE FLOW
  // ---------------------------------------------------------------
  let hasUsedGuestCredit = false;

  analyseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!selectedFile) return;

    if (!window.currentUser) {
      if (hasUsedGuestCredit) {
        // Force authentication signup to continue
        if (window.openAuthModal) {
          window.openAuthModal(true, () => {
            hasUsedGuestCredit = false;
            startAnalysis();
          });
        }
        return;
      } else {
        // Proceed with Guest limit warning
        hasUsedGuestCredit = true;
        startAnalysis();
        showToast('Guest profile generated. Download the PDF — or sign up to save it.', 'info');
      }
    } else {
      startAnalysis();
    }
  });

  let latestProfile = null;
  window.latestSaakhProfile = null;

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderProfile(profile) {
    latestProfile = profile;
    window.latestSaakhProfile = profile;

    setText('res-business-name', profile.businessName);
    setText('res-period', profile.period);
    setText('res-source', profile.source);
    setText('stmt-business-name', profile.businessName);
    setText('stmt-period', profile.period);
    setText('stmt-income-total', profile.incomeTotal);
    setText('stmt-expense-total', profile.expenseTotal);
    setText('stmt-net-profit', profile.netProfit);
    setText('stmt-profit-margin', profile.profitMargin);
    setText('stmt-cash-flow', profile.cashFlow);
    setText('stmt-expense-ratio', profile.expenseRatio);
    setText('narr-rating', profile.scoreLabel);

    const summaryEl = document.getElementById('narr-summary');
    if (summaryEl) {
      summaryEl.innerHTML = escapeHtml(profile.ratingSummary).replace(
        profile.profitMargin,
        `<strong>${escapeHtml(profile.profitMargin)}</strong>`
      );
    }

    const incomeBody = document.getElementById('stmt-income-body');
    if (incomeBody) {
      incomeBody.innerHTML = (profile.income.length ? profile.income : [{ label: 'No income lines extracted', amount: '₹0' }])
        .map(
          (row) => `<tr>
            <td class="col-description">${escapeHtml(row.label)}</td>
            <td class="col-amount income">${escapeHtml(row.amount)}</td>
          </tr>`
        )
        .join('');
    }

    const expenseBody = document.getElementById('stmt-expense-body');
    if (expenseBody) {
      expenseBody.innerHTML = (profile.expenses.length ? profile.expenses : [{ label: 'No expense lines extracted', amount: '₹0' }])
        .map(
          (row) => `<tr>
            <td class="col-description">${escapeHtml(row.label)}</td>
            <td class="col-amount expense">${escapeHtml(row.amount)}</td>
          </tr>`
        )
        .join('');
    }

    const narrBody = document.getElementById('narr-body');
    if (narrBody) {
      narrBody.innerHTML = profile.narrative
        .map((section, idx) => {
          const isLast = idx === profile.narrative.length - 1;
          return `<div class="narrative-section${isLast ? ' summary-section' : ''}">
            <h4 class="narrative-section-title">${escapeHtml(section.title)}</h4>
            <p>${escapeHtml(section.body)}</p>
          </div>`;
        })
        .join('');
    }

    const flagsList = document.getElementById('flags-list');
    if (flagsList) {
      const intro = flagsList.querySelector('.flags-intro');
      const introHtml = intro ? intro.outerHTML : '';
      const cards =
        profile.flags && profile.flags.length
          ? profile.flags
              .map(
                (flag) => `<div class="flag-card">
            <div class="flag-card-header">
              <div class="flag-type-pill">${escapeHtml(flag.type)}</div>
              <div class="flag-amount">${escapeHtml(flag.amount)}</div>
            </div>
            <div class="flag-card-body">
              <p class="flag-desc">${escapeHtml(flag.description)}</p>
            </div>
          </div>`
              )
              .join('')
          : `<div class="flag-card">
            <div class="flag-card-body">
              <p class="flag-desc">No major uncertainties flagged. Gemma extracted the visible lines with reasonable confidence. Gap note: ${escapeHtml(profile.gapNote)}</p>
            </div>
          </div>`;
      flagsList.innerHTML = introHtml + cards;
      updateFlagsCount();
    }

    const footer = document.getElementById('stmt-footer');
    if (footer) {
      footer.innerHTML = `Generated by Saakh + <strong>Gemma</strong> (${escapeHtml(profile.modelUsed || 'gemma')}) &nbsp;·&nbsp; Based on uploaded records &nbsp;·&nbsp; <strong>This is not a certified audit</strong>`;
    }
  }

  function startAnalysis() {
    if (!selectedFile) return;

    if (!window.SaakhGemma || typeof window.SaakhGemma.analyzeDocument !== 'function') {
      showToast('Gemma client failed to load. Refresh and try again.', 'error');
      return;
    }

    switchPanel(uploadPanel, processingPanel);

    const statusEl = document.getElementById('processing-status');
    const setStatus = (msg) => {
      if (statusEl) statusEl.textContent = msg;
    };

    const analysisPromise = window.SaakhGemma.analyzeDocument(selectedFile, setStatus);
    const animationPromise = new Promise((resolve) => {
      animateProcessingSteps(resolve);
    });

    Promise.all([analysisPromise, animationPromise])
      .then(([profile]) => {
        renderProfile(profile);
        switchPanel(processingPanel, resultsPanel);
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const n = profile.extractedLineCount;
        showToast(
          n
            ? `Gemma read ${n} line(s) and built your financial profile.`
            : 'Gemma built your financial profile from the uploaded record.',
          'success'
        );
      })
      .catch((err) => {
        console.error(err);
        switchPanel(processingPanel, uploadPanel);
        showToast(err.message || 'Gemma could not read this document. Try a clearer photo.', 'error');
      });
  }

  // Processing step animation
  const STEP_DURATIONS = [900, 1100, 1200, 900, 1100]; // ms per step

  function animateProcessingSteps(onComplete) {
    let currentStep = 0;

    // Reset all steps
    processingSteps.forEach(s => {
      s.classList.remove('active', 'done');
    });

    function activateStep(index) {
      if (index >= processingSteps.length) {
        // All steps done
        setTimeout(onComplete, 400);
        return;
      }

      // Set current as active
      if (processingSteps[index]) {
        processingSteps[index].classList.add('active');
      }

      setTimeout(() => {
        // Mark current as done
        if (processingSteps[index]) {
          processingSteps[index].classList.remove('active');
          processingSteps[index].classList.add('done');
        }
        // Move to next
        activateStep(index + 1);
      }, STEP_DURATIONS[index] || 1000);
    }

    activateStep(0);
  }

  // ---------------------------------------------------------------
  // 6b. HERO STAT COUNTER ANIMATION
  // ---------------------------------------------------------------
  function animateCounter(el, target, duration = 1200) {
    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = target;
      return;
    }
    const start = performance.now();
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quart — punchier, more satisfying
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  const statEls = document.querySelectorAll('.hero-stat-value[data-target]');
  if (statEls.length) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target, 10);
          animateCounter(el, target, 1400);
          statsObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    statEls.forEach(el => statsObserver.observe(el));
  }

  // ---------------------------------------------------------------
  // 7. PANEL TRANSITIONS
  // ---------------------------------------------------------------
  function switchPanel(from, to) {
    from.style.opacity = '0';
    from.style.transform = 'translateY(-10px)';
    from.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    setTimeout(() => {
      from.style.display = 'none';
      from.style.opacity = '';
      from.style.transform = '';
      from.style.transition = '';

      // Processing panel is flex-column; results and upload are block/flex
      const isProcessing = to === processingPanel;
      to.style.display = isProcessing ? 'flex' : 'flex';
      to.style.flexDirection = 'column';
      to.style.opacity = '0';
      to.style.transform = 'translateY(10px)';

      // Force reflow
      void to.offsetWidth;

      to.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      to.style.opacity = '1';
      to.style.transform = 'translateY(0)';

      setTimeout(() => {
        to.style.transition = '';
      }, 400);

    }, 300);
  }

  // ---------------------------------------------------------------
  // 7. NEW ANALYSIS
  // ---------------------------------------------------------------
  if (newAnalysisBtn) {
    newAnalysisBtn.addEventListener('click', () => {
      clearFile();

      // Reset processing steps
      processingSteps.forEach(s => {
        s.classList.remove('active', 'done');
      });

      // Switch back to upload
      resultsPanel.style.display = 'none';
      uploadPanel.style.display = 'flex';
      uploadPanel.style.flexDirection = 'column';
      uploadPanel.style.alignItems = 'center';

      document.getElementById('tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ---------------------------------------------------------------
  // 8. RESULTS TABS
  // ---------------------------------------------------------------
  resultsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Update tab active states
      resultsTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update content visibility
      tabContents.forEach(content => {
        content.classList.remove('active');
      });

      const targetContent = document.getElementById(`tab-content-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add('active');
        // Animate in
        targetContent.style.animation = 'none';
        void targetContent.offsetWidth;
        targetContent.style.animation = 'fadeIn 0.3s ease both';
      }
    });
  });

  // ---------------------------------------------------------------
  // 9. FLAG BUTTON ACTIONS
  // ---------------------------------------------------------------
  document.querySelectorAll('.flag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.flag-card');
      if (!card) return;

      if (btn.classList.contains('flag-btn-keep')) {
        card.style.opacity = '0';
        card.style.transform = 'translateX(10px)';
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        setTimeout(() => {
          card.style.display = 'none';
          updateFlagsCount();
          showToast('Item kept as classified.', 'success');
        }, 300);
      } else if (btn.classList.contains('flag-btn-remove')) {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-10px)';
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        setTimeout(() => {
          card.style.display = 'none';
          updateFlagsCount();
          showToast('Item removed from financial statement.', 'info');
        }, 300);
      } else if (btn.classList.contains('flag-btn-reclassify')) {
        showToast('Reclassification will be available when the backend is connected.', 'info');
      }
    });
  });

  function updateFlagsCount() {
    const visibleCards = document.querySelectorAll('.flag-card:not([style*="display: none"])');
    const badge = document.getElementById('flags-count');
    if (badge) badge.textContent = visibleCards.length;
  }

  // ---------------------------------------------------------------
  // 10. DOWNLOAD STATEMENT (PDF) — portable lender handoff
  // ---------------------------------------------------------------
  async function handleStatementDownload(buttonEl) {
    if (!window.SaakhExport || typeof window.SaakhExport.downloadSaakhStatement !== 'function') {
      showToast('PDF export is unavailable. Refresh and try again.', 'error');
      return;
    }

    try {
      const profile = latestProfile || window.latestSaakhProfile || {};
      const businessName =
        profile.businessName ||
        document.getElementById('res-business-name')?.textContent?.trim() ||
        'Saakh Business';
      const period =
        profile.period ||
        document.getElementById('res-period')?.textContent?.trim() ||
        'Recent period';
      const source =
        profile.source ||
        document.getElementById('res-source')?.textContent?.trim() ||
        'Uploaded business record';

      await window.SaakhExport.downloadSaakhStatement(
        {
          ...profile,
          businessName,
          period,
          source,
        },
        buttonEl
      );
      showToast('Statement downloaded — share it with any bank or NBFC.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not create PDF. Please try again.', 'error');
    }
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => handleStatementDownload(downloadBtn));
  }

  const whatsNextDownloadBtn = document.getElementById('whats-next-download-btn');
  if (whatsNextDownloadBtn) {
    whatsNextDownloadBtn.addEventListener('click', () =>
      handleStatementDownload(whatsNextDownloadBtn)
    );
  }

  // ---------------------------------------------------------------
  // 11. SMOOTH SCROLL FOR NAV LINKS
  // ---------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---------------------------------------------------------------
  // 12. TOAST NOTIFICATIONS
  // ---------------------------------------------------------------
  function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.saakh-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'saakh-toast';

    const icons = {
      success: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#10B981" stroke-width="1.2"/><path d="M5 8L7 10L11 6" stroke="#10B981" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      error:   `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#EF4444" stroke-width="1.2"/><path d="M6 6L10 10M10 6L6 10" stroke="#EF4444" stroke-width="1.3" stroke-linecap="round"/></svg>`,
      info:    `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#C9942A" stroke-width="1.2"/><path d="M8 7V11M8 5V5.5" stroke="#C9942A" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    };

    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;

    // Inline styles for toast — light theme colours
    Object.assign(toast.style, {
      position:       'fixed',
      bottom:         '28px',
      left:           '50%',
      transform:      'translateX(-50%) translateY(12px)',
      display:        'flex',
      alignItems:     'center',
      gap:            '10px',
      padding:        '12px 20px',
      background:     '#FFFFFF',
      backdropFilter: 'blur(12px)',
      border:         '1px solid #DDD6C8',
      borderRadius:   '10px',
      color:          '#1A1208',
      fontSize:       '13px',
      fontFamily:     'Inter, sans-serif',
      zIndex:         '9999',
      opacity:        '0',
      transition:     'opacity 0.3s ease, transform 0.3s ease',
      boxShadow:      '0 4px 24px rgba(26, 18, 8, 0.14)',
      maxWidth:       '400px',
      textAlign:      'center',
    });

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    // Auto dismiss
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
  window.showToast = showToast;

  // ---------------------------------------------------------------
  // 13. HERO CARD FLOAT ANIMATION (CSS handles, but stagger init)
  // ---------------------------------------------------------------
  const heroCards = document.querySelectorAll('.hero-card');
  heroCards.forEach((card, i) => {
    card.style.animationDelay = `${i * 0.1 + 0.5}s`;
  });

  // ---------------------------------------------------------------
  // 14. UPLOAD ZONE — keyboard accessibility
  // ---------------------------------------------------------------
  uploadZone.setAttribute('tabindex', '0');
  uploadZone.setAttribute('role', 'button');
  uploadZone.setAttribute('aria-label', 'Upload financial document');

  uploadZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!selectedFile) fileInput.click();
    }
  });

  // ---------------------------------------------------------------
  // 15. SHOP SCENE INTERACTIVE TILT (subtle parallax on mouse move)
  // ---------------------------------------------------------------
  const shopScene = document.getElementById('shop-scene');
  if (shopScene) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      shopScene.addEventListener('mousemove', (e) => {
        const rect = shopScene.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 to 0.5
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const tiltX = y * -4;  // degrees, subtle
        const tiltY = x * 4;
        shopScene.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        shopScene.style.transition = 'transform 0.15s ease-out';
      });
      shopScene.addEventListener('mouseleave', () => {
        shopScene.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg)';
        shopScene.style.transition = 'transform 0.4s ease-out';
      });
    }
  }

  console.log('%c🪙 Saakh — Frontend Loaded', 'color: #9A6B0A; font-weight: bold; font-size: 14px;');
  console.log('%cLight theme · Ready for backend integration.', 'color: #9E8E72; font-size: 12px;');
});
 