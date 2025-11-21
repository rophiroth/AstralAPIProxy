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
    const kavLabel = chartTranslate('shemKavanahLabel', 'Kavaná');
    const gemLabel = chartTranslate('shemGematriaLabel', 'Gematría');
    const renderShemName = (text) => '<span class="shemHebrew metatron">' + text + '</span><span class="shemHebrew stam">' + text + '</span>';
    const buildShemRow = (key, fallback, info, fallbackName, showKavanah) => {
      const effectiveName = (info && info.name) || fallbackName;
      if (!effectiveName) return '';
      const label = chartTranslate(key, fallback);
      const safeName = escapeHtml(effectiveName);
      const ordinal = (info && typeof info.index === 'number') ? (info.index + 1) : null;
      const gematria = (info && typeof info.gematria === 'number') ? info.gematria : null;
      const metaParts = [];
      if (ordinal != null) metaParts.push('#' + ordinal);
      if (gematria != null) metaParts.push(gemLabel + ': ' + gematria);
      const metaHtml = metaParts.length ? ' <span class="shem-meta">(' + metaParts.join(' · ') + ')</span>' : '';
      const kavSource = (info && info.kavanah) || ((typeof getShemKavanah === 'function') ? getShemKavanah(effectiveName, lang) : '');
      const kavHtml = (showKavanah && kavSource)
        ? '<p class="shem-kavanah"><span class="shem-kavanah-label">' + kavLabel + ':</span> ' + escapeHtml(kavSource) + '</p>'
        : '';
      return '    <li class="shem-info-item"><strong>' + label + ':</strong> ' + renderShemName(safeName) + metaHtml + kavHtml + '</li>';
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
      buildShemRow('enochAstronomicalName', 'Nombre (Astronómico)', astroInfo, shemAstron, !sameName),
      buildShemRow('enochEnochName', 'Nombre (Enoch)', enochInfo, shemEnoch, true),
      '  </ul>',
      '</div>',
      '<div id="treeMobileAnchor"></div>'
    ].join('\n');
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

