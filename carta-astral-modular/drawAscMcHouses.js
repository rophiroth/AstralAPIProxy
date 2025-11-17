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

const fallbackSignGlyphs = {
  Aries:'\u2648', Taurus:'\u2649', Gemini:'\u264A', Cancer:'\u264B',
  Leo:'\u264C', Virgo:'\u264D', Libra:'\u264E', Scorpio:'\u264F',
  Sagittarius:'\u2650', Capricorn:'\u2651', Aquarius:'\u2652', Pisces:'\u2653'
};
const ASC_FALLBACK_SIGN_COLORS = {
  Aries: '#ff4d4f',
  Taurus: '#ff9c2f',
  Gemini: '#ffe34d',
  Cancer: '#2dd5c4',
  Leo: '#ff6ec7',
  Virgo: '#7dde5b',
  Libra: '#5b9fff',
  Scorpio: '#9a6bff',
  Sagittarius: '#ff8f3f',
  Capricorn: '#c28f62',
  Aquarius: '#3dd4ff',
  Pisces: '#8c93ff'
};
const getSignGlyphLocal = (sign) => {
  try {
    if (typeof window.getSignGlyph === 'function') return window.getSignGlyph(sign);
  } catch (_){}
  return fallbackSignGlyphs[sign] || (window.zodiacEmojis?.[sign] || sign.slice(0,2));
};
function getSignColor(sign) {
  if (!sign) return '#fff';
  try {
    const palette = (typeof window !== 'undefined' && window.SIGN_COLORS) || ASC_FALLBACK_SIGN_COLORS;
    return (palette && palette[sign]) || ASC_FALLBACK_SIGN_COLORS[sign] || '#fff';
  } catch (_){
    return ASC_FALLBACK_SIGN_COLORS[sign] || '#fff';
  }
}

function chartLabel(key, fallback) {
  try {
    if (typeof window.getChartTranslation === 'function') {
      return window.getChartTranslation(key, fallback);
    }
  } catch (_){}
  return fallback || key;
}

