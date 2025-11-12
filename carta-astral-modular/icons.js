// icons.js

// Mappings for planet and zodiac emojis
window.planetEmojis = {
  Sun: "\\u2609",\n  Moon: "\\u263D",\n  Mercury: "\\u263F",\n  Venus: "\\u2640",\n  Mars: "\\u2642",\n  Jupiter: "\\u2643",\n  Saturn: "\\u2644",\n  Uranus: "\\u2645",\n  Neptune: "\\u2646",\n  Pluto: "\\u2647"\n};

window.zodiacEmojis = {
  Aries: "\\u2648",\n  Taurus: "\\u2649",\n  Gemini: "\\u264A",\n  Cancer: "\\u264B",\n  Leo: "\\u264C",\n  Virgo: "\\u264D",\n  Libra: "\\u264E",\n  Scorpio: "\\u264F",\n  Sagittarius: "\\u2650",\n  Capricorn: "\\u2651",\n  Aquarius: "\\u2652",\n  Pisces: "\\u2653"\n};
// ✨ Exportar funciones de ayuda ✨
window.getPlanetEmoji = function(name) {
  return window.planetEmojis[name] || "";
};
window.getZodiacEmoji = function(sign) {
  return window.zodiacEmojis[sign] || "";
};

