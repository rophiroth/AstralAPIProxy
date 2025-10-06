function downloadCSV(data) {
  if (!data.length) return;
  const hasLunar = typeof data[0].moon_phase_angle_deg !== 'undefined';
  const hasHebrew = typeof data[0].he_year !== 'undefined';
  const baseHeader = ['gregorian','enoch_year','enoch_month','enoch_day','day_of_year','added_week','name','start_utc','end_utc'];
  const lunarHeader = hasLunar ? [
    'moon_phase_angle_deg',
    'moon_phase_angle_start_deg','moon_phase_angle_end_deg',
    'moon_illum','moon_illum_start','moon_illum_end',
    'moon_icon','moon_event','moon_event_utc',
    'moon_sign','moon_sign_primary','moon_sign_primary_pct','moon_sign_secondary','moon_sign_secondary_pct','moon_zodiac_mode',
    'moon_long_start_deg','moon_long_end_deg','moon_long_delta_deg','moon_sign_start','moon_sign_end',
    'moon_distance_km','perigee','perigee_utc','apogee','apogee_utc'
  ] : [];
  const hebrewHeader = hasHebrew ? ['he_year','he_month','he_day','he_month_name','is_rosh_chodesh','he_holiday_code','he_holiday_name'] : [];
  const astroHeader = [
    'equinox','equinox_utc','solstice','solstice_utc',
    'solar_eclipse','solar_eclipse_utc','lunar_eclipse','lunar_eclipse_utc',
    'supermoon','supermoon_utc','alignment','alignment_utc'
  ];
  const header = [...baseHeader, ...lunarHeader, ...astroHeader, ...hebrewHeader].join(',');
  const rows = data.map(d => {
    const base = [
      d.gregorian,
      d.enoch_year ?? '',
      d.enoch_month,
      d.enoch_day,
      d.day_of_year ?? '',
      d.added_week,
      (d.name ?? '').toString().replace(/,/g,' '),
      d.start_utc ?? '',
      d.end_utc ?? ''
    ];
    const lunar = hasLunar ? [
      (d.moon_phase_angle_deg ?? ''),
      (d.moon_phase_angle_start_deg ?? ''),(d.moon_phase_angle_end_deg ?? ''),
      (d.moon_illum ?? ''),(d.moon_illum_start ?? ''),(d.moon_illum_end ?? ''),
      (d.moon_icon ?? ''),
      (d.moon_event ?? ''),
      (d.moon_event_utc ?? ''),
      (d.moon_sign ?? ''),
      (d.moon_sign_primary ?? ''),
      (typeof d.moon_sign_primary_pct !== 'undefined' ? d.moon_sign_primary_pct : ''),
      (d.moon_sign_secondary ?? ''),
      (typeof d.moon_sign_secondary_pct !== 'undefined' ? d.moon_sign_secondary_pct : ''),
      (d.moon_zodiac_mode ?? ''),
      (d.moon_long_start_deg ?? ''),(d.moon_long_end_deg ?? ''),(d.moon_long_delta_deg ?? ''),(d.moon_sign_start ?? ''),(d.moon_sign_end ?? ''),
      (d.moon_distance_km ?? ''),
      (d.perigee ? '1' : ''),
      (d.perigee_utc ?? ''),
      (d.apogee ? '1' : ''),
      (d.apogee_utc ?? '')
    ] : [];
    const astro = [
      (d.equinox ?? ''), (d.equinox_utc ?? ''),
      (d.solstice ?? ''), (d.solstice_utc ?? ''),
      (d.solar_eclipse ? '1' : ''), (d.solar_eclipse_utc ?? ''),
      (d.lunar_eclipse ? '1' : ''), (d.lunar_eclipse_utc ?? ''),
      (d.supermoon ? '1' : ''), (d.supermoon_utc ?? ''),
      (typeof d.alignment !== 'undefined' ? d.alignment : ''), (d.alignment_utc ?? '')
    ];
    const heb = hasHebrew ? [
      (d.he_year ?? ''),
      (d.he_month ?? ''),
      (d.he_day ?? ''),
      (d.he_month_name ?? ''),
      (d.is_rosh_chodesh ? '1' : ''),
      (d.he_holiday_code ?? ''),
      (d.he_holiday_name ?? '')
    ] : [];
    return [...base, ...lunar, ...astro, ...heb].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const yr = data[0]?.enoch_year ?? 'unknown-year';
  a.download = `enoch-calendar-${yr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadICS(data) {
  try {
    if (!Array.isArray(data) || data.length === 0) return;
    const now = new Date();
    const dtstamp = toIcsDateTime(now.toISOString());

    function esc(txt) {
      return String(txt || '')
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
    }
    function toIcsDateTime(iso) {
      try {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d)) return '';
        const y = d.getUTCFullYear();
        if (y <= 0 || y > 9999) return ''; // iCalendar doesn't support extended years
        const pad = (n)=> String(n).padStart(2,'0');
        const y4 = String(y).padStart(4,'0');
        return `${y4}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
      } catch(_) { return ''; }
    }
    function hourAfter(iso) {
      try {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        d.setUTCHours(d.getUTCHours()+1);
        return d.toISOString();
      } catch(_) { return iso || ''; }
    }

    const L = (typeof window !== 'undefined' && (window.lang || '').toLowerCase()) === 'en' ? 'en' : 'es';
    const labels = (L === 'en') ? {
      equinox: 'Equinox', solstice: 'Solstice', solarEclipse: 'Solar eclipse', lunarEclipse: 'Lunar eclipse',
      supermoon: 'Supermoon', alignment: 'Planetary alignment', full: 'Full Moon', new: 'New Moon', first_quarter: 'First Quarter', last_quarter: 'Last Quarter',
      perigee: 'Lunar perigee', apogee: 'Lunar apogee'
    } : {
      equinox: 'Equinoccio', solstice: 'Solsticio', eclipseSolar: 'Eclipse solar', eclipseLunar: 'Eclipse lunar',
      supermoon: 'Súper luna', alignment: 'Alineación planetaria', full: 'Luna llena', new: 'Luna nueva', first_quarter: 'Cuarto creciente', last_quarter: 'Cuarto menguante',
      perigee: 'Perigeo lunar', apogee: 'Apogeo lunar'
    };

    const lines = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('PRODID:-//AstralAPIProxy//Enoch Calendar//ES');
    lines.push('VERSION:2.0');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push(`X-WR-CALNAME:${esc(L==='en'?'Enoch Calendar — Astronomy':'Calendario de Enoj — Astronomía')}`);
    lines.push('X-WR-TIMEZONE:UTC');

    function pushEvent({ uid, startIso, endIso, summary, desc, cats }) {
      const dtStart = toIcsDateTime(startIso);
      const dtEnd = toIcsDateTime(endIso || hourAfter(startIso));
      if (!dtStart) return; // skip invalid
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${esc(uid)}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART:${dtStart}`);
      if (dtEnd) lines.push(`DTEND:${dtEnd}`);
      if (summary) lines.push(`SUMMARY:${esc(summary)}`);
      if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
      if (cats) lines.push(`CATEGORIES:${esc(cats)}`);
      lines.push('END:VEVENT');
    }

    const cat = 'Astronomy';
    for (const d of data) {
      // Lunar phase event
      if (d.moon_event && d.moon_event_utc) {
        const sum = labels[d.moon_event] || d.moon_event;
        pushEvent({
          uid: `enoch-${d.enoch_year}-${d.day_of_year}-moon-${d.moon_event}`,
          startIso: d.moon_event_utc,
          summary: sum,
          desc: `Phase: ${d.moon_event}${d.moon_distance_km?`\nDistance: ${d.moon_distance_km} km`:''}`,
          cats: cat
        });
      }
      // Perigee/Apogee
      if (d.perigee && d.perigee_utc) {
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-perigee`, startIso: d.perigee_utc, summary: labels.perigee, cats: cat });
      }
      if (d.apogee && d.apogee_utc) {
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-apogee`, startIso: d.apogee_utc, summary: labels.apogee, cats: cat });
      }
      // Equinox / Solstice
      if (d.equinox && d.equinox_utc) {
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-equinox-${d.equinox}`, startIso: d.equinox_utc, summary: `${labels.equinox}`, cats: cat });
      }
      if (d.solstice && d.solstice_utc) {
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-solstice-${d.solstice}`, startIso: d.solstice_utc, summary: `${labels.solstice}`, cats: cat });
      }
      // Eclipses
      if (d.solar_eclipse && d.solar_eclipse_utc) {
        const sum = (L==='en') ? labels.solarEclipse : labels.eclipseSolar;
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-solar-eclipse`, startIso: d.solar_eclipse_utc, summary: sum, cats: cat });
      }
      if (d.lunar_eclipse && d.lunar_eclipse_utc) {
        const sum = (L==='en') ? labels.lunarEclipse : labels.eclipseLunar;
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-lunar-eclipse`, startIso: d.lunar_eclipse_utc, summary: sum, cats: cat });
      }
      // Supermoon
      if (d.supermoon && d.supermoon_utc) {
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-supermoon`, startIso: d.supermoon_utc, summary: labels.supermoon, cats: cat });
      }
      // Alignment
      if (typeof d.alignment !== 'undefined' && d.alignment_utc) {
        const n = Number(d.alignment)||0;
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-alignment-${n}`, startIso: d.alignment_utc, summary: `${labels.alignment}${n?` (${n})`:''}`, cats: cat });
      }
    }

    lines.push('END:VCALENDAR');
    const ics = lines.join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const yr = data[0]?.enoch_year ?? 'year';
    a.download = `enoch-astro-${yr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('[ICS] build failed', e);
  }
}
