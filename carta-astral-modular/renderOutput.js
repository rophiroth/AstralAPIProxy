// renderOutput.js (sanitized)

// Hebrew letters (StamHebrew) per house according to Aries->Pisces sequence
const hebrewHouseLetters = {
  1:"\u05D4", // ה
  2:"\u05D5", // ו
  3:"\u05D6", // ז
  4:"\u05D7", // ח
  5:"\u05D8", // ט
  6:"\u05D9", // י
  7:"\u05DC", // ל
  8:"\u05E0", // נ
  9:"\u05E1", // ס
 10:"\u05E2", // ע
 11:"\u05E6", // צ
 12:"\u05E7"  // ק
};
try { window.hebrewHouseLetters = hebrewHouseLetters; } catch(_) {}
const localSignGlyphs = {
  Aries:'\u2648\uFE0E', Taurus:'\u2649\uFE0E', Gemini:'\u264A\uFE0E', Cancer:'\u264B\uFE0E',
  Leo:'\u264C\uFE0E', Virgo:'\u264D\uFE0E', Libra:'\u264E\uFE0E', Scorpio:'\u264F\uFE0E',
  Sagittarius:'\u2650\uFE0E', Capricorn:'\u2651\uFE0E', Aquarius:'\u2652\uFE0E', Pisces:'\u2653\uFE0E'
};
const RENDER_FALLBACK_SIGN_COLORS = {
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
function getSignGlyph(sign) {
  const map = (typeof window !== 'undefined' && window.SIGN_SYMBOL) || localSignGlyphs;
  return (map && map[sign]) || localSignGlyphs[sign] || sign.slice(0,2);
}
function resolveSignColor(sign) {
  if (!sign) return '';
  try {
    const palette = (typeof window !== 'undefined' && window.SIGN_COLORS) || RENDER_FALLBACK_SIGN_COLORS;
    return (palette && palette[sign]) || RENDER_FALLBACK_SIGN_COLORS[sign] || '';
  } catch (_){
    return RENDER_FALLBACK_SIGN_COLORS[sign] || '';
  }
}
function renderSignIcon(sign) {
  if (!sign) return '';
  const glyph = getSignGlyph(sign);
  const color = resolveSignColor(sign);
  const styleAttr = color ? ' style="color:' + color + ';"' : '';
  return '<span class="sign-iconic" data-sign="' + sign + '"' + styleAttr + '>' + glyph + '</span>';
}

function chartTranslate(key, fallback) {
  try {
    if (typeof window.getChartTranslation === 'function') {
      return window.getChartTranslation(key, fallback);
    }
  } catch (_){}
  return fallback || key;
}
function chartTranslateSign(sign) {
  try {
    if (typeof window.translateSignName === 'function') {
      return window.translateSignName(sign);
    }
  } catch (_){}
  return sign;
}
function chartTranslatePlanet(planet) {
  try {
    if (typeof window.translatePlanetName === 'function') {
      return window.translatePlanetName(planet);
    }
  } catch (_){}
  return planet;
}
function chartTranslateAspect(type, fallback) {
  try {
    if (typeof window.translateAspectName === 'function') {
      return window.translateAspectName(type);
    }
  } catch (_){}
  return fallback || type;
}
function chartTranslateElement(key, fallback) {
  const dict = (window.__chartTranslations && window.__chartTranslations.elementNames) || null;
  return (dict && dict[key]) || fallback || key;
}
function chartTranslateModality(key, fallback) {
  const dict = (window.__chartTranslations && window.__chartTranslations.modalityNames) || null;
  return (dict && dict[key]) || fallback || key;
}

function resolveChartLang() {
  try {
    const raw = (window.__chartLanguage || window.lang || window.currentLang || 'es');
    return String(raw).toLowerCase().startsWith('en') ? 'en' : 'es';
  } catch (_){
    return 'es';
  }
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEnochInfo(container, enoch, lastSunLongitude){
  try {
    const lang = resolveChartLang();
    const astroInfo = (typeof getShemInfoFromLongitude === 'function') ? getShemInfoFromLongitude(lastSunLongitude, lang) : null;
    const enochInfo = (typeof getShemInfoFromEnoch === 'function') ? getShemInfoFromEnoch(enoch.enoch_month, enoch.enoch_day, enoch.added_week, lang) : null;
    const shemAstron = (astroInfo && astroInfo.name) || ((typeof getShemAstronomico==='function') ? getShemAstronomico(lastSunLongitude) : '');
    const shemEnoch  = (enochInfo && enochInfo.name) || ((typeof getShemEnochiano==='function') ? getShemEnochiano(enoch.enoch_month, enoch.enoch_day, enoch.added_week) : '');
    const sameName = shemAstron && shemEnoch && shemAstron === shemEnoch;
    const astroKavanah = (astroInfo && astroInfo.kavanah) || ((typeof getShemKavanah === 'function') ? getShemKavanah(shemAstron, lang) : '');
    const enochKavanah = (enochInfo && enochInfo.kavanah) || ((typeof getShemKavanah === 'function') ? getShemKavanah(shemEnoch, lang) : '');
    const kavLabel = chartTranslate('shemKavanahLabel', 'Kavaná');
    const renderShemName = (text) => '<span class="shemHebrew">' + text + '</span>';
    const buildShemRow = (key, fallback, name, showKavanah, kavanahValue) => {
      if (!name) return '';
      const label = chartTranslate(key, fallback);
      const safeName = escapeHtml(name);
      const kavHtml = (showKavanah && kavanahValue)
        ? '<p class="shem-kavanah"><span class="shem-kavanah-label">' + kavLabel + ':</span> ' + escapeHtml(kavanahValue) + '</p>'
        : '';
      return '    <li class="shem-info-item"><strong>' + label + ':</strong> ' + renderShemName(safeName) + kavHtml + '</li>';
    };
    container.innerHTML = [
      '<div style="background:var(--card-bg);color:var(--text);border:1px solid var(--border);padding:10px;border-radius:8px;">',
      '  <h3>' + chartTranslate('enochTitle', 'Calendario de Enoj') + '</h3>',
      '  <ul style="list-style:none;padding:0;margin:0 0 10px 0;">',
      '    <li><strong>' + chartTranslate('enochYear', 'Año') + ':</strong> ' + enoch.enoch_year + '</li>',
      '    <li><strong>' + chartTranslate('enochMonth', 'Mes') + ':</strong> ' + enoch.enoch_month + '</li>',
      '    <li><strong>' + chartTranslate('enochDay', 'Día') + ':</strong> ' + enoch.enoch_day + '</li>',
      '    <li><strong>' + chartTranslate('enochDayOfYear', 'Día del año') + ':</strong> ' + enoch.enoch_day_of_year + '</li>',
      '    <li><strong>' + chartTranslate('enochAddedWeek', 'Semana adicional') + ':</strong> ' + (enoch.added_week ? chartTranslate('yesLabel', 'Sí') : chartTranslate('noLabel', 'No')) + '</li>',
      buildShemRow('enochAstronomicalName', 'Nombre (Astronómico)', shemAstron, !sameName, astroKavanah),
      buildShemRow('enochEnochName', 'Nombre (Enoch)', shemEnoch, true, enochKavanah),
      '  </ul>',
      '</div>',
      '<div id="treeMobileAnchor"></div>'
    ].join('\\n');
  } catch(e) {
    try { container.innerHTML = '<em>Error mostrando Calendario</em>'; } catch(_) {}
  }
}
function renderPlanetsAndHouses(container, planets, houses_data){
  const { ascendant, midheaven, houses } = houses_data || {};
  const buildPlanetBadge = (name) => {
    const icon = (window.planetEmojis && window.planetEmojis[name]) || '';
    return '<span class="planet-badge" data-planet="' + name + '">' +
      (icon ? '<span class="planet-icon">' + icon + '</span>' : '') +
      '<span class="planet-name">' + chartTranslatePlanet(name) + '</span>' +
      '<span class="planet-colon">:</span></span>';
  };
  const buildSignBadge = (sign) => {
    if (!sign) return '';
    return '<span class="sign-badge" data-sign="' + sign + '">' +
      renderSignIcon(sign) +
      '<span>' + chartTranslateSign(sign) + '</span></span>';
  };
  const buildDegreeLabel = (value, absolute) => {
    const local = decimals(value, 2);
    const abs = (typeof absolute === 'number') ? ' (' + decimals(absolute, 2) + '\u00B0)' : '';
    return '<span class="degree-value">' + local + '\u00B0' + abs + '</span>';
  };

  let html = [
    '<div style="background:var(--card-bg);color:var(--text);padding:10px;border-radius:8px;margin-top:10px;border:1px solid var(--border);max-width:560px;margin-left:auto;margin-right:auto;">',
    '  <h3>' + chartTranslate('planetsTitle', 'Planetas') + '</h3>',
    '  <ul class="data-list planet-list">'
  ];
  try {
    for (const [name, body] of Object.entries(planets||{})){
      const lon = body && typeof body.longitude==='number' ? body.longitude : null;
      if (lon==null) continue;
      const zodiacSign = (typeof getZodiacSign==='function') ? getZodiacSign(lon) : '';
      html.push('<li>' + buildPlanetBadge(name) + ' ' + buildSignBadge(zodiacSign) + ' ' + buildDegreeLabel(lon % 30, lon) + '</li>');
    }
  } catch(_){ }
  html.push('  </ul>','</div>');

  const ascLabel = chartTranslate('ascLabel', 'Asc');
  const mcLabel = chartTranslate('mcLabel', 'MC');
  const houseLabel = chartTranslate('houseLabel', 'Casa');
  html.push('<div style="background:var(--card-bg);color:var(--text);padding:10px;border-radius:8px;margin-top:10px;border:1px solid var(--border);max-width:560px;margin-left:auto;margin-right:auto;">','  <h3>' + chartTranslate('housesTitle', 'Casas Astrol\u00f3gicas') + '</h3>','  <ul class="data-list houses-list">');
  try {
    if (ascendant) {
      html.push('<li><span class="house-id">' + ascLabel + ':</span> ' + buildSignBadge(ascendant.sign) + ' ' + buildDegreeLabel(ascendant.position, ascendant.degree) + '</li>');
    }
    if (midheaven) {
      html.push('<li><span class="house-id">' + mcLabel + ':</span> ' + buildSignBadge(midheaven.sign) + ' ' + buildDegreeLabel(midheaven.position, midheaven.degree) + '</li>');
    }
    for (const h of (houses||[])){
      const letter = (window.hebrewHouseLetters && window.hebrewHouseLetters[h.house]) || '';
      const letterHtml = letter ? '<span class="house-letter">' + letter + '</span>' : '';
      html.push('<li><span class="house-id">#' + h.house + letterHtml + ':</span> ' + buildSignBadge(h.sign) + ' ' + buildDegreeLabel(h.position) + '</li>');
    }
  } catch(_){ }
  html.push('  </ul>','</div>');

  container.innerHTML += html.join('\n');
}



function renderAspectsTable(container, aspects) {
  if (!container) return;
  if (!Array.isArray(aspects) || aspects.length === 0) {
    try { if (container.id === 'aspectsTableContainer') { container.innerHTML = ''; container.classList.add('hidden'); } } catch(_){ }
    return;
  }
  const title = chartTranslate('aspectsTitle', 'Classical Aspects');
  const typeLabel = chartTranslate('aspectTypeLabel', 'Aspect');
  const planetsLabel = chartTranslate('aspectPlanetsLabel', 'Planets');
  const orbLabel = chartTranslate('aspectOrbLabel', 'Orb');
  const defaultAspectSymbols = {
    conjunction: '\u260C',
    opposition: '\u260D',
    square: '\u25A1',
    trine: '\u25B3',
    sextile: '\u2736'
  };
  const getPlanetIcon = (name) => {
    try {
      if (typeof window.getPlanetEmoji === 'function') return window.getPlanetEmoji(name);
    } catch(_){ }
    return (window.planetEmojis && window.planetEmojis[name]) || '';
  };
  const getAspectSymbol = (type) => {
    return (window.aspectSymbols && window.aspectSymbols[type]) || defaultAspectSymbols[type] || '';
  };
  const planetChip = (name) => {
    const icon = getPlanetIcon(name);
    const label = chartTranslatePlanet(name);
    return '<span class="planet-chip" data-planet="' + name + '">' + (icon ? '<span class="planet-icon">' + icon + '</span>' : '') + '<span>' + label + '</span></span>';
  };
  const rows = aspects.map((asp) => {
    const typeName = chartTranslateAspect(asp.type, asp.type);
    const typeSymbol = getAspectSymbol(asp.type);
    const plist = '<div class="aspect-planets">' + planetChip(asp.planetA) + '<span class="planet-chip-sep">+</span>' + planetChip(asp.planetB) + '</div>';
    const orb = (Math.round(Math.abs(asp.orb) * 100) / 100).toFixed(2) + '\u00B0';
    return '<tr>' +
      '<td><div class="aspect-type-cell" data-aspect="' + asp.type + '">' + (typeSymbol ? '<span class="aspect-icon">' + typeSymbol + '</span>' : '') + '<span>' + typeName + '</span></div></td>' +
      '<td>' + plist + '</td>' +
      '<td>' + orb + '</td>' +
    '</tr>';
  });
  const html = [
    '<div class="element-summary aspects-card" style="margin-top:16px;">',
    '  <h3>' + title + '</h3>',
    '  <table style="border-collapse:collapse;width:100%;">',
    '    <thead><tr><th style="text-align:left;padding:6px 8px;">' + typeLabel + '</th><th style="text-align:left;padding:6px 8px;">' + planetsLabel + '</th><th style="text-align:left;padding:6px 8px;">' + orbLabel + '</th></tr></thead>',
    '    <tbody>' + rows.join('') + '</tbody>',
    '  </table>',
    '</div>'
  ];
  if (container.id === 'aspectsTableContainer') {
    container.innerHTML = html.join('\n');
    try { container.classList.remove('hidden'); } catch(_){ }
  } else {
    container.innerHTML += html.join('\n');
  }
}


// =============== Summaries ===============
function renderElementSummary(container, planets, ascendant){
  try {
    const ascSign = ascendant && ascendant.sign;
    const raw = (window.computeRawElementsCounts) ? window.computeRawElementsCounts(planets, ascSign) : {Fuego:0,Tierra:0,Aire:0,Agua:0};
    const weighted = (window.computeWeightedElementsPolarity) ? window.computeWeightedElementsPolarity(planets, ascSign) : { elements: raw, polarity:{masc:0,fem:0} };
    const counts = weighted.elements || raw;
    const mascW = (counts.Fuego||0) + (counts.Aire||0);
    const femW  = (counts.Agua||0) + (counts.Tierra||0);

    const tokens = (window.listElementContributorsDetailed) ? window.listElementContributorsDetailed(planets, ascSign) : null;
    const fmt = (n) => (Math.abs(n-Math.round(n))<1e-9 ? Math.round(n) : (Math.round(n*100)/100).toFixed(2));

    const formatList = (arr) => {
      if (!arr || !arr.length) return '-';
      return '<div class="token-column">' +
        arr.map((item) => '<span class="token-chip">' + item + '</span>').join('') +
        '</div>';
    };
    const cellUnit = (val, list) => '<div class="cell-top">'+fmt(val)+'</div><div class="cell-sub">'+formatList(list)+'</div>';
    // same cell formatter for modalidades
    const cell = (_key, val, list) => '<div class="cell-top">'+fmt(val)+'</div><div class="cell-sub">'+formatList(list)+'</div>';
    const maxVal = Math.max(Number(counts.Fuego||0), Number(counts.Tierra||0), Number(counts.Aire||0), Number(counts.Agua||0));
    const hi = (v) => Math.abs(Number(v)-maxVal) < 1e-6;

    const card = document.createElement('div');
    card.className = 'element-summary';
    card.style.background = 'var(--card-bg)';
    card.style.padding = '10px';
    card.style.borderRadius = '8px';
    card.style.marginTop = '10px';

    card.innerHTML = [
      '<h3>' + chartTranslate('elementSummaryTitle', 'Resumen por Elementos') + '</h3>',
      '<table style="border-collapse:collapse;">',
      '  <thead><tr><th style="text-align:left;padding:4px 8px;">' + chartTranslate('tableSourceLabel', 'Fuente') + '</th><th style="text-align:left;padding:4px 8px;">' + chartTranslateElement('Fuego', 'Fuego') + '</th><th style="text-align:left;padding:4px 8px;">' + chartTranslateElement('Tierra', 'Tierra') + '</th><th style="text-align:left;padding:4px 8px;">' + chartTranslateElement('Aire', 'Aire') + '</th><th style="text-align:left;padding:4px 8px;">' + chartTranslateElement('Agua', 'Agua') + '</th></tr></thead>',
      '  <tbody>',
      '    <tr><td style="padding:4px 8px;">' + chartTranslate('elementSourceUnit', 'Conteo (unitario)') + '</td>'+
      '      <td style="padding:4px 8px;">'+cellUnit(raw.Fuego||0, tokens?tokens.Fuego:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cellUnit(raw.Tierra||0, tokens?tokens.Tierra:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cellUnit(raw.Aire||0, tokens?tokens.Aire:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cellUnit(raw.Agua||0, tokens?tokens.Agua:null)+'</td></tr>',
      '    <tr><td style="padding:4px 8px;">' + chartTranslate('elementSourceWeighted', 'Puntaje (ponderado)') + '</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Fuego)?'<span class="hi">'+fmt(counts.Fuego)+'</span>':fmt(counts.Fuego||0))+'</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Tierra)?'<span class="hi">'+fmt(counts.Tierra)+'</span>':fmt(counts.Tierra||0))+'</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Aire)?'<span class="hi">'+fmt(counts.Aire)+'</span>':fmt(counts.Aire||0))+'</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Agua)?'<span class="hi">'+fmt(counts.Agua)+'</span>':fmt(counts.Agua||0))+'</td></tr>',
      '  </tbody>',
      '</table>',
      '<div style="margin-top:8px;">'+
        '<strong>' + chartTranslate('elementPolarityTitle', 'Polaridad') + ':</strong> ' + chartTranslate('polarityMasculine', 'Masculino (Fuego + Aire)') + ': '+fmt(mascW)+' | ' + chartTranslate('polarityFeminine', 'Femenino (Agua + Tierra)') + ': '+fmt(femW)+'</div>',
      (function(){
        var triM = Number(counts.Fuego||0);
        var triN = Number(counts.Aire||0);
        var triF = Number((counts.Agua||0) + (counts.Tierra||0));
        var triMax = Math.max(triM, triN, triF);
        var wrap = function(label, v){ return (Math.abs(v-triMax)<1e-6)?('<span class="hi">'+fmt(v)+'</span>'):fmt(v); };
        return '<div style="margin-top:6px;"><strong>' + chartTranslate('triadLabel', 'Tr\u00EDada') + ':</strong> ' + chartTranslate('triadMasculine', 'Masculino (Fuego)') + ': '+wrap('M',triM)+' | ' + chartTranslate('triadNeutral', 'Neutro (Aire)') + ': '+wrap('N',triN)+' | ' + chartTranslate('triadFeminine', 'Femenino (Agua+Tierra)') + ': '+wrap('F',triF)+'</div>';
      })()
    ].join('\n');

    container.appendChild(card);

    // Nota aclaratoria (letra chica)
    try {
      var note = document.createElement('div');
      note.className = 'note';
      note.innerHTML = chartTranslate('notePluto', 'Nota: se excluye <strong>Plutón</strong>; <strong>Sol</strong>, <strong>Luna</strong> y <strong>Ascendente</strong> puntúan x2 en los conteos ponderados.');
      container.appendChild(note);
    } catch(_){}

    // Modalidades
    const rawMod = (window.computeRawModalityCounts) ? window.computeRawModalityCounts(planets, ascSign) : {Cardinal:0,Fijo:0,Mutable:0};
    const wMod   = (window.computeWeightedModalityCounts) ? window.computeWeightedModalityCounts(planets, ascSign) : rawMod;
    const modTokens = (window.listModalityContributorsDetailed) ? window.listModalityContributorsDetailed(planets, ascSign) : null;
    const maxMod = Math.max(Number(wMod.Cardinal||0), Number(wMod.Fijo||0), Number(wMod.Mutable||0));
    const hiMod = (v) => Math.abs(Number(v)-maxMod) < 1e-6;

    const mod = document.createElement('div');
    mod.className = 'element-summary';
    mod.style.background = 'var(--card-bg)';
    mod.style.padding = '10px';
    mod.style.borderRadius = '8px';
    mod.style.marginTop = '10px';
    mod.innerHTML = [
      '<h3>' + chartTranslate('modalitiesTitle', 'Resumen por Modalidades') + '</h3>',
      '<table style="border-collapse:collapse;">',
      '  <thead><tr><th style="text-align:left;padding:4px 8px;">' + chartTranslate('tableSourceLabel', 'Fuente') + '</th><th style="text-align:left;padding:4px 8px;">' + chartTranslateModality('Cardinal', 'Cardinal') + '</th><th style="text-align:left;padding:4px 8px;">' + chartTranslateModality('Fijo', 'Fijo') + '</th><th style="text-align:left;padding:4px 8px;">' + chartTranslateModality('Mutable', 'Mutable') + '</th></tr></thead>',
      '  <tbody>',
      '    <tr><td style="padding:4px 8px;">' + chartTranslate('modalitiesSourceUnit', 'Conteo (unitario)') + '</td>'+
      '      <td style="padding:4px 8px;">'+cell('Cardinal', rawMod.Cardinal||0, modTokens?modTokens.Cardinal:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cell('Fijo', rawMod.Fijo||0, modTokens?modTokens.Fijo:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cell('Mutable', rawMod.Mutable||0, modTokens?modTokens.Mutable:null)+'</td></tr>',
      '    <tr><td style="padding:4px 8px;">' + chartTranslate('modalitiesSourceWeighted', 'Puntaje (ponderado)') + '</td>'+
      '      <td style="padding:4px 8px;">'+(hiMod(wMod.Cardinal)?'<span class="hi">'+fmt(wMod.Cardinal)+'</span>':fmt(wMod.Cardinal||0))+'</td>'+
      '      <td style="padding:4px 8px;">'+(hiMod(wMod.Fijo)?'<span class="hi">'+fmt(wMod.Fijo)+'</span>':fmt(wMod.Fijo||0))+'</td>'+
      '      <td style="padding:4px 8px;">'+(hiMod(wMod.Mutable)?'<span class="hi">'+fmt(wMod.Mutable)+'</span>':fmt(wMod.Mutable||0))+'</td></tr>',
      '  </tbody>',
      '</table>'
    ].join('\n');
    container.appendChild(mod);
  } catch(e) {
    try { console.warn('renderElementSummary failed', e); } catch(_){}
  }
}

function getAiBackendUrl() {
  try {
    const hinted = (window.AI_SUMMARY_URL || window.MASHIA_BACKEND_URL || '').trim();
    if (hinted) return hinted;
  } catch (_){}
  try {
    const meta = document.querySelector('meta[name="ai-summary-url"]');
    if (meta) {
      const raw = (meta.getAttribute('content') || '').trim();
      if (raw) {
        try { return new URL(raw, window.location.href).toString(); } catch (_){ return raw; }
      }
    }
  } catch (_){}
  return 'ai_summary.php';
}

function buildAiPrompt(vizData, lang) {
  if (!vizData) return '';
  const placements = [];
  const planets = vizData.planets || {};
  const houses = vizData.houses_data || {};
  const aspects = Array.isArray(vizData.classicAspects) ? vizData.classicAspects : [];
  const formatPlacement = (name) => {
    const planet = planets[name];
    if (!planet || typeof planet.longitude !== 'number') return '';
    const lon = planet.longitude;
    const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(lon) : '';
    const degLocal = decimals(((lon % 30) + 30) % 30, 1);
    const label = chartTranslatePlanet(name);
    const signLabel = chartTranslateSign(sign);
    return label + ': ' + signLabel + ' ' + degLocal + '\u00B0';
  };
  ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].forEach((name) => {
    const line = formatPlacement(name);
    if (line) placements.push('- ' + line);
  });
  const ascLine = (houses.ascendant && typeof houses.ascendant.position === 'number')
    ? '- Asc: ' + chartTranslateSign(houses.ascendant.sign || '') + ' ' + decimals(houses.ascendant.position, 1) + '\u00B0'
    : '';
  const mcLine = (houses.midheaven && typeof houses.midheaven.position === 'number')
    ? '- MC: ' + chartTranslateSign(houses.midheaven.sign || '') + ' ' + decimals(houses.midheaven.position, 1) + '\u00B0'
    : '';
  const aspectLines = aspects.slice(0, 6).map((asp) => {
    const label = chartTranslateAspect(asp.type, asp.type);
    const a = chartTranslatePlanet(asp.planetA);
    const b = chartTranslatePlanet(asp.planetB);
    const orb = (typeof asp.orb === 'number') ? decimals(asp.orb, 2) + '\u00B0' : '';
    return '- ' + label + ': ' + a + ' \u2194 ' + b + (orb ? ' (orb ' + orb + ')' : '');
  });
  const enoch = vizData.enoch || {};
  const langCode = (lang && lang.toLowerCase().startsWith('en')) ? 'en' : 'es';
  const sunLon = planets.Sun && planets.Sun.longitude;
  const astroInfo = (typeof getShemInfoFromLongitude === 'function') ? getShemInfoFromLongitude(sunLon, langCode) : null;
  const enochInfo = (typeof getShemInfoFromEnoch === 'function') ? getShemInfoFromEnoch(enoch.enoch_month, enoch.enoch_day, enoch.added_week, langCode) : null;
  const enochLines = [];
  if (astroInfo && astroInfo.name) {
    const label = langCode === 'en' ? 'Astronomical name' : 'Nombre astron\u00f3mico';
    enochLines.push('- ' + label + ': ' + astroInfo.name + (astroInfo.kavanah ? ' — ' + astroInfo.kavanah : ''));
  }
  if (enochInfo && enochInfo.name) {
    const label = langCode === 'en' ? 'Enoch name' : 'Nombre de Enoj';
    enochLines.push('- ' + label + ': ' + enochInfo.name + (enochInfo.kavanah ? ' — ' + enochInfo.kavanah : ''));
  }
  const intro = langCode === 'en'
    ? 'You are a compassionate Kabbalistic astrologer. Interpret the Tree of Life chart below with spiritual and practical guidance.'
    : 'Eres un astr\u00f3logo kabalista compasivo. Interpreta la carta del \u00c1rbol de la Vida con gu\u00eda espiritual y pr\u00e1ctica.';
  const outro = langCode === 'en'
    ? 'Write 2-3 short paragraphs in English, weaving sefirot, elements and any warnings.'
    : 'Escribe 2-3 p\u00e1rrafos breves en espa\u00f1ol, hilando sefirot, elementos y advertencias.';
  const lines = [
    intro,
    '',
    (langCode === 'en' ? 'Key placements:' : 'Posiciones clave:'),
    ...placements,
    '',
    (langCode === 'en' ? 'Ascendant & Midheaven:' : 'Ascendente y Medio Cielo:'),
    ascLine || '- (sin datos)',
    mcLine || '',
    '',
    (langCode === 'en' ? 'Classical aspects:' : 'Aspectos cl\u00e1sicos:'),
    aspectLines.length ? aspectLines.join('\n') : '- (ninguno)',
    '',
    (langCode === 'en' ? 'Enoch calendar:' : 'Calendario de Enoj:'),
    '- ' + (langCode === 'en' ? 'Year' : 'A\u00f1o') + ': ' + (enoch.enoch_year || '?') + ', ' + (langCode === 'en' ? 'Month' : 'Mes') + ': ' + (enoch.enoch_month || '?') + ', ' + (langCode === 'en' ? 'Day' : 'D\u00eda') + ': ' + (enoch.enoch_day || '?'),
    enochLines.join('\n') || '- (sin nombres disponibles)',
    '',
    outro
  ];
  return lines.join('\n');
}

function requestAiSummary(button, body, vizData, endpoint) {
  if (!vizData) {
    body.textContent = chartTranslate('aiSummaryNoData', 'Calcula la carta primero.');
    return;
  }
  if (button.dataset.loading === '1') return;
  const lang = resolveChartLang();
  const prompt = buildAiPrompt(vizData, lang);
  if (!prompt) {
    body.textContent = chartTranslate('aiSummaryNoData', 'No hay datos suficientes para la IA.');
    return;
  }
  button.dataset.loading = '1';
  button.disabled = true;
  button.textContent = chartTranslate('aiSummaryWorking', 'Generando...');
  body.textContent = chartTranslate('aiSummaryLoading', 'Conectando con la IA...');
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, lang })
  })
    .then((resp) => {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const type = resp.headers.get('content-type') || '';
      if (type.includes('application/json')) return resp.json();
      return resp.text().then((txt) => ({ summary: txt }));
    })
    .then((payload) => {
      const text = (payload && (payload.summary || payload.text || payload.message)) || '';
      body.textContent = text.trim() || chartTranslate('aiSummaryEmpty', 'La IA no devolvi\u00f3 texto.');
    })
    .catch((err) => {
      const msg = chartTranslate('aiSummaryError', 'No se pudo generar el resumen.');
      body.textContent = msg + (err && err.message ? ' (' + err.message + ')' : '');
    })
    .finally(() => {
      button.dataset.loading = '0';
      button.disabled = false;
      button.textContent = chartTranslate('aiSummaryButton', 'Generar resumen kabal\u00edstico');
    });
}

