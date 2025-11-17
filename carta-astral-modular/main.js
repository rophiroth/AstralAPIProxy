// main.js

const SCRIPT_VERSION = (typeof window !== 'undefined' && window.__assetVersion) || Date.now();

function loadExternalScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src + '?v=' + SCRIPT_VERSION;
    script.defer = true;
    script.onload = resolve;
    script.onerror = function(err) {
      console.error('[lazy-loader] error', src, err);
      resolve();
    };
    document.body.appendChild(script);
  });
}

let resultModulesPromise = null;
const RESULT_MODULES = [
  'renderOutput.js',
  'tooltips.js',
  'shemot.js',
  'sefirotCoords.js',
  'drawAscMcHouses.js',
  'mapPlanetsToSefirot.js',
  'drawTreeOfLife.js',
  'drawClassicWheel.js'
];

let pendingMobileTreeRender = null;


function estimateTreeMobileHeight(baseWidth) {
  const fallbackRatio = 1.24;
  try {
    const referenceWidth = baseWidth && baseWidth > 0 ? baseWidth : 1024;
    let coordsSource = null;
    if (typeof window !== 'undefined' && window.sefirotCoords) {
      coordsSource = window.sefirotCoords;
    } else if (typeof sefirotCoords !== 'undefined') {
      coordsSource = sefirotCoords;
    }
    if (!coordsSource) return Math.round(referenceWidth * fallbackRatio);
    const coords = Object.values(coordsSource);
    if (!coords.length) return Math.round(referenceWidth * fallbackRatio);
    const xs = coords.map(([x]) => x);
    const ys = coords.map(([, y]) => y);
    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);
    const baseWidthSpan = Math.max(1, maxX - minX);
    const baseHeightSpan = Math.max(1, maxY - minY);
    const ratio = baseHeightSpan / baseWidthSpan;
    const padding = 1.12;
    return Math.round(referenceWidth * ratio * padding);
  } catch (_){
    const ref = baseWidth && baseWidth > 0 ? baseWidth : 1024;
    return Math.round(ref * fallbackRatio);
  }
}
function renderTreeMobile(vizData) {

  const anchor = document.getElementById('treeMobileAnchor');

  if (!anchor) return;

  const shouldShow = window.matchMedia('(max-width: 900px)').matches;

  anchor.innerHTML = '';

  if (!shouldShow) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'tree-mobile-container';

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.min(1280, Math.max(1020, estimateTreeMobileHeight(canvas.width)));

  wrapper.appendChild(canvas);
  anchor.appendChild(wrapper);

  const overrideKeys = ['__TREE_DYNAMIC_FIT','__TREE_SCALE','__TREE_MARGIN_FACTOR','__TREE_MARGIN_X','__TREE_MARGIN_TOP','__TREE_MARGIN_BOTTOM','__TREE_VERTICAL_NUDGE'];
  const previous = {};
  try {
    if (typeof window !== 'undefined') {
      const overrides = {
        __TREE_DYNAMIC_FIT: true,
        __TREE_SCALE: 1,
        __TREE_MARGIN_FACTOR: 0.95,
        __TREE_MARGIN_X: 34,
        __TREE_MARGIN_TOP: 100,
        __TREE_MARGIN_BOTTOM: 64,
        __TREE_VERTICAL_NUDGE: 48
      };
      overrideKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(window, key)) {
          previous[key] = { exists: true, value: window[key] };
        } else {
          previous[key] = { exists: false };
        }
        window[key] = overrides[key];
      });
    }
    drawTreeOfLife(vizData, canvas.getContext('2d'));
  } catch (err) {
    console.warn('[tree-mobile] draw error', err);
  } finally {
    try {
      if (typeof window !== 'undefined') {
        overrideKeys.forEach((key) => {
          const state = previous[key];
          if (state && state.exists) {
            window[key] = state.value;
          } else {
            delete window[key];
          }
        });
      }
    } catch (_){ }
  }

}



