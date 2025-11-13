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

function renderEnochInfo(container, enoch, lastSunLongitude){
  try {
    const shemAstron = (typeof getShemAstronomico==='function') ? getShemAstronomico(lastSunLongitude) : '';
    const shemEnoch  = (typeof getShemEnochiano==='function') ? getShemEnochiano(enoch.enoch_month, enoch.enoch_day, enoch.added_week) : '';
    container.innerHTML = [
      '<div style="background:var(--card-bg);color:var(--text);border:1px solid var(--border);padding:10px;border-radius:8px;">',
      '  <h3>Calendario de Enoch</h3>',
      '  <ul style="list-style:none;padding:0;margin:0 0 10px 0;">',
      '    <li><strong>A\u00F1o:</strong> ' + enoch.enoch_year + '</li>',
      '    <li><strong>Mes:</strong> ' + enoch.enoch_month + '</li>',
      '    <li><strong>D\u00EDa:</strong> ' + enoch.enoch_day + '</li>',
      '    <li><strong>D\u00EDa del a\u00F1o:</strong> ' + enoch.enoch_day_of_year + '</li>',
      '    <li><strong>Semana adicional:</strong> ' + (enoch.added_week ? 'S\u00ED' : 'No') + '</li>',
      '    <li><strong>Nombre (Astron\u00F3mico):</strong> <span class="shemHebrew metatron">' + shemAstron + '</span> <span class="shemHebrew stam">' + shemAstron + '</span></li>',
      '    <li><strong>Nombre (Enoch):</strong> <span class="shemHebrew metatron">' + shemEnoch + '</span> <span class="shemHebrew stam">' + shemEnoch + '</span></li>',
      '  </ul>',
      '</div>'
    ].join('\n');
  } catch(e) {
    try { container.innerHTML = '<em>Error mostrando Calendario</em>'; } catch(_) {}
  }
}