function renderAiSummary(container, vizData) {
  if (!container) return;
  try {
    const previous = document.getElementById('aiSummaryCard');
    if (previous && previous.parentNode) previous.parentNode.removeChild(previous);
  } catch (_){}
  const card = document.createElement('div');
  card.className = 'ai-summary-card';
  card.id = 'aiSummaryCard';
  const title = chartTranslate('aiSummaryTitle', 'Resumen con IA');
  const hint = chartTranslate('aiSummaryHint', 'Usa MashIA para sintetizar toda la carta.');
  const placeholder = chartTranslate('aiSummaryPlaceholder', 'Pulsa el bot\u00f3n para recibir una lectura kabal\u00edstica generada por IA.');
  card.innerHTML = [
    '<h3>' + title + '</h3>',
    '<p class="ai-summary-hint">' + hint + '</p>',
    '<div class="ai-summary-body">' + placeholder + '</div>',
    '<div class="ai-summary-actions"><button type="button">' + chartTranslate('aiSummaryButton', 'Generar resumen kabal\u00edstico') + '</button></div>'
  ].join('\n');
  container.appendChild(card);
  const button = card.querySelector('button');
  const body = card.querySelector('.ai-summary-body');
  const endpoint = getAiBackendUrl();
  if (!endpoint) {
    button.disabled = true;
    body.textContent = chartTranslate('aiSummaryNoBackend', 'Configura la URL de MashIA para usar esta secci\u00f3n.');
    return;
  }
  button.addEventListener('click', () => {
    requestAiSummary(button, body, vizData, endpoint);
  });
}

// Expose
try {
  window.renderEnochInfo = renderEnochInfo;
  window.renderPlanetsAndHouses = renderPlanetsAndHouses;
  window.renderElementSummary = renderElementSummary;
  window.renderAspectsTable = renderAspectsTable;
  window.renderAiSummary = renderAiSummary;
} catch(_){}

