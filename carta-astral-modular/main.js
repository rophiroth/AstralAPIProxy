// main.js

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
  debugValue("馃寪 Main.js cargado");

  let selectedLat = null;
  // cache for redraw on theme change (global to allow theme observer
  // to trigger once the DOM is ready). This avoids flickering.
  try { if (typeof window.__lastCartaData === 'undefined') window.__lastCartaData = null; } catch(_){}
  let selectedLon = null;
  let debounceTimeout;
  let manualLocationSelected = false;
  let autoGeoRequested = false;
  let locationFetchController = null;
  let ipLookupPending = false;
  let ipBootstrapDone = false;
  const quickLocationHints = [
    { name: "Santiago, Chile", lat: -33.4489, lon: -70.6693, detail: "Capital de Chile" },
    { name: "Buenos Aires, Argentina", lat: -34.6037, lon: -58.3816, detail: "Capital de Argentina" },
    { name: "Madrid, España", lat: 40.4168, lon: -3.7038, detail: "España" },
    { name: "Ciudad de México, México", lat: 19.4326, lon: -99.1332, detail: "México" },
    { name: "Bogotá, Colombia", lat: 4.7110, lon: -74.0721, detail: "Colombia" },
    { name: "Lima, Perú", lat: -12.0464, lon: -77.0428, detail: "Perú" },
    { name: "Montevideo, Uruguay", lat: -34.9011, lon: -56.1645, detail: "Uruguay" },
    { name: "Quito, Ecuador", lat: -0.1807, lon: -78.4678, detail: "Ecuador" },
    { name: "Caracas, Venezuela", lat: 10.4806, lon: -66.9036, detail: "Venezuela" },
    { name: "São Paulo, Brasil", lat: -23.5505, lon: -46.6333, detail: "Brasil" }
  ];

  const locationInput = document.getElementById("location");
  const suggestionsBox = document.getElementById("suggestions");
  const coordsDiv = document.getElementById("coords");
  const gpsButton = document.getElementById("gpsButton");
  const langSelect = document.getElementById("langSelect");
  const loadingScreen = document.getElementById("loadingScreen");
  const appShell = document.getElementById("appShell");

  function setLocationFromSuggestion(label, lat, lon, { manual = false } = {}) {
    locationInput.value = label;
    selectedLat = lat;
    selectedLon = lon;
    if (!manual) {
      setGpsStatus("detectedPlaceholder");
    } else {
      locationInput.placeholder = currentTranslations.placeholder;
    }
    suggestionsBox.innerHTML = "";
    debugValue("Detected location", label, lat, lon);
    manualLocationSelected = manual;
  }

  const translations = {
    es: {
      title: "Carta Astral Modular",
      dateLabel: "Fecha y hora de nacimiento:",
      locationLabel: "Ubicación (Ciudad, País):",
      submitButton: "Calcular Carta",
      placeholder: "Escribe tu ciudad",
      gpsLabel: "Usar ubicación actual",
      statusSearching: "Buscando ubicación...",
      statusDetected: "Ubicación detectada",
      statusError: "GPS:",
      detectedPlaceholder: "Ubicación actual (Ubicación detectada)",
      statusDetectedBrowser: "Ubicación aproximada detectada",
      suggestionNoResults: "No se encontraron resultados",
      suggestionError: "No hay conexión",
      loadingApp: "Cargando módulo...",
      errorUnavailable: "Servicio temporalmente no disponible. Intenta nuevamente en unos segundos.",
      selectLocationMessage: "Selecciona una ubicación válida o permite el acceso a tu ubicación.",
      calculatingMessage: "Calculando carta...",
      gpsDenied: "sin permiso",
      unexpectedError: "Error inesperado",
      enochTitle: "Calendario de Enoch",
      enochYear: "Año",
      enochMonth: "Mes",
      enochDay: "Día",
      enochDayOfYear: "Día del año",
      enochAddedWeek: "Semana adicional",
      enochAstronomicalName: "Nombre (Astronómico)",
      enochEnochName: "Nombre (Enoch)",
      yesLabel: "Sí",
      noLabel: "No",
      planetsTitle: "Planetas",
      housesTitle: "Casas astrológicas",
      ascLabel: "Asc",
      descLabel: "Desc",
      mcLabel: "MC",
      houseLabel: "Casa",
      elementSummaryTitle: "Resumen elemental",
      elementSourceUnit: "Conteo (unitario)",
      elementSourceWeighted: "Puntaje (ponderado)",
      elementPolarityTitle: "Polaridad",
      polarityMasculine: "Masculino (Fuego + Aire)",
      polarityFeminine: "Femenino (Agua + Tierra)",
      tableSourceLabel: "Fuente",
      modalitiesTitle: "Resumen por modalidades",
      modalitiesSourceUnit: "Conteo (unitario)",
      modalitiesSourceWeighted: "Puntaje (ponderado)",
      notePluto: "Nota: se excluye Plutón; Sol, Luna y Ascendente puntúan x2 en los conteos ponderados.",
      triadLabel: "Tríada",
      triadMasculine: "Masculino (Fuego)",
      triadNeutral: "Neutro (Aire)",
      triadFeminine: "Femenino (Agua+Tierra)",
      planetNames: {
        Sun: "Sol",
        Moon: "Luna",
        Mercury: "Mercurio",
        Venus: "Venus",
        Mars: "Marte",
        Jupiter: "Júpiter",
        Saturn: "Saturno",
        Uranus: "Urano",
        Neptune: "Neptuno",
        Pluto: "Plutón"
      },
      signNames: {
        Aries: "Aries",
        Taurus: "Tauro",
        Gemini: "Géminis",
        Cancer: "Cáncer",
        Leo: "Leo",
        Virgo: "Virgo",
        Libra: "Libra",
        Scorpio: "Escorpio",
        Sagittarius: "Sagitario",
        Capricorn: "Capricornio",
        Aquarius: "Acuario",
        Pisces: "Piscis"
      },
      elementNames: {
        Fuego: "Fuego",
        Tierra: "Tierra",
        Aire: "Aire",
        Agua: "Agua"
      },
      modalityNames: {
        Cardinal: "Cardinal",
        Fijo: "Fijo",
        Mutable: "Mutable"
      }
    },
    en: {
      title: "Modular Birth Chart",
      dateLabel: "Birth date and time:",
      locationLabel: "Location (City, Country):",
      submitButton: "Calculate Chart",
      placeholder: "Type your city",
      gpsLabel: "Use current location",
      statusSearching: "Looking up location...",
      statusDetected: "Location detected",
      statusError: "GPS:",
      detectedPlaceholder: "Current location (Detected)",
      statusDetectedBrowser: "Approximate location detected",
      suggestionNoResults: "No results found",
      suggestionError: "No connection",
      loadingApp: "Loading module...",
      errorUnavailable: "Service temporarily unavailable. Please try again in a moment.",
      selectLocationMessage: "Choose a valid location or allow access to your location.",
      calculatingMessage: "Calculating chart...",
      gpsDenied: "permission denied",
      unexpectedError: "Unexpected error",
      enochTitle: "Enoch Calendar",
      enochYear: "Year",
      enochMonth: "Month",
      enochDay: "Day",
      enochDayOfYear: "Day of year",
      enochAddedWeek: "Added week",
      enochAstronomicalName: "Name (Astronomical)",
      enochEnochName: "Name (Enoch)",
      yesLabel: "Yes",
      noLabel: "No",
      planetsTitle: "Planets",
      housesTitle: "Astrological Houses",
      ascLabel: "Asc",
      descLabel: "Desc",
      mcLabel: "MC",
      houseLabel: "House",
      elementSummaryTitle: "Element Summary",
      elementSourceUnit: "Count (unit)",
      elementSourceWeighted: "Score (weighted)",
      elementPolarityTitle: "Polarity",
      polarityMasculine: "Masculine (Fire + Air)",
      polarityFeminine: "Feminine (Water + Earth)",
      tableSourceLabel: "Source",
      modalitiesTitle: "Modalities Summary",
      modalitiesSourceUnit: "Count (unit)",
      modalitiesSourceWeighted: "Score (weighted)",
      notePluto: "Note: Pluto is excluded; Sun, Moon and Ascendant count twice in weighted totals.",
      triadLabel: "Triad",
      triadMasculine: "Masculine (Fire)",
      triadNeutral: "Neutral (Air)",
      triadFeminine: "Feminine (Water+Earth)",
      planetNames: {
        Sun: "Sun",
        Moon: "Moon",
        Mercury: "Mercury",
        Venus: "Venus",
        Mars: "Mars",
        Jupiter: "Jupiter",
        Saturn: "Saturn",
        Uranus: "Uranus",
        Neptune: "Neptune",
        Pluto: "Pluto"
      },
      signNames: {
        Aries: "Aries",
        Taurus: "Taurus",
        Gemini: "Gemini",
        Cancer: "Cancer",
        Leo: "Leo",
        Virgo: "Virgo",
        Libra: "Libra",
        Scorpio: "Scorpio",
        Sagittarius: "Sagittarius",
        Capricorn: "Capricorn",
        Aquarius: "Aquarius",
        Pisces: "Pisces"
      },
      elementNames: {
        Fuego: "Fire",
        Tierra: "Earth",
        Aire: "Air",
        Agua: "Water"
      },
      modalityNames: {
        Cardinal: "Cardinal",
        Fijo: "Fixed",
        Mutable: "Mutable"
      }
    }
  };
  let currentTranslations = translations.es;
  let activeLang = 'es';
  const t = (key, fallback) => (currentTranslations && currentTranslations[key]) || fallback || key;

  function pushTranslationsToGlobal() {
    try {
      window.__chartTranslations = currentTranslations;
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
      window.dispatchEvent(new CustomEvent('chart:language-change', {
        detail: { lang: activeLang, translations: currentTranslations }
      }));
    } catch (_){}
  }
  pushTranslationsToGlobal();

  function applyLanguage(lang) {
    const tr = translations[lang] || translations.es;
    const dateLabel = document.querySelector('[data-l10n="dateLabel"]');
    const locationLabel = document.querySelector('[data-l10n="locationLabel"]');
    const submitBtn = document.querySelector('#astroForm button[type="submit"]');
    const titleEl = document.getElementById("appTitle");
    const loadingLabel = document.querySelector('[data-l10n="loadingApp"]');
    if (titleEl) titleEl.textContent = tr.title;
    if (dateLabel) dateLabel.textContent = tr.dateLabel;
    if (locationLabel) locationLabel.textContent = tr.locationLabel;
    if (submitBtn) submitBtn.textContent = tr.submitButton;
    if (loadingLabel) loadingLabel.textContent = tr.loadingApp;
    if (gpsButton) gpsButton.setAttribute("aria-label", tr.gpsLabel);
    if (locationInput && !manualLocationSelected) {
      locationInput.placeholder = tr.placeholder;
    }
    if (langSelect) {
      langSelect.value = lang;
      try { localStorage.setItem("chartLang", lang); } catch (_){}
    }
    currentTranslations = tr;
    activeLang = lang;
    pushTranslationsToGlobal();
  }

  const defaultLang = (navigator.language && navigator.language.toLowerCase().startsWith("es")) ? "es" : "en";
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

  function appendSuggestion(label, lat, lon, detail) {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    const span = document.createElement("span");
    span.textContent = label;
    div.appendChild(span);
    if (detail) {
      const small = document.createElement("small");
      small.textContent = detail;
      div.appendChild(small);
    }
      div.addEventListener("click", () => { setLocationFromSuggestion(label, lat, lon, { manual: true }); });
    suggestionsBox.appendChild(div);
  }

  function setGpsStatus(key, extra = "") {
    if (!locationInput || manualLocationSelected) return;
    if (!key) {
      locationInput.placeholder = currentTranslations.placeholder;
      return;
    }
    const base = currentTranslations[key] || "";
    const text = [base, extra].filter(Boolean).join(" ").trim();
    locationInput.placeholder = text || currentTranslations.placeholder;
  }
  function revealApp() {
    try {
      if (loadingScreen) loadingScreen.classList.add('hidden');
      if (appShell) appShell.classList.remove('hidden');
    } catch (_){}
  }

  function requestGeolocation({ force = false } = {}) {
    if (!navigator.geolocation) {
      setGpsStatus(null);
      return;
    }
    if (manualLocationSelected && !force) {
      return;
    }
    if (autoGeoRequested && !force) {
      return;
    }
    autoGeoRequested = true;
    setGpsStatus("statusSearching");
    if (gpsButton) gpsButton.disabled = true;
    navigator.geolocation.getCurrentPosition(pos => {
      setLocationFromSuggestion(currentTranslations.detectedPlaceholder, pos.coords.latitude, pos.coords.longitude);
      setGpsStatus("detectedPlaceholder");
      autoGeoRequested = false;
      if (gpsButton) gpsButton.disabled = false;
    }, (err) => {
      setGpsStatus("statusError", err && err.message ? err.message : (currentTranslations.gpsDenied || ""));
      autoGeoRequested = false;
      if (gpsButton) gpsButton.disabled = false;
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }

  async function attemptIpBootstrap() {
    if (ipBootstrapDone || ipLookupPending) return;
    if (!locationInput) return;
    if (manualLocationSelected) return;
    if ((locationInput.value || "").trim().length > 0) return;
    ipLookupPending = true;
    setGpsStatus("statusSearching");
    const providers = [
      {
        url: "https://ipapi.co/json/",
        map: (data) => {
          const lat = parseFloat(data.latitude);
          const lon = parseFloat(data.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          const label = [data.city, data.region, data.country_name].filter(Boolean).join(", ") || data.ip || null;
          return { lat, lon, label };
        }
      },
      {
        url: "https://ipwho.is/?fields=ip,success,city,region,country,latitude,longitude",
        map: (data) => {
          if (data.success === false) return null;
          const lat = parseFloat(data.latitude);
          const lon = parseFloat(data.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
          const label = [data.city, data.region, data.country].filter(Boolean).join(", ") || data.ip || null;
          return { lat, lon, label };
        }
      }
    ];
    let applied = false;
    for (const provider of providers) {
      if (applied) break;
      try {
        const resp = await fetch(provider.url, { headers: { Accept: "application/json" } });
        if (!resp.ok) continue;
        const data = await resp.json();
        const mapped = provider.map(data);
        if (!mapped) continue;
        if (manualLocationSelected || (locationInput.value || "").trim().length > 0) {
          applied = true;
          ipBootstrapDone = true;
          break;
        }
        const label = mapped.label || currentTranslations.detectedPlaceholder;
        setLocationFromSuggestion(label, mapped.lat, mapped.lon, { manual: false });
        setGpsStatus("statusDetectedBrowser");
        ipBootstrapDone = true;
        applied = true;
      } catch (providerErr) {
        debugValue("ip bootstrap provider error", { url: provider.url, err: providerErr && providerErr.message });
      }
    }
    if (!applied && !manualLocationSelected) {
      setGpsStatus(null);
    }
    ipLookupPending = false;
  }


  }

  locationInput.addEventListener("input", () => {
    manualLocationSelected = false;
    ipBootstrapDone = true;
    selectedLat = null;
    selectedLon = null;
    setGpsStatus(null);
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      const query = locationInput.value.trim();
      if (query.length < 2) {
        suggestionsBox.innerHTML = "";
        return;
      }

      const normalized = query.toLowerCase();
      suggestionsBox.innerHTML = "";
      const seen = new Set();
      const quickMatches = quickLocationHints
        .filter(item => item.name.toLowerCase().includes(normalized))
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(normalized) ? 0 : 1;
          const bStarts = b.name.toLowerCase().startsWith(normalized) ? 0 : 1;
          return aStarts - bStarts;
        })
        .slice(0, 4);
      quickMatches.forEach(item => {
        appendSuggestion(item.name, item.lat, item.lon, item.detail + " (rápido)");
        seen.add(item.name.toLowerCase());
      });

      const loading = document.createElement("div");
      loading.className = "suggestion-loading";
      loading.textContent = currentTranslations.statusSearching;
      suggestionsBox.appendChild(loading);

      if (locationFetchController) {
        locationFetchController.abort();
      }
      locationFetchController = new AbortController();
      const signal = locationFetchController.signal;
      try {
        const response = await fetch(
          "https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(query) +
          "&format=json&addressdetails=1&limit=6&accept-language=es",
          { signal }
        );
        const places = await response.json();
        if (signal.aborted) return;
        loading.remove();
        let appended = false;
        for (const place of places) {
          const placeKey = (place.display_name || "").toLowerCase();
          if (seen.has(placeKey)) continue;
          if (!["city", "town", "village", "administrative", "state", "country", "region"].includes(place.type)) continue;
          const detail = place.type ? place.type.charAt(0).toUpperCase() + place.type.slice(1) : "";
          appendSuggestion(place.display_name, parseFloat(place.lat), parseFloat(place.lon), detail);
          seen.add(placeKey);
          appended = true;
          if (seen.size >= 6) break;
        }
        if (!appended && suggestionsBox.querySelectorAll(".suggestion-item").length === 0) {
          const none = document.createElement("div");
          none.className = "suggestion-loading";
          none.textContent = currentTranslations.suggestionNoResults;
          suggestionsBox.appendChild(none);
        }
      } catch (err) {
        loading.remove();
        if (err.name === "AbortError") return;
        debugValue("suggestion fetch error", err);
        if (!suggestionsBox.querySelector(".suggestion-item")) {
          const errDiv = document.createElement("div");
          errDiv.className = "suggestion-loading";
          errDiv.textContent = currentTranslations.suggestionError;
          suggestionsBox.appendChild(errDiv);
        }
      }
    }, 400);
  });
  if (gpsButton) {
    gpsButton.addEventListener("click", () => {
      requestGeolocation({ force: true });
    });
  }

  document.addEventListener("click", (e) => {
    if (!suggestionsBox.contains(e.target) && e.target !== locationInput) {
      suggestionsBox.innerHTML = "";
    }
  });

  document.getElementById("astroForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const datetime = document.getElementById("datetime").value;
    const output = document.getElementById("output");
    const canvas = document.getElementById("treeOfLifeCanvas");
    const ctx = canvas.getContext("2d");
    const treeWrapper = document.querySelector('.tree-wrapper');
    // Mostrar estado de carga visible
    try { output.classList.remove('hidden'); } catch(_){}
    output.innerHTML = '<div class="loading"><div class="spinner"></div><span>' + t("calculatingMessage", "Calculando carta...") + '</span></div>';
    if (treeWrapper) treeWrapper.classList.add('hidden');

    debugValue("[submit] datos", { datetime, selectedLat, selectedLon });

    if (!selectedLat || !selectedLon) {
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
      try { debugValue("[submit] json ok", Object.keys(data||{})); } catch(_){}
      try { window.__lastCartaData = data; } catch(_){}
	  const { planets, enoch, houses_data } = data;          // 鈫? bloque nuevo
	  //const { ascendant, midheaven, houses } = houses_data;  // 鈫? lo que necesitaba el front
      //const { planets, ascendant, midheaven, houses, enoch } = data;
		oplanets = orderPlanets(planets); // 🔁 Ya no se reordena automáticamente
      debugValue("馃獝 Respuesta del backend", data);

      //const shemAstronomico = getShemAstronomico(planets.Sun.longitude);
      //const shemEnoch = getShemEnochiano(enoch.enoch_month, enoch.enoch_day, enoch.added_week);

	  // 1) Solo Enoj:
      try {
        if (typeof window.renderEnochInfo === "function") {
          renderEnochInfo(output, enoch, planets.Sun && planets.Sun.longitude);
        } else { debugValue("renderEnochInfo missing"); }
      } catch (re) { debugValue("renderEnochInfo error", re); }

      // 2) Opcional: toda la data de planetas y casas
      //    comenta o descomenta esta línea según quieras listar:
      try {
        if (typeof window.renderPlanetsAndHouses === "function") {
          renderPlanetsAndHouses(output, oplanets, houses_data);
        } else { debugValue("renderPlanetsAndHouses missing"); }
      } catch (rph) { debugValue("renderPlanetsAndHouses error", rph); }

      // 2b) Resumen por elementos (planetas + ascendente) y mini IA
      try {
        if (typeof window.renderElementSummary === "function") {
          renderElementSummary(output, oplanets, houses_data && houses_data.ascendant);
        } else { debugValue("renderElementSummary missing"); }
      } catch (resErr) { debugValue("renderElementSummary error", resErr); }

      // 3) Dibuja en canvas

      try {
        document.fonts.load("20px 'StamHebrew'").then(() => {
          try { drawTreeOfLife(data, ctx); } catch (de) { debugValue("drawTreeOfLife error", de); }
          try { setupTooltip(canvas, (houses_data && houses_data.houses) || [], oplanets); } catch (te) { debugValue("setupTooltip error", te); }
          try { output.classList.remove('hidden'); } catch(_){}
          if (treeWrapper) treeWrapper.classList.remove('hidden');
        });
      } catch (fe) {
        debugValue("fonts.load error", fe);
        try { drawTreeOfLife(data, ctx); } catch (de2) { debugValue("drawTreeOfLife error 2", de2); }
        try { setupTooltip(canvas, (houses_data && houses_data.houses) || [], oplanets); } catch (te2) { debugValue("setupTooltip error 2", te2); }
        try { output.classList.remove('hidden'); } catch(_){}
        if (treeWrapper) treeWrapper.classList.remove('hidden');
      }
    } catch (err) {
      const technical = (err && err.message) ? err.message : String(err);
      if (/failed to fetch/i.test(technical)) {
        const fallbackMsg = (currentTranslations && currentTranslations.errorUnavailable) ||
          "Servicio temporalmente no disponible. Intenta nuevamente.";
        output.innerHTML = "<p>" + fallbackMsg + "</p>";
      } else {
        output.innerHTML = "<p>" + t("unexpectedError", "Error inesperado") + ": " + technical + "</p>";
      }
      debugValue("🔬 Error en fetch", err);
    }
  });

  attemptIpBootstrap();
  setTimeout(attemptIpBootstrap, 800);
  revealApp();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM ya listo; inicializar de inmediato (para loader din谩mico)
  initApp();
  
  // re-render canvas when theme changes
  function rerenderCanvas() {
    try {
      if (!window.__lastCartaData) return;
      const canvas = document.getElementById('treeOfLifeCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      drawTreeOfLife(window.__lastCartaData, ctx);
      const planets = (window.__lastCartaData && window.__lastCartaData.planets) || {};
      const houses = (window.__lastCartaData && window.__lastCartaData.houses_data && window.__lastCartaData.houses_data.houses) || [];
      setupTooltip(canvas, houses, orderPlanets(planets));
    } catch (e) { debugValue("rerenderCanvas error", e); }
  }
try {
  const mo = new MutationObserver((mut) => {
    for (const m of mut) { if (m.attributeName === 'data-theme') { rerenderCanvas(); } }
  });
  mo.observe(document.documentElement, { attributes: true });
} catch(_) {}
try { const tb = document.getElementById('themeToggle'); if (tb) tb.addEventListener('click', () => setTimeout(rerenderCanvas, 0)); } catch(_) {}

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