function scheduleTreeMobileRender(vizData) {

  if (pendingMobileTreeRender) {

    cancelAnimationFrame(pendingMobileTreeRender);

  }

  pendingMobileTreeRender = requestAnimationFrame(() => renderTreeMobile(vizData));

}



try {

  window.addEventListener('resize', () => {

    try { if (window.__lastCartaData) scheduleTreeMobileRender(window.__lastCartaData); } catch (_){ }

  });

} catch (_){ }



function ensureResultModules() {
  if (!resultModulesPromise) {
    resultModulesPromise = Promise.all(
      RESULT_MODULES.map((src) => loadExternalScript(src))
    );
  }
  return resultModulesPromise;
}

const ASPECT_DEFINITIONS = [
  { key: 'conjunction', angle: 0, orb: 6 },
  { key: 'sextile', angle: 60, orb: 4 },
  { key: 'square', angle: 90, orb: 5 },
  { key: 'trine', angle: 120, orb: 5 },
  { key: 'opposition', angle: 180, orb: 6 }
];

function normalizeDegree(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

function computeClassicalAspects(planets) {
  const entries = Object.entries(planets || {});
  const results = [];
  for (let i = 0; i < entries.length; i++) {
    const [nameA, dataA] = entries[i];
    const lonA = dataA && typeof dataA.longitude === 'number' ? normalizeDegree(dataA.longitude) : null;
    if (lonA === null) continue;
    for (let j = i + 1; j < entries.length; j++) {
      const [nameB, dataB] = entries[j];
      const lonB = dataB && typeof dataB.longitude === 'number' ? normalizeDegree(dataB.longitude) : null;
      if (lonB === null) continue;
      let diff = Math.abs(lonA - lonB);
      if (diff > 180) diff = 360 - diff;
      ASPECT_DEFINITIONS.forEach((def) => {
        const delta = Math.abs(diff - def.angle);
        if (delta <= def.orb) {
          results.push({
            type: def.key,
            planetA: nameA,
            planetB: nameB,
            exact: def.angle,
            actual: diff,
            orb: delta
          });
        }
      });
    }
  }
  return results.sort((a, b) => a.orb - b.orb);
}

async function renderResultsView(data) {
  if (!data) return;
  await ensureResultModules();
  const output = document.getElementById("output");
  if (!output) return;
  const treeWrapper = document.querySelector('.tree-wrapper');
  const treeCanvas = document.getElementById("treeOfLifeCanvas");
  const classicWrapper = document.getElementById("classicChartWrapper");
  const classicCanvas = document.getElementById("classicChartCanvas");
  const aspectsContainer = document.getElementById("aspectsTableContainer");
  if (treeWrapper) {
    const anchor = document.getElementById('treeMobileAnchor');
    if (anchor && anchor.contains(treeWrapper)) {
      anchor.removeChild(treeWrapper);
    }
  }
  if (treeWrapper && output.contains(treeWrapper)) {
    try {
      const vizHome = document.querySelector('.visualizations');
      if (vizHome) {
        vizHome.insertBefore(treeWrapper, vizHome.firstChild || null);
      }
    } catch (_){ }
  }
  if (treeWrapper) treeWrapper.classList.add('hidden');
  if (classicWrapper) classicWrapper.classList.add('hidden');
  if (treeCanvas) {
    const tctx = treeCanvas.getContext("2d");
    if (tctx) tctx.clearRect(0, 0, treeCanvas.width, treeCanvas.height);
  }
  if (classicCanvas) {
    const cctx = classicCanvas.getContext("2d");
    if (cctx) cctx.clearRect(0, 0, classicCanvas.width, classicCanvas.height);
  }
  if (aspectsContainer) {
    aspectsContainer.innerHTML = '';
    aspectsContainer.classList.add('hidden');
  }
  output.innerHTML = "";
  output.classList.remove('hidden');
  const aspects = computeClassicalAspects(data && data.planets ? data.planets : {});
  const vizData = Object.assign({}, data, { classicAspects: aspects });
  try { window.__lastCartaData = vizData; } catch (_) {}
  const { planets, enoch, houses_data } = vizData;
  const oplanets = orderPlanets(planets);

  try {
    if (typeof window.renderEnochInfo === "function") {
      renderEnochInfo(output, enoch, planets.Sun && planets.Sun.longitude);
      scheduleTreeMobileRender(vizData);
    } else { debugValue("renderEnochInfo missing"); }
  } catch (re) { debugValue("renderEnochInfo error", re); }

  try {
    if (typeof window.renderPlanetsAndHouses === "function") {
      renderPlanetsAndHouses(output, oplanets, houses_data);
    } else { debugValue("renderPlanetsAndHouses missing"); }
  } catch (rph) { debugValue("renderPlanetsAndHouses error", rph); }

  try {
    if (typeof window.renderElementSummary === "function") {
      renderElementSummary(output, oplanets, houses_data && houses_data.ascendant);
    } else { debugValue("renderElementSummary missing"); }
  } catch (resErr) { debugValue("renderElementSummary error", resErr); }

  try {
    if (typeof window.renderAspectsTable === "function") {
      renderAspectsTable(aspectsContainer || output, aspects);
    } else { debugValue("renderAspectsTable missing"); }
  } catch (aspErr) { debugValue("renderAspectsTable error", aspErr); }

  const drawVisuals = () => {
    if (treeCanvas && typeof window.drawTreeOfLife === "function") {
      try {
        const inlineMobile = window.matchMedia('(max-width: 900px)').matches;
        const desiredHeight = inlineMobile ? 980 : 740;
        if (treeCanvas.height !== desiredHeight) treeCanvas.height = desiredHeight;
        if (treeCanvas.width !== 960) treeCanvas.width = 960;
        if (treeWrapper) treeWrapper.classList.toggle('mobile-hidden', inlineMobile);
      } catch (_){ }
      try { drawTreeOfLife(vizData, treeCanvas.getContext("2d")); } catch (de) { debugValue("drawTreeOfLife error", de); }
      try { setupTooltip(treeCanvas, (houses_data && houses_data.houses) || [], oplanets); } catch (te) { debugValue("setupTooltip error", te); }
      if (treeWrapper) treeWrapper.classList.remove('hidden');
    }
    if (classicCanvas && typeof window.drawClassicWheel === "function") {
      try { drawClassicWheel(vizData, classicCanvas.getContext("2d")); } catch (ce) { debugValue("drawClassicWheel error", ce); }
      if (classicWrapper) classicWrapper.classList.remove('hidden');
    }
    scheduleTreeMobileRender(vizData);
  };

  try {
    document.fonts.load("20px 'StamHebrew'").then(drawVisuals);
  } catch (fe) {
    debugValue("fonts.load error", fe);
    drawVisuals();
  }
}

function getApiUrl() {
  try {
    const meta = document.querySelector('meta[name="api-url"]');
    const fromMeta = meta && meta.getAttribute('content');
    const hinted = (window.CALC_API || '').trim();
    const base = fromMeta || hinted || 'https://astralapiproxy.onrender.com/calculate';
    const u = new URL(base, window.location.origin);
    return u.toString();
  } catch (_) {
    return 'https://astralapiproxy.onrender.com/calculate';
  }
}

function getFallbackApiUrl() {
  const meta = document.querySelector('meta[name="api-upstream-url"]');
  const fromMeta = meta && meta.getAttribute('content');
  return (fromMeta && fromMeta.trim()) || 'https://astralapiproxy.onrender.com/calculate';
}

async function fetchWithFallback(primaryUrl, fallbackUrl, makeOptions) {
  const attempt = async (url) => await fetch(url, makeOptions());
  let attemptedFallback = false;
  try {
    let response = await attempt(primaryUrl);
    if (!response.ok && fallbackUrl && fallbackUrl !== primaryUrl && response.status >= 500) {
      attemptedFallback = true;
      debugValue("[fetchWithFallback] primary responded", response.status, "falling back to", fallbackUrl);
      response = await attempt(fallbackUrl);
    }
    if (!response.ok) {
      throw new Error('API ' + response.status);
    }
    return response;
  } catch (err) {
    if (!fallbackUrl || fallbackUrl === primaryUrl || attemptedFallback) {
      throw err;
    }
    debugValue("[fetchWithFallback] primary fetch failed, trying fallback", err);
    const fallbackResponse = await attempt(fallbackUrl);
    if (!fallbackResponse.ok) {
      throw new Error('API ' + fallbackResponse.status);
    }
    return fallbackResponse;
  }
}

function initApp() {
  debugValue("é¦ƒå¯ª Main.js cargado");


  const locationInput = document.getElementById("location");
  const suggestionsBox = document.getElementById("suggestions");
  const coordsDiv = document.getElementById("coords");
  const gpsButton = document.getElementById("gpsButton");
  const langSelect = document.getElementById("langSelect");
  const loadingScreen = document.getElementById("loadingScreen");
  const appShell = document.getElementById("appShell");
  const langCompactQuery = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(max-width: 560px)') : null;
  const syncLangOptionLabels = () => {
    if (!langSelect) return;
    const map = (langCompactQuery && langCompactQuery.matches)
      ? { es: 'Es', en: 'En' }
      : { es: 'Español', en: 'English' };
    Array.from(langSelect.options || []).forEach((opt) => {
      const key = (opt.value || '').toLowerCase();
      if (map[key]) opt.textContent = map[key];
    });
  };
  syncLangOptionLabels();
  if (langCompactQuery) {
    if (typeof langCompactQuery.addEventListener === 'function') {
      langCompactQuery.addEventListener('change', syncLangOptionLabels);
    } else if (typeof langCompactQuery.addListener === 'function') {
      langCompactQuery.addListener(syncLangOptionLabels);
    }
  }

  const translationsAPI = (typeof window !== "undefined" && window.ChartTranslations) || null;
  const availableTranslations = translationsAPI ? translationsAPI.translations : { es: {} };
  const t = (key, fallback) => (currentTranslations && currentTranslations[key]) || fallback || key;
  let activeLang = (translationsAPI && translationsAPI.defaultLang) || 'es';
  let currentTranslations = translationsAPI && typeof translationsAPI.getTranslation === 'function'
    ? translationsAPI.getTranslation(activeLang)
    : (availableTranslations[activeLang] || {});

  function pushTranslationsToGlobal() {
    if (translationsAPI && typeof translationsAPI.pushToGlobal === 'function') {
      currentTranslations = translationsAPI.pushToGlobal(activeLang) || currentTranslations;
      return;
    }
    try {
      window.__chartTranslations = currentTranslations || {};
      window.__chartLanguage = activeLang;
      window.getChartTranslation = function(key, fallback) {
        return (currentTranslations && currentTranslations[key]) || fallback || key;
      };
      window.translateSignName = function(sign) {
        const dict = currentTranslations && currentTranslations.signNames;
        return (dict && dict[sign]) || sign;
      };
      window.translatePlanetName = function(planet) {
        const dict = currentTranslations && currentTranslations.planetNames;
        return (dict && dict[planet]) || planet;
      };
      window.translateAspectName = function(type) {
        const dict = currentTranslations && currentTranslations.aspectNames;
        return (dict && dict[type]) || type;
      };
      window.dispatchEvent(new CustomEvent('chart:language-change', {
        detail: { lang: activeLang, translations: currentTranslations }
      }));
    } catch (_){ }
  }
  pushTranslationsToGlobal();


  function revealApp() {
    try {
      if (loadingScreen) loadingScreen.classList.add('hidden');
      if (appShell) appShell.classList.remove('hidden');
    } catch (_){ }
  }

  const locationController = (typeof window !== 'undefined' && typeof window.initLocationModule === 'function')
    ? window.initLocationModule({
        locationInput,
        suggestionsBox,
        gpsButton,
        debugValue,
        getTranslations: () => currentTranslations
      })
    : null;


  const getSelectedCoords = () => {
    if (locationController && typeof locationController.getCoords === 'function') {
      return locationController.getCoords();
    }
    return { lat: null, lon: null };
  };


  function applyLanguage(lang) {
    const tr = (translationsAPI && typeof translationsAPI.getTranslation === "function")
      ? translationsAPI.getTranslation(lang)
      : (availableTranslations[lang] || availableTranslations.es || {});
    const dateLabel = document.querySelector('[data-l10n="dateLabel"]');
    const locationLabel = document.querySelector('[data-l10n="locationLabel"]');
    const submitBtn = document.querySelector('#astroForm button[type="submit"]');
    const titleEl = document.getElementById("appTitle");
    const brandLink = document.getElementById("brandLink");
    const loadingLabel = document.querySelector('[data-l10n="loadingApp"]');
    if (titleEl) titleEl.textContent = tr.title;
    if (brandLink && tr.brandUrl) brandLink.setAttribute('href', tr.brandUrl);
    if (dateLabel) dateLabel.textContent = tr.dateLabel;
    if (locationLabel) locationLabel.textContent = tr.locationLabel;
    if (submitBtn) submitBtn.textContent = tr.submitButton;
    if (loadingLabel) loadingLabel.textContent = tr.loadingApp;
    if (gpsButton) gpsButton.setAttribute("aria-label", tr.gpsLabel);
    document.title = tr.title || document.title;
    if (langSelect) {
      langSelect.value = lang;
      try { localStorage.setItem("chartLang", lang); } catch (_){ }
    }
    currentTranslations = tr || {};
    activeLang = lang;
    pushTranslationsToGlobal();
    try {
      if (window.__lastCartaData) {
        renderResultsView(window.__lastCartaData).catch((e) => debugValue("renderResults rerender error", e));
      }
    } catch(_){ }
  }

  const navigatorDefault = (navigator.language && navigator.language.toLowerCase().startsWith("es")) ? "es" : "en";
  const moduleDefault = (translationsAPI && translationsAPI.defaultLang) || 'es';
  const defaultLang = availableTranslations[navigatorDefault] ? navigatorDefault : moduleDefault;
  try {
    const stored = localStorage.getItem("chartLang");
    if (stored) activeLang = stored;
    else activeLang = defaultLang;
  } catch (_) {
    activeLang = defaultLang;
  }
  applyLanguage(activeLang);
  if (langSelect) {
    langSelect.value = activeLang;
    langSelect.addEventListener("change", (e) => {
      activeLang = e.target.value;
      applyLanguage(activeLang);
    });
  }


  document.getElementById("astroForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const datetime = document.getElementById("datetime").value;
    const output = document.getElementById("output");
    const canvas = document.getElementById("treeOfLifeCanvas");
    const ctx = canvas.getContext("2d");
    const treeWrapper = document.querySelector('.tree-wrapper');
    const classicWrapper = document.getElementById('classicChartWrapper');
    const classicCanvas = document.getElementById('classicChartCanvas');
    // Mostrar estado de carga visible
    try { output.classList.remove('hidden'); } catch(_){}
    output.innerHTML = '<div class="loading"><div class="spinner"></div><span>' + t("calculatingMessage", "Calculando carta...") + '</span></div>';
    if (treeWrapper) treeWrapper.classList.add('hidden');
    if (classicWrapper) classicWrapper.classList.add('hidden');
    try {
      if (classicCanvas) {
        const cc = classicCanvas.getContext('2d');
        if (cc) cc.clearRect(0, 0, classicCanvas.width, classicCanvas.height);
      }
    } catch (_){}

    const coords = getSelectedCoords();
    const selectedLat = coords.lat;
    const selectedLon = coords.lon;
    debugValue("[submit] datos", { datetime, selectedLat, selectedLon });

    if (!selectedLat || !selectedLon) {
      if (locationController && typeof locationController.requireCoords === "function") {
        locationController.requireCoords();
      }
      output.innerHTML = "<p>" + t("selectLocationMessage", "Selecciona una ubicación válida o permite el acceso a tu ubicación.") + "</p>";
      return;
    }
	let tz = 'UTC';
	try {
	  tz = await getTimezoneFromCoords(selectedLat,selectedLon);
	} catch (tzErr) {
	  debugValue("TZ detect error, using UTC", tzErr);
	  tz = 'UTC';
	}
    try {
      const API_URL = getApiUrl();
      const fallbackAPI = getFallbackApiUrl();
      const payload = {
        datetime,
        latitude: selectedLat,
        longitude: selectedLon,
        timezone: tz
      };
      const payloadBody = JSON.stringify(payload);
      debugValue("[submit] API primary", API_URL, "fallback", fallbackAPI);
      const response = await fetchWithFallback(API_URL, fallbackAPI, () => ({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payloadBody
      }));

      debugValue("[submit] status", response.status, "url", response.url);
      const data = await response.json();
      await ensureResultModules();
      try { debugValue("[submit] json ok", Object.keys(data||{})); } catch(_){}
      await renderResultsView(data);
} catch (err) {
      const technical = (err && err.message) ? err.message : String(err);
      if (/failed to fetch/i.test(technical)) {
        const fallbackMsg = (currentTranslations && currentTranslations.errorUnavailable) ||
          "Servicio temporalmente no disponible. Intenta nuevamente.";
        output.innerHTML = "<p>" + fallbackMsg + "</p>";
      } else {
        output.innerHTML = "<p>" + t("unexpectedError", "Error inesperado") + ": " + technical + "</p>";
      }
      debugValue("ðŸ”¬ Error en fetch", err);
    }
  });

  revealApp();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM ya listo; inicializar de inmediato (para loader dinè°©mico)
  initApp();
  
  // re-render canvas when theme changes
  async function rerenderVisuals() {
    try {
      if (!window.__lastCartaData) return;
      await ensureResultModules();
      const data = window.__lastCartaData;

      const treeCanvas = document.getElementById('treeOfLifeCanvas');
      if (treeCanvas && typeof window.drawTreeOfLife === 'function') {
        const tctx = treeCanvas.getContext('2d');
        if (tctx) {
          tctx.clearRect(0, 0, treeCanvas.width, treeCanvas.height);
          drawTreeOfLife(data, tctx);
          if (typeof window.setupTooltip === 'function') {
            const planets = orderPlanets((data && data.planets) || {});
            const houses = (data && data.houses_data && data.houses_data.houses) || [];
            setupTooltip(treeCanvas, houses, planets);
          }
        }
      }

      const classicCanvas = document.getElementById('classicChartCanvas');
      if (classicCanvas && typeof window.drawClassicWheel === 'function') {
        const cctx = classicCanvas.getContext('2d');
        if (cctx) {
          cctx.clearRect(0, 0, classicCanvas.width, classicCanvas.height);
          drawClassicWheel(data, cctx);
        }
      }
      scheduleTreeMobileRender(data);
    } catch (e) { debugValue("rerenderVisuals error", e); }
  }
try {
  const mo = new MutationObserver((mut) => {
    for (const m of mut) {
      if (m.attributeName === 'data-theme') {
        const res = rerenderVisuals();
        if (res && typeof res.catch === 'function') res.catch((e) => debugValue("rerenderVisuals theme error", e));
      }
    }
  });
  mo.observe(document.documentElement, { attributes: true });
} catch(_) {}
try {
  const tb = document.getElementById('themeToggle');
  if (tb) tb.addEventListener('click', () => setTimeout(() => {
    const res = rerenderVisuals();
    if (res && typeof res.catch === 'function') res.catch((e) => debugValue("rerenderVisuals toggle error", e));
  }, 0));
} catch(_) {}

}

try {
  window.addEventListener('load', () => {
    try {
      const screen = document.getElementById('loadingScreen');
      if (screen) screen.classList.add('hidden');
      const shell = document.getElementById('appShell');
      if (shell) shell.classList.remove('hidden');
    } catch (_){}
  });
} catch (_){}