function renderPlanetsAndHouses(container, planets, houses_data){
  const { ascendant, midheaven, houses } = houses_data || {};
  // planets
  let html = [
    '<div style="background:var(--card-bg);color:var(--text);padding:10px;border-radius:8px;margin-top:10px;border:1px solid var(--border);">',
    '  <h3>Planetas</h3>',
    '  <ul style="list-style:none;padding:0;">'
  ];
  try {
    for (const [name, body] of Object.entries(planets||{})){
      const lon = body && typeof body.longitude==='number' ? body.longitude : null;
      if (lon==null) continue;
      const zodiacSign = (typeof getZodiacSign==='function') ? getZodiacSign(lon) : '';
      const ze = (window.zodiacEmojis && window.zodiacEmojis[zodiacSign]) || '';
      const pEmoji = (window.planetEmojis && window.planetEmojis[name]) || '';
      const zEmoji = ze || '';
      html.push('<li><span style="font-size:1.1em;margin-right:4px;">' + pEmoji + '</span> <strong>' + name + ':</strong> <span style="font-size:1.05em;margin-right:2px;">' + zEmoji + '</span> ' + zodiacSign + ' ' + (decimals(lon%30,4)) + '\u00B0 (' + decimals(lon,4) + '\u00B0)</li>');
    }
  } catch(_){}
  html.push('  </ul>','</div>');

  // houses
  html.push('<div style="background:var(--card-bg);color:var(--text);padding:10px;border-radius:8px;margin-top:10px;border:1px solid var(--border);">','  <h3>Casas Astrologicas</h3>','  <ul style="list-style:none;padding:0;">');
  try {
    html.push('<li><strong>Asc:</strong> ' + ((window.zodiacEmojis && window.zodiacEmojis[ascendant.sign])||'') + ' ' + ascendant.sign + ' ' + decimals(ascendant.position,4) + '\u00B0 ' + decimals(ascendant.degree,4) + '\u00B0</li>');
    html.push('<li><strong>MC:</strong> ' + ((window.zodiacEmojis && window.zodiacEmojis[midheaven.sign])||'') + ' ' + midheaven.sign + ' ' + decimals(midheaven.position,4) + '\u00B0 ' + decimals(midheaven.degree,4) + '\u00B0</li>');
    for (const h of (houses||[])){
      const ze = (window.zodiacEmojis && window.zodiacEmojis[h.sign]) || '';
      const letter = (window.hebrewHouseLetters && window.hebrewHouseLetters[h.house]) || '';
      const letterHtml = letter ? ' <span style="font-family:\'StamHebrew\';margin-left:4px;">' + letter + '</span>' : '';
      html.push('<li><strong>Casa ' + h.house + ':</strong> ' + (ze||'') + ' ' + h.sign + ' ' + decimals(h.position,4) + '\u00B0' + letterHtml + '</li>');
    }
  } catch(_){}
  html.push('  </ul>','</div>');

  container.innerHTML += html.join('\n');
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

    const cellUnit = (val, list) => '<div class="cell-top">'+fmt(val)+'</div><div class="cell-sub">'+(list && list.length? list.join(' ') : '-')+'</div>';
    // same cell formatter for modalidades
    const cell = (_key, val, list) => '<div class="cell-top">'+fmt(val)+'</div><div class="cell-sub">'+(list && list.length? list.join(' ') : '-')+'</div>';
    const maxVal = Math.max(Number(counts.Fuego||0), Number(counts.Tierra||0), Number(counts.Aire||0), Number(counts.Agua||0));
    const hi = (v) => Math.abs(Number(v)-maxVal) < 1e-6;

    const card = document.createElement('div');
    card.className = 'element-summary';
    card.style.background = 'var(--card-bg)';
    card.style.padding = '10px';
    card.style.borderRadius = '8px';
    card.style.marginTop = '10px';

    card.innerHTML = [
      '<h3>Resumen por Elementos</h3>',
      '<table style="border-collapse:collapse;">',
      '  <thead><tr><th style="text-align:left;padding:4px 8px;">Fuente</th><th style="text-align:left;padding:4px 8px;">Fuego</th><th style="text-align:left;padding:4px 8px;">Tierra</th><th style="text-align:left;padding:4px 8px;">Aire</th><th style="text-align:left;padding:4px 8px;">Agua</th></tr></thead>',
      '  <tbody>',
      '    <tr><td style="padding:4px 8px;">Conteo (unitario)</td>'+
      '      <td style="padding:4px 8px;">'+cellUnit(raw.Fuego||0, tokens?tokens.Fuego:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cellUnit(raw.Tierra||0, tokens?tokens.Tierra:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cellUnit(raw.Aire||0, tokens?tokens.Aire:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cellUnit(raw.Agua||0, tokens?tokens.Agua:null)+'</td></tr>',
      '    <tr><td style="padding:4px 8px;">Puntaje (ponderado)</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Fuego)?'<span class="hi">'+fmt(counts.Fuego)+'</span>':fmt(counts.Fuego||0))+'</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Tierra)?'<span class="hi">'+fmt(counts.Tierra)+'</span>':fmt(counts.Tierra||0))+'</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Aire)?'<span class="hi">'+fmt(counts.Aire)+'</span>':fmt(counts.Aire||0))+'</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Agua)?'<span class="hi">'+fmt(counts.Agua)+'</span>':fmt(counts.Agua||0))+'</td></tr>',
      '  </tbody>',
      '</table>',
      '<div style="margin-top:8px;">'+
        '<strong>Polaridad:</strong> Masculino (Fuego+Aire): '+fmt(mascW)+' | Femenino (Agua+Tierra): '+fmt(femW)+'</div>',
      (function(){
        var triM = Number(counts.Fuego||0);
        var triN = Number(counts.Aire||0);
        var triF = Number((counts.Agua||0) + (counts.Tierra||0));
        var triMax = Math.max(triM, triN, triF);
        var wrap = function(label, v){ return (Math.abs(v-triMax)<1e-6)?('<span class="hi">'+fmt(v)+'</span>'):fmt(v); };
        return '<div style="margin-top:6px;"><strong>Tr\u00EDada:</strong> Masculino (Fuego): '+wrap('M',triM)+' | Neutro (Aire): '+wrap('N',triN)+' | Femenino (Agua+Tierra): '+wrap('F',triF)+'</div>';
      })()
    ].join('\n');

    container.appendChild(card);

    // Nota aclaratoria (letra chica)
    try {
      var note = document.createElement('div');
      note.className = 'note';
      note.innerHTML = 'Nota: se excluye <strong>Plutón</strong>; <strong>Sol</strong>, <strong>Luna</strong> y <strong>Ascendente</strong> puntúan ×2 en los conteos ponderados.';
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
      '<h3>Resumen por Modalidades</h3>',
      '<table style="border-collapse:collapse;">',
      '  <thead><tr><th style="text-align:left;padding:4px 8px;">Fuente</th><th style="text-align:left;padding:4px 8px;">Cardinal</th><th style="text-align:left;padding:4px 8px;">Fijo</th><th style="text-align:left;padding:4px 8px;">Mutable</th></tr></thead>',
      '  <tbody>',
      '    <tr><td style="padding:4px 8px;">Conteo (unitario)</td>'+
      '      <td style="padding:4px 8px;">'+cell('Cardinal', rawMod.Cardinal||0, modTokens?modTokens.Cardinal:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cell('Fijo', rawMod.Fijo||0, modTokens?modTokens.Fijo:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cell('Mutable', rawMod.Mutable||0, modTokens?modTokens.Mutable:null)+'</td></tr>',
      '    <tr><td style="padding:4px 8px;">Puntaje (ponderado)</td>'+
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
} catch(_){}

