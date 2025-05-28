// drawAscMcHouses.js

// Letras hebreas para las casas (usa tu font “StamHebrew” en CSS)
const hebrewLetters = {
  1: "ה", 2: "ו", 3: "ז", 4: "ח", 5: "ט", 6: "י",
  7: "ל", 8: "נ", 9: "ס", 10: "ע", 11: "צ", 12: "ק"
};


// Mapeo de senderos diagonales para cada casa
const housePaths = {
  1:  ["Keter",    "Chokhmah"],
  2:  ["Keter",    "Binah"],
  3:  ["Chokhmah", "Gevurah"],
  4:  ["Chesed",   "Tiferet"],
  5:  ["Chokhmah", "Tiferet"],
  6:  ["Tiferet",  "Netzach"],
  7:  ["Hod",      "Yesod"],
  8:  ["Netzach",  "Yesod"],
  9:  ["Tiferet",  "Hod"],
  10: ["Binah",    "Tiferet"],
  11: ["Gevurah",  "Tiferet"],
  12: ["Binah",    "Chesed"]
};

/**
 * Dibuja Ascendente y Medio Cielo (MC).
 * @param {{ sign: string, position: number }} ascendant
 * @param {{ sign: string, position: number }} midheaven
 * @param {CanvasRenderingContext2D} ctx
 */
function drawAscMc(ascendant, midheaven, ctx) {
  const tiferet = sefirotCoords["Tiferet"];
  const maljut  = sefirotCoords["Maljut"];

  const ascY  = tiferet[1] - 100;
  const descY = tiferet[1] + 63;

  // ASC
  ctx.beginPath();
  //ctx.arc(tiferet[0], ascY, 20, 0, 2 * Math.PI);
  ctx.fillStyle = "lightgreen";
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "black";
  ctx.fillText(`ASC: ${window.zodiacEmojis[ascendant.sign]} ${decimals(ascendant.position,2)}°`, tiferet[0], ascY);
  ctx.restore();

  // DESC (opuesto)
  ctx.beginPath();
  //ctx.arc(tiferet[0], descY, 20, 0, 2 * Math.PI);
  ctx.fillStyle = "lightblue";
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "black";
  const descDegree = (ascendant.degree + 180) % 360;
  ctx.fillText(`DESC: ${window.zodiacEmojis[getZodiacSign(descDegree)]} ${decimals((descDegree%30),2)}°`, tiferet[0], descY);
  ctx.restore();

  // MC (en Maljut)
  ctx.beginPath();
  //ctx.arc(maljut[0], maljut[1], 20, 0, 2 * Math.PI);
  ctx.fillStyle = "lightcoral";
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "black";
  ctx.fillText(`MC:${window.zodiacEmojis[midheaven.sign]}${decimals(midheaven.position,1)}°`, maljut[0], maljut[1]);
  ctx.restore();
}


/**
 * Dibuja las 12 casas, con etiqueta vertical a la derecha.
 * @param {Array<{ house: number, sign: string, position: number }>} houses
 * @param {CanvasRenderingContext2D} ctx
 */
function drawHousesLines(houses, ctx) {
  if (!Array.isArray(houses)) {
    console.warn("⚠️ Casas no válidas:", houses);
    return;
  }

  houses.forEach(h => {
    const path = housePaths[h.house];
    if (!path) return;
    const [start, end] = path;
    const [x1, y1] = sefirotCoords[start];
    const [x2, y2] = sefirotCoords[end];

    // X desplazado en 3 y 12, Y siempre mitad
    const tX = (h.house === 3 || h.house === 12) ? 0.6 : 0.5;
    const x  = x1 + (x2 - x1) * tX;
    const y  = y1 + (y2 - y1) * 0.5;
    const radius = 32;

    // Dibuja el círculo
    ctx.beginPath();
    // ctx.arc(x, y, radius, 0, 2 * Math.PI);
    // ctx.fillStyle   = "lightyellow";
    // ctx.fill();
    // ctx.strokeStyle = "#666";
    // ctx.lineWidth   = 1.5;
	//linea en vez de esferas
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.strokeStyle = "#aaa";   // un color más sutil para no competir visualmente
	ctx.lineWidth   = 2;
    ctx.stroke();

    // Signo + grado dentro
    
  });
}
function drawHousesWithIcons(houses, ctx) {
  if (!Array.isArray(houses)) return;

  houses.forEach(h => {
    if (!h || !h.house || !h.sign) return;

    const path = housePaths[h.house];
    if (!path) return;
    const [start, end] = path;
    const [x1, y1] = sefirotCoords[start];
    const [x2, y2] = sefirotCoords[end];
    let t = 0.5, ty = 0.5;

    if (h.house === 3 || h.house === 12) t = .3, ty = 0.3;
    //if (h.house === 5 || h.house === 10) t = 0.45, ty = 0.3;

    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * ty;

/*     ctx.beginPath();
    // ctx.arc(x, y, 32, 0, 2 * Math.PI);
    // ctx.fillStyle = "lightyellow";
    // ctx.fill();
	//linea en vez de esferas
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.strokeStyle = "#aaa";   // un color más sutil para no competir visualmente
	ctx.lineWidth   = 2;
    ctx.stroke(); */

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#000";

    const emoji = getZodiacEmoji(h.sign) || "";
    const letter = hebrewLetters[h.house] || "";
    const pos = decimals(h.position,2);

    // Línea 1: número de casa + letra hebrea
    ctx.font = "13px sans-serif";
    ctx.fillText(`🏡${h.house}  `, x - 6, y - 10);
    ctx.font = "20px StamHebrew";
    ctx.fillText(letter, x + 12, y - 10);

    // Línea 2: signo zodiacal + grado
    ctx.font = "13px sans-serif";
    ctx.fillText(`${emoji}${pos}°`, x, y + 10);

    ctx.restore();
  });
}

// Asegúrate de que estas funciones estén disponibles globalmente
window.drawAscMc = drawAscMc;
//window.drawHouses = drawHouses;
