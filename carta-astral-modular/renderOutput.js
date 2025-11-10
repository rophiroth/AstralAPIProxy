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

function renderElementSummary(container, planets, houses) {
  const planetCounts = window.countElementsForPlanets(planets);
  const houseCounts  = window.countElementsForHouses(houses);
  const totalCounts  = window.sumElementCounts(planetCounts, houseCounts);

  const domPlanets = window.dominantElement(planetCounts);
  const domHouses  = window.dominantElement(houseCounts);
  const domTotal   = window.dominantElement(totalCounts);

  const block = document.createElement('div');
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
        ${row('Casas', houseCounts)}
        ${row('Total', totalCounts)}
      </tbody>
    </table>
    <div style="margin-top:8px;">
      <strong>Dominante (Planetas):</strong> ${domPlanets.element || '-'} (${domPlanets.count})<br>
      <strong>Dominante (Casas):</strong> ${domHouses.element || '-'} (${domHouses.count})<br>
      <strong>Dominante (Total):</strong> ${domTotal.element || '-'} (${domTotal.count})
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

  const prompt = buildElementPrompt(planetCounts, houseCounts, totalCounts, domTotal.element);
  const btn = block.querySelector('#ai-generate');
  const out = block.querySelector('#ai-output');

  btn.addEventListener('click', async () => {
    btn.disabled = true; btn.textContent = 'Generando...';
    try {
      const txt = await generateAIInsight(prompt);
      out.textContent = txt;
    } catch (e) {
      out.textContent = 'No se pudo solicitar IA. Interpretación heurística local:\n' + heuristicInsight(totalCounts, domTotal.element);
    } finally {
      btn.disabled = false; btn.textContent = 'Generar interpretación con IA';
    }
  });

  // Generar inmediatamente una interpretación base (usa IA si hay token, si no heurística)
  btn.click();
}

function buildElementPrompt(planetCounts, houseCounts, totalCounts, dominant) {
  const js = (o) => JSON.stringify(o);
  return (
    'Eres un astrólogo. Resume brevemente la energía elemental ' +
    'de esta carta. Da consejos prácticos y tono positivo. ' +
    `Planetas: ${js(planetCounts)}. Casas: ${js(houseCounts)}. ` +
    `Total: ${js(totalCounts)}. Elemento dominante: ${dominant || 'ninguno'}. ` +
    'Escribe 4–6 líneas en español neutro.'
  );
}

function heuristicInsight(totalCounts, dominant) {
  const lines = [];
  const pretty = (k, v) => `${k}: ${v}`;
  lines.push(`Balance elemental — ${pretty('Fuego', totalCounts.Fuego)}, ${pretty('Tierra', totalCounts.Tierra)}, ${pretty('Aire', totalCounts.Aire)}, ${pretty('Agua', totalCounts.Agua)}.`);
  if (dominant) {
    const msg = {
      Fuego: 'Predomina la acción y la iniciativa; canaliza con objetivos claros y constancia.',
      Tierra: 'Predomina lo práctico y estable; cultiva flexibilidad y descanso consciente.',
      Aire: 'Predomina lo mental y social; aterriza ideas con pequeños hábitos diarios.',
      Agua: 'Predomina lo emocional e intuitivo; protege tus límites y rutinas de autocuidado.'
    }[dominant];
    if (msg) lines.push(msg);
  }
  // Observación secundaria
  const entries = Object.entries(totalCounts).sort((a,b)=>b[1]-a[1]);
  if (entries[1] && entries[1][1] > 0) {
    lines.push(`Segundo elemento fuerte: ${entries[1][0].toLowerCase()}, útil como contrapeso.`);
  }
  lines.push('Sugerencia: observa en qué áreas (casas) se concentran, para aplicar foco.');
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
