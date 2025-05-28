
function getPlanetsByHouse(planets, houses) {
  const planetsByHouse = {};
	houses = Object.values(houses);
  for (const [planetName, planetData] of Object.entries(planets)) {
    const planetDegree = planetData.longitude;
	/* debugValue("getPlanetsByHouse1", {planetDegree, planetName , houses }); 
	debugValue("HOUSES DEBUG", {
  type: typeof houses,
  isArray: Array.isArray(houses),
  length: Array.isArray(houses) ? houses.length : "⚠️ Not array",
  preview: houses
}); */
    for (let i = 0; i < houses.length; i++) {
      const house = houses[i];
      const nextHouse = houses[(i + 1) % 12];

      const startDeg = house.degree;
      const endDeg = nextHouse.degree < startDeg
        ? nextHouse.degree + 360
        : nextHouse.degree;

      const adjustedDeg = planetDegree < startDeg ? planetDegree + 360 : planetDegree;
		//debugValue("getPlanetsByHouse2", {adjustedDeg, startDeg, adjustedDeg, endDeg, i}); 
      if (adjustedDeg >= startDeg && adjustedDeg < endDeg) {
        const houseNum = house.house;
        if (!planetsByHouse[houseNum]) planetsByHouse[houseNum] = [];
        planetsByHouse[houseNum].push({ name: planetName, ...planetData });
        //break;
      }
    }
  }

  return planetsByHouse;
}
// utils.js o en un archivo compartido
window.decimals = function(value, digits = 2) {
  const factor = Math.pow(10, digits);
  return Math.floor(value * factor) / factor;
};



function getZodiacSign(degree) {
  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  return signs[Math.floor(degree / 30) % 12];
}

function orderPlanets(planets) {
  const preferredOrder = [
    "Sun", "Moon", "Mercury", "Venus", "Mars",
    "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
  ];

  const ordered = {};
  for (const name of preferredOrder) {
    if (planets[name]) {
      ordered[name] = planets[name];
    }
  }
  return ordered;
}

async function getTimezoneFromCoords(lat, lon) {
  const username = "universidadholistica"; // ⚠️ Usa tu propio usuario desde geonames.org
  const url = `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lon}&username=${username}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Error al consultar GeoNames");

    const data = await response.json();
    if (data.timezoneId) {
      console.log("🕐 Zona horaria detectada:", data.timezoneId);
      return data.timezoneId;
    } else {
      throw new Error("No se pudo obtener zona horaria");
    }
  } catch (err) {
    console.error("❌ Error obteniendo timezone:", err.message);
    return "UTC"; // Fallback si falla
  }
}
