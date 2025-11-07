// Lightweight i18n: ES/EN for UI labels and common statuses
try { console.log('[i18n] file requested'); } catch(_){ }
(function(){
  const I18N = {
    es: {
      title: 'Calendario de Enoj',
      prevYear: '⟵ Año anterior',
      nextYear: 'Siguiente año ⟶',
      today: 'Hoy',
      downloadCsv: 'Descargar CSV',
      downloadIcs: 'Descargar ICS',
      jumpYearPlaceholder: 'Año Enoj',
      jumpYearBtn: 'Ir',
      mapDateBtn: 'Mapear fecha',
      legendShabbat: 'Shabat',
      legendMikra: 'Mikrá',
      legendFestMid: 'Intermedio',
      legendOmer: 'Ómer',
      monthLabel: 'Mes {m}',
      intercalaryWeek: 'Semana Intercalaria',
      labelDate: 'Fecha',
      labelStart: 'Comienza',
      labelEnd: 'Termina',
      labelFestival: 'Fiesta',
      labelSefira: 'Sefirá',
      statusLoading: 'Cargando...',
      statusLoadedCsv: 'Cargado desde CSV',
      statusBuildError: 'Error construyendo calendario',
      statusInitError: 'Error de inicialización',
      statusMapError: 'Error al mapear fecha',
      inputEnterValidYear: 'Ingresa un año de Enoj válido',
      pickGregorianDate: 'Selecciona una fecha gregoriana',
      yearLabel: 'Año {year}',
      yearLabelApprox: 'Año {year} (≈ {approx} EC)'
    },
    en: {
      title: 'Enoch Calendar',
      prevYear: '⟵ Previous Year',
      nextYear: 'Next Year ⟶',
      today: 'Today',
      downloadCsv: 'Download CSV',
      downloadIcs: 'Download ICS',
      jumpYearPlaceholder: 'Enoch year',
      jumpYearBtn: 'Go',
      mapDateBtn: 'Map Date',
      legendShabbat: 'Shabbat',
      legendMikra: 'Mikra',
      legendFestMid: 'Intermediate',
      legendOmer: 'Omer',
      monthLabel: 'Month {m}',
      intercalaryWeek: 'Intercalary Week',
      labelDate: 'Date',
      labelStart: 'Starts',
      labelEnd: 'Ends',
      labelFestival: 'Festival',
      labelSefira: 'Sefirah',
      statusLoading: 'Loading...',
      statusLoadedCsv: 'Loaded from CSV',
      statusBuildError: 'Error building calendar',
      statusInitError: 'Initialization error',
      statusMapError: 'Map date error',
      inputEnterValidYear: 'Enter a valid Enoch year',
      pickGregorianDate: 'Pick a Gregorian date',
      yearLabel: 'Year {year}',
      yearLabelApprox: 'Year {year} (≈ {approx} CE)'
    }
  };

  function format(str, vars){
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
  }

  // Visible UI logger to #debugLog
  if (!window.uiLog) {
    window.uiLog = function(msg){
      try {
        var el = document.getElementById('debugLog');
        var hint = document.getElementById('dbgHint');
        if (hint && !hint.textContent) hint.textContent = 'Eventos arriba (botón "Limpiar" para borrar)';
        if (!el) return;
        var ts = new Date().toLocaleTimeString();
        el.textContent += '[' + ts + '] ' + msg + '\n';
        el.scrollTop = el.scrollHeight;
      } catch(_){ }
    };
  }

  function getQueryLang(){
    try {
      const m = (location.search || '').match(/[?&]lang=(en|es)\b/i);
      return m ? m[1].toLowerCase() : null;
    } catch(_){ return null; }
  }

  const detect = () => {
    try {
      const q = getQueryLang();
      if (q && I18N[q]) return q;
      const ls = localStorage.getItem('lang');
      if (ls && I18N[ls]) return ls;
      const nav = (navigator.language || 'es').slice(0,2);
      return I18N[nav] ? nav : 'es';
    } catch (_) { return 'es'; }
  };

  function applyTranslations() {
    try { console.log('[i18n] applyTranslations lang=', window.lang); } catch(_){}
    const dict = I18N[window.lang] || I18N.es;
    // Text nodes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    // Placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });
    // aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      if (dict[key]) el.setAttribute('aria-label', dict[key]);
    });
    // Title\n    if (dict.title) document.title = dict.title;\n    // Localized title attributes\n    document.querySelectorAll('[data-i18n-title]').forEach(el => {\n      const key = el.getAttribute('data-i18n-title');\n      if (dict[key]) el.setAttribute('title', dict[key]);\n    });
    document.documentElement.lang = window.lang || 'es';
    // no UI badge
  }

  // Expose helpers
  window.I18N = I18N;
  // Weekdays short labels per language
  const WEEKDAYS = {
    es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  };
  window.lang = detect();
  window.getWeekdays = function(){
    const l = window.lang || 'es';
    return WEEKDAYS[l] || WEEKDAYS.es;
  };
  window.t = function(key, vars){
    const dict = I18N[window.lang] || I18N.es;
    const str = dict[key] || key;
    return format(str, vars);
  };
  window.setStatus = function(key, vars){
    const s = document.getElementById('status');
    if (s) s.textContent = window.t(key, vars);
  };
  window.setYearLabel = function(year, approx){
    const yl = document.getElementById('yearLabel');
    if (!yl) return;
    if (approx) yl.textContent = window.t('yearLabelApprox', { year, approx });
    else yl.textContent = window.t('yearLabel', { year });
  };

  // Language selector (if present)
  function initLangSelector(){
    const sel = document.getElementById('langSel');
    if (!sel) return;
    try { sel.value = window.lang; } catch(_){}
    sel.addEventListener('change', () => {
      window.lang = sel.value;
      try { localStorage.setItem('lang', window.lang); } catch(_){ }
      try { console.log('[i18n] lang change ->', window.lang); } catch(_){}
      applyTranslations();\n      try { document.dispatchEvent(new Event('langchange')); } catch(_) {}\n      // Optional: sync external brand link/icon if present
      try { if (typeof window.syncBrandLink === 'function') window.syncBrandLink(); } catch(_){ }
      // Try to re-render current year label in selected language if we have state
      try {
        if (typeof currentYear !== 'undefined') {
          window.setYearLabel(currentYear);
        } else if (window.currentYear) {
          window.setYearLabel(window.currentYear);
        }
      } catch(_){}
      // Re-render calendar in new language if data is present
      try {
        const hasLocal = (function(){ try { return typeof currentData !== 'undefined' && Array.isArray(currentData) && currentData.length; } catch(e){ return false; }})();
        const hasWin = Array.isArray(window.currentData) && window.currentData.length;
        const canRender = typeof window.renderCalendar === 'function';
        console.log('[i18n] rerender check', { hasLocal, hasWin, canRender });
        if (canRender && (hasLocal || hasWin)) {
          const data = hasLocal ? currentData : window.currentData;
          window.renderCalendar(data);
        }
      } catch(_){}
    });
  }
  function boot(){
    try { console.log('[i18n] boot'); } catch(_){ }
    applyTranslations();\n      try { document.dispatchEvent(new Event('langchange')); } catch(_) {}\n      // Optional: sync external brand link/icon if present
    try { if (typeof window.syncBrandLink === 'function') window.syncBrandLink(); } catch(_){ }
    initLangSelector();
  }
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
try { console.log('[i18n] init script parsed'); } catch(_){ }

