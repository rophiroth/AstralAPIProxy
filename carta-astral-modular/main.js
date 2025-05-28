// main.js

window.addEventListener("DOMContentLoaded", () => {
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
        coordsDiv.innerHTML = "<strong>Lat:</strong> " + selectedLat.toFixed(4) + " | <strong>Lon:</strong> " + selectedLon.toFixed(4) + " (Detected location)";
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
            coordsDiv.innerHTML = "<strong>Lat:</strong> " + selectedLat + " | <strong>Lon:</strong> " + selectedLon;
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

    debugValue("馃摛 Enviando datos", { datetime, selectedLat, selectedLon });

    if (!selectedLat || !selectedLon) {
      output.innerHTML = "<p>Selecciona una ubicación válida o permite el acceso a tu ubicación.</p>";
      return;
    }
	const tz = await getTimezoneFromCoords(selectedLat,selectedLon);
    try {
//      const response = await fetch("http://127.0.0.1:5000/calculate", {
	const response = await fetch("http://192.168.1.83:5000/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datetime,
          latitude: selectedLat,
          longitude: selectedLon,
          timezone: tz
        })
      });

      const data = await response.json();
	  const { planets, enoch, houses_data } = data;          // 鈫? bloque nuevo
	  //const { ascendant, midheaven, houses } = houses_data;  // 鈫? lo que necesitaba el front
      //const { planets, ascendant, midheaven, houses, enoch } = data;
		oplanets = orderPlanets(planets); // 🔁 Ya no se reordena automáticamente
      debugValue("馃獝 Respuesta del backend", data);

      //const shemAstronomico = getShemAstronomico(planets.Sun.longitude);
      //const shemEnoch = getShemEnochiano(enoch.enoch_month, enoch.enoch_day, enoch.added_week);

	  // 1) Solo Enoj:
	  renderEnochInfo(output, enoch,planets.Sun.longitude);

      // 2) Opcional: toda la data de planetas y casas
      //    comenta o descomenta esta línea según quieras listar:
      renderPlanetsAndHouses(output, oplanets, houses_data);

      // 3) Dibuja en canvas

      document.fonts.load("20px 'StamHebrew'").then(() => {
		  drawTreeOfLife(data, ctx); // fuente ya lista
		});
		setupTooltip(canvas, houses_data.houses, oplanets);
    } catch (err) {
      output.innerHTML = "<p>Error inesperado: " + err.message + "</p>";
      debugValue("馃挜 Error en fetch", err);
    }
  });
});
