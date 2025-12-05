// sefirotCoords.js
const BASE_CENTER = 400;
const BASE_OFFSET = 250;

function computeTreeScale() {
  if (typeof window === 'undefined') return 1;
  const width = window.innerWidth || document.documentElement.clientWidth || 1200;
  if (width >= 1800) return 1.08;
  if (width >= 1500) return 1.04;
  if (width >= 1200) return 1.0;
  if (width >= 900) return 1.08;
  if (width >= 720) return 1.16;
  if (width >= 620) return 1.22;
  if (width >= 520) return 1.28;
  if (width >= 440) return 1.32;
  if (width >= 380) return 1.36;
  return 1.38;
}

const TREE_SCALE = computeTreeScale();
try { window.__TREE_SCALE = TREE_SCALE; } catch (_){}

const baseCoords = {
  "Keter":    [BASE_CENTER,               225],
  "Chokhmah": [BASE_CENTER + BASE_OFFSET, 275],
  "Binah":    [BASE_CENTER - BASE_OFFSET, 275],
  "Chesed":   [BASE_CENTER + BASE_OFFSET, 412],
  "Gevurah":  [BASE_CENTER - BASE_OFFSET, 412],
  "Tiferet":  [BASE_CENTER,               475],
  "Netzach":  [BASE_CENTER + BASE_OFFSET, 545],
  "Hod":      [BASE_CENTER - BASE_OFFSET, 545],
  "Yesod":    [BASE_CENTER,               645],
  "Maljut":   [BASE_CENTER,               785]
};

const scalePoint = ([x, y]) => [x * TREE_SCALE, y * TREE_SCALE];
const sefirotCoords = Object.fromEntries(
  Object.entries(baseCoords).map(([key, coord]) => [key, scalePoint(coord)])
);

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
