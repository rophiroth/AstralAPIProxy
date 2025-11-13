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
    ctx.save();
    ctx.font = '12px sans-serif';
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

function drawSefirot(ctx, sefirotPlanets, planets) {
  const rootStyles = getComputedStyle(document.documentElement);
  const textColor = (rootStyles.getPropertyValue('--text') || '#111').trim();
  const nodeBg    = (rootStyles.getPropertyValue('--card-bg') || '#fff').trim();
  const borderCol = (rootStyles.getPropertyValue('--border') || '#ccc').trim();
  for (const [sefira, [x, y]] of Object.entries(sefirotCoords)) {
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, 2 * Math.PI);
    ctx.fillStyle = nodeBg;
    ctx.fill();
    ctx.strokeStyle = borderCol; ctx.lineWidth = 1.5; ctx.stroke();

    // Label
    ctx.font = '13px sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText(sefira, x, y - 50);

    const planetName = sefirotPlanets[sefira];
    const planet = planets?.[planetName];

    if (planet && typeof planet.longitude === 'number') {
      const degree = decimals((planet.longitude % 30), 2);
      const sign = getZodiacSign(planet.longitude);
      const zodiacEmoji = (typeof getZodiacEmoji==='function') ? getZodiacEmoji(sign) : (window.zodiacEmojis?.[sign]||'');
      const planetEmoji = (typeof getPlanetEmoji==='function') ? getPlanetEmoji(planetName) : (window.planetEmojis?.[planetName]||'');

      // Planet icon
      ctx.font = "20px 'Segoe UI Symbol', 'Noto Sans Symbols', 'Arial Unicode MS'";
      ctx.fillText(planetEmoji, x, y - 10);

      // Sign + degree
      ctx.font = '13px sans-serif';
      ctx.fillText(`${zodiacEmoji}${degree}\u00B0`, x, y + 12);
    }
  }
}
