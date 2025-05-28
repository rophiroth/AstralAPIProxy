// Mapa de las letras hebreas (fuente StamHebrew en CSS)
const hebrewLettersMap = {
  1: "ה", 2: "ו", 3: "ז", 4: "ח",
  5: "ט", 6: "י", 7: "ל", 8: "נ",
  9: "ס", 10: "ע", 11: "צ", 12: "ק"
};

/**
 * 1) Solo el calendario de Enoj + Nombre de Dios en dos fuentes
 */
function renderEnochInfo(container, enoch,lastSunLongitude) {
  const shemAstron = getShemAstronomico(lastSunLongitude);
  const shemEnoch  = getShemEnochiano(enoch.enoch_month, enoch.enoch_day, enoch.added_week);

  container.innerHTML = `
    <div style="background:#f0f8ff;padding:10px;border-radius:8px;">
      <h3>Calendario de Enoj:</h3>
      <ul style="list-style:none;padding:0;margin:0 0 10px 0;">
        <li><strong>Año:</strong> ${enoch.enoch_year}</li>
        <li><strong>Mes:</strong> ${enoch.enoch_month}</li>
        <li><strong>Día:</strong> ${enoch.enoch_day}</li>
        <li><strong>Día del año:</strong> ${enoch.enoch_day_of_year}</li>
        <li><strong>Semana adicional:</strong> ${enoch.added_week ? "Sí" : "No"}</li>
        <li><strong>Nombre de Dios Astronómico:</strong>
          <span class='shemHebrew metatron'>${shemAstron}</span>
          <span class='shemHebrew stam'>${shemAstron}</span>
        </li>
        <li><strong>Nombre de Dios Enoch:</strong>
          <span class='shemHebrew metatron'>${shemEnoch}</span>
          <span class='shemHebrew stam'>${shemEnoch}</span>
        </li>
      </ul>
    </div>
  `;
}

/**
 * 2) Planetas y casas (usa planetEmojis y zodiacEmojis de icons.js).
 */
function renderPlanetsAndHouses(container, planets, houses_data) {
  const { ascendant, midheaven, houses } = houses_data;

  // Guarda la posición del Sol globalmente para renderEnochInfo
  window.lastSunLongitude = planets?.Sun?.longitude || 0;

  // Planetas
  let html = `
    <div style="background:#fffbea;padding:10px;border-radius:8px;margin-top:10px;">
      <h3>Planetas</h3>
      <ul style="list-style:none;padding:0;">`;
  for (const [name, body] of Object.entries(planets)) {
    const pe = window.planetEmojis?.[name] || "";
    const zodiacSign = getZodiacSign(body.longitude); // Usa tu misma función
	const ze = window.zodiacEmojis[zodiacSign] || "";
    html += `
        <li>${pe} <strong>${name}:</strong> ${ze} ${zodiacSign} ${decimals((body.longitude%30),4)}° (${decimals(body.longitude,4)}°)</li>`;
  }
  html += `
      </ul>
    </div>`;

  // Casas
  html += `
    <div style="background:#e6f7ff;padding:10px;border-radius:8px;margin-top:10px;">
      <h3>Casas Astrológicas</h3>
      <ul style="list-style:none;padding:0;">
        <li>🏠 <strong>Asc:</strong>
            ${window.zodiacEmojis?.[ascendant.sign] || ""} ${ascendant.sign} ${decimals(ascendant.position,4)}° ${decimals(ascendant.degree,4)}°
        </li>
        <li>🏠 <strong>MC:</strong>
            ${window.zodiacEmojis?.[midheaven.sign] || ""} ${midheaven.sign} ${decimals(midheaven.position,4)}° ${decimals(midheaven.degree,4)}°
        </li>`;

  for (const h of houses) {
    const he = hebrewLettersMap[h.house] || "";
    const ze = window.zodiacEmojis?.[h.sign] || "";
    html += `
        <li>🏡 <strong>Casa ${h.house}:</strong>
            ${ze} ${h.sign} ${decimals(h.position,4)}°
            <span style="font-family:'StamHebrew';">${he}</span>
        </li>`;
  }

  html += `
      </ul>
    </div>`;

  container.innerHTML += html;
}

// Exponer globalmente
window.renderEnochInfo = renderEnochInfo;
window.renderPlanetsAndHouses = renderPlanetsAndHouses;
