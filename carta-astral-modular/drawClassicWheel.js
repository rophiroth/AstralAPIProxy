(function() {
  const zodiacOrder = [
    { key: 'Aries', glyph: '♈' },
    { key: 'Taurus', glyph: '♉' },
    { key: 'Gemini', glyph: '♊' },
    { key: 'Cancer', glyph: '♋' },
    { key: 'Leo', glyph: '♌' },
    { key: 'Virgo', glyph: '♍' },
    { key: 'Libra', glyph: '♎' },
    { key: 'Scorpio', glyph: '♏' },
    { key: 'Sagittarius', glyph: '♐' },
    { key: 'Capricorn', glyph: '♑' },
    { key: 'Aquarius', glyph: '♒' },
    { key: 'Pisces', glyph: '♓' }
  ];

  const aspectColors = {
    conjunction: '#ffd54f',
    sextile: '#64b5f6',
    square: '#ff8a65',
    trine: '#81c784',
    opposition: '#ef5350'
  };

  const planetColors = {
    Midheaven: '#c62828',     // Maljut / Tierra (MC axis ref)
    Moon: '#ff9e40',          // Yesod tones (orange)
    Mercury: '#ffe066',       // Hod (yellow)
    Venus: '#a5d6a7',         // Netzach (light green)
    Sun: '#4dd0e1',           // Tiferet (cyan)
    Mars: '#42a5f5',          // Gevurah (blue)
    Jupiter: '#7e57c2',       // Chesed (indigo)
    Saturn: '#ab47bc',        // Binah (violet)
    Uranus: '#ec407a',        // Chokhmah (magenta)
    Neptune: '#f48fb1',       // Keter (rose)
    Pluto: '#cfd8dc'
  };

  const axisColors = {
    asc: '#b388ff',  // Ascendente (púrpura)
    mc: '#c62828'
  };

  let rotationDeg = 0;
  function setRotation(deg) {
    rotationDeg = typeof deg === 'number' ? deg : 0;
  }

  function toRadians(deg) {
    // Rotate so Ascendant sits at 9 o'clock and progression runs counterclockwise.
    const adjusted = normalizeDeg(deg - rotationDeg);
    return ((adjusted + 180) * Math.PI) / 180;
  }

  function normalizeDeg(deg) {
    let d = deg % 360;
    if (d < 0) d += 360;
    return d;
  }

  function drawSignRing(ctx, centerX, centerY, radiusOuter, radiusInner) {
    ctx.save();
    for (let i = 0; i < 12; i++) {
      const startDeg = i * 30;
      const endDeg = (i + 1) * 30;
      const start = toRadians(startDeg);
      const end = toRadians(endDeg);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radiusOuter, start, end, false);
      ctx.arc(centerX, centerY, radiusInner, end, start, true);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.08)';
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSextantDividers(ctx, cx, cy, radiusOuter, radiusInner) {
    ctx.save();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = 'rgba(132,87,207,0.45)';
    for (let deg = 0; deg < 360; deg += 60) {
      const angle = toRadians(deg);
      const x1 = cx + Math.cos(angle) * radiusInner;
      const y1 = cy + Math.sin(angle) * radiusInner;
      const x2 = cx + Math.cos(angle) * radiusOuter;
      const y2 = cy + Math.sin(angle) * radiusOuter;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSignSeparators(ctx, cx, cy, radius) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 12; i++) {
      const angle = toRadians(i * 30);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawDegreeTicks(ctx, cx, cy, radiusOuter, radiusInner) {
    ctx.save();
    const color = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#fff';
    ctx.strokeStyle = color;
    for (let deg = 0; deg < 360; deg += 1) {
      const angle = toRadians(deg);
      const major = deg % 30 === 0;
      const mid = deg % 5 === 0;
      const r1 = major ? radiusInner - 14 : mid ? radiusInner - 10 : radiusInner - 6;
      const r2 = radiusInner;
      ctx.lineWidth = major ? 1.3 : 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSignLabels(ctx, cx, cy, radius) {
    ctx.save();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const info = zodiacOrder[i];
      const angle = toRadians(i * 30 + 15);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const display = (window.zodiacEmojis && window.zodiacEmojis[info.key]) || info.glyph || info.key.slice(0, 2);
      ctx.fillText(display, x, y);
    }
    ctx.restore();
  }

  function drawPlanets(ctx, data, cx, cy, anchorRadius, orbitRadiusBase) {
    const planets = data && data.planets ? data.planets : {};
    const names = Object.keys(planets);
    const positions = {};
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '15px sans-serif';
    const drawingAnchor = typeof orbitRadiusBase === 'number' ? orbitRadiusBase : anchorRadius - 30;
    const guideOuter = anchorRadius - 3;
    names.forEach((name, idx) => {
      const planet = planets[name];
      if (!planet || typeof planet.longitude !== 'number') return;
      const deg = normalizeDeg(planet.longitude);
      const angle = toRadians(deg);
      const orbitalRadius = drawingAnchor - 12 - (idx % 2) * 12;
      const x = cx + Math.cos(angle) * orbitalRadius;
      const y = cy + Math.sin(angle) * orbitalRadius;
      const symbol = (window.planetEmojis && window.planetEmojis[name]) || name.charAt(0);
      const color = planetColors[name] || '#90a4ae';

      // guide line from ring to planet symbol
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.1;
      ctx.setLineDash([4, 3]);
      const guideStart = Math.min(guideOuter, orbitalRadius + 12);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * guideStart, cy + Math.sin(angle) * guideStart);
      ctx.lineTo(cx + Math.cos(angle) * (guideOuter + 6), cy + Math.sin(angle) * (guideOuter + 6));
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(symbol, x, y + 0.5);
      positions[name] = { angle, x, y };
    });
    ctx.restore();
    return positions;
  }

  function drawHouseTicks(ctx, houses, cx, cy, radiusOuter, radiusInner) {
    if (!Array.isArray(houses)) return;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    houses.forEach((house) => {
      if (!house || typeof house.degree !== 'number') return;
      const deg = normalizeDeg(house.degree);
      const angle = toRadians(deg);
      const x1 = cx + Math.cos(angle) * radiusInner;
      const y1 = cy + Math.sin(angle) * radiusInner;
      const x2 = cx + Math.cos(angle) * radiusOuter;
      const y2 = cy + Math.sin(angle) * radiusOuter;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawHouseLabels(ctx, houses, cx, cy, radius) {
    if (!Array.isArray(houses)) return;
    const letters = (window.hebrewHouseLetters) || {};
    ctx.save();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#fff';
    ctx.font = "14px 'StamHebrew', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    houses.forEach((house) => {
      if (!house || typeof house.degree !== 'number') return;
      const letter = letters[house.house];
      if (!letter) return;
      const angle = toRadians(normalizeDeg(house.degree) + 2);
      const x = cx + Math.cos(angle) * (radius - 24);
      const y = cy + Math.sin(angle) * (radius - 24);
      ctx.fillText(letter, x, y);
    });
    ctx.restore();
  }

  function drawAxes(ctx, data, cx, cy, radius) {
    if (!data || !data.houses_data) return;
    const asc = data.houses_data.ascendant;
    const mc = data.houses_data.midheaven;
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#fff';
    ctx.save();
    ctx.lineWidth = 2.5;
    if (asc && typeof asc.degree === 'number') {
      const angle = toRadians(normalizeDeg(asc.degree));
      const descAngle = angle + Math.PI;
      ctx.strokeStyle = axisColors.asc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(descAngle) * radius, cy + Math.sin(descAngle) * radius);
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.font = '12px sans-serif';
      ctx.fillText('ASC', cx + Math.cos(angle) * (radius + 12), cy + Math.sin(angle) * (radius + 12));
      ctx.fillText('DESC', cx + Math.cos(descAngle) * (radius + 12), cy + Math.sin(descAngle) * (radius + 12));
    }
    if (mc && typeof mc.degree === 'number') {
      const angle = toRadians(normalizeDeg(mc.degree));
      const icAngle = angle + Math.PI;
      ctx.strokeStyle = axisColors.mc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(icAngle) * radius, cy + Math.sin(icAngle) * radius);
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.font = '12px sans-serif';
      ctx.fillText('MC', cx + Math.cos(angle) * (radius + 12), cy + Math.sin(angle) * (radius + 12));
      ctx.fillText('IC', cx + Math.cos(icAngle) * (radius + 12), cy + Math.sin(icAngle) * (radius + 12));
    }
    ctx.restore();
  }

  function drawAspects(ctx, data, positions) {
    const aspects = (data && data.classicAspects) || [];
    if (!aspects.length) return;
    ctx.save();
    ctx.lineWidth = 1.6;
    ctx.font = '10px sans-serif';
    aspects.forEach((aspect) => {
      const posA = positions[aspect.planetA];
      const posB = positions[aspect.planetB];
      if (!posA || !posB) return;
      const color = aspectColors[aspect.type] || 'rgba(255,255,255,0.3)';
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(posA.x, posA.y);
      ctx.lineTo(posB.x, posB.y);
      ctx.stroke();
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2;
      ctx.fillStyle = color;
      const symbol = aspect.type === 'conjunction' ? '\u260C'
        : aspect.type === 'opposition' ? '\u260D'
        : aspect.type === 'square' ? '\u25A1'
        : aspect.type === 'trine' ? '\u25B3'
        : aspect.type === 'sextile' ? '*' : '';
      ctx.fillText(symbol, midX, midY);
    });
    ctx.restore();
  }

  function drawClassicWheel(data, ctx) {
    if (!ctx) return;
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const size = Math.min(width, height);
    const cx = width / 2;
    const cy = height / 2;
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(0.5, 0.5);
    const outer = size / 2 - 10;
    const inner = outer - 35;
    const ascDegree = data && data.houses_data && data.houses_data.ascendant && typeof data.houses_data.ascendant.degree === 'number'
      ? data.houses_data.ascendant.degree
      : 0;
    setRotation(ascDegree);
    drawSignRing(ctx, cx, cy, outer, inner);
    drawSextantDividers(ctx, cx, cy, outer, inner - 10);
    drawSignSeparators(ctx, cx, cy, outer);
    drawSignLabels(ctx, cx, cy, (outer + inner) / 2);
    if (data && data.houses_data && Array.isArray(data.houses_data.houses)) {
      drawHouseTicks(ctx, data.houses_data.houses, cx, cy, inner, inner - 15);
      drawHouseLabels(ctx, data.houses_data.houses, cx, cy, inner);
    }
    drawDegreeTicks(ctx, cx, cy, inner, inner - 8);
    drawAxes(ctx, data, cx, cy, inner - 10);
    const positions = drawPlanets(ctx, data, cx, cy, inner, inner - 30);
    drawAspects(ctx, data, positions);
    ctx.restore();
  }

  window.drawClassicWheel = function(data, ctx) {
    try {
      drawClassicWheel(data, ctx);
    } catch (err) {
      console.error('[drawClassicWheel] error', err);
    }
  };
})();
