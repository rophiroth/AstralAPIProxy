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

function renderElementSummary(container, planets, ascendant) {
  const ascSign = ascendant && ascendant.sign;
  // Raw unit counts (conteo) — excluye Plutón, incluye Ascendente (1)
  const rawCounts = window.computeRawElementsCounts(planets, ascSign);
  // Weighted elements + polarity — excluye Plutón, incluye Ascendente con ponderaciones
  const { elements: weightedCounts, polarity } = window.computeWeightedElementsPolarity(planets, ascSign);
  // Modalities
  const rawMods = window.computeRawModalityCounts(planets, ascSign);
  const weightedMods = window.computeWeightedModalityCounts(planets, ascSign);
  const contribEl = window.listElementContributorsDetailed ? window.listElementContributorsDetailed(planets, ascSign) : null;
  const contribMod = window.listModalityContributorsDetailed ? window.listModalityContributorsDetailed(planets, ascSign) : null;
  const masc = polarity.masc;
  const fem  = polarity.fem;
  const dominantPolarity = masc === fem ? 'Empate' : (masc > fem ? 'Masculino' : 'Femenino');
  const trio = {
    'Masculino (Fuego)': weightedCounts.Fuego || 0,
    'Neutro (Aire)': weightedCounts.Aire || 0,
    'Femenino (Agua+Tierra)': (weightedCounts.Agua || 0) + (weightedCounts.Tierra || 0)
  };

  const block = document.createElement('div');
  block.className = 'element-summary';
  block.style.background = 'var(--card-bg)';
  block.style.padding = '10px';
  block.style.borderRadius = '8px';
  block.style.marginTop = '10px';
  // Celdas con aportantes (planeta+signo)
  const cell = (icon, val, tokens) => `
      <div class="cell-top">${icon} ${val}</div>
      <div class="cell-sub">${(tokens && tokens.length) ? tokens.join(' ') : '-'}</div>`;
  const row2 = (label, counts, tokensByEl) => `
    <tr>
      <td style="padding:4px 8px;">${label}</td>
      <td style="padding:4px 8px;">${cell('🔥', counts.Fuego, tokensByEl ? tokensByEl.Fuego : null)}</td>
      <td style="padding:4px 8px;">${cell('🌱', counts.Tierra, tokensByEl ? tokensByEl.Tierra : null)}</td>
      <td style="padding:4px 8px;">${cell('💨', counts.Aire, tokensByEl ? tokensByEl.Aire : null)}</td>
      <td style="padding:4px 8px;">${cell('💧', counts.Agua, tokensByEl ? tokensByEl.Agua : null)}</td>
    </tr>`;

  const row = (label, counts) => `
    <tr>
      <td style="padding:4px 8px;">${label}</td>
      <td style="padding:4px 8px;">🔥 ${counts.Fuego}</td>
      <td style="padding:4px 8px;">🌱 ${counts.Tierra}</td>
      <td style="padding:4px 8px;">💨 ${counts.Aire}</td>
      <td style="padding:4px 8px;">💧 ${counts.Agua}</td>
    </tr>`;

  const fmt = (n) => (Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : (Math.round(n*100)/100).toFixed(2));

  const maxWeighted = Math.max(
    Number(weightedCounts.Fuego||0),
    Number(weightedCounts.Tierra||0),
    Number(weightedCounts.Aire||0),
    Number(weightedCounts.Agua||0)
  );
  const isMax = (v) => Math.abs(Number(v) - maxWeighted) < 1e-6;

  const puntajeRow = `
    <tr>
      <td style="padding:4px 8px;">Puntaje (ponderado)</td>
      <td style="padding:4px 8px;">🔥 ${isMax(weightedCounts.Fuego||0) ? `<span class="hi">${fmt(weightedCounts.Fuego||0)}</span>` : fmt(weightedCounts.Fuego||0)}</td>
      <td style="padding:4px 8px;">🌱 ${isMax(weightedCounts.Tierra||0) ? `<span class=\"hi\">${fmt(weightedCounts.Tierra||0)}</span>` : fmt(weightedCounts.Tierra||0)}</td>
      <td style="padding:4px 8px;">💨 ${isMax(weightedCounts.Aire||0) ? `<span class=\"hi\">${fmt(weightedCounts.Aire||0)}</span>` : fmt(weightedCounts.Aire||0)}</td>
      <td style="padding:4px 8px;">💧 ${isMax(weightedCounts.Agua||0) ? `<span class=\"hi\">${fmt(weightedCounts.Agua||0)}</span>` : fmt(weightedCounts.Agua||0)}</td>
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
        ${row2('Conteo (unitario)', {
          Fuego: fmt(rawCounts.Fuego||0),
          Tierra: fmt(rawCounts.Tierra||0),
          Aire: fmt(rawCounts.Aire||0),
          Agua: fmt(rawCounts.Agua||0)
        }, window.listElementContributorsDetailed ? window.listElementContributorsDetailed(planets, ascSign) : null)}
        ${puntajeRow}
      </tbody>
    </table>
    <h3 style="margin-top:14px;">Resumen por Modos</h3>
    ${(() => {
      const maxWM = Math.max(Number(weightedMods.Cardinal||0), Number(weightedMods.Fijo||0), Number(weightedMods.Mutable||0));
      const hiM = (v) => Math.abs(Number(v) - maxWM) < 1e-6;
      return `
      <table style="border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:4px 8px;">Fuente</th>
            <th style="text-align:left;padding:4px 8px;">Cardinal</th>
            <th style="text-align:left;padding:4px 8px;">Fijo</th>
            <th style="text-align:left;padding:4px 8px;">Mutable</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:4px 8px;">Conteo (unitario)</td>
            <td style="padding:4px 8px;"><div class="cell-top">${fmt(rawMods.Cardinal||0)}</div><div class="cell-sub">${(contribMod && contribMod.Cardinal && contribMod.Cardinal.length ? contribMod.Cardinal.join(' ') : '-')}</div></td>
            <td style="padding:4px 8px;"><div class="cell-top">${fmt(rawMods.Fijo||0)}</div><div class="cell-sub">${(contribMod && contribMod.Fijo && contribMod.Fijo.length ? contribMod.Fijo.join(' ') : '-')}</div></td>
            <td style="padding:4px 8px;"><div class="cell-top">${fmt(rawMods.Mutable||0)}</div><div class="cell-sub">${(contribMod && contribMod.Mutable && contribMod.Mutable.length ? contribMod.Mutable.join(' ') : '-')}</div></td>
          </tr>
          <tr>
            <td style="padding:4px 8px;">Puntaje (ponderado)</td>
            <td style="padding:4px 8px;">${hiM(weightedMods.Cardinal||0) ? `<span class="hi">${fmt(weightedMods.Cardinal||0)}</span>` : fmt(weightedMods.Cardinal||0)}</td>
            <td style="padding:4px 8px;">${hiM(weightedMods.Fijo||0) ? `<span class="hi">${fmt(weightedMods.Fijo||0)}</span>` : fmt(weightedMods.Fijo||0)}</td>
            <td style="padding:4px 8px;">${hiM(weightedMods.Mutable||0) ? `<span class="hi">${fmt(weightedMods.Mutable||0)}</span>` : fmt(weightedMods.Mutable||0)}</td>
          </tr>
        </tbody>
      </table>`;
    })()}
    <div style="margin-top:6px;color:#475467;font-size:13px;">
      <strong>Aportantes (planetas+Asc):</strong>
      Fuego: ${(window.listElementContributors(planets, ascSign).Fuego || []).join(' ') || '-'} ·
      Tierra: ${(window.listElementContributors(planets, ascSign).Tierra || []).join(' ') || '-'} ·
      Aire: ${(window.listElementContributors(planets, ascSign).Aire || []).join(' ') || '-'} ·
      Agua: ${(window.listElementContributors(planets, ascSign).Agua || []).join(' ') || '-'}
    </div>
    <div style="margin-top:8px;">
      <strong>Polaridad (ponderada):</strong> Masculino (🔥+💨): ${fmt(masc)} | Femenino (💧+🌱): ${fmt(fem)} → <em>${dominantPolarity}</em>
      <br>
      <strong>Tríada propuesta:</strong>
      ${(() => {
        const maxT = Math.max(Number(trio['Masculino (Fuego)']), Number(trio['Neutro (Aire)']), Number(trio['Femenino (Agua+Tierra)']));
        const hi = (val, label, icon) => {
          const txt = `${label} (${icon}): ${fmt(val)}`;
          return Math.abs(Number(val) - maxT) < 1e-6 ? `<span class="hi">${txt}</span>` : txt;
        };
        return [
          hi(trio['Masculino (Fuego)'], 'Masculino', '🔥'),
          hi(trio['Neutro (Aire)'], 'Neutro', '💨'),
          hi(trio['Femenino (Agua+Tierra)'], 'Femenino', '💧+🌱')
        ].join(' | ');
      })()}
    </div>
    <div style="margin-top:6px;color:#667085;font-size:12px;">
      <em>Notas:</em> Conteo excluye Plutón e incluye Ascendente (1). Puntaje pondera Sol/Luna/Asc x2; Aire 75/25, Tierra 25/75.
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

  // Usar los conteos ponderados para el prompt/heurística
  const prompt = buildElementPromptPolarity(weightedCounts, masc, fem, trio, dominantPolarity);
  const btn = block.querySelector('#ai-generate');
  const out = block.querySelector('#ai-output');

  btn.addEventListener('click', async () => {
    btn.disabled = true; btn.textContent = 'Generando...';
    try {
      const txt = await generateAIInsight(prompt);
      out.textContent = txt;
    } catch (e) {
      out.textContent = 'No se pudo solicitar IA. Interpretación heurística local:\n' + heuristicInsightPolarity(weightedCounts, masc, fem, trio, dominantPolarity);
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