function buildAiBasePrompt(vizData, lang) {
  if (!vizData) return null;
  const placements = [];
  const planets = vizData.planets || {};
  const houses = vizData.houses_data || {};
  const aspects = Array.isArray(vizData.classicAspects) ? vizData.classicAspects : [];
  const langCode = (lang && lang.toLowerCase().startsWith('en')) ? 'en' : 'es';
  const isEnglish = langCode === 'en';
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
  const ascData = houses.ascendant || {};
  const ascSign = ascData.sign || '';
  const ascLine = (typeof ascData.position === 'number')
    ? '- Asc: ' + chartTranslateSign(ascSign) + ' ' + decimals(ascData.position, 1) + '\u00B0'
    : '- Asc: ' + (isEnglish ? 'Unavailable' : 'Sin datos');
  const mcData = houses.midheaven || {};
  const mcLine = (typeof mcData.position === 'number')
    ? '- MC: ' + chartTranslateSign(mcData.sign || '') + ' ' + decimals(mcData.position, 1) + '\u00B0'
    : '- MC: ' + (isEnglish ? 'Unavailable' : 'Sin datos');
  const aspectLines = aspects.slice(0, 8).map((asp) => {
    const label = chartTranslateAspect(asp.type, asp.type);
    const a = chartTranslatePlanet(asp.planetA);
    const b = chartTranslatePlanet(asp.planetB);
    const orb = (typeof asp.orb === 'number') ? decimals(asp.orb, 2) + '\u00B0' : '';
    return '- ' + label + ': ' + a + ' \u2194 ' + b + (orb ? ' (orb ' + orb + ')' : '');
  });
  const enoch = vizData.enoch || {};
  const sunLon = planets.Sun && planets.Sun.longitude;
  const astroInfo = (typeof getShemInfoFromLongitude === 'function') ? getShemInfoFromLongitude(sunLon, langCode) : null;
  const enochInfo = (typeof getShemInfoFromEnoch === 'function') ? getShemInfoFromEnoch(enoch.enoch_month, enoch.enoch_day, enoch.added_week, langCode) : null;
  const seenShemNames = new Set();
  const formatShemLine = (label, info) => {
    if (!info || !info.name || seenShemNames.has(info.name)) return null;
    seenShemNames.add(info.name);
    const ordinal = (typeof info.index === 'number') ? '#' + (info.index + 1) : '';
    const gem = (typeof info.gematria === 'number') ? (isEnglish ? 'Gematria ' : 'Gematr\u00eda ') + info.gematria : '';
    const metaParts = [ordinal, gem].filter(Boolean).join(' | ');
    const kav = info.kavanah ? (isEnglish ? 'Kavanah: ' : 'Kavanah: ') + info.kavanah : '';
    return '- ' + label + ': ' + info.name + (metaParts ? ' (' + metaParts + ')' : '') + (kav ? ' — ' + kav : '');
  };
  const divineNameLines = [];
  const enochLabel = isEnglish ? 'Enoch name' : 'Nombre de Enoj';
  const astroLabel = isEnglish ? 'Astronomical name' : 'Nombre astron\u00f3mico';
  const enochLineDetail = formatShemLine(enochLabel, enochInfo);
  if (enochLineDetail) divineNameLines.push(enochLineDetail);
  const astroLineDetail = formatShemLine(astroLabel, astroInfo);
  if (astroLineDetail) divineNameLines.push(astroLineDetail);
  const fmtCount = (value) => {
    if (typeof value !== 'number' || !isFinite(value)) return '0';
    const rounded = Math.round(value * 10) / 10;
    return Math.abs(rounded - Math.round(rounded)) < 0.05 ? String(Math.round(rounded)) : String(rounded);
  };
  const elementLines = [];
  const elementStats = (typeof window.computeWeightedElementsPolarity === 'function')
    ? window.computeWeightedElementsPolarity(planets, ascSign)
    : null;
  if (elementStats && elementStats.elements) {
    const e = elementStats.elements;
    elementLines.push(
      (isEnglish
        ? 'Weighted elements (Sun/Moon/Asc x2, Pluto omitted): '
        : 'Elementos ponderados (Sol/Luna/Asc x2, sin Plut\u00f3n): ')
      + [
        chartTranslateElement('Fuego', isEnglish ? 'Fire' : 'Fuego') + ' ' + fmtCount(e.Fuego || 0),
        chartTranslateElement('Tierra', isEnglish ? 'Earth' : 'Tierra') + ' ' + fmtCount(e.Tierra || 0),
        chartTranslateElement('Aire', isEnglish ? 'Air' : 'Aire') + ' ' + fmtCount(e.Aire || 0),
        chartTranslateElement('Agua', isEnglish ? 'Water' : 'Agua') + ' ' + fmtCount(e.Agua || 0)
      ].join(', ')
    );
  }
  if (elementStats && elementStats.polarity) {
    elementLines.push(
      (isEnglish ? 'Polarities: Masculine ' : 'Polaridades: Masculino ') + fmtCount(elementStats.polarity.masc || 0) +
      (isEnglish ? ' vs Feminine ' : ' vs Femenino ') + fmtCount(elementStats.polarity.fem || 0)
    );
  }
  const modCounts = (typeof window.computeWeightedModalityCounts === 'function')
    ? window.computeWeightedModalityCounts(planets, ascSign)
    : null;
  const modLine = modCounts
    ? '- ' + (isEnglish ? 'Weighted modalities: ' : 'Modalidades ponderadas: ') + [
        chartTranslateModality('Cardinal', 'Cardinal') + ' ' + fmtCount(modCounts.Cardinal || 0),
        chartTranslateModality('Fijo', 'Fixed') + ' ' + fmtCount(modCounts.Fijo || 0),
        chartTranslateModality('Mutable', 'Mutable') + ' ' + fmtCount(modCounts.Mutable || 0)
      ].join(', ')
    : '';
  const sefirotLines = [];
  if (typeof window.mapPlanetsToSefirot === 'function') {
    const sefMapping = window.mapPlanetsToSefirot(planets) || {};
    const sefNames = (window.__chartTranslations && window.__chartTranslations.sefirotNames) || {};
    Object.entries(sefMapping).forEach(([sefira, planetName]) => {
      const planet = planets[planetName];
      if (!planet || typeof planet.longitude !== 'number') return;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(planet.longitude) : '';
      const degLocal = decimals(((planet.longitude % 30) + 30) % 30, 1);
      const sefName = (sefNames && sefNames[sefira]) || sefira;
      sefirotLines.push('- ' + sefName + ': ' + chartTranslatePlanet(planetName) + ' ' + chartTranslateSign(sign) + ' ' + degLocal + '\u00B0');
    });
  }
  const intro = isEnglish
    ? 'You are a sober, detail-oriented Kabbalistic astrologer. Interpret the Tree of Life chart with spiritual and practical guidance.'
    : 'Eres un astr\u00f3logo kabalista sobrio y minucioso. Interpreta la carta del \u00c1rbol de la Vida con gu\u00eda espiritual y pr\u00e1ctica.';
  const ariLine = isEnglish
    ? 'Follow the Tree of Life order taught by Rabbi Itzhak Luria (ARI): Name of God, luminaries/Ascendant, sefirot interplay, elements/polarity, and concluding aspects.'
    : 'Sigue el orden del \u00c1rbol de la Vida seg\u00fan el ARI (Rab\u00ed Itzjak Luria): Nombre divino, luminarias/Ascendente, interacci\u00f3n de las sefirot, elementos/polaridad y aspectos finales.';
  const dontTransliterateLine = isEnglish
    ? 'Do not transliterate the 72-Name into phonetic words; cite the letters exactly as provided (ej. Mem-Yud-He).'
    : 'No transliteres el Nombre de 72 letras a palabras fon\u00e9ticas; cita las letras exactamente como aparecen (ej. Mem-Yud-He).';
  const focusLine = isEnglish
    ? 'Never invent anything: describe the Divine Name only with the provided letters, ordinal (1\u201372), gematria, and kavanah; in every section anchor claims in exact degrees, houses, sefirot, counts, or orbs.'
    : 'No inventes nada: describe el Nombre divino solo con las letras dadas, ordinal (1\u201372), gematr\u00eda y kavanah; en cada secci\u00f3n ancla las afirmaciones en grados, casas, sefirot, conteos u orbes exactos.';
  const quoteCountsLine = isEnglish
    ? 'Any balance/imbalance (Chesed vs Gevurah, masculine vs feminine, sefirot loads) must quote the specific numbers, degrees, or placements that justify it.'
    : 'Todo equilibrio/desbalance (Jesed vs Guevur\u00e1, masculino vs femenino, cargas de sefirot) debe citar los n\u00fameros, grados o posiciones que lo respalden.';
  const detailLine = isEnglish
    ? 'Expand each answer to the maximum: use long, well-punctuated paragraphs (commas, semicolons, periods) with concrete data: degrees, houses, sefirot, ordinal/gematria, kavanah, and practical consequences.'
    : 'Expande cada respuesta al m\u00e1ximo: usa p\u00e1rrafos largos y bien puntuados (comas, puntos y coma, puntos) con datos concretos: grados, casas, sefirot, ordinal/gematr\u00eda, kavanah y consecuencias pr\u00e1cticas.';
  const dataIntegrityLine = isEnglish
    ? 'If data is missing, state it as unavailable instead of speculating.'
    : 'Si falta alg\u00fan dato, ind\u00edcalo como no disponible en vez de especular.';
  const cautionLine = isEnglish
    ? 'This is an automated report; it may have errors. Real interpretation requires a professional Kabbalistic astrologer.'
    : 'Este es un informe autom\u00e1tico y puede tener errores. La interpretaci\u00f3n real requiere un astr\u00f3logo kabalista profesional.';
  const instructions = [
    intro,
    ariLine,
    dontTransliterateLine,
    focusLine,
    quoteCountsLine,
    detailLine,
    dataIntegrityLine,
    cautionLine
  ];
  const placementsMap = {};
  placements.forEach((entry) => {
    const clean = entry.replace(/^- /, '');
    const key = clean.split(':')[0];
    if (key) placementsMap[key.trim()] = entry;
  });
  const luminariesLines = ['Sun', 'Moon']
    .map((name) => placementsMap[name])
    .filter(Boolean);
  const sectionData = {
    divine: divineNameLines,
    luminaries: luminariesLines.concat(ascLine ? [ascLine] : []),
    sefirot: sefirotLines,
    elements: elementLines,
    modalities: modLine ? [modLine] : [],
    aspects: aspectLines,
    closing: [
      '- ' + (isEnglish ? 'Year' : 'A\u00f1o') + ': ' + ((enoch.enoch_year != null) ? enoch.enoch_year : '?'),
      '- ' + (isEnglish ? 'Month' : 'Mes') + ': ' + ((enoch.enoch_month != null) ? enoch.enoch_month : '?'),
      '- ' + (isEnglish ? 'Day' : 'D\u00eda') + ': ' + ((enoch.enoch_day != null) ? enoch.enoch_day : '?'),
      '- ' + (isEnglish ? 'Day of year' : 'D\u00eda del a\u00f1o') + ': ' + ((enoch.enoch_day_of_year != null) ? enoch.enoch_day_of_year : '?'),
      '- ' + (isEnglish ? 'Intercalary week' : 'Semana intercalaria') + ': ' + (enoch.added_week ? (isEnglish ? 'Yes' : 'S\u00ed') : (isEnglish ? 'No' : 'No'))
    ]
  };
  return { langCode, instructions, data: sectionData };
}

