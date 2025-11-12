// renderOutput.js (sanitized)

// Hebrew letters (StamHebrew) for houses
const hebrewLettersMap = {
  1:"\u05D0",2:"\u05D1",3:"\u05D2",4:"\u05D3",5:"\u05D4",6:"\u05D5",
  7:"\u05D6",8:"\u05D7",9:"\u05D8",10:"\u05D9",11:"\u05DB",12:"\u05DC"
};
try { window.hebrewLettersMap = hebrewLettersMap; } catch(_) {}

function renderEnochInfo(container, enoch, lastSunLongitude){
  try {
    const shemAstron = (typeof getShemAstronomico==='function') ? getShemAstronomico(lastSunLongitude) : '';
    const shemEnoch  = (typeof getShemEnochiano==='function') ? getShemEnochiano(enoch.enoch_month, enoch.enoch_day, enoch.added_week) : '';
    container.innerHTML = [
      '<div style="background:#f0f8ff;padding:10px;border-radius:8px;">',
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
    '<div style="background:#fffbea;padding:10px;border-radius:8px;margin-top:10px;">',
    '  <h3>Planetas</h3>',
    '  <ul style="list-style:none;padding:0;">'
  ];
  try {
    for (const [name, body] of Object.entries(planets||{})){
      const lon = body && typeof body.longitude==='number' ? body.longitude : null;
      if (lon==null) continue;
      const zodiacSign = (typeof getZodiacSign==='function') ? getZodiacSign(lon) : '';
      const ze = (window.zodiacEmojis && window.zodiacEmojis[zodiacSign]) || '';
      html.push('<li>' + (window.planetEmojis?.[name]||'') + ' <strong>' + name + ':</strong> ' + (ze||'') + ' ' + zodiacSign + ' ' + (decimals(lon%30,4)) + '\u00B0 (' + decimals(lon,4) + '\u00B0)</li>');
    }
  } catch(_){}
  html.push('  </ul>','</div>');

  // houses
  html.push('<div style="background:#e6f7ff;padding:10px;border-radius:8px;margin-top:10px;">','  <h3>Casas Astrologicas</h3>','  <ul style="list-style:none;padding:0;">');
  try {
    html.push('<li><strong>Asc:</strong> ' + ((window.zodiacEmojis && window.zodiacEmojis[ascendant.sign])||'') + ' ' + ascendant.sign + ' ' + decimals(ascendant.position,4) + '\u00B0 ' + decimals(ascendant.degree,4) + '\u00B0</li>');
    html.push('<li><strong>MC:</strong> ' + ((window.zodiacEmojis && window.zodiacEmojis[midheaven.sign])||'') + ' ' + midheaven.sign + ' ' + decimals(midheaven.position,4) + '\u00B0 ' + decimals(midheaven.degree,4) + '\u00B0</li>');
    for (const h of (houses||[])){
      const ze = (window.zodiacEmojis && window.zodiacEmojis[h.sign]) || '';
      html.push('<li><strong>Casa ' + h.house + ':</strong> ' + (ze||'') + ' ' + h.sign + ' ' + decimals(h.position,4) + '\u00B0 <span style="font-family:\'StamHebrew\';">' + (hebrewLettersMap[h.house]||'') + '</span></li>');
    }
  } catch(_){}
  html.push('  </ul>','</div>');

  container.innerHTML += html.join('\n');
}

// =============== Element summary ===============
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

    const cell = (title, val, list) => '<div class="cell-top">'+title+' '+fmt(val)+'</div><div class="cell-sub">'+(list && list.length? list.join(' ') : '-')+'</div>';
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
      '      <td style="padding:4px 8px;">'+cell('Fuego', raw.Fuego||0, tokens?tokens.Fuego:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cell('Tierra', raw.Tierra||0, tokens?tokens.Tierra:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cell('Aire', raw.Aire||0, tokens?tokens.Aire:null)+'</td>'+
      '      <td style="padding:4px 8px;">'+cell('Agua', raw.Agua||0, tokens?tokens.Agua:null)+'</td></tr>',
      '    <tr><td style="padding:4px 8px;">Puntaje (ponderado)</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Fuego)?'<span class="hi">'+fmt(counts.Fuego)+'</span>':fmt(counts.Fuego||0))+'</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Tierra)?'<span class="hi">'+fmt(counts.Tierra)+'</span>':fmt(counts.Tierra||0))+'</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Aire)?'<span class="hi">'+fmt(counts.Aire)+'</span>':fmt(counts.Aire||0))+'</td>'+
      '      <td style="padding:4px 8px;">'+(hi(counts.Agua)?'<span class="hi">'+fmt(counts.Agua)+'</span>':fmt(counts.Agua||0))+'</td></tr>',
      '  </tbody>',
      '</table>',
      '<div style="margin-top:8px;">'+
        '<strong>Polaridad (puntaje x2):</strong> Masculino (Fuego+Aire): '+fmt(mascW)+' | Femenino (Agua+Tierra): '+fmt(femW)+'</div>'
    ].join('\n');

    container.appendChild(card);
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

