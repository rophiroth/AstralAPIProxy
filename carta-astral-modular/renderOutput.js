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

// ==========================
// Resumen por Elementos + IA
// ==========================

function renderElementSummary(container, planets, _houses) {
  // Solo contar PLANETAS (sin casas)
  const planetCounts = window.countElementsForPlanets(planets);

  // Polaridad clásica
  const masc = (planetCounts.Fuego || 0) + (planetCounts.Aire || 0);
  const fem  = (planetCounts.Tierra || 0) + (planetCounts.Agua || 0);
  const dominantPolarity = masc === fem ? 'Empate' : (masc > fem ? 'Masculino' : 'Femenino');

  // Exploración: Masculino(Fuego), Neutro(Aire), Femenino(Agua+Tierra)
  const trio = {
    'Masculino (Fuego)': planetCounts.Fuego || 0,
    'Neutro (Aire)': planetCounts.Aire || 0,
    'Femenino (Agua+Tierra)': (planetCounts.Agua || 0) + (planetCounts.Tierra || 0)
  };

  const block = document.createElement('div');
  block.className = 'element-summary';
  block.style.background = '#eefaf1';
  block.style.padding = '10px';
  block.style.borderRadius = '8px';
  block.style.marginTop = '10px';

  const row = (label, counts) => `
    <tr>
      <td style="padding:4px 8px;">${label}</td>
      <td style="padding:4px 8px;">🔥 ${counts.Fuego}</td>
      <td style="padding:4px 8px;">🌱 ${counts.Tierra}</td>
      <td style="padding:4px 8px;">💨 ${counts.Aire}</td>
      <td style="padding:4px 8px;">💧 ${counts.Agua}</td>
    </tr>`;

  block.innerHTML = `
    <h3>Resumen por Elementos</h3>
    <table style="border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left;padding:4px 8px;">Fuente</th>
          <th style="text-align:left;padding:4px 8px;">Fuego</th>
          <th style="text-align:left;padding:4px 8px;">Tierra</th>
          <th style="text-align:left;padding:4px 8px;">Aire</th>
          <th style="text-align:left;padding:4px 8px;">Agua</th>
        </tr>
      </thead>
      <tbody>
        ${row('Planetas', planetCounts)}
      </tbody>
    </table>
    <div style="margin-top:8px;">
      <strong>Polaridad:</strong> Masculino (🔥+💨): ${masc} | Femenino (💧+🌱): ${fem} → <em>${dominantPolarity}</em>
      <br>
      <strong>Tríada propuesta:</strong>
      Masculino (🔥): ${trio['Masculino (Fuego)']} | Neutro (💨): ${trio['Neutro (Aire)']} | Femenino (💧+🌱): ${trio['Femenino (Agua+Tierra)']}
    </div>
    <div id="ai-section" style="margin-top:10px;background:#fff;padding:10px;border:1px solid #ccc;border-radius:6px;">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button id="ai-generate" type="button" style="background:#0b6bcb;color:#fff;border:none;padding:8px 10px;cursor:pointer;border-radius:4px;">Generar interpretación con IA</button>
        <small style="opacity:0.8;">Opcional: define <code>localStorage.HF_API_KEY</code> para usar Hugging Face gratis.</small>
      </div>
      <div id="ai-output" style="margin-top:8px;white-space:pre-wrap;"></div>
    </div>
  `;

  container.appendChild(block);

  const prompt = buildElementPromptPolarity(planetCounts, masc, fem, trio, dominantPolarity);
  const btn = block.querySelector('#ai-generate');
  const out = block.querySelector('#ai-output');

  btn.addEventListener('click', async () => {
    btn.disabled = true; btn.textContent = 'Generando...';
    try {
      const txt = await generateAIInsight(prompt);
      out.textContent = txt;
    } catch (e) {
      out.textContent = 'No se pudo solicitar IA. Interpretación heurística local:\n' + heuristicInsightPolarity(planetCounts, masc, fem, trio, dominantPolarity);
    } finally {
      btn.disabled = false; btn.textContent = 'Generar interpretación con IA';
    }
  });

  // Generar inmediatamente una interpretación base (usa IA si hay token, si no heurística)
  btn.click();
}

function buildElementPromptPolarity(planetCounts, masc, fem, trio, dominantPolarity) {
  const js = (o) => JSON.stringify(o);
  return (
    'Eres astrólogo. Resume brevemente el balance elemental y de polaridad. ' +
    'Usa tono positivo y consejos prácticos. ' +
    `Planetas por elemento: ${js(planetCounts)}. ` +
    `Polaridad (M/F): ${masc}/${fem} → ${dominantPolarity}. ` +
    `Tríada (Fuego/Aire/Agua+Tierra): ${js(trio)}. ` +
    'Escribe 4–6 líneas en español neutro.'
  );
}

function heuristicInsightPolarity(planetCounts, masc, fem, trio, dominantPolarity) {
  const lines = [];
  const p = planetCounts;
  lines.push(`Elementos — Fuego: ${p.Fuego||0}, Tierra: ${p.Tierra||0}, Aire: ${p.Aire||0}, Agua: ${p.Agua||0}.`);
  lines.push(`Polaridad — Masculino (🔥+💨): ${masc}, Femenino (💧+🌱): ${fem}. Dominante: ${dominantPolarity}.`);
  lines.push(`Tríada — Fuego: ${trio['Masculino (Fuego)']}, Aire: ${trio['Neutro (Aire)']}, Agua+Tierra: ${trio['Femenino (Agua+Tierra)']}.`);
  if (dominantPolarity === 'Masculino') lines.push('Tendencia a la iniciativa/actividad; sujeta la energía con objetivos concretos.');
  else if (dominantPolarity === 'Femenino') lines.push('Tendencia a lo receptivo/emocional; apoya con rutinas y límites saludables.');
  else lines.push('Balanceado: aprovecha la flexibilidad para alternar acción y contemplación.');
  return lines.join('\n');
}

async function generateAIInsight(prompt) {
  const key = localStorage.getItem('HF_API_KEY');
  if (!key) {
    // Sin token: caer a heurística
    throw new Error('No HF token');
  }
  const model = 'mistralai/Mistral-7B-Instruct-v0.2';
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 180, temperature: 0.7 }
    })
  });
  if (!res.ok) throw new Error('HF request failed');
  const data = await res.json();
  const txt = Array.isArray(data) && data[0]?.generated_text ? data[0].generated_text : '';
  return (txt || '').trim() || 'No se obtuvo texto del modelo.';
}

window.renderElementSummary = renderElementSummary;