function drawAscMc(ascendant, midheaven, ctx) {
  const tiferet = sefirotCoords['Tiferet'];
  const maljut  = sefirotCoords['Maljut'];
  const rootStyles = getComputedStyle(document.documentElement);
  const textColor = (rootStyles.getPropertyValue('--text') || '#111').trim();
  const scale = (typeof window !== 'undefined' && window.__TREE_SCALE) || 1;
  const ascLabel = chartLabel('ascLabel', 'ASC');
  const descLabel = chartLabel('descLabel', 'DESC');
  const mcLabel = chartLabel('mcLabel', 'MC');
  const emojiFont = `${28 * scale}px 'Segoe UI Symbol', 'Noto Sans Symbols', 'Arial Unicode MS'`;

  const ascY  = tiferet[1] - 90 * scale;
  const descY = tiferet[1] + 80 * scale;

  function drawAxis(label, signName, degree, baseX, baseY, opts) {
    const glyph = getSignGlyphLocal(signName);
    const signColor = getSignColor(signName) || textColor;
    const degreeText = `${degree}\u00B0`;
    const center = opts && opts.center;
    ctx.save();
    ctx.textBaseline = 'middle';
    if (center) {
      ctx.textAlign = 'center';
      ctx.font = `bold ${15 * scale}px sans-serif`;
      ctx.fillStyle = textColor;
      ctx.fillText(`${label}:`, baseX, baseY - 18 * scale);
      const lineY = baseY - 10 * scale;
      const degreeTextCenter = `${degree}\u00B0`;
      ctx.font = emojiFont;
      const glyphWidth = ctx.measureText(glyph).width || (18 * scale);
      ctx.font = `bold ${15 * scale}px sans-serif`;
      const degreeWidth = ctx.measureText(degreeTextCenter).width;
      const gap = 12 * scale;
      const total = glyphWidth + gap + degreeWidth;
      const start = baseX - total / 2;

      ctx.font = emojiFont;
      ctx.textAlign = 'left';
      ctx.fillStyle = signColor;
      ctx.fillText(glyph, start, lineY);

      ctx.font = `bold ${15 * scale}px sans-serif`;
      ctx.fillStyle = textColor;
      ctx.fillText(degreeTextCenter, start + glyphWidth + gap, lineY);
    } else {
      ctx.textAlign = 'left';
      ctx.font = `bold ${15 * scale}px sans-serif`;
      ctx.fillStyle = textColor;
      const labelText = `${label}: `;
      ctx.fillText(labelText, baseX, baseY);
      let cursor = baseX + ctx.measureText(labelText).width;
      ctx.font = emojiFont;
      const glyphWidth = ctx.measureText(glyph).width || (18 * scale);
      ctx.fillStyle = signColor;
      ctx.fillText(glyph, cursor, baseY + 2 * scale);
      cursor += glyphWidth + 8 * scale;
      ctx.font = `bold ${15 * scale}px sans-serif`;
      ctx.fillStyle = textColor;
      ctx.fillText(`${degree}\u00B0`, cursor, baseY);
    }
    ctx.restore();
  }

  const baseX = tiferet[0] - 70 * scale;
  drawAxis(ascLabel, ascendant.sign, decimals(ascendant.position, 2), baseX, ascY);

  const descDegree = (ascendant.degree + 180) % 360;
  drawAxis(descLabel, getZodiacSign(descDegree), decimals((descDegree % 30), 2), baseX, descY);

  drawAxis(mcLabel, midheaven.sign, decimals(midheaven.position, 1), maljut[0], maljut[1] - 2 * scale, { center: true });
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
  const scale = (typeof window !== 'undefined' && window.__TREE_SCALE) || 1;
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
    const pillBg = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.08)';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${14 * scale}px sans-serif`;
    ctx.fillStyle = textColor;

    const glyph = getSignGlyphLocal(h.sign);
    const signColor = getSignColor(h.sign);
    const letter = (window.hebrewHouseLetters && window.hebrewHouseLetters[h.house]) || '';
    const pos = decimals(h.position,2);
    const degreeText = `${pos}\u00B0`;

    // Line 1: house number + letter
    const houseLabel = `#${h.house}`;
    ctx.font = `${14 * scale}px sans-serif`;
    const labelWidth = ctx.measureText(houseLabel).width;
    ctx.fillText(houseLabel, x - 18, y - 16 * scale);
    if (letter) {
      ctx.font = `${18 * scale}px 'StamHebrew', sans-serif`;
      ctx.fillText(letter, x - 18 + labelWidth + 8, y - 16 * scale);
      ctx.font = `${14 * scale}px sans-serif`;
    }

    // Line 2: sign + degree with pill background for contrast
    const emojiFont = `${22 * scale}px 'Segoe UI Symbol', 'Noto Sans Symbols', 'Arial Unicode MS'`;
    ctx.font = emojiFont;
    const glyphWidth = ctx.measureText(glyph).width || (16 * scale);
    const degreeFont = `${14 * scale}px sans-serif`;
    ctx.font = degreeFont;
    const degreeWidth = ctx.measureText(degreeText).width;
    const paddingX = 10 * scale;
    const contentWidth = glyphWidth + degreeWidth + paddingX * 3;
    const hgt = 22 * scale;
    const rx = x - contentWidth / 2;
    const ry = y + 10 * scale - hgt / 2;
    const r = 6 * scale;
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + contentWidth - r, ry);
    ctx.quadraticCurveTo(rx + contentWidth, ry, rx + contentWidth, ry + r);
    ctx.lineTo(rx + contentWidth, ry + hgt - r);
    ctx.quadraticCurveTo(rx + contentWidth, ry + hgt, rx + contentWidth - r, ry + hgt);
    ctx.lineTo(rx + r, ry + hgt);
    ctx.quadraticCurveTo(rx, ry + hgt, rx, ry + hgt - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
    ctx.fillStyle = pillBg;
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    const textBaseline = y + 10 * scale + 1 * scale;
    ctx.textAlign = 'left';
    ctx.font = emojiFont;
    ctx.fillStyle = signColor;
    ctx.fillText(glyph, rx + paddingX, textBaseline);
    ctx.font = degreeFont;
    ctx.fillStyle = textColor;
    const degreeX = rx + paddingX + glyphWidth + paddingX * 0.8;
    ctx.fillText(degreeText, degreeX, textBaseline);
    ctx.textAlign = 'center';

    ctx.restore();
  });
}

window.drawAscMc = drawAscMc;
// drawHousesLines and drawHousesWithIcons are referenced by drawTreeOfLife
