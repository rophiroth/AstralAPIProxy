// icons.js

// Mappings for planet and zodiac emojis
window.planetEmojis = {
  Sun: "☉",
  Moon: "☾",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇"
};

window.zodiacEmojis = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓"
};
// ✨ Exportar funciones de ayuda ✨
window.getPlanetEmoji = function(name) {
  return window.planetEmojis[name] || "";
};
window.getZodiacEmoji = function(sign) {
  return window.zodiacEmojis[sign] || "";
};