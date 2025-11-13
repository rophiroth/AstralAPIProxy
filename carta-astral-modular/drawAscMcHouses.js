// drawAscMcHouses.js (sanitized)

// House path mapping (start->end sefirot)
const housePaths = {
  1:  ['Keter','Chokhmah'],
  2:  ['Keter','Binah'],
  3:  ['Chokhmah','Gevurah'],
  4:  ['Chesed','Tiferet'],
  5:  ['Chokhmah','Tiferet'],
  6:  ['Tiferet','Netzach'],
  7:  ['Hod','Yesod'],
  8:  ['Netzach','Yesod'],
  9:  ['Tiferet','Hod'],
  10: ['Binah','Tiferet'],
  11: ['Gevurah','Tiferet'],
  12: ['Binah','Chesed']
};

function drawAscMc(ascendant, midheaven, ctx) {
  const tiferet = sefirotCoords['Tiferet'];
  const maljut  = sefirotCoords['Maljut'];
  const rootStyles = getComputedStyle(document.documentElement);
  const textColor = (rootStyles.getPropertyValue('--text') || '#111').trim();

  const ascY  = tiferet[1] - 100;
  const descY = tiferet[1] + 63;

  // ASC
  ctx.beginPath();
  ctx.fillStyle = 'lightgreen';
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText(`ASC: ${(window.zodiacEmojis?.[ascendant.sign]||'')} ${decimals(ascendant.position,2)}\u00B0`, tiferet[0], ascY);
  ctx.restore();

  // DESC opposite
  ctx.beginPath();
  ctx.fillStyle = 'lightblue';
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = textColor;
  const descDegree = (ascendant.degree + 180) % 360;
  ctx.fillText(`DESC: ${(window.zodiacEmojis?.[getZodiacSign(descDegree)]||'')} ${decimals((descDegree%30),2)}\u00B0`, tiferet[0], descY);
  ctx.restore();

  // MC at Maljut
  ctx.beginPath();
  ctx.fillStyle = 'lightcoral';
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText(`MC:${(window.zodiacEmojis?.[midheaven.sign]||'')}${decimals(midheaven.position,1)}\u00B0`, maljut[0], maljut[1]);
  ctx.restore();
}

function drawHousesLines(houses, ctx) {
  if (!Array.isArray(houses)) return;
  const rs = getComputedStyle(document.documentElement);
  const muted = (rs.getPropertyValue('--muted') || '#9aa4b2').trim();
  houses.forEach(h => {
    const path = housePaths[h.house];
    if (!path) return;
    const [start, end] = path;
    const [x1, y1] = sefirotCoords[start];
    const [x2, y2] = sefirotCoords[end];

    const tX = (h.house === 3 || h.house === 12) ? 0.6 : 0.5;
    const x  = x1 + (x2 - x1) * tX; // not used here but kept for ref
    const y  = y1 + (y2 - y1) * 0.5;

    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = muted;
    ctx.lineWidth   = 2.2;
    ctx.stroke();
  });
}

function drawHousesWithIcons(houses, ctx) {
  if (!Array.isArray(houses)) return;
  houses.forEach(h => {
    if (!h || !h.house || !h.sign) return;

    const path = housePaths[h.house];
    if (!path) return;
    const [start, end] = path;
    const [x1, y1] = sefirotCoords[start];
    const [x2, y2] = sefirotCoords[end];
    let t = 0.5, ty = 0.5;
    if (h.house === 3 || h.house === 12) { t = 0.3; ty = 0.3; }

    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * ty;

    const rs = getComputedStyle(document.documentElement);
    const textColor = (rs.getPropertyValue('--text') || '#111').trim();
    const isDark = (document.documentElement.getAttribute('data-theme')||'').toLowerCase()==='dark';
    const pillBg = isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.75)';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = textColor;

    const emoji = (typeof getZodiacEmoji==='function') ? getZodiacEmoji(h.sign) : (window.zodiacEmojis?.[h.sign]||'');
    const letter = (window.hebrewHouseLetters && window.hebrewHouseLetters[h.house]) || '';
    const pos = decimals(h.position,2);

    // Line 1: house number + letter
    const houseLabel = `#${h.house}`;
    ctx.font = '14px sans-serif';
    const labelWidth = ctx.measureText(houseLabel).width;
    ctx.fillText(houseLabel, x - 18, y - 16);
    if (letter) {
      ctx.font = "18px 'StamHebrew', sans-serif";
      ctx.fillText(letter, x - 18 + labelWidth + 8, y - 16);
      ctx.font = '14px sans-serif';
    }

    // Line 2: sign + degree with pill background for contrast
    const label = `${emoji}${pos}\u00B0`;
    ctx.font = '14px sans-serif';
    const w = ctx.measureText(label).width + 10;
    const hgt = 18;
    const rx = x - w/2, ry = y + 10 - hgt/2, r = 6;
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + w - r, ry);
    ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + r);
    ctx.lineTo(rx + w, ry + hgt - r);
    ctx.quadraticCurveTo(rx + w, ry + hgt, rx + w - r, ry + hgt);
    ctx.lineTo(rx + r, ry + hgt);
    ctx.quadraticCurveTo(rx, ry + hgt, rx, ry + hgt - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
    ctx.fillStyle = pillBg;
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.fillText(label, x, y + 10);

    ctx.restore();
  });
}

window.drawAscMc = drawAscMc;
// drawHousesLines and drawHousesWithIcons are referenced by drawTreeOfLife