const AI_SECTION_META = [
  {
    key: 'divine',
    icon: '\u2721',
    title: { es: '1) Nombre divino', en: '1) Divine Name' },
    prompt: {
      es: 'Contenido del Nombre divino sin encabezados ni numeraci\u00f3n. Usa los nombres astron\u00f3mico y de Enoj (letras exactas, ordinal 1-72, gematr\u00eda, kavanah provista) para explicar destino, prop\u00f3sito y correcciones k\u00e1rmicas al alinearse o desviarse. No inventes atributos ni bendiciones fuera de los datos; si falta algo, decl\u00e1ralo. Exp\u00e1ndete al m\u00e1ximo, m\u00ednimo ocho oraciones bien puntuadas.',
      en: 'Divine Name content only, no headings or numbering. Use the astronomical and Enochian Names (exact letters, ordinal 1-72, gematria, provided kavanah) to explain destiny, purpose, and karmic corrections when aligned or misaligned. Do not invent attributes or blessings beyond the data; if something is missing, state it. Expand to the maximum, at least eight well-punctuated sentences.'
    }
  },
  {
    key: 'luminaries',
    icon: '\u263C',
    title: { es: '2) Sol, Luna y Ascendente', en: '2) Sun, Moon & Ascendant' },
    prompt: {
      es: 'Describe Sol (conciencia/l\u00f3gica), Luna (imaginaci\u00f3n/emoci\u00f3n/sue\u00f1os) y Ascendente (orientaci\u00f3n/destino/percepci\u00f3n externa) sin t\u00edtulos. Cita grados y signos exactos, casas y sefirot de cada uno, c\u00f3mo se equilibran o chocan, y qu\u00e9 implican en la misi\u00f3n vital. Usa m\u00ednimo ocho oraciones detalladas.',
      en: 'Describe Sun (consciousness/logic), Moon (imagination/emotion/dreams), and Ascendant (orientation/destiny/external perception) with no headings. Quote exact degrees and signs, houses, and sefirot for each, how they balance or clash, and what they imply for life purpose. Use at least eight detailed sentences.'
    }
  },
  {
    key: 'sefirot',
    icon: '\u269B',
    title: { es: '3) \u00c1rbol de la Vida y sefirot', en: '3) Tree of Life & Sefirot' },
    prompt: {
      es: 'Usa el mapa planeta\u2192sefirot y conteos para mostrar flujos: Keter/Jojm\u00e1/Bin\u00e1 (espiritual), Jesed/Guevur\u00e1/Tiferet (mental), Netzaj/Hod/Yesod (emocional) y Maljut (concreto/MC). Destaca sefirot vac\u00edas o saturadas y signos que se repiten, con n\u00fameros y grados. Extiende al m\u00e1ximo con al menos ocho oraciones.',
      en: 'Use the planet\u2192sefirot map and counts to show flows: Keter/Chokhmah/Binah (spiritual), Chesed/Gevurah/Tiferet (mental), Netzach/Hod/Yesod (emotional), and Malkhut (concrete/MC). Highlight empty or overloaded sefirot and repeated signs with numbers and degrees. Expand fully with at least eight sentences.'
    }
  },
  {
    key: 'elements',
    icon: '\u2694',
    title: { es: '4) Elementos y polaridad', en: '4) Elements & polarity' },
    prompt: {
      es: 'Explica conteos ponderados de elementos, polaridad masculino/femenino y modalidades con n\u00fameros claros. Relaciona cualquier desbalance con car\u00e1cter o karma sin inventar nada. Usa m\u00ednimo ocho oraciones largas y bien puntuadas.',
      en: 'Explain weighted element counts, masculine/feminine polarity, and modality totals with clear numbers. Tie any imbalance to character or karma without inventing anything. Use at least eight long, well-punctuated sentences.'
    }
  },
  {
    key: 'aspects',
    icon: '\u2605',
    title: { es: '5) Aspectos cl\u00e1sicos', en: '5) Classical aspects' },
    prompt: {
      es: 'Interpreta la lista de aspectos (tipo, planetas, orbes) sin encabezados ni notas de otras secciones. Cita cada orb num\u00e9rico al explicar tensiones u oportunidades. Al menos ocho oraciones detalladas.',
      en: 'Interpret the aspect list (type, planets, orbs) without headings or references to other sections. Cite each numeric orb when explaining tensions or opportunities. Provide at least eight detailed sentences.'
    }
  },
  {
    key: 'closing',
    icon: '\u23f3',
    title: { es: '6) Cierre y calendario', en: '6) Closing & calendar' },
    prompt: {
      es: 'Usa los datos del calendario de Enoj (a\u00f1o, mes, d\u00eda, d\u00eda del a\u00f1o, semana intercalaria) para un cierre reflexivo. Incluye una advertencia de que es un informe autom\u00e1tico y que la lectura profesional es necesaria para certeza. Usa m\u00ednimo seis oraciones fluidas y bien puntuadas.',
      en: 'Use the Enoch calendar data (year, month, day, day of year, intercalary week) for a reflective closing. Include a warning that this is automated and that a professional reading is needed for certainty. Use at least six fluid, well-punctuated sentences.'
    }
  }
];

