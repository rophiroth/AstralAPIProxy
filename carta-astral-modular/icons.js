// icons.js

// Mappings for planet and zodiac emojis (use real Unicode escapes)
window.planetEmojis = {
  Sun: "\u2609",
  Moon: "\u263D",
  Mercury: "\u263F",
  Venus: "\u2640",
  Mars: "\u2642",
  Jupiter: "\u2643",
  Saturn: "\u2644",
  Uranus: "\u2645",
  Neptune: "\u2646",
  Pluto: "\u2647",
  Ascendant: "\u2191"
};

// Force text presentation (FE0E) so we can recolor glyphs via CSS/canvas fills.
window.zodiacEmojis = {
  Aries: "\u2648\uFE0E",
  Taurus: "\u2649\uFE0E",
  Gemini: "\u264A\uFE0E",
  Cancer: "\u264B\uFE0E",
  Leo: "\u264C\uFE0E",
  Virgo: "\u264D\uFE0E",
  Libra: "\u264E\uFE0E",
  Scorpio: "\u264F\uFE0E",
  Sagittarius: "\u2650\uFE0E",
  Capricorn: "\u2651\uFE0E",
  Aquarius: "\u2652\uFE0E",
  Pisces: "\u2653\uFE0E"
};

// Helpers
window.getPlanetEmoji = function(name) {
  return window.planetEmojis[name] || "";
};
window.getZodiacEmoji = function(sign) {
  return window.zodiacEmojis[sign] || "";
};
