/* function getPlanetsByHouse(planets, houses) {
  const result = Array.from({ length: 12 }, () => []);
  const sortedHouses = houses.slice().sort((a, b) => a.house - b.house);

  for (const [name, planet] of Object.entries(planets)) {
    const lon = planet.longitude;
    for (let i = 0; i < 12; i++) {
      const start = sortedHouses[i].position;
      const end = sortedHouses[(i + 1) % 12].position;
      const houseIndex = sortedHouses[i].house - 1;

      const isInHouse = start < end
        ? lon >= start && lon < end
        : lon >= start || lon < end;

      if (isInHouse) {
        result[houseIndex].push({ name, ...planet });
        break;
      }
    }
  }
  return result;
} */

function setupTooltip(canvas, houses, planets) {
  const tooltip = document.createElement("div");
  tooltip.style.position = "absolute";
  tooltip.style.background = "#fffbea";
  tooltip.style.padding = "8px 12px";
  tooltip.style.borderRadius = "6px";
  tooltip.style.border = "1px solid #ccc";
  tooltip.style.fontSize = "13px";
  tooltip.style.fontFamily = "sans-serif";
  tooltip.style.pointerEvents = "none";
  tooltip.style.display = "none";
  tooltip.style.zIndex = 9999;
  document.body.appendChild(tooltip);

  const planetsByHouse = getPlanetsByHouse(planets, houses);
  const houseCoords = getHouseCoords(houses); // ← asegúrate de que esta función ya exista y esté cargada
	//debugValue("houseCoords", { houseCoords });
	//console.log("Is houseCoords truly object?", typeof houseCoords, houseCoords instanceof Array);
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = 1; i <= 12; i++) {
		const h= houses[i-1];
      const { x: cx, y: cy } = houseCoords[i];
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
		
      if (distance < 30) {
		//debugValue("houseCoords", {planetsByHouse, houseCoords, distance, i, x, y}); 
        const planetsInHouse = planetsByHouse[i - 1];
        if (!planetsInHouse || planetsInHouse.length === 0) {
          tooltip.style.display = "none";
        //  return;
        }

        let tooltipContent = `<strong>House ${h.house}</strong><br>${getZodiacEmoji(h.sign)} ${h.sign} ${decimals(h.position, 4)}\\u00B0\n\t\t<spanspan style="font-family:'StamHebrew'; font-size: 18px;">${(window.hebrewLettersMap||{})[h.house]}</span><br><br>`;

		if (planetsInHouse && planetsInHouse.length > 0) {
		  tooltipContent += planetsInHouse.map(p => {
			const emoji = window.planetEmojis?.[p.name] || "";
			const zodiac = window.getZodiacSign(p.longitude) || "";
			return `${emoji} ${p.name}: ${getZodiacEmoji(zodiac)} ${zodiac} ${decimals(p.longitude%30, 4)}° ${decimals(p.longitude, 4)}°`;
		  }).join("<br>");
		} else {
		  tooltipContent += "<em>No planets in this house.</em>";
		}

		tooltip.innerHTML = tooltipContent;

        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY + 10}px`;
        tooltip.style.display = "block";
        return;
      }
    }

    tooltip.style.display = "none";
  });

  canvas.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
  });
}

window.setupTooltip = setupTooltip;