function getAiSectionMeta(lang) {
  const locale = (lang && String(lang).toLowerCase().startsWith('en')) ? 'en' : 'es';
  return AI_SECTION_META.map((meta) => ({
    key: meta.key,
    icon: meta.icon,
    title: meta.title[locale],
    prompt: meta.prompt[locale]
  }));
}

function formatSectionHtml(text, lang) {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const blocks = parts.length ? parts : [trimmed];
  return blocks.map((p) => '<p>' + escapeHtml(p) + '</p>').join('');
}

function requestAiSummarySections(button, vizData, endpoint, autorun, sectionsMeta, sectionNodes) {
  autorun = !!autorun;
  const readyLabel = chartTranslate('aiSummaryButton', 'Generar resumen kabal\u00edstico');
  const isBookingButton = button && button.dataset.booking === '1';
  if (!vizData) {
    const msg = chartTranslate('aiSummaryNoData', 'Calcula la carta primero.');
    sectionsMeta.forEach((meta) => {
      const target = sectionNodes[meta.key];
      if (target) target.textContent = msg;
    });
    return;
  }
  if (!isBookingButton && button.dataset.loading === '1') return;
  const lang = resolveChartLang();
  const baseInfo = buildAiBasePrompt(vizData, lang);
  if (!baseInfo) {
    const msg = chartTranslate('aiSummaryNoData', 'No hay datos suficientes para la IA.');
    sectionsMeta.forEach((meta) => {
      const target = sectionNodes[meta.key];
      if (target) target.textContent = msg;
    });
    return;
  }
  if (!isBookingButton) {
    button.dataset.loading = '1';
    button.disabled = true;
    button.textContent = chartTranslate('aiSummaryWorking', 'Generando...');
  }
  sectionsMeta.forEach((meta) => {
    const target = sectionNodes[meta.key];
    if (target) target.textContent = chartTranslate('aiSummaryLoading', 'Conectando con la IA...');
  });
    const caution = (lang === 'en'
      ? 'Write in flowing prose (no bullets, no headings). Do not mention section numbers or that other prompts exist; focus only on this section and never invent data.'
      : 'Escribe en prosa corrida (sin vi\u00f1etas ni t\u00edtulos). No menciones n\u00fameros de secci\u00f3n ni que hay otros prompts; c\u00e9ntrate solo en esta secci\u00f3n y nunca inventes datos.');
  function runSection(index) {
    if (index >= sectionsMeta.length) {
      if (!isBookingButton) {
        button.dataset.loading = '0';
        button.disabled = false;
        button.textContent = readyLabel;
      }
      return;
    }
    const meta = sectionsMeta[index];
    const target = sectionNodes[meta.key];
    const sectionLines = baseInfo.data[meta.key] || [];
    const prompt = [
      ...baseInfo.instructions,
      '',
      meta.prompt,
      '',
      ...sectionLines,
      '',
      caution
    ].join('\n');
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
        const html = formatSectionHtml(text, lang);
        if (target) {
          if (html) target.innerHTML = html;
          else target.textContent = text.trim() || chartTranslate('aiSummaryEmpty', 'La IA no devolvi\u00f3 texto.');
        }
      })
      .catch((err) => {
        if (target) {
          const msg = chartTranslate('aiSummaryError', 'No se pudo generar el resumen.');
          target.textContent = msg + (err && err.message ? ' (' + err.message + ')' : '');
        }
      })
      .finally(() => runSection(index + 1));
  }
  runSection(0);
}

