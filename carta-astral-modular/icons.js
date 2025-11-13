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

window.zodiacEmojis = {
  Aries: "\u2648",
  Taurus: "\u2649",
  Gemini: "\u264A",
  Cancer: "\u264B",
  Leo: "\u264C",
  Virgo: "\u264D",
  Libra: "\u264E",
  Scorpio: "\u264F",
  Sagittarius: "\u2650",
  Capricorn: "\u2651",
  Aquarius: "\u2652",
  Pisces: "\u2653"
};

// Helpers
window.getPlanetEmoji = function(name) {
  return window.planetEmojis[name] || "";
};
window.getZodiacEmoji = function(sign) {
  return window.zodiacEmojis[sign] || "";
};

