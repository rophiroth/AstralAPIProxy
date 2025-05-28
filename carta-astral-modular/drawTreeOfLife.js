
function drawTreeOfLife(data, ctx) {
  try {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const { planets, houses_data } = data;
    const { ascendant, midheaven, houses } = houses_data;
	const sefirotPlanets = {
      "Yesod":     "Moon",
      "Hod":       "Mercury",
      "Netzach":   "Venus",
      "Tiferet":   "Sun",
      "Gevurah":   "Mars",
      "Chesed":    "Jupiter",
      "Binah":     "Saturn",
      "Chokhmah":  "Uranus",
      "Keter":     "Neptune",
      //"Maljut":    "Pluto"
    };

	drawHousesLines(houses, ctx);
    drawSefirot(ctx, sefirotPlanets, planets);
    drawAscMc(ascendant, midheaven, ctx);
    drawHousesWithIcons(houses, ctx);

    
    ctx.restore();
  } catch (err) {
    console.error("💥 Error al dibujar el Árbol de la Vida:", err);
  }
}

function drawSefirot(ctx, sefirotPlanets, planets) {
  for (const [sefira, [x, y]] of Object.entries(sefirotCoords)) {
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.stroke();

    // Nombre de la Sefirá arriba
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "black";
    ctx.fillText(sefira, x, y - 50);

    const planetName = sefirotPlanets[sefira];
    const planet = planets?.[planetName];

    if (planet && typeof planet.longitude === "number") {
      const degree = decimals((planet.longitude % 30),2);
      const sign = getZodiacSign(planet.longitude);
      const zodiacEmoji = getZodiacEmoji(sign);
      const planetEmoji = getPlanetEmoji(planetName);
		//debugValue("DEBUG, revisamos sign y zodiacEmoji: ",sign,zodiacEmoji);
      // Ícono del planeta arriba del centro
      ctx.font = "20px serif";
	  ctx.font = "20px 'Segoe UI Symbol', 'Noto Sans Symbols', 'Arial Unicode MS'";
      ctx.fillText(planetEmoji, x, y - 10);

      // Signo + grado al centro
      ctx.font = "13px sans-serif";
      ctx.fillText(`${zodiacEmoji}${degree}°`, x, y + 12);
    } else {
      //ctx.font = "12px sans-serif";
      //ctx.fillText("?°", x, y + 12);
    }
  }
}
