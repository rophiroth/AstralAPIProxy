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
    const treeScale = (typeof window !== 'undefined' && window.__TREE_SCALE) || 1;
    const coords = Object.values(sefirotCoords);
    const xs = coords.map(([x]) => x);
    const ys = coords.map(([, y]) => y);
    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);
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
    ctx.font = `${12 * treeScale}px sans-serif`;
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
      const zodiacEmoji = (typeof getZodiacEmoji==='function') ? getZodiacEmoji(sign) : (window.zodiacEmojis?.[sign]||'');
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
      ctx.fillText(zodiacEmoji, emojiCenter, signBaseline);

      ctx.textAlign = 'left';
      ctx.font = `${15 * scale}px sans-serif`;
      ctx.fillStyle = textColor;
      const degreeStart = emojiCenter + (emojiSize * 0.4) + 8 * scale;
      ctx.fillText(`${degree}\u00B0`, degreeStart, signBaseline);
      ctx.restore();
    }
  }
}
