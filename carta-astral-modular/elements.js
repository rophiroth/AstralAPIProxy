// elements.js - utilidades para conteo por elementos, modalidades y tokens
(function(){
  const SIGN_ELEMENT = {
    Aries: 'Fuego', Leo: 'Fuego', Sagittarius: 'Fuego',
    Taurus: 'Tierra', Virgo: 'Tierra', Capricorn: 'Tierra',
    Gemini: 'Aire', Libra: 'Aire', Aquarius: 'Aire',
    Cancer: 'Agua', Scorpio: 'Agua', Pisces: 'Agua'
  };

  // Glifos zodiacales
  const SIGN_SYMBOL = {
    Aries: '\u2648\uFE0E', Taurus: '\u2649\uFE0E', Gemini: '\u264A\uFE0E', Cancer: '\u264B\uFE0E',
    Leo: '\u264C\uFE0E', Virgo: '\u264D\uFE0E', Libra: '\u264E\uFE0E', Scorpio: '\u264F\uFE0E',
    Sagittarius: '\u2650\uFE0E', Capricorn: '\u2651\uFE0E', Aquarius: '\u2652\uFE0E', Pisces: '\u2653\uFE0E'
  };

  const SIGN_COLORS = {
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
  } catch (_){}

  // Glifos planetarios (y ASC)
  const PLANET_SYMBOL = {
    Sun: '\u2609', Moon: '\u263D', Mercury: '\u263F', Venus: '\u2640', Mars: '\u2642', Jupiter: '\u2643', Saturn: '\u2644', Uranus: '\u2645', Neptune: '\u2646', Pluto: '\u2647', Ascendant: '\u2191'
  };

  // Etiquetas ES (con escapes para acentos)
  const PLANET_LABEL_ES = {
    Sun:'Sol', Moon:'Luna', Mercury:'Mercurio', Venus:'Venus', Mars:'Marte', Jupiter:'J\u00FApiter', Saturn:'Saturno',
    Uranus:'Urano', Neptune:'Neptuno', Pluto:'Plut\u00F3n', Ascendant:'Ascendente'
  };
  const SIGN_LABEL_ES = {
    Aries:'Aries', Taurus:'Tauro', Gemini:'G\u00E9minis', Cancer:'C\u00E1ncer', Leo:'Leo', Virgo:'Virgo', Libra:'Libra', Scorpio:'Escorpio',
    Sagittarius:'Sagitario', Capricorn:'Capricornio', Aquarius:'Acuario', Pisces:'Piscis'
  };

  // Modalidades
  const SIGN_MODALITY = {
    Aries: 'Cardinal', Cancer: 'Cardinal', Libra: 'Cardinal', Capricorn: 'Cardinal',
    Taurus: 'Fijo', Leo: 'Fijo', Scorpio: 'Fijo', Aquarius: 'Fijo',
    Gemini: 'Mutable', Virgo: 'Mutable', Sagittarius: 'Mutable', Pisces: 'Mutable'
  };

  function elementFromSign(sign) { return SIGN_ELEMENT[sign] || ''; }
  function getSignColorValue(sign) {
    if (!sign) return '';
    try {
      const palette = (typeof window !== 'undefined' && window.SIGN_COLORS) || SIGN_COLORS;
      return (palette && palette[sign]) || SIGN_COLORS[sign] || '';
    } catch (_){
      return SIGN_COLORS[sign] || '';
    }
  }
  function renderSignToken(spanSign, content, title) {
    const signAttr = spanSign ? ` data-sign="${spanSign}"` : '';
    const titleAttr = title ? ` title="${title}"` : '';
    const color = spanSign ? getSignColorValue(spanSign) : '';
    const styleAttr = color ? ` style="color:${color};"` : '';
    return `<span class="sign-token"${signAttr}${titleAttr}${styleAttr}>${content}</span>`;
  }
  function emptyElementCount() { return { Fuego: 0, Tierra: 0, Aire: 0, Agua: 0 }; }

  // Conteos básicos (no ponderados)
  function countElementsForPlanets(planets) {
    const counts = emptyElementCount();
    if (!planets) return counts;
    for (const [, body] of Object.entries(planets)) {
      if (!body || typeof body.longitude !== 'number') continue;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(body.longitude) : null;
      if (!sign) continue;
      const el = elementFromSign(sign);
      if (el) counts[el] += 1;
    }
    return counts;
  }

  function countElementsForHouses(houses) {
    const counts = emptyElementCount();
    if (!Array.isArray(houses)) return counts;
    for (const h of houses) {
      if (!h || !h.sign) continue;
      const el = elementFromSign(h.sign);
      if (el) counts[el] += 1;
    }
    return counts;
  }

  function sumElementCounts(a, b) {
    const out = emptyElementCount();
    for (const k of Object.keys(out)) out[k] = (a?.[k] || 0) + (b?.[k] || 0);
    return out;
  }

  function dominantElement(counts) {
    let best = null, max = -Infinity;
    for (const [el, n] of Object.entries(counts || {})) {
      if (n > max) { max = n; best = el; }
    }
    return { element: best, count: max > -Infinity ? max : 0 };
  }

  // Ponderado: excluye Plutón; Sol/Luna/Asc x2; resto x1
  // Devuelve: elements ponderados y polaridad (masc/fem) usando suma directa
  function computeWeightedElementsPolarity(planets, ascendantSign) {
    const elements = emptyElementCount();
    let masc = 0, fem = 0;
    const excluded = new Set(['Pluto']);
    const specialDouble = new Set(['Sun','Moon','Ascendant']);
    function addBySign(sign, who) {
      if (!sign) return;
      const el = SIGN_ELEMENT[sign]; if (!el) return;
      const w = specialDouble.has(who) ? 2 : 1;
      elements[el] += w;
      // Polaridad simple: Fuego+Aire -> masc; Agua+Tierra -> fem
      if (el === 'Fuego' || el === 'Aire') masc += w;
      if (el === 'Agua' || el === 'Tierra') fem  += w;
    }
    for (const [name, body] of Object.entries(planets || {})) {
      if (excluded.has(name)) continue;
      const lon = body && typeof body.longitude === 'number' ? body.longitude : null;
      if (lon == null) continue;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(lon) : null;
      if (!sign) continue;
      addBySign(sign, name);
    }
    if (ascendantSign) addBySign(ascendantSign, 'Ascendant');
    return { elements, polarity: { masc, fem } };
  }

  // Raw unit counts (exclude Pluto, include Asc as 1)
  function computeRawElementsCounts(planets, ascendantSign) {
    const counts = emptyElementCount();
    const excluded = new Set(['Pluto']);
    for (const [name, body] of Object.entries(planets || {})) {
      if (excluded.has(name)) continue;
      const lon = body && typeof body.longitude === 'number' ? body.longitude : null;
      if (lon == null) continue;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(lon) : null;
      if (!sign) continue;
      const el = SIGN_ELEMENT[sign]; if (el) counts[el] += 1;
    }
    if (ascendantSign) { const el = SIGN_ELEMENT[ascendantSign]; if (el) counts[el] += 1; }
    return counts;
  }

  function computeRawModalityCounts(planets, ascendantSign) {
    const counts = { Cardinal: 0, Fijo: 0, Mutable: 0 };
    const excluded = new Set(['Pluto']);
    for (const [name, body] of Object.entries(planets || {})) {
      if (excluded.has(name)) continue;
      const lon = body && typeof body.longitude === 'number' ? body.longitude : null;
      if (lon == null) continue;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(lon) : null;
      if (!sign) continue;
      const mod = SIGN_MODALITY[sign]; if (mod) counts[mod] += 1;
    }
    if (ascendantSign) { const mod = SIGN_MODALITY[ascendantSign]; if (mod) counts[mod] += 1; }
    return counts;
  }

  function computeWeightedModalityCounts(planets, ascendantSign) {
    const counts = { Cardinal: 0, Fijo: 0, Mutable: 0 };
    const excluded = new Set(['Pluto']);
    const specialDouble = new Set(['Sun','Moon','Ascendant']);
    function add(sign, who) {
      const mod = SIGN_MODALITY[sign]; if (!mod) return;
      const w = specialDouble.has(who) ? 2 : 1; counts[mod] += w;
    }
    for (const [name, body] of Object.entries(planets || {})) {
      if (excluded.has(name)) continue;
      const lon = body && typeof body.longitude === 'number' ? body.longitude : null;
      if (lon == null) continue;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(lon) : null;
      if (!sign) continue;
      add(sign, name);
    }
    if (ascendantSign) add(ascendantSign, 'Ascendant');
    return counts;
  }

  // Tokens planeta+signo (☉♈, ↑♊) por elemento, con tooltips
  function listElementContributorsDetailed(planets, ascendantSign) {
    const out = { Fuego: [], Tierra: [], Aire: [], Agua: [] };
    const excluded = new Set(['Pluto']);
    const specialDouble = new Set(['Sun','Moon','Ascendant']);
    for (const [name, body] of Object.entries(planets || {})) {
      if (excluded.has(name)) continue;
      const lon = body && typeof body.longitude === 'number' ? body.longitude : null;
      if (lon == null) continue;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(lon) : null;
      if (!sign) continue;
      const el = SIGN_ELEMENT[sign]; if (!el) continue;
      const dbl = specialDouble.has(name) ? 'x2' : '';
      const display = `${(PLANET_SYMBOL[name]||name)}${(SIGN_SYMBOL[sign]||'')}${dbl}`;
      const token = renderSignToken(sign, display, `${(PLANET_LABEL_ES[name]||name)} en ${(SIGN_LABEL_ES[sign]||sign)}`);
      out[el].push(token);
    }
    if (ascendantSign) {
      const el = SIGN_ELEMENT[ascendantSign];
      if (el) {
        const ascDisplay = `${PLANET_SYMBOL.Ascendant}${(SIGN_SYMBOL[ascendantSign]||'')}x2`;
        out[el].push(renderSignToken(ascendantSign, ascDisplay, 'Ascendente'));
      }
    }
    return out;
  }

  // Tokens planeta+signo por modalidad, con tooltips
  function listModalityContributorsDetailed(planets, ascendantSign) {
    const out = { Cardinal: [], Fijo: [], Mutable: [] };
    const excluded = new Set(['Pluto']);
    const specialDouble = new Set(['Sun','Moon','Ascendant']);
    for (const [name, body] of Object.entries(planets || {})) {
      if (excluded.has(name)) continue;
      const lon = body && typeof body.longitude === 'number' ? body.longitude : null;
      if (lon == null) continue;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(lon) : null;
      if (!sign) continue;
      const mod = SIGN_MODALITY[sign]; if (!mod) continue;
      const dbl = specialDouble.has(name) ? 'x2' : '';
      const display = `${(PLANET_SYMBOL[name]||name)}${(SIGN_SYMBOL[sign]||'')}${dbl}`;
      const token = renderSignToken(sign, display, `${(PLANET_LABEL_ES[name]||name)} en ${(SIGN_LABEL_ES[sign]||sign)}`);
      out[mod].push(token);
    }
    if (ascendantSign) {
      const mod = SIGN_MODALITY[ascendantSign];
      if (mod) {
        const ascDisplay = `${PLANET_SYMBOL.Ascendant}${(SIGN_SYMBOL[ascendantSign]||'')}x2`;
        out[mod].push(renderSignToken(ascendantSign, ascDisplay, 'Ascendente'));
      }
    }
    return out;
  }

  // Simplificado: solo glifos de signo por elemento
  function listElementContributors(planets, ascendantSign) {
    const out = { Fuego: [], Tierra: [], Aire: [], Agua: [] };
    const excluded = new Set(['Pluto']);
    for (const [name, body] of Object.entries(planets || {})) {
      if (excluded.has(name)) continue;
      const lon = body && typeof body.longitude === 'number' ? body.longitude : null;
      if (lon == null) continue;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(lon) : null;
      if (!sign) continue;
      const el = SIGN_ELEMENT[sign];
      if (el) out[el].push(renderSignToken(sign, SIGN_SYMBOL[sign] || sign));
    }
    if (ascendantSign) {
      const el = SIGN_ELEMENT[ascendantSign];
      if (el) out[el].push(renderSignToken(ascendantSign, SIGN_SYMBOL[ascendantSign] || ascendantSign));
    }
    return out;
  }

  // Exponer globalmente
  window.elementFromSign = elementFromSign;
  window.countElementsForPlanets = countElementsForPlanets;
  window.countElementsForHouses = countElementsForHouses;
  window.sumElementCounts = sumElementCounts;
  window.dominantElement = dominantElement;
  window.computeWeightedElementsPolarity = computeWeightedElementsPolarity;
  window.computeRawElementsCounts = computeRawElementsCounts;
  window.computeRawModalityCounts = computeRawModalityCounts;
  window.computeWeightedModalityCounts = computeWeightedModalityCounts;
  try { window.SIGN_SYMBOL = SIGN_SYMBOL; } catch (_){}
  window.listElementContributors = listElementContributors;
  window.listElementContributorsDetailed = listElementContributorsDetailed;
  window.listModalityContributorsDetailed = listModalityContributorsDetailed;
})();
