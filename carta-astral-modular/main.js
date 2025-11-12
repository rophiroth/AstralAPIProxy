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

function initApp() {
  debugValue("馃寪 Main.js cargado");

  let selectedLat = null;
  let selectedLon = null;
  let debounceTimeout;

  const locationInput = document.getElementById("location");
  const suggestionsBox = document.getElementById("suggestions");
  const coordsDiv = document.getElementById("coords");

  window.addEventListener("load", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        selectedLat = pos.coords.latitude;
        selectedLon = pos.coords.longitude;
        locationInput.placeholder = "Lat: " + selectedLat.toFixed(4) + " | Lon: " + selectedLon.toFixed(4) + " (Detectado)";
        debugValue("Detected location", selectedLat, selectedLon);
      }, err => {
        locationInput.placeholder = "Escribe tu ciudad";
        debugValue("鈿狅笍 No se pudo detectar ubicaci贸n autom谩ticamente");
      });
    }
  });

  locationInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      const query = locationInput.value.trim();
      if (query.length < 2) {
        suggestionsBox.innerHTML = "";
        return;
      }

      const res = await fetch("https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(query) + "&format=json&addressdetails=1&limit=5&accept-language=es");
      const places = await res.json();
      suggestionsBox.innerHTML = "";

      places
        .filter(place => ["city", "town", "village", "administrative"].includes(place.type))
        .forEach(place => {
          const div = document.createElement("div");
          div.textContent = place.display_name;
          div.addEventListener("click", () => {
            locationInput.value = place.display_name;
            selectedLat = parseFloat(place.lat);
            selectedLon = parseFloat(place.lon);
            locationInput.placeholder = "Lat: " + selectedLat.toFixed(4) + " | Lon: " + selectedLon.toFixed(4);
            suggestionsBox.innerHTML = "";
            debugValue("Detected location", place.display_name, selectedLat, selectedLon);
          });
          suggestionsBox.appendChild(div);
        });
    }, 400);
  });

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
    output.classList.remove('hidden');
    output.innerHTML = "<p>Calculando carta…</p>";
    if (treeWrapper) treeWrapper.classList.add('hidden');

    debugValue("馃摛 Enviando datos", { datetime, selectedLat, selectedLon });

    if (!selectedLat || !selectedLon) {
      output.innerHTML = "<p>Selecciona una ubicación válida o permite el acceso a tu ubicación.</p>";
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
      debugValue("API target", API_URL);
	const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datetime,
          latitude: selectedLat,
          longitude: selectedLon,
          timezone: tz
        })
      });

      debugValue("Fetch status", response.status);
      const data = await response.json();
	  const { planets, enoch, houses_data } = data;          // 鈫? bloque nuevo
	  //const { ascendant, midheaven, houses } = houses_data;  // 鈫? lo que necesitaba el front
      //const { planets, ascendant, midheaven, houses, enoch } = data;
		oplanets = orderPlanets(planets); // 🔁 Ya no se reordena automáticamente
      debugValue("馃獝 Respuesta del backend", data);

      //const shemAstronomico = getShemAstronomico(planets.Sun.longitude);
      //const shemEnoch = getShemEnochiano(enoch.enoch_month, enoch.enoch_day, enoch.added_week);

	  // 1) Solo Enoj:
	  (typeof window.renderEnochInfo==="function"?renderEnochInfo(output, enoch, planets.Sun && planets.Sun.longitude):debugValue("renderEnochInfo missing"));

      // 2) Opcional: toda la data de planetas y casas
      //    comenta o descomenta esta línea según quieras listar:
      (typeof window.renderPlanetsAndHouses==="function"?renderPlanetsAndHouses(output, oplanets, houses_data):debugValue("renderPlanetsAndHouses missing"));

      // 2b) Resumen por elementos (planetas + ascendente) y mini IA
      (typeof window.renderElementSummary==="function"?renderElementSummary(output, oplanets, houses_data.ascendant):debugValue("renderElementSummary missing"));

      // 3) Dibuja en canvas

      document.fonts.load("20px 'StamHebrew'").then(() => {
		  drawTreeOfLife(data, ctx); // fuente ya lista
		});
		setupTooltip(canvas, houses_data.houses, oplanets);

      // Mostrar secciones una vez listo
      output.classList.remove('hidden');
      if (treeWrapper) treeWrapper.classList.remove('hidden');
    } catch (err) {
      output.innerHTML = "<p>Error inesperado: " + (err && err.message ? err.message : String(err)) + "</p>";
      debugValue("🔬 Error en fetch", err);
    }
  });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM ya listo; inicializar de inmediato (para loader din谩mico)
  initApp();
}




