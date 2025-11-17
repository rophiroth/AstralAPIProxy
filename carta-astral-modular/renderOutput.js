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
  Aries:'\u2648', Taurus:'\u2649', Gemini:'\u264A', Cancer:'\u264B',
  Leo:'\u264C', Virgo:'\u264D', Libra:'\u264E', Scorpio:'\u264F',
  Sagittarius:'\u2650', Capricorn:'\u2651', Aquarius:'\u2652', Pisces:'\u2653'
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
  const dot = color ? '<span class="sign-color-dot" style="background:' + color + ';"></span>' : '';
  return '<span class="sign-iconic" data-sign="' + sign + '"' + styleAttr + '>' + dot + '<span class="sign-glyph">' + glyph + '</span></span>';
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

function renderEnochInfo(container, enoch, lastSunLongitude){
  try {
    const shemAstron = (typeof getShemAstronomico==='function') ? getShemAstronomico(lastSunLongitude) : '';
    const shemEnoch  = (typeof getShemEnochiano==='function') ? getShemEnochiano(enoch.enoch_month, enoch.enoch_day, enoch.added_week) : '';
    container.innerHTML = [
      '<div style="background:var(--card-bg);color:var(--text);border:1px solid var(--border);padding:10px;border-radius:8px;">',
      '  <h3>' + chartTranslate('enochTitle', 'Calendario de Enoj') + '</h3>',
      '  <ul style="list-style:none;padding:0;margin:0 0 10px 0;">',
      '    <li><strong>' + chartTranslate('enochYear', 'Año') + ':</strong> ' + enoch.enoch_year + '</li>',
      '    <li><strong>' + chartTranslate('enochMonth', 'Mes') + ':</strong> ' + enoch.enoch_month + '</li>',
      '    <li><strong>' + chartTranslate('enochDay', 'Día') + ':</strong> ' + enoch.enoch_day + '</li>',
      '    <li><strong>' + chartTranslate('enochDayOfYear', 'Día del año') + ':</strong> ' + enoch.enoch_day_of_year + '</li>',
      '    <li><strong>' + chartTranslate('enochAddedWeek', 'Semana adicional') + ':</strong> ' + (enoch.added_week ? chartTranslate('yesLabel', 'Sí') : chartTranslate('noLabel', 'No')) + '</li>',
      '    <li><strong>' + chartTranslate('enochAstronomicalName', 'Nombre (Astronómico)') + ':</strong> <span class="shemHebrew metatron">' + shemAstron + '</span> <span class="shemHebrew stam">' + shemAstron + '</span></li>',
      '    <li><strong>' + chartTranslate('enochEnochName', 'Nombre (Enoch)') + ':</strong> <span class="shemHebrew metatron">' + shemEnoch + '</span> <span class="shemHebrew stam">' + shemEnoch + '</span></li>',
      '  </ul>',
      '</div>'
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

// Expose
try {
  window.renderEnochInfo = renderEnochInfo;
  window.renderPlanetsAndHouses = renderPlanetsAndHouses;
  window.renderElementSummary = renderElementSummary;
  window.renderAspectsTable = renderAspectsTable;
} catch(_){}

