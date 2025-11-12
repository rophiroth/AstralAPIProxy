// elements.js — utilidades para conteo por elementos

(function(){
  const SIGN_ELEMENT = {
    Aries: "Fuego",
    Leo: "Fuego",
    Sagittarius: "Fuego",
    Taurus: "Tierra",
    Virgo: "Tierra",
    Capricorn: "Tierra",
    Gemini: "Aire",
    Libra: "Aire",
    Aquarius: "Aire",
    Cancer: "Agua",
    Scorpio: "Agua",
    Pisces: "Agua"
  };

  // Unicode glyphs for zodiac signs
  const SIGN_SYMBOL = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
    Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓'
  };

  // Modalities (Cardinal, Fixed, Mutable)
  const SIGN_MODALITY = {
    Aries: 'Cardinal', Cancer: 'Cardinal', Libra: 'Cardinal', Capricorn: 'Cardinal',
    Taurus: 'Fijo', Leo: 'Fijo', Scorpio: 'Fijo', Aquarius: 'Fijo',
    Gemini: 'Mutable', Virgo: 'Mutable', Sagittarius: 'Mutable', Pisces: 'Mutable'
  };

  function elementFromSign(sign) {
    return SIGN_ELEMENT[sign] || "";
  }

  function emptyElementCount() {
    return { Fuego: 0, Tierra: 0, Aire: 0, Agua: 0 };
  }

  function countElementsForPlanets(planets) {
    const counts = emptyElementCount();
    if (!planets) return counts;
    for (const [name, body] of Object.entries(planets)) {
      if (!body || typeof body.longitude !== "number") continue;
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
    let best = null;
    let max = -Infinity;
    for (const [el, n] of Object.entries(counts || {})) {
      if (n > max) { max = n; best = el; }
    }
    return { element: best, count: max > -Infinity ? max : 0 };
  }

  // =====================
  // Weighted scoring
  // - Exclude Pluto
  // - Include Ascendant
  // - Sun, Moon, Ascendant have weight 2, others 1
  // - Polarity weights per element:
  //   Fire: 100% M, 0% F
  //   Air:  75% M, 25% F
  //   Earth:25% M, 75% F
  //   Water:0% M, 100% F
  // Returns { elements:{}, polarity:{masc,fem} }
  function computeWeightedElementsPolarity(planets, ascendantSign) {
    const elements = emptyElementCount();
    let masc = 0, fem = 0;

    const excluded = new Set(['Pluto']);
    const specialDouble = new Set(['Sun','Moon','Ascendant']);

    function addBySign(sign, who) {
      if (!sign) return;
      const el = SIGN_ELEMENT[sign];
      if (!el) return;
      const w = specialDouble.has(who) ? 2 : 1;
      elements[el] += w;
      // polarity split
      if (el === 'Fuego') { masc += 1 * w; }
      else if (el === 'Aire') { masc += 0.75 * w; fem += 0.25 * w; }
      else if (el === 'Tierra') { masc += 0.25 * w; fem += 0.75 * w; }
      else if (el === 'Agua') { fem += 1 * w; }
    }

    // Planets
    for (const [name, body] of Object.entries(planets || {})) {
      if (excluded.has(name)) continue;
      const lon = body && typeof body.longitude === 'number' ? body.longitude : null;
      if (lon == null) continue;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(lon) : null;
      if (!sign) continue;
      addBySign(sign, name);
    }

    // Ascendant
    if (ascendantSign) addBySign(ascendantSign, 'Ascendant');

    return { elements, polarity: { masc, fem } };
  }

  // =====================
  // Raw counts (unit weight)
  // - Exclude Pluto
  // - Include Ascendant (unit)
  function computeRawElementsCounts(planets, ascendantSign) {
    const counts = emptyElementCount();
    const excluded = new Set(['Pluto']);
    for (const [name, body] of Object.entries(planets || {})) {
      if (excluded.has(name)) continue;
      const lon = body && typeof body.longitude === 'number' ? body.longitude : null;
      if (lon == null) continue;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(lon) : null;
      if (!sign) continue;
      const el = SIGN_ELEMENT[sign];
      if (el) counts[el] += 1;
    }
    if (ascendantSign) {
      const el = SIGN_ELEMENT[ascendantSign];
      if (el) counts[el] += 1;
    }
    return counts;
  }

  // Raw modality counts (unit weight), exclude Pluto, include Asc as 1
  function computeRawModalityCounts(planets, ascendantSign) {
    const counts = { Cardinal: 0, Fijo: 0, Mutable: 0 };
    const excluded = new Set(['Pluto']);
    for (const [name, body] of Object.entries(planets || {})) {
      if (excluded.has(name)) continue;
      const lon = body && typeof body.longitude === 'number' ? body.longitude : null;
      if (lon == null) continue;
      const sign = (typeof getZodiacSign === 'function') ? getZodiacSign(lon) : null;
      if (!sign) continue;
      const mod = SIGN_MODALITY[sign];
      if (mod) counts[mod] += 1;
    }
    if (ascendantSign) {
      const mod = SIGN_MODALITY[ascendantSign];
      if (mod) counts[mod] += 1;
    }
    return counts;
  }

  // Weighted modality counts — Sun/Moon/Asc x2; excluye Pluto
  function computeWeightedModalityCounts(planets, ascendantSign) {
    const counts = { Cardinal: 0, Fijo: 0, Mutable: 0 };
    const excluded = new Set(['Pluto']);
    const specialDouble = new Set(['Sun','Moon','Ascendant']);
    function add(sign, who) {
      const mod = SIGN_MODALITY[sign];
      if (!mod) return;
      const w = specialDouble.has(who) ? 2 : 1;
      counts[mod] += w;
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

  // List contributors per element (glyphs), exclude Pluto; include Asc
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
      if (el) out[el].push(SIGN_SYMBOL[sign] || sign);
    }
    if (ascendantSign) {
      const el = SIGN_ELEMENT[ascendantSign];
      if (el) out[el].push(SIGN_SYMBOL[ascendantSign] || ascendantSign);
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
  window.listElementContributors = listElementContributors;
})();
