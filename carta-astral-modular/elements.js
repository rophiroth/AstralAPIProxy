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

  // Exponer globalmente
  window.elementFromSign = elementFromSign;
  window.countElementsForPlanets = countElementsForPlanets;
  window.countElementsForHouses = countElementsForHouses;
  window.sumElementCounts = sumElementCounts;
  window.dominantElement = dominantElement;
})();

