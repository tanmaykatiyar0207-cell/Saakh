/* ================================================================
   Saakh — i18n Localization System
   Handles client-side translation across multiple languages.
================================================================ */

(function () {
  'use strict';

  const TRANSLATIONS = {
    en: {
      // Sidebar Navigation
      nav_home: "Home",
      nav_dashboard: "Dashboard",
      nav_summary: "Summary",
      nav_upload: "Upload & Understand",
      nav_copilot: "AI Copilot",
      nav_forecast: "Forecast",
      nav_actions: "Action Center",
      nav_export: "Export",
      nav_logout: "Logout",
      nav_powered: "Powered by Gemma",
      nav_privacy: "On-device AI reading your ledgers privately.",
      
      // Landing Page
      landing_title: 'Your Khata,<br/><em class="hero-headline-accent">Officially Recognised.</em>',
      landing_sub: 'Photograph the khata and UPI screenshots you already have. In one sitting, Saakh turns years of informal history into a <strong>portable, lender-ready credit profile</strong> — no new bookkeeping habit required.',
      landing_login: "Sign In",
      landing_signup: "Sign Up",
      landing_generate: "Generate Profile",
      landing_drop: "Drop your document here",
      landing_browse: "browse files",
      
      // Dashboard Summary
      dash_overview: "Executive Overview",
      dash_title: "Business Summary",
      dash_sub: "A high-level view of your financial health across all uploaded ledgers and forecasts.",
      dash_ask_copilot: "Ask AI Copilot",
      dash_ask_sub: "Have a question about this summary? Ask Gemma instantly.",
      dash_profit: "Total Net Profit",
      dash_balance: "Est. Cash Balance",
      dash_runway: "Cash Runway",
      dash_runway_sub: "Until cash depletion",
      dash_top_expenses: "Top Expense Categories",
      dash_attention: "Needs Attention",
      
      // Copilot Page
      copilot_title: "AI Cashflow Copilot",
      copilot_sub: "Chat with Gemma to understand your financial health, ask about specific transactions, or get advice on reducing expenses.",
      copilot_empty_title: "How can I help your business today?",
      copilot_empty_sub: "Gemma has analyzed your vault. Try asking one of these questions:",
      copilot_sug_1: "What is my current cash runway?",
      copilot_sug_2: "Show me my top 3 expenses",
      copilot_sug_3: "How can I cut costs this month?",
      copilot_input_placeholder: "Ask Gemma about your finances...",
      
      // Forecast Page
      forecast_title: "Cashflow Projections",
      forecast_sub: "Gemma analyses your transaction history and projects 30 days ahead with recurring bill detection and inventory restock alerts.",
      forecast_btn: "Forecast Now",
      forecast_chart_title: "30-Day Cash Trajectory",
      forecast_stress: "Stress Simulator",
      forecast_stress_sub: "See how an unexpected expense affects your runway.",
      forecast_bills: "Detected Recurring Bills",
      forecast_warnings: "Cash Warnings",
      
      // Score Page
      nav_score: "Saakh Score",
      score_eyebrow: "Credit Profile",
      score_title: "Your Saakh Score",
      score_sub: "A dynamic trust score generated from your uploaded ledgers and cashflow consistency. Share this with NBFCs for better loan terms.",
      score_desc: "This score is out of 900. It updates automatically as you upload more khata pages and build a longer history.",
      score_excellent: "Excellent",
      score_good: "Good",
      score_needs_work: "Needs Work",
      score_factors: "Scoring Factors",
      factor_1_title: "Data Depth",
      factor_1_desc: "Measures the volume and time span of the records you've uploaded. More consistent uploads equal a higher score.",
      factor_2_title: "Profitability",
      factor_2_desc: "Based on your Net Profit margin. Positive cash flow directly boosts your score.",
      factor_3_title: "Runway Health",
      factor_3_desc: "Evaluates how many days your business can survive on current cash without new income.",
      factor_4_title: "Expense Stability",
      factor_4_desc: "Rewards businesses with predictable expenses and punishes high volatility."
    },
    hi: {
      nav_home: "होम",
      nav_dashboard: "डैशबोर्ड",
      nav_summary: "सारांश",
      nav_upload: "दस्तावेज़ अपलोड",
      nav_copilot: "एआई कोपायलट",
      nav_forecast: "पूर्वानुमान",
      nav_actions: "कार्रवाई केंद्र",
      nav_export: "निर्यात",
      nav_logout: "लॉग आउट",
      nav_powered: "Gemma द्वारा संचालित",
      nav_privacy: "आपके लेज़र को निजी तौर पर पढ़ने वाला ऑन-डिवाइस AI।",
      landing_title: 'आपका खाता,<br/><em class="hero-headline-accent">आधिकारिक रूप से मान्यता प्राप्त।</em>',
      landing_sub: 'अपने खाते और UPI स्क्रीनशॉट की तस्वीर लें। एक ही बार में, साख वर्षों के अनौपचारिक इतिहास को <strong>पोर्टेबल, ऋणदाता-तैयार क्रेडिट प्रोफाइल</strong> में बदल देता है — किसी नई बहीखाता आदत की आवश्यकता नहीं है।',
      landing_login: "साइन इन",
      landing_signup: "साइन अप",
      landing_generate: "प्रोफ़ाइल बनाएं",
      landing_drop: "अपना दस्तावेज़ यहाँ छोड़ें",
      landing_browse: "फ़ाइलें ब्राउज़ करें",
      dash_overview: "कार्यकारी अवलोकन",
      dash_title: "व्यापार सारांश",
      dash_sub: "सभी अपलोड किए गए लेज़रों और पूर्वानुमानों में आपके वित्तीय स्वास्थ्य का एक उच्च-स्तरीय दृश्य।",
      dash_ask_copilot: "एआई कोपायलट से पूछें",
      dash_ask_sub: "इस सारांश के बारे में कोई प्रश्न है? जेम्मा से तुरंत पूछें।",
      dash_profit: "कुल शुद्ध लाभ",
      dash_balance: "अनुमानित नकद शेष",
      dash_runway: "कैश रनवे",
      dash_runway_sub: "नकदी समाप्त होने तक",
      dash_top_expenses: "शीर्ष व्यय श्रेणियां",
      dash_attention: "ध्यान देने की आवश्यकता है",
      copilot_title: "एआई कैशफ्लो कोपायलट",
      copilot_sub: "अपने वित्तीय स्वास्थ्य को समझने के लिए जेम्मा के साथ चैट करें।",
      copilot_empty_title: "मैं आज आपके व्यवसाय की कैसे मदद कर सकता हूँ?",
      copilot_empty_sub: "जेम्मा ने आपके वॉल्ट का विश्लेषण किया है। ये प्रश्न पूछने का प्रयास करें:",
      copilot_sug_1: "मेरा वर्तमान कैश रनवे क्या है?",
      copilot_sug_2: "मुझे मेरे शीर्ष 3 खर्च दिखाएं",
      copilot_sug_3: "मैं इस महीने लागत कैसे कम कर सकता हूँ?",
      copilot_input_placeholder: "अपने वित्त के बारे में जेम्मा से पूछें...",
      forecast_title: "कैशफ्लो अनुमान",
      forecast_sub: "जेम्मा आपके लेनदेन के इतिहास का विश्लेषण करती है और 30 दिन आगे का अनुमान लगाती है।",
      forecast_btn: "अभी पूर्वानुमान लगाएं",
      forecast_chart_title: "30-दिवसीय नकद प्रक्षेपवक्र",
      forecast_stress: "तनाव सिम्युलेटर",
      forecast_stress_sub: "देखें कि अप्रत्याशित व्यय आपके रनवे को कैसे प्रभावित करता है।",
      forecast_bills: "आवर्ती बिल",
      forecast_warnings: "नकद चेतावनियाँ",
      export_title: "ऋणदाता प्रोफ़ाइल निर्यात करें",
      export_sub: "अपने अपलोड किए गए लेज़रों के आधार पर एक औपचारिक पीडीएफ स्टेटमेंट जनरेट करें।",
      export_btn: "पीडीएफ रिपोर्ट जनरेट करें",
      
      // Score Page
      nav_score: "साख स्कोर",
      score_eyebrow: "क्रेडिट प्रोफ़ाइल",
      score_title: "आपका साख स्कोर",
      score_sub: "आपके अपलोड किए गए लेज़र से उत्पन्न एक गतिशील ट्रस्ट स्कोर। बेहतर ऋण शर्तों के लिए इसे NBFC के साथ साझा करें।",
      score_desc: "यह स्कोर 900 में से है। जैसे-जैसे आप अधिक खाता पृष्ठ अपलोड करते हैं, यह स्वचालित रूप से अपडेट होता है।",
      score_excellent: "उत्कृष्ट",
      score_good: "अच्छा",
      score_needs_work: "सुधार आवश्यक है",
      score_factors: "स्कोरिंग कारक",
      factor_1_title: "डेटा गहराई",
      factor_1_desc: "आपके द्वारा अपलोड किए गए रिकॉर्ड की मात्रा। अधिक लगातार अपलोड एक उच्च स्कोर के बराबर है।",
      factor_2_title: "लाभप्रदता",
      factor_2_desc: "आपके शुद्ध लाभ मार्जिन पर आधारित। सकारात्मक नकदी प्रवाह सीधे आपके स्कोर को बढ़ाता है।",
      factor_3_title: "रनवे स्वास्थ्य",
      factor_3_desc: "मूल्यांकन करता है कि आपका व्यवसाय नई आय के बिना कितने दिनों तक जीवित रह सकता है।",
      factor_4_title: "व्यय स्थिरता",
      factor_4_desc: "पूर्वानुमेय खर्चों वाले व्यवसायों को पुरस्कृत करता है और उच्च अस्थिरता को दंडित करता है।"
    },
    hinglish: {
      nav_home: "Home",
      nav_dashboard: "Dashboard",
      nav_summary: "Summary",
      nav_upload: "Bill Upload Karein",
      nav_copilot: "AI Se Baat Karein",
      nav_forecast: "Forecast Dekhein",
      nav_actions: "Actions",
      nav_export: "PDF Nikalein",
      nav_logout: "Logout",
      nav_powered: "Powered by Gemma",
      nav_privacy: "On-device AI aapke ledgers private rakhta hai.",
      landing_title: 'Aapka Khata,<br/><em class="hero-headline-accent">Officially Recognised.</em>',
      landing_sub: 'Apne khata aur UPI screenshots ki photo lein. Saakh aapke purane records ko <strong>bank-ready profile</strong> mein badal dega.',
      landing_login: "Sign In",
      landing_signup: "Sign Up",
      landing_generate: "Profile Banayein",
      landing_drop: "Apna document yahan drop karein",
      landing_browse: "files browse karein",
      dash_overview: "Executive Overview",
      dash_title: "Business Summary",
      dash_sub: "Aapke business ki total health ka overview.",
      dash_ask_copilot: "AI Copilot se puchiye",
      dash_ask_sub: "Summary ke baare mein koi sawal hai? Gemma se puchiye.",
      dash_profit: "Total Net Profit",
      dash_balance: "Est. Cash Balance",
      dash_runway: "Cash Runway",
      dash_runway_sub: "Cash khatam hone tak",
      dash_top_expenses: "Top Expenses",
      dash_attention: "Dhyan dein",
      copilot_title: "AI Cashflow Copilot",
      copilot_sub: "Gemma se chat karke apne business finances samjhein.",
      copilot_empty_title: "Main aapki kya madad kar sakti hu?",
      copilot_empty_sub: "Gemma ne aapke records padh liye hain. Ye sawal puchiye:",
      copilot_sug_1: "Mera current cash runway kya hai?",
      copilot_sug_2: "Mere top 3 kharche kya hain?",
      copilot_sug_3: "Kharcha kaise kam karu?",
      copilot_input_placeholder: "Gemma se puchiye...",
      forecast_title: "Cashflow Projections",
      forecast_sub: "Gemma aapke history ko dekh kar 30 din aage ka hisaab batati hai.",
      forecast_btn: "Forecast Banayein",
      forecast_chart_title: "30-Day Cash Trajectory",
      forecast_stress: "Stress Simulator",
      forecast_stress_sub: "Dekhiye achanak kharcha aane se kya hoga.",
      forecast_bills: "Recurring Bills",
      forecast_warnings: "Cash Warnings",
      export_title: "Export Lender Profile",
      export_sub: "Apne ledgers ka formal PDF statement banayein.",
      export_btn: "PDF Report Banayein",
      
      // Score Page
      nav_score: "Saakh Score",
      score_eyebrow: "Credit Profile",
      score_title: "Aapka Saakh Score",
      score_sub: "Aapke records aur cashflow par based ek trust score. Ise NBFCs ke sath share karein.",
      score_desc: "Ye score 900 me se hai. Aur khata upload karne par ye automatically badhega.",
      score_excellent: "Excellent",
      score_good: "Good",
      score_needs_work: "Needs Work",
      score_factors: "Scoring Factors",
      factor_1_title: "Data Depth",
      factor_1_desc: "Aapne kitne purane aur lagatar records upload kiye hain.",
      factor_2_title: "Profitability",
      factor_2_desc: "Aapke Net Profit margin par based. Positive cash flow score badhata hai.",
      factor_3_title: "Runway Health",
      factor_3_desc: "Nayi income ke bina aapka business kitne din chal sakta hai.",
      factor_4_title: "Expense Stability",
      factor_4_desc: "Predictable kharchon ko reward karta hai aur achanak bade kharchon par penalty."
    },
    // Tamil, Telugu, Kannada, Marathi omitted for brevity in this optimized pass, falling back to English or partial.
    // To keep it clean and optimized, we will fully support En, Hi, Hinglish for all UI strings.
    ta: {
      nav_home: "முகப்பு", nav_summary: "சுருக்கம்", nav_upload: "பதிவேற்று", nav_copilot: "செயற்கை நுண்ணறிவு", nav_forecast: "முன்கணிப்பு", nav_actions: "செயல் மையம்", nav_export: "ஏற்றுமதி", nav_logout: "வெளியேறு",
      dash_title: "வணிகச் சுருக்கம்", dash_profit: "நிகர லாபம்", dash_balance: "பண இருப்பு", dash_runway: "பண ஓட்டம்", dash_top_expenses: "முக்கிய செலவுகள்", dash_attention: "கவனம் தேவை",
      copilot_title: "AI கோபைலட்", forecast_title: "பணப்புழக்க கணிப்பு", export_title: "ஏற்றுமதி", landing_title: "உங்கள் கணக்கு, அதிகாரப்பூர்வமாக அங்கீகரிக்கப்பட்டது."
    },
    te: {
      nav_home: "హోమ్", nav_summary: "సారాంశం", nav_upload: "అప్‌లోడ్ చేయండి", nav_copilot: "AI కోపైలట్", nav_forecast: "అంచనా", nav_actions: "చర్య కేంద్రం", nav_export: "ఎగుమతి", nav_logout: "లాగౌట్",
      dash_title: "వ్యాపార సారాంశం", dash_profit: "నికర లాభం", dash_balance: "నగదు నిల్వ", dash_runway: "నగదు రన్వే", dash_top_expenses: "ప్రధాన ఖర్చులు", dash_attention: "శ్రద్ధ వహించండి",
      copilot_title: "AI కోపైలట్", forecast_title: "నగదు ప్రవాహ అంచనా", export_title: "ఎగుమతి", landing_title: "మీ ఖాతా, అధికారికంగా గుర్తించబడింది."
    },
    kn: {
      nav_home: "ಮುಖಪುಟ", nav_summary: "ಸಾರಾಂಶ", nav_upload: "ಅಪ್ಲೋಡ್ ಮಾಡಿ", nav_copilot: "AI ಕೊಪೈಲಟ್", nav_forecast: "ಮುನ್ಸೂಚನೆ", nav_actions: "ಕ್ರಿಯಾ ಕೇಂದ್ರ", nav_export: "ರಫ್ತು", nav_logout: "ಲಾಗ್ ಔಟ್",
      dash_title: "ವ್ಯಾಪಾರ ಸಾರಾಂಶ", dash_profit: "ನಿವ್ವಳ ಲಾಭ", dash_balance: "ನಗದು ಬಾಕಿ", dash_runway: "ನಗದು ರನ್ವೇ", dash_top_expenses: "ಉನ್ನತ ವೆಚ್ಚಗಳು", dash_attention: "ಗಮನ ಹರಿಸಿ",
      copilot_title: "AI ಕೊಪೈಲಟ್", forecast_title: "ಹಣದ ಹರಿವಿನ ಮುನ್ಸೂಚನೆ", export_title: "ರಫ್ತು", landing_title: "ನಿಮ್ಮ ಖಾತೆ, ಅಧಿಕೃತವಾಗಿ ಗುರುತಿಸಲ್ಪಟ್ಟಿದೆ."
    },
    mr: {
      nav_home: "मुख्यपृष्ठ", nav_summary: "सारांश", nav_upload: "अपलोड करा", nav_copilot: "AI कोपायलट", nav_forecast: "अंदाज", nav_actions: "कृती केंद्र", nav_export: "निर्यात", nav_logout: "लॉग आउट",
      dash_title: "व्यवसाय सारांश", dash_profit: "निव्वळ नफा", dash_balance: "रोख शिल्लक", dash_runway: "रोख रनवे", dash_top_expenses: "शीर्ष खर्च", dash_attention: "लक्ष द्या",
      copilot_title: "AI कोपायलट", forecast_title: "रोख प्रवाह अंदाज", export_title: "निर्यात", landing_title: "तुमचे खाते, अधिकृतपणे मान्यताप्राप्त."
    }
  };

  // Get current language from localStorage or default to 'en'
  function getCurrentLanguage() {
    return localStorage.getItem('saakh_lang') || 'en';
  }

  // Update DOM with translations
  function applyTranslations(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
    
    // Fallback dictionary to English for missing keys in regional languages
    const fallback = TRANSLATIONS['en'];

    // 1. Standard text replacements
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = dict[key] || fallback[key];
      if (text) {
        if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
            el.value = text;
        } else if (text.includes('<') && text.includes('>')) {
            el.innerHTML = text;
        } else {
            replaceTextNodes(el, text);
        }
      }
    });

    // 2. Placeholder replacements
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = dict[key] || fallback[key];
      if (text) {
        el.placeholder = text;
      }
    });

    // Update all language dropdowns on the page to match current language
    const selectors = document.querySelectorAll('.lang-selector');
    selectors.forEach(sel => {
        sel.value = lang;
    });
  }

  function replaceTextNodes(element, newText) {
    let replaced = false;
    for (let node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
        node.nodeValue = " " + newText + " ";
        replaced = true;
        break; // Replace first text node found
      }
    }
    // If no text node was found (e.g. empty element), append one
    if (!replaced) {
        element.appendChild(document.createTextNode(newText));
    }
  }

  // Set language and update UI
  window.setLanguage = function (lang) {
    if (!TRANSLATIONS[lang]) lang = 'en';
    localStorage.setItem('saakh_lang', lang);
    applyTranslations(lang);
    // Dispatch event so other components (like Gemma) can react if needed
    window.dispatchEvent(new CustomEvent('saakh-lang-changed', { detail: lang }));
  };

  window.getLanguage = getCurrentLanguage;

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    const currentLang = getCurrentLanguage();
    applyTranslations(currentLang);

    // Bind event listeners to all selectors
    const selectors = document.querySelectorAll('.lang-selector');
    selectors.forEach(sel => {
        sel.addEventListener('change', (e) => {
            window.setLanguage(e.target.value);
        });
    });
  });

})();
 