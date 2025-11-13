function setupTooltip(canvas, houses, planets) {
  const tooltip = document.createElement('div');
  const rootStyles = getComputedStyle(document.documentElement);
  const bg = rootStyles.getPropertyValue('--card-bg') || '#222';
  const text = rootStyles.getPropertyValue('--text') || '#eee';
  const border = rootStyles.getPropertyValue('--border') || '#444';
  tooltip.style.position = 'absolute';
  tooltip.style.background = String(bg).trim();
  tooltip.style.color = String(text).trim();
  tooltip.style.padding = '8px 12px';
  tooltip.style.borderRadius = '6px';
  tooltip.style.border = '1px solid ' + String(border).trim();
  tooltip.style.fontSize = '13px';
  tooltip.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.display = 'none';
  tooltip.style.zIndex = 9999;
  tooltip.style.boxShadow = rootStyles.getPropertyValue('--shadow') || '0 8px 24px rgba(0,0,0,0.25)';
  document.body.appendChild(tooltip);

  const planetsByHouse = getPlanetsByHouse(planets, houses);
  const houseCoords = getHouseCoords(houses); // ensure loaded before

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = 1; i <= 12; i++) {
      const h = houses[i - 1];
      const pos = houseCoords[i];
      if (!pos) continue;
      const dx = x - pos.x;
      const dy = y - pos.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 30) {
        const planetsInHouse = planetsByHouse[i - 1] || [];
        let tooltipContent = `
          <strong>House ${h.house}</strong><br>
          ${(typeof getZodiacEmoji==='function'?getZodiacEmoji(h.sign):(window.zodiacEmojis?.[h.sign]||''))} ${h.sign} ${decimals(h.position, 4)}\u00B0<br>
          <span style="font-family:'StamHebrew'; font-size: 18px;">${(window.hebrewLettersMap||{})[h.house]||''}</span><br><br>
        `;
        if (planetsInHouse.length) {
          tooltipContent += planetsInHouse.map(p => {
            const emoji = window.planetEmojis?.[p.name] || '';
            const zodiac = getZodiacSign(p.longitude) || '';
            const zemoji = (typeof getZodiacEmoji==='function') ? getZodiacEmoji(zodiac) : (window.zodiacEmojis?.[zodiac]||'');
            return `${emoji} ${p.name}: ${zemoji} ${zodiac} ${decimals(p.longitude%30, 4)}\u00B0 ${decimals(p.longitude, 4)}\u00B0`;
          }).join('<br>');
        } else {
          tooltipContent += '<em>No planets in this house.</em>';
        }

        tooltip.innerHTML = tooltipContent;
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top  = `${e.pageY + 10}px`;
        tooltip.style.display = 'block';
        return;
      }
    }
    tooltip.style.display = 'none';
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
}

window.setupTooltip = setupTooltip;