function renderAiSummary(host, vizData) {
  const container = host || document.getElementById('aiSummaryMount') || document.getElementById('output');
  if (!container) return;
  container.innerHTML = '';
  const card = document.createElement('section');
  card.className = 'ai-summary-card';
  const title = chartTranslate('aiSummaryTitle', 'Resumen con IA');
  const hint = chartTranslate('aiSummaryHint', 'Usa MashIA para sintetizar toda la carta.');
  const placeholder = chartTranslate('aiSummaryPlaceholder', 'Pulsa el bot\u00f3n para recibir una lectura kabal\u00edstica generada por IA.');
  const disclaimer = chartTranslate('aiSummaryDisclaimer', 'Aviso: esta s\u00edntesis autom\u00e1tica puede contener errores; consulta a un profesional para una lectura formal.');
  const langCode = resolveChartLang();
  const sectionsMeta = getAiSectionMeta(langCode);
  const sectionsHtml = sectionsMeta.map((meta) => (
    '<section class="ai-section ai-section-' + meta.key + '"><div class="ai-section-title"><span class="ai-section-icon">' + meta.icon + '</span>' + escapeHtml(meta.title) + '</div><div class="ai-section-content" data-ai-section="' + meta.key + '">' + placeholder + '</div></section>'
  )).join('');
  card.innerHTML = [
    '<header class="ai-summary-header"><div class="ai-summary-icon">\u2736</div><div><h3>' + title + '</h3><p class="ai-summary-hint">' + hint + '</p></div></header>',
    '<div class="ai-summary-body"><div class="ai-summary-sections">' + sectionsHtml + '</div></div>',
    '<p class="ai-summary-disclaimer">' + disclaimer + '</p>',
    '<div class="ai-summary-actions"><a href="https://www.psyhackers.org/spiritual-guidance" target="_blank" rel="noopener" class="ai-summary-btn" data-booking="1">' + chartTranslate('aiSummaryButton', 'Agendar gu\u00eda espiritual') + '</a></div>'
  ].join('\n');
  container.appendChild(card);
  const button = card.querySelector('.ai-summary-btn');
  const sectionNodes = {};
  sectionsMeta.forEach((meta) => {
    sectionNodes[meta.key] = card.querySelector('[data-ai-section="' + meta.key + '"]');
  });
  const endpoint = getAiBackendUrl();
  if (!endpoint) {
    try { button.setAttribute('aria-disabled', 'true'); } catch(_){}
    sectionsMeta.forEach((meta) => {
      const target = sectionNodes[meta.key];
      if (target) target.textContent = chartTranslate('aiSummaryNoBackend', 'Configura la URL de MashIA para usar esta secci\u00f3n.');
    });
    return;
  }
  if (!card.dataset.autoRequested) {
    card.dataset.autoRequested = '1';
    requestAiSummarySections(button, vizData, endpoint, true, sectionsMeta, sectionNodes);
  }
}

// Expose
try {
  window.renderEnochInfo = renderEnochInfo;
  window.renderPlanetsAndHouses = renderPlanetsAndHouses;
  window.renderElementSummary = renderElementSummary;
  window.renderAspectsTable = renderAspectsTable;
  window.renderAiSummary = renderAiSummary;
} catch(_){}



