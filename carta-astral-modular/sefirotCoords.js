// sefirotCoords.js
const X_CENTER = 300;   // mitad de 900px
const X_OFFSET = 220;   // separación horizontal desde el centro

const sefirotCoords = {
  "Keter":    [X_CENTER,               70],
  "Chokhmah": [X_CENTER + X_OFFSET,   150],
  "Binah":    [X_CENTER - X_OFFSET,   150],
  "Chesed":   [X_CENTER + X_OFFSET,   280],
  "Gevurah":  [X_CENTER - X_OFFSET,   280],
  "Tiferet":  [X_CENTER,               390],
  "Netzach":  [X_CENTER + X_OFFSET,   420],
  "Hod":      [X_CENTER - X_OFFSET,   420],
  "Yesod":    [X_CENTER,               530],
  "Maljut":   [X_CENTER,               630]
};

function getHouseCoords(houses) {
  const coords = [];

  houses.forEach(h => {
    const path = housePaths[h.house];
    if (!path) return;

    const [start, end] = path;
    const [x1, y1] = sefirotCoords[start];
    const [x2, y2] = sefirotCoords[end];

    const tX = (h.house === 3 || h.house === 12) ? 0.3 : 0.5;
    const x  = x1 + (x2 - x1) * tX;
    const y  = y1 + (y2 - y1) * 0.5;

    coords[h.house] = { x, y };
  });

  return coords;
}

// Hazla disponible globalmente si se necesita
window.getHouseCoords = getHouseCoords;

