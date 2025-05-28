
// mapPlanetsToSefirot.js

function mapPlanetsToSefirot(planets) {
  const mapping = {
    "Keter": "Neptune",
    "Chokhmah": "Uranus",
    "Binah": "Saturn",
    "Chesed": "Jupiter",
    "Gevurah": "Mars",
    "Tiferet": "Sun",
    "Netzach": "Venus",
    "Hod": "Mercury",
    "Yesod": "Moon"
  };

  const result = {};
  for (const [sefirah, planetName] of Object.entries(mapping)) {
    if (planets[planetName]) {
      result[sefirah] = planetName;
    }
  }
  return result;
}

window.mapPlanetsToSefirot = mapPlanetsToSefirot;
