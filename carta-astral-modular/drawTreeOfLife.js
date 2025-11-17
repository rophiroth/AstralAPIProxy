// drawTreeOfLife.js (sanitized)

function drawTreeOfLife(data, ctx) {
  try {
    // Clear first, then fill background (avoid wiping background afterward)
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const rs = getComputedStyle(document.documentElement);
    const bg = (rs.getPropertyValue('--card-bg') || '#171a21').trim();
    ctx.save();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    const styleScale = (typeof window !== 'undefined' && window.__TREE_SCALE) || 1;
    const dynamicFit = (typeof window !== 'undefined' && !!window.__TREE_DYNAMIC_FIT);
    let originalMaljut = null;
    let maljutShiftValue = 0;
    if (dynamicFit) {
      try {
        maljutShiftValue = (typeof window !== 'undefined' && window.__TREE_MALJUT_SHIFT) || 0;
        if (maljutShiftValue && sefirotCoords && Array.isArray(sefirotCoords.Maljut)) {
          originalMaljut = sefirotCoords.Maljut.slice();
          sefirotCoords.Maljut = [originalMaljut[0], originalMaljut[1] - maljutShiftValue];
        }
      } catch (_){}
    }
    const coords = Object.values(sefirotCoords);
    const xs = coords.map(([x]) => x);
    const ys = coords.map(([, y]) => y);
    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);
    if (dynamicFit) {
      const marginFactor = (typeof window !== 'undefined' && window.__TREE_MARGIN_FACTOR) || 1;
      const marginXBase = (typeof window !== 'undefined' && window.__TREE_MARGIN_X) || 28;
      const marginTopBase = (typeof window !== 'undefined' && window.__TREE_MARGIN_TOP) || 82;
      const marginBottomBase = (typeof window !== 'undefined' && window.__TREE_MARGIN_BOTTOM) || 12;
      const horizontalMarginMin = Math.max(26, ctx.canvas.width * 0.03);
      const verticalMarginMin = Math.max(42, ctx.canvas.height * 0.045);
      const marginX = Math.max(marginXBase * marginFactor, horizontalMarginMin);
      const marginTop = Math.max(marginTopBase * marginFactor, verticalMarginMin);
      const marginBottom = Math.max(marginBottomBase * marginFactor, verticalMarginMin);
      const width = Math.max(1, maxX - minX);
      const height = Math.max(1, maxY - minY);
      const availableWidth = Math.max(20, ctx.canvas.width - 2 * marginX);
      const availableHeight = Math.max(20, ctx.canvas.height - marginTop - marginBottom);
      const baseScale = Math.min(availableWidth / width, availableHeight / height);
      const drawScale = baseScale;
      const scaledWidth = width * drawScale;
      const scaledHeight = height * drawScale;
      const verticalNudge = (typeof window !== 'undefined' && window.__TREE_VERTICAL_NUDGE) || 0;
      const offsetX = marginX + Math.max(0, (availableWidth - scaledWidth) / 2);
      const offsetY = Math.max(marginTop, marginTop + Math.max(0, (availableHeight - scaledHeight) / 2) - verticalNudge);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(drawScale, drawScale);
      ctx.translate(-minX, -minY);
    } else {
      const treeScale = styleScale;
      const marginX = 28 * treeScale;
      const marginTop = 82 * treeScale;
      const marginBottom = 12 * treeScale;
      const offsetX = marginX + (ctx.canvas.width - 2 * marginX - (maxX - minX)) / 2 - minX;
      let offsetY = marginTop - minY;
      const maxAllowedY = ctx.canvas.height - marginBottom;
      const maxAfterOffset = maxY + offsetY;
      if (maxAfterOffset > maxAllowedY) {
        offsetY -= (maxAfterOffset - maxAllowedY);
      }
      ctx.save();
      ctx.translate(offsetX, offsetY);
    }
    ctx.font = `${12 * styleScale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const { planets, houses_data } = data;
    const { ascendant, midheaven, houses } = houses_data;
    const sefirotPlanets = {
      Yesod:    'Moon',
      Hod:      'Mercury',
      Netzach:  'Venus',
      Tiferet:  'Sun',
      Gevurah:  'Mars',
      Chesed:   'Jupiter',
      Binah:    'Saturn',
      Chokhmah: 'Uranus',
      Keter:    'Neptune',
      // Maljut: 'Pluto' // excluded
    };

    drawHousesLines(houses, ctx);
    drawSefirot(ctx, sefirotPlanets, planets);
    drawAscMc(ascendant, midheaven, ctx);
    drawHousesWithIcons(houses, ctx);

    ctx.restore();
    if (originalMaljut) {
      try {
        sefirotCoords.Maljut = originalMaljut;
      } catch (_){ }
    }
  } catch (err) {
    console.error('[drawTree] error', err);
  }
}

try {
  window.drawTreeOfLife = drawTreeOfLife;
} catch (_){}

const SIGN_COLORS = (typeof window !== 'undefined' && window.SIGN_COLORS) || {
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
try {
  if (typeof window !== 'undefined') {
    window.SIGN_COLORS = window.SIGN_COLORS || SIGN_COLORS;
  }
} catch(_){}
const FALLBACK_SIGN_GLYPHS = {
  Aries:'\u2648\uFE0E', Taurus:'\u2649\uFE0E', Gemini:'\u264A\uFE0E', Cancer:'\u264B\uFE0E',
  Leo:'\u264C\uFE0E', Virgo:'\u264D\uFE0E', Libra:'\u264E\uFE0E', Scorpio:'\u264F\uFE0E',
  Sagittarius:'\u2650\uFE0E', Capricorn:'\u2651\uFE0E', Aquarius:'\u2652\uFE0E', Pisces:'\u2653\uFE0E'
};
function getTreeSignGlyph(sign) {
  try {
    const map = (typeof window !== 'undefined' && window.SIGN_SYMBOL) || FALLBACK_SIGN_GLYPHS;
    return (map && map[sign]) || FALLBACK_SIGN_GLYPHS[sign] || sign.slice(0,2);
  } catch (_){
    return FALLBACK_SIGN_GLYPHS[sign] || sign.slice(0,2);
  }
}
const PLANET_COLORS = {
  Sun: '#4dd0e1',
  Moon: '#ff9e40',
  Mercury: '#ffe066',
  Venus: '#a5d6a7',
  Mars: '#42a5f5',
  Jupiter: '#7e57c2',
  Saturn: '#ab47bc',
  Uranus: '#ec407a',
  Neptune: '#f48fb1',
  Pluto: '#cfd8dc',
  Ascendant: '#b388ff',
  Midheaven: '#ef5350'
};

function drawSefirot(ctx, sefirotPlanets, planets) {
  const rootStyles = getComputedStyle(document.documentElement);
  const textColor = (rootStyles.getPropertyValue('--text') || '#111').trim();
  const nodeBg    = (rootStyles.getPropertyValue('--card-bg') || '#fff').trim();
  const borderCol = (rootStyles.getPropertyValue('--border') || '#ccc').trim();
  const scale = (typeof window !== 'undefined' && window.__TREE_SCALE) || 1;
  const radius = 52 * scale;
  const translateSefira = (name) => {
    try {
      const dict = window.__chartTranslations && window.__chartTranslations.sefirotNames;
      return (dict && dict[name]) || name;
    } catch (_) {
      return name;
    }
  };
  for (const [sefira, [x, y]] of Object.entries(sefirotCoords)) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = nodeBg;
    ctx.fill();
    ctx.strokeStyle = borderCol; ctx.lineWidth = 1.5; ctx.stroke();

    // Label
    ctx.fillStyle = textColor;
    ctx.font = `${15 * scale}px sans-serif`;
    const labelYOffset = radius + (sefira === 'Keter' ? 10 : 14) * scale;
    const labelY = y - labelYOffset;
    ctx.fillText(translateSefira(sefira), x, labelY);

    const planetName = sefirotPlanets[sefira];
    const planet = planets?.[planetName];

    if (planet && typeof planet.longitude === 'number') {
      const degree = decimals((planet.longitude % 30), 2);
      const sign = getZodiacSign(planet.longitude);
      const zodiacGlyph = getTreeSignGlyph(sign);
      const planetEmoji = (typeof getPlanetEmoji==='function') ? getPlanetEmoji(planetName) : (window.planetEmojis?.[planetName]||'');
      const signColor = SIGN_COLORS[sign] || textColor;

      // Planet icon
      ctx.save();
      ctx.font = `${26 * scale}px 'Segoe UI Symbol', 'Noto Sans Symbols', 'Arial Unicode MS'`;
      ctx.fillStyle = PLANET_COLORS[planetName] || textColor;
      ctx.fillText(planetEmoji, x, y - 16 * scale);

      // Sign icon and degree inline
      const signBaseline = y + 12 * scale;
      const emojiSize = 30 * scale;
      const emojiCenter = x - 18 * scale;
      ctx.font = `${emojiSize}px 'Segoe UI Symbol', 'Noto Sans Symbols', 'Arial Unicode MS'`;
      ctx.textAlign = 'center';
      ctx.fillStyle = signColor;
      ctx.fillText(zodiacGlyph, emojiCenter, signBaseline);

      ctx.textAlign = 'left';
      ctx.font = `${15 * scale}px sans-serif`;
      ctx.fillStyle = textColor;
      const degreeStart = emojiCenter + (emojiSize * 0.4) + 8 * scale;
      ctx.fillText(`${degree}\u00B0`, degreeStart, signBaseline);
      ctx.restore();
    }
  }
}
