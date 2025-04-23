<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carta Astral con Swiss Ephemeris</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #f9f9f9; }
    label { display: block; margin-top: 1rem; }
    input, button { padding: 0.5rem; margin-top: 0.3rem; width: 100%; max-width: 400px; }
    button { background: #5a2c83; color: white; border: none; cursor: pointer; margin-top: 1rem; }
    canvas { margin-top: 2rem; background: white; border: 1px solid #ccc; display: block; }
    #output, #coords { margin-top: 1rem; background: white; padding: 1rem; border: 1px solid #ccc; }
    #suggestions { border: 1px solid #ccc; background: white; max-width: 400px; position: absolute; z-index: 10; }
    #suggestions div { padding: 0.5rem; cursor: pointer; }
    #suggestions div:hover { background-color: #eee; }
  </style>
</head>
<body>
  <h1>Carta Astral con Swiss Ephemeris</h1>
  <form id="astroForm">
    <label>Fecha y hora de nacimiento:
      <input type="datetime-local" id="datetime" value="1986-10-13T01:00">
    </label>
    <label>Ubicación (Ciudad, País):
      <input type="text" id="location" autocomplete="off">
      <div id="suggestions"></div>
    </label>
    <div id="coords"></div>
    <button type="submit">Calcular Carta</button>
  </form>
  <div id="output"></div>
  <canvas id="treeOfLifeCanvas" width="400" height="700"></canvas>

  <script>
    let selectedLat = null;
    let selectedLon = null;

    const locationInput = document.getElementById("location");
    const suggestionsBox = document.getElementById("suggestions");
    const coordsDiv = document.getElementById("coords");

    locationInput.addEventListener("input", async () => {
      const query = locationInput.value.trim();
      if (query.length < 2) {
        suggestionsBox.innerHTML = "";
        return;
      }

      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json`);
      const places = await res.json();
      suggestionsBox.innerHTML = "";

      places.slice(0, 5).forEach(place => {
        const div = document.createElement("div");
        div.textContent = place.display_name;
        div.addEventListener("click", () => {
          locationInput.value = place.display_name;
          selectedLat = parseFloat(place.lat);
          selectedLon = parseFloat(place.lon);
          coordsDiv.innerHTML = `<strong>Lat:</strong> ${selectedLat} | <strong>Lon:</strong> ${selectedLon}`;
          suggestionsBox.innerHTML = "";
        });
        suggestionsBox.appendChild(div);
      });
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

      if (!selectedLat || !selectedLon) {
        output.innerHTML = `<p>Selecciona una ubicación válida desde las sugerencias.</p>`;
        return;
      }

      try {
        const response = await fetch("https://astralapiproxy.onrender.com/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ datetime, latitude: selectedLat, longitude: selectedLon })
        });
        const data = await response.json();

        if (data.error) {
          output.innerHTML = `<p>Error: ${data.error}</p>`;
          return;
        }

        const positions = data.positions;
        const enoch = data.enoch;

        output.innerHTML = `
          <h3>Planetas:</h3>
          <ul>
            ${Object.entries(positions).map(([name, deg]) => `<li>${name}: ${deg.toFixed(2)}°</li>`).join('')}
          </ul>
          <h3>Calendario de Enoj:</h3>
          ${enoch ? `<ul>
            <li><strong>Año:</strong> ${enoch.enoch_year}</li>
            <li><strong>Comienzo del año:</strong> ${enoch.enoch_start}</li>
            <li><strong>Día del año:</strong> ${enoch.enoch_day_of_year}</li>
            <li><strong>Mes:</strong> ${enoch.enoch_month}</li>
            <li><strong>Día:</strong> ${enoch.enoch_day}</li>
          </ul>` : '<p><em>No se recibió información del calendario de Enoj.</em></p>'}
        `;

        drawTreeOfLife(positions, ctx);

      } catch (err) {
        output.innerHTML = `<p>Error inesperado: ${err.message}</p>`;
      }
    });

    function drawTreeOfLife(planets, ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.font = "12px sans-serif";

      const sefirot = {
        "Yesod": "Moon",
        "Hod": "Mercury",
        "Netzach": "Venus",
        "Tiferet": "Sun",
        "Gevurah": "Mars",
        "Chesed": "Jupiter",
        "Binah": "Saturn",
        "Chokhmah": "Uranus",
        "Keter": "Neptune"
      };

      const coords = {
        "Yesod": [200, 600],
        "Hod": [100, 500],
        "Netzach": [300, 500],
        "Tiferet": [200, 400],
        "Gevurah": [100, 300],
        "Chesed": [300, 300],
        "Binah": [100, 200],
        "Chokhmah": [300, 200],
        "Keter": [200, 100]
      };

      for (const [sefirah, planet] of Object.entries(sefirot)) {
        const value = planets[planet];
        const [x, y] = coords[sefirah];
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, 2 * Math.PI);
        ctx.fillStyle = "lightblue";
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "black";
        ctx.fillText(`${sefirah}`, x - 20, y - 35);
        if (value !== undefined) ctx.fillText(`${planet}: ${value.toFixed(2)}°`, x - 30, y + 40);
      }
    }
  </script>
</body>
</html>
