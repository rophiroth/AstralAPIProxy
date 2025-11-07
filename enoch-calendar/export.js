// Infer the Enoch year to display in filenames, preferring current UI state,
// otherwise the mode of enoch_year in the provided rows, or the year of DOY=1.
function inferEnochYear(data) {
  try {
    if (typeof window !== 'undefined' && Number.isFinite(Number(window.currentYear))) return Number(window.currentYear);
  } catch(_) {}
  try {
    if (Array.isArray(data) && data.length) {
      // Prefer the record with day_of_year === 1
      const firstDay = data.find(d => Number(d.day_of_year) === 1 && Number.isFinite(Number(d.enoch_year)));
      if (firstDay) return Number(firstDay.enoch_year);
      // Fallback: mode of enoch_year across rows
      const counts = new Map();
      for (const d of data) {
        const y = Number(d.enoch_year);
        if (!Number.isFinite(y)) continue;
        counts.set(y, (counts.get(y) || 0) + 1);
      }
      if (counts.size) {
        let best = null, bestCount = -1;
        for (const [y, c] of counts.entries()) { if (c > bestCount) { best = y; bestCount = c; } }
        if (best != null) return best;
      }
      // Last resort: first row's enoch_year
      const y0 = Number(data[0]?.enoch_year);
      if (Number.isFinite(y0)) return y0;
    }
  } catch(_) {}
  return 'year';
}

function downloadCSV(data) {
  if (!data.length) return;
  const hasLunar = typeof data[0].moon_phase_angle_deg !== 'undefined';
  const hasHebrew = typeof data[0].he_year !== 'undefined';
  const hasAlignments = typeof data[0].alignments !== 'undefined';
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
    'supermoon','supermoon_utc','alignment','alignment_utc',
    'alignment_total','alignment_planets','alignment_span_deg','alignment_score',
    ...(hasAlignments ? ['alignments'] : []),
    'solar_eclipse_mag','lunar_eclipse_mag'
  ];
  const header = [...baseHeader, ...lunarHeader, ...astroHeader, ...hebrewHeader].join(',');
  const csvQuote = (v) => {
    try {
      let s = (v === null || typeof v === 'undefined') ? '' : String(v);
      if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    } catch(_) { return String(v ?? ''); }
  };
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
      (typeof d.alignment !== 'undefined' ? d.alignment : ''), (d.alignment_utc ?? ''),
      (typeof d.alignment_total !== 'undefined' ? d.alignment_total : ''),
      csvQuote(d.alignment_planets ?? ''),
      (typeof d.alignment_span_deg !== 'undefined' ? d.alignment_span_deg : ''),
      (typeof d.alignment_score !== 'undefined' ? d.alignment_score : ''),
      ...(hasAlignments ? [csvQuote((function(){ try { return JSON.stringify(d.alignments || []); } catch(_) { return '[]'; } })())] : []),
      (typeof d.solar_eclipse_mag !== 'undefined' ? d.solar_eclipse_mag : ''),
      (typeof d.lunar_eclipse_mag !== 'undefined' ? d.lunar_eclipse_mag : '')
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
  const yr = inferEnochYear(data) ?? 'unknown-year';
  a.download = `enoch-calendar-${yr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadICS(data) {
  try {
    if (!Array.isArray(data) || data.length === 0) return;
    // Pad Pisces if the year looks truncated (31 or 38 days as appropriate)
    try { data = padEnochYearForIcs(data); } catch(_) {}
    const now = new Date();
    const dtstamp = toIcsDateTime(now.toISOString());

    function esc(txt) {
      return String(txt || '')
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
    }
    // Basic helpers for ICS date/time
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
    function minuteAfter(iso, mins = 1) {
      try {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        d.setUTCMinutes(d.getUTCMinutes() + (mins|0));
        return d.toISOString();
      } catch(_) { return iso || ''; }
    }
    function fmtHmUTC(iso) {
      try {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        const pad = (n)=> String(n).padStart(2,'0');
        return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
      } catch(_) { return ''; }
    }
    function withUtcRange(summary, startIso, endIso) {
      try {
        const a = fmtHmUTC(startIso);
        const b = fmtHmUTC(endIso);
        if (!a && !b) return String(summary||'');
        if (a && b) return `${summary} — ${a}–${b} UTC`;
        if (a) return `${summary} — ${a} UTC`;
        return `${summary} — ${b} UTC`;
      } catch(_) { return String(summary||''); }
    }
    function toIcsDate(isoDate) {
      try {
        if (!isoDate) return '';
        // Accept 'YYYY-MM-DD' or Date/ISO
        if (typeof isoDate === 'string' && /\d{4}-\d{2}-\d{2}/.test(isoDate)) {
          return isoDate.replace(/-/g, '');
        }
        const d = new Date(isoDate);
        if (isNaN(d)) return '';
        const pad = (n)=> String(n).padStart(2,'0');
        return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}`;
      } catch(_) { return ''; }
    }
    
    // Ensure ICS covers full Pisces: pad missing last Enoch days to 31 or 38
    function padEnochYearForIcs(rows) {
      try {
        if (!Array.isArray(rows) || rows.length === 0) return rows;
        // Find last record by day_of_year
        const sorted = rows.slice().sort((a,b) => Number(a.day_of_year) - Number(b.day_of_year));
        const last = sorted[sorted.length - 1];
        if (!last || Number(last.enoch_month) !== 12) return rows; // only pad when already in Pisces
        const expect38 = rows.some(r => !!r.added_week);
        const expectedPiscesDays = expect38 ? 38 : 31;
        const lastEDay = Number(last.enoch_day);
        if (!Number.isFinite(lastEDay) || lastEDay >= expectedPiscesDays) return rows;
        const missing = expectedPiscesDays - lastEDay;
        const pad = (n)=> String(n).padStart(2,'0');
        const parseYMD = (ymd) => { try { return new Date(ymd + 'T00:00:00Z'); } catch(_) { return null; } };
        const base = parseYMD(String(last.gregorian));
        if (!base || isNaN(base)) return rows;
        const out = rows.slice();
        for (let i = 1; i <= missing; i++) {
          const dt = new Date(base.getTime());
          dt.setUTCDate(dt.getUTCDate() + i);
          const ymd = ${dt.getUTCFullYear()}--;
          let shem = '';
          try {
            if (typeof window !== 'undefined' && typeof window.getShemEnochiano === 'function') {
              shem = window.getShemEnochiano(12, lastEDay + i, expect38 && (last.day_of_year + i > 364)) || '';
            }
          } catch(_) {}
          out.push({
            gregorian: ymd,
            enoch_year: last.enoch_year,
            enoch_month: 12,
            enoch_day: lastEDay + i,
            added_week: (expect38 && (last.day_of_year + i > 364)) ? true : false,
            name: shem,
            day_of_year: Number(last.day_of_year) + i,
            start_utc: '', end_utc: ''
          });
        }
        try { console.warn('[ICS] padded Pisces to', expectedPiscesDays, 'days; added', missing, 'records'); } catch(_) {}
        return out;
      } catch(_) { return rows; }
    }
    // Zodiac mapping for month → sign + glyph (1-based months)
    const ZSIGNS = [
      { en: 'Aries',       es: 'Aries',       glyph: '♈' },
      { en: 'Taurus',      es: 'Tauro',       glyph: '♉' },
      { en: 'Gemini',      es: 'Géminis',     glyph: '♊' },
      { en: 'Cancer',      es: 'Cáncer',      glyph: '♋' },
      { en: 'Leo',         es: 'Leo',         glyph: '♌' },
      { en: 'Virgo',       es: 'Virgo',       glyph: '♍' },
      { en: 'Libra',       es: 'Libra',       glyph: '♎' },
      { en: 'Scorpio',     es: 'Escorpio',    glyph: '♏' },
      { en: 'Sagittarius', es: 'Sagitario',   glyph: '♐' },
      { en: 'Capricorn',   es: 'Capricornio', glyph: '♑' },
      { en: 'Aquarius',    es: 'Acuario',     glyph: '♒' },
      { en: 'Pisces',      es: 'Piscis',      glyph: '♓' }
    ];
    function signForMonth(m) {
      const i = (Number(m) - 1 + 12) % 12;
      return ZSIGNS[i] || ZSIGNS[0];
    }
    function shemForDay(d) {
      try {
        if (d && d.name) return String(d.name);
        if (typeof window !== 'undefined' && typeof window.getShemEnochiano === 'function') {
          return window.getShemEnochiano(Number(d.enoch_month), Number(d.enoch_day), !!d.added_week) || '';
        }
      } catch(_) {}
      return '';
    }
    function padYear4(y) { try { const n = Number(y); return (Number.isFinite(n) ? String(Math.trunc(n)).padStart(4,'0') : String(y)); } catch(_) { return String(y); } }
    function formatDaySummary(d) {
      const shem = shemForDay(d) || '';
      const sg = signForMonth(d.enoch_month);
      const dd = Number(d.enoch_day);
      const yy = padYear4(d.enoch_year);
      const signName = (typeof window !== 'undefined' && (window.lang || '').toLowerCase() === 'en') ? (sg.en || '') : (sg.es || sg.en || '');
      // Use Unicode bidi isolates (recommended) to keep LTR and RTL runs independent
      const LRI = '\u2066', RLI = '\u2067', PDI = '\u2069';
      const ltr = `${dd} ${signName}${sg.glyph} ${yy}`;
      // Example result: "7 Capricorn♑ 5996 (ננא)"
      return `${LRI}${ltr}${PDI} (${RLI}${shem}${PDI})`;
    }

    function inferBounds(arr, idx) {
      const d = arr[idx];
      let start = d.start_utc || '';
      let end = d.end_utc || '';
      if (!start) {
        const prev = arr[idx - 1];
        if (prev && prev.end_utc) start = prev.end_utc;
      }
      if (!start) {
        const next = arr[idx + 1];
        if (next && next.start_utc) start = minuteAfter(next.start_utc, -24*60);
      }
      if (!end) {
        const next = arr[idx + 1];
        if (next && next.start_utc) end = next.start_utc;
      }
      if (!end && start) end = minuteAfter(start, 24*60);
      if (!start && d.gregorian) start = d.gregorian + 'T00:00:00Z';
      if (!end && d.gregorian) end = addDaysIso(d.gregorian, 1) + 'T00:00:00Z';
      return { start, end };
    }

    const L = (typeof window !== 'undefined' && (window.lang || '').toLowerCase()) === 'en' ? 'en' : 'es';
    const labels = (L === 'en') ? {
      equinox: 'Equinox', solstice: 'Solstice', solarEclipse: 'Solar eclipse', lunarEclipse: 'Lunar eclipse',
      supermoon: 'Supermoon', alignment: 'Planetary alignment', full: 'Full Moon', new: 'New Moon', first_quarter: 'First Quarter', last_quarter: 'Last Quarter',
      perigee: 'Lunar perigee', apogee: 'Lunar apogee',
      festival: 'Festival'
    } : {
      equinox: 'Equinoccio', solstice: 'Solsticio', eclipseSolar: 'Eclipse solar', eclipseLunar: 'Eclipse lunar',
      supermoon: 'Súper luna', alignment: 'Alineación planetaria', full: 'Luna llena', new: 'Luna nueva', first_quarter: 'Cuarto creciente', last_quarter: 'Cuarto menguante',
      perigee: 'Perigeo lunar', apogeo: 'Apogeo lunar',
      festival: 'Festividad'
    };
    const words = (L === 'en') ? {
      phase: 'Phase', illumination: 'Illumination', sign: 'Sign', distance: 'Distance',
      start: 'Start (UTC)', end: 'End (UTC)', addedWeek: 'Added week', yes: 'Yes', no: 'No',
      hebrew: 'Hebrew', kind: 'Kind', magnitude: 'Magnitude', obscuration: 'Obscuration',
      catAstronomy: 'Astronomy', catFestival: 'Festival', catEnoch: 'Enoch'
    } : {
      phase: 'Fase', illumination: 'Iluminación', iluminacion: 'Iluminación', sign: 'Signo', distance: 'Distancia',
      start: 'Inicio (UTC)', end: 'Fin (UTC)', addedWeek: 'Semana agregada', yes: 'Sí', no: 'No',
      hebrew: 'Hebreo', kind: 'Tipo', magnitude: 'Magnitud', obscuration: 'Oscurecimiento',
      catAstronomy: 'Astronomía', catFestival: 'Festividad', catEnoch: 'Enoj'
    };

    const lines = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('PRODID:-//AstralAPIProxy//Enoch Calendar//ES');
    lines.push('VERSION:2.0');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push(`X-WR-CALNAME:${esc(L==='en'?'Enoch Calendar — Astronomy':'Calendario de Enoj — Astronomía')}`);
    lines.push('X-WR-TIMEZONE:UTC');

    // Prevent accidental duplicated UIDs within a single export
    const usedUIDs = new Set();

    function normalizeUid(uid) {
      const base = String(uid || '').trim();
      // Append a pseudo-domain for global uniqueness in clients
      return base.includes('@') ? base : `${base}@enoch.calendar`;
    }

    function pushEvent({ uid, startIso, endIso, summary, desc, cats }) {
      const dtStart = toIcsDateTime(startIso);
      const dtEnd = toIcsDateTime(endIso || hourAfter(startIso));
      if (!dtStart) return; // skip invalid
      const nu = normalizeUid(uid);
      if (usedUIDs.has(nu)) return; // avoid duplicates
      usedUIDs.add(nu);
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${esc(nu)}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART:${dtStart}`);
      if (dtEnd) lines.push(`DTEND:${dtEnd}`);
      if (summary) lines.push(`SUMMARY:${esc(summary)}`);
      if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
      if (cats) lines.push(`CATEGORIES:${esc(cats)}`);
      lines.push('END:VEVENT');
    }

    function pushAllDayEvent({ uid, dateIso, days = 1, summary, desc, cats }) {
      const d0 = toIcsDate(dateIso);
      if (!d0) return;
      const nu = normalizeUid(uid);
      if (usedUIDs.has(nu)) return;
      usedUIDs.add(nu);
      const d1 = toIcsDate(addDaysIso(dateIso, days));
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${esc(nu)}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART;VALUE=DATE:${d0}`);
      if (d1) lines.push(`DTEND;VALUE=DATE:${d1}`);
      if (summary) lines.push(`SUMMARY:${esc(summary)}`);
      if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
      if (cats) lines.push(`CATEGORIES:${esc(cats)}`);
      lines.push('END:VEVENT');
    }

    // Lightweight aspect helpers (fallback if main.js globals not yet available)
    function aspectDeltaForPair(spanDeg) {
      try {
        const s = Number(spanDeg);
        if (!Number.isFinite(s)) return NaN;
        const targets = [0, 60, 90, 120, 180];
        let best = Infinity;
        for (const t of targets) {
          const d = Math.abs(s - t);
          if (d < best) best = d;
        }
        return Math.round(best * 10) / 10;
      } catch(_) { return NaN; }
    }
    function aspectNameFromSpan(spanDeg, count) {
      try {
        const n = Number(count);
        const s = Number(spanDeg);
        if (!isFinite(n) || !isFinite(s)) return '';
        const a = ((s % 360) + 360) % 360;
        const near = (x, t, orb) => {
          const d = Math.abs(((x - t + 540) % 360) - 180);
          return d <= orb;
        };
        const es = { conj: 'Conjunción', opp: 'Oposición', sqr: 'Cuadratura', tri: 'Trígono', sex: 'Sextil', pair: 'Par', group: 'Grupo' };
        const en = { conj: 'Conjunction', opp: 'Opposition', sqr: 'Square', tri: 'Trine', sex: 'Sextile', pair: 'Pair', group: 'Group' };
        const W = (L === 'en') ? en : es;
        // Orbs (deg) conservative defaults
        const orbs = { conj: 6, opp: 6, sqr: 5, tri: 4, sex: 3 };
        if (n === 2) {
          if (near(a, 0, orbs.conj)) return W.conj;
          if (near(a, 180, orbs.opp)) return W.opp;
          if (near(a, 90, orbs.sqr)) return W.sqr;
          if (near(a, 120, orbs.tri)) return W.tri;
          if (near(a, 60, orbs.sex)) return W.sex;
          return W.pair;
        }
        if (near(a, 0, 12)) return W.conj;
        if (near(a, 180, 12)) return W.opp;
        return W.group;
      } catch(_) { return ''; }
    }

    function fmtPct01(x) {
      const n = Number(x);
      if (!isFinite(n)) return '';
      const v = (n <= 1 && n >= 0) ? Math.round(n*100) : Math.round(n);
      return `${v}%`;
    }

    function buildFestivalMapLocal(rows) {
      try {
        const map = new Map();
        const byMD = new Map();
        for (const d of rows) byMD.set(`${d.enoch_month}-${d.enoch_day}`, d);
        function setDay(doY, classList, name, short) {
          if (!doY) return;
          const prev = map.get(doY);
          if (prev) {
            const merged = new Set([...(prev.classList||[]), ...(classList||[])]);
            const label = (classList||[]).includes('mikra') ? name : (prev.name || name);
            const s = short || prev.short || name;
            map.set(doY, { classList: [...merged], name: label, short: s });
          } else {
            map.set(doY, { classList: classList || [], name, short: short || name });
          }
        }
        // Pesach (1/14), Matzot (1/15-21)
        const pesach = byMD.get('1-14');
        if (pesach) setDay(pesach.day_of_year, ['festival','mikra','pesach'], 'Pesach', 'Pesaj');
        for (let d = 15; d <= 21; d++) {
          const rec = byMD.get(`1-${d}`);
          if (!rec) continue;
          if (d === 15 || d === 21) {
            const full = d === 15 ? 'Jag HaMatzot (1°)' : 'Jag HaMatzot (7°)';
            setDay(rec.day_of_year, ['festival','mikra','matzot'], full, 'Matzot');
          } else {
            setDay(rec.day_of_year, ['festival','fest-mid','matzot'], 'Jag HaMatzot', 'Matzot');
          }
        }
        // Rosh Hashanah 7/1, Days of Awe (7/2-9), Yom Kippur 7/10
        const rh = byMD.get('7-1');
        if (rh) setDay(rh.day_of_year, ['festival','mikra','rosh-hashanah'], 'Rosh Hashanah', 'Rosh Hash.');
        for (let d = 2; d <= 9; d++) {
          const rec = byMD.get(`7-${d}`);
          if (!rec) continue;
          setDay(rec.day_of_year, ['festival','fest-mid','awe-mid'], `Día de Teshuvá ${d}/10`, `Teshuvá ${d}`);
        }
        const yk = byMD.get('7-10');
        if (yk) setDay(yk.day_of_year, ['festival','mikra','yom-kippur'], 'Yom Kippur', 'Y. Kippur');
        // Sukkot 7/15-21; Shemini Atzeret 7/22
        for (let d = 15; d <= 21; d++) {
          const rec = byMD.get(`7-${d}`);
          if (!rec) continue;
          if (d === 15 || d === 21) {
            const full = d === 15 ? 'Sukkot (1°)' : 'Sukkot (7°)';
            setDay(rec.day_of_year, ['festival','mikra','sukkot'], full, 'Sukkot');
          } else {
            setDay(rec.day_of_year, ['festival','fest-mid','sukkot'], 'Sukkot', 'Sukkot');
          }
        }
        const shem = byMD.get('7-22');
        if (shem) setDay(shem.day_of_year, ['festival','shemini'], 'Shemini Atzeret', 'Shemini');
        // Omer 1/25..1/25+48; Shavuot day 50
        const omerStart = byMD.get('1-25');
        if (omerStart) {
          const startDOY = omerStart.day_of_year;
          for (let i = 0; i < 49; i++) {
            const doY = startDOY + i;
            const rec = rows.find(x => x.day_of_year === doY);
            if (!rec) break;
            setDay(doY, ['omer','festival','fest-mid'], `Ómer día ${i+1}`, `Ómer ${i+1}`);
          }
          const shavuotDOY = startDOY + 49;
          const shav = rows.find(x => x.day_of_year === shavuotDOY);
          if (shav) setDay(shavuotDOY, ['festival','shavuot','mikra'], 'Shavuot', 'Shavuot');
        }
        return map;
      } catch(_) { return new Map(); }
    }

    function buildAlignmentDesc(d) {
      try {
        const lines = [];
        // Prefer detailed alignments list when present
        let arr = null;
        if (Array.isArray(d.alignments)) arr = d.alignments;
        else if (typeof d.alignments === 'string') {
          try { const parsed = JSON.parse(d.alignments); if (Array.isArray(parsed)) arr = parsed; } catch(_) {}
        }
        if (!arr && (Array.isArray(d.planetary_alignments) || typeof d.planetary_alignments === 'string')) {
          try {
            const val = d.planetary_alignments;
            if (Array.isArray(val)) arr = val;
            else if (typeof val === 'string') { const parsed = JSON.parse(val); if (Array.isArray(parsed)) arr = parsed; }
          } catch(_) {}
        }
        if (Array.isArray(arr) && arr.length) {
          for (const it of arr) {
            const c = Number(it.count)||0;
            const ttl = Number(it.total)||Number(d.alignment_total)||0;
            const planets = it.planets ? ` (${it.planets})` : '';
            const spanTxt = (typeof it.span_deg === 'number' && isFinite(it.span_deg)) ? (() => {
              const val = Math.round(it.span_deg*10)/10;
              if (c === 2) {
                const dlt = (typeof it.offset_deg === 'number' && isFinite(it.offset_deg)) ? it.offset_deg : aspectDeltaForPair(it.span_deg);
                return `, ${val}° (Δ ${Math.round(dlt*10)/10}°)`;
              }
              return `, span ${val}°`;
            })() : '';
            const asp = (typeof it.span_deg === 'number' && isFinite(it.span_deg)) ? (() => {
              const nm = aspectNameFromSpan(it.span_deg, c);
              return nm ? `, ${nm}` : '';
            })() : '';
            const whenTxt = it.utc ? ` @ ${it.utc}` : '';
            const sc = (typeof it.score === 'number' && isFinite(it.score)) ? `, score ${Math.round(it.score*100)}%` : '';
            lines.push(`${c}${ttl?`/${ttl}`:''}${planets}${spanTxt}${asp}${sc}${whenTxt}`);
          }
        } else {
          // Fallback to top‑level fields
          const n = Number(d.alignment)||Number(d.alignment_count)||NaN;
          const ttl = Number(d.alignment_total)||0;
          const c = isFinite(n) ? n : (Array.isArray(d.alignments) ? d.alignments.length : NaN);
          let planetsLabel = '';
          try {
            const raw = d.alignment_planets;
            if (Array.isArray(raw)) planetsLabel = raw.join(',');
            else if (typeof raw === 'string') {
              const s = raw.trim();
              if (s.startsWith('[')) { try { const arr = JSON.parse(s); if (Array.isArray(arr)) planetsLabel = arr.join(','); else planetsLabel = s; } catch(_) { planetsLabel = s; } }
              else planetsLabel = s;
            }
            if (!planetsLabel) {
              const val = d.planetary_alignments;
              if (Array.isArray(val) && val[0] && val[0].planets) planetsLabel = String(val[0].planets);
              else if (typeof val === 'string') {
                try { const parsed = JSON.parse(val); if (Array.isArray(parsed) && parsed[0] && parsed[0].planets) planetsLabel = String(parsed[0].planets); } catch(_) {}
              }
            }
          } catch(_) {}
          const plist = planetsLabel ? ` (${planetsLabel})` : '';
          const spanTxt = (typeof d.alignment_span_deg === 'number' && isFinite(d.alignment_span_deg)) ? (() => {
            const isPair = (c === 2);
            const val = Math.round(d.alignment_span_deg*10)/10;
            if (!isPair) return `, span ${val}°`;
            const dlt = aspectDeltaForPair(d.alignment_span_deg);
            return `, ${val}° (Δ ${Math.round(dlt*10)/10}°)`;
          })() : '';
          const asp = (typeof d.alignment_span_deg === 'number' && isFinite(d.alignment_span_deg)) ? (() => {
            const nm = aspectNameFromSpan(d.alignment_span_deg, c);
            return nm ? `, ${nm}` : '';
          })() : '';
          const sc = (typeof d.alignment_score === 'number' && isFinite(d.alignment_score)) ? `, score ${Math.round(d.alignment_score*100)}%` : '';
          const w = d.alignment_utc ? ` @ ${d.alignment_utc}` : '';
          if (isFinite(c)) lines.push(`${c}${ttl?`/${ttl}`:''}${plist}${spanTxt}${asp}${sc}${w}`);
        }
        return lines.length ? (`${labels.alignment}:\n- ` + lines.join('\n- ')) : '';
      } catch(_) { return ''; }
    }

    function findPlanetsLabelShort(d) {
      try {
        // 1) direct array
        if (Array.isArray(d.alignment_planets) && d.alignment_planets.length) return d.alignment_planets.join('–');
        // 2) string (csv or JSON)
        if (typeof d.alignment_planets === 'string' && d.alignment_planets.trim()) {
          const s = d.alignment_planets.trim();
          if (s.startsWith('[')) {
            try { const arr = JSON.parse(s); if (Array.isArray(arr) && arr.length) return arr.join('–'); }
            catch(_) { return s.replace(/[\s,]+/g, ' ').replace(/\s+/g, ' '); }
          }
          // CSV string
          const parts = s.split(/[;,\s]+/).filter(Boolean);
          if (parts.length) return parts.join('–');
        }
        // 3) detailed array (first item)
        const arr = Array.isArray(d.alignments) ? d.alignments : (typeof d.alignments === 'string' ? (function(){ try { const p = JSON.parse(d.alignments); return Array.isArray(p) ? p : null; } catch(_) { return null; } })() : null);
        if (arr && arr[0] && arr[0].planets) return String(arr[0].planets).replace(/[,\s]+/g, '–');
        // 4) planetary_alignments
        const pa = Array.isArray(d.planetary_alignments) ? d.planetary_alignments : (typeof d.planetary_alignments === 'string' ? (function(){ try { const p = JSON.parse(d.planetary_alignments); return Array.isArray(p) ? p : null; } catch(_) { return null; } })() : null);
        if (pa && pa[0] && pa[0].planets) return String(pa[0].planets).replace(/[,\s]+/g, '–');
      } catch(_) {}
      return '';
    }

    function buildMoonDesc(d) {
      const bits = [];
      if (d.moon_event) bits.push(`Phase: ${d.moon_event}`);
      if (typeof d.moon_illum !== 'undefined') bits.push(`Illumination: ${fmtPct01(d.moon_illum)}`);
      const signs = [];
      if (d.moon_sign) signs.push(d.moon_sign);
      if (d.moon_sign_primary) {
        const p = (typeof d.moon_sign_primary_pct !== 'undefined') ? ` ${fmtPct01(d.moon_sign_primary_pct)}` : '';
        signs.push(`${d.moon_sign_primary}${p?` (${p})`:''}`);
      }
      if (d.moon_sign_secondary) {
        const s = (typeof d.moon_sign_secondary_pct !== 'undefined') ? ` ${fmtPct01(d.moon_sign_secondary_pct)}` : '';
        signs.push(`${d.moon_sign_secondary}${s?` (${s})`:''}`);
      }
      if (signs.length) bits.push(`Sign: ${signs.join(' / ')}`);
      if (typeof d.moon_distance_km !== 'undefined') bits.push(`Distance: ${Math.round(Number(d.moon_distance_km))} km`);
      return bits.length ? ('Moon:\n- ' + bits.join('\n- ')) : '';
    }

    const cat = words.catAstronomy;
    // 1) Add FESTIVALS as all‑day events (one per day)
    try {
      const buildFest = (typeof window !== 'undefined' && typeof window.buildFestivalMap === 'function')
        ? window.buildFestivalMap
        : buildFestivalMapLocal;
      const fmap = buildFest(data);
      if (fmap && typeof fmap.forEach === 'function') {
        fmap.forEach((info, doy) => {
          const rec = data.find(x => x.day_of_year === doy);
          if (!rec) return;
          const uid = `enoch-${rec.enoch_year}-${rec.day_of_year}-festival`;
          const summary = info && info.name ? info.name : (L==='en' ? labels.festival : labels.festival);
          // Helpful details: include Enoch/Hebrew context if available
          const descBits = [];
          descBits.push(`Enoch: Y${rec.enoch_year} M${rec.enoch_month} D${rec.enoch_day}`);
          if (rec.he_month_name && rec.he_day && rec.he_year) {
            descBits.push(`Hebrew: ${rec.he_month_name} ${rec.he_day}, ${rec.he_year}`);
          }
          // Timed event using Enoch day start/end instead of all‑day midnight anchors
          const ordered = data.slice().sort((a,b) => Number(a.day_of_year) - Number(b.day_of_year));
          const idx = ordered.findIndex(x => x.day_of_year === rec.day_of_year);
          const { start, end } = inferBounds(ordered, idx >= 0 ? idx : 0);
          const descWithTimes = descBits.concat([`${words.start}: ${start}`, `${words.end}: ${end}`]).join('\n');
          pushEvent({ uid, startIso: start, endIso: end, summary, desc: descWithTimes, cats: words.catFestival });
        });
      }
    } catch(_) { /* ignore */ }

    // 2) Add ASTRO events with enriched details
    for (const d of data) {
      // Lunar phase event
      if (d.moon_event && d.moon_event_utc) {
        const icon = d.moon_icon ? `${d.moon_icon} ` : '';
        const sum = icon + (labels[d.moon_event] || d.moon_event);
        pushEvent({
          uid: `enoch-${d.enoch_year}-${d.day_of_year}-moon-${d.moon_event}`,
          startIso: d.moon_event_utc,
          summary: sum,
          desc: (function(){
            const bits = [];
            bits.push(`${words.phase || 'Phase'}: ${d.moon_event}`);
            if (typeof d.moon_illum !== 'undefined') bits.push(`${words.illumination || 'Illumination'}: ${fmtPct01(d.moon_illum)}`);
            if (d.moon_sign) bits.push(`${words.sign || 'Sign'}: ${d.moon_sign}`);
            if (typeof d.moon_distance_km !== 'undefined') bits.push(`${words.distance || 'Distance'}: ${Math.round(Number(d.moon_distance_km))} km`);
            return bits.join('\n');
          })(),
          cats: cat
        });
      }
      // Perigee/Apogee
      if (d.perigee && d.perigee_utc) {
        const icon = d.moon_icon ? `${d.moon_icon} ` : '';
        pushEvent({
          uid: `enoch-${d.enoch_year}-${d.day_of_year}-perigee`,
          startIso: d.perigee_utc,
          summary: icon + labels.perigee,
          desc: buildMoonDesc(d),
          cats: cat
        });
      }
      if (d.apogee && d.apogee_utc) {
        const icon = d.moon_icon ? `${d.moon_icon} ` : '';
        const apogeeLabel = (L==='en') ? labels.apogee : (labels.apogeo || 'Apogeo lunar');
        pushEvent({
          uid: `enoch-${d.enoch_year}-${d.day_of_year}-apogee`,
          startIso: d.apogee_utc,
          summary: icon + apogeeLabel,
          desc: buildMoonDesc(d),
          cats: cat
        });
      }
      // Equinox / Solstice
      if (d.equinox && d.equinox_utc) {
        pushEvent({
          uid: `enoch-${d.enoch_year}-${d.day_of_year}-equinox-${d.equinox}`,
          startIso: d.equinox_utc,
          summary: `${labels.equinox}`,
          desc: `Type: ${String(d.equinox).toUpperCase()}\nEnoch: Y${d.enoch_year} M${d.enoch_month} D${d.enoch_day}`,
          cats: cat
        });
      }
      if (d.solstice && d.solstice_utc) {
        pushEvent({
          uid: `enoch-${d.enoch_year}-${d.day_of_year}-solstice-${d.solstice}`,
          startIso: d.solstice_utc,
          summary: `${labels.solstice}`,
          desc: `Type: ${String(d.solstice).toUpperCase()}\nEnoch: Y${d.enoch_year} M${d.enoch_month} D${d.enoch_day}`,
          cats: cat
        });
      }
      // Eclipses
      if (d.solar_eclipse && d.solar_eclipse_utc) {
        const sum = (L==='en') ? labels.solarEclipse : labels.eclipseSolar;
        const desc = (function(){
          const bits = [];
          if (d.solar_eclipse_kind) bits.push(`${words.kind}: ${d.solar_eclipse_kind}`);
          if (typeof d.solar_eclipse_mag === 'number') bits.push(`${words.magnitude}: ${d.solar_eclipse_mag}`);
          if (typeof d.solar_eclipse_obsc === 'number') bits.push(`${words.obscuration}: ${fmtPct01(d.solar_eclipse_obsc)}`);
          return bits.join('\n');
        })();
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-solar-eclipse`, startIso: d.solar_eclipse_utc, summary: sum, desc, cats: cat });
      }
      if (d.lunar_eclipse && d.lunar_eclipse_utc) {
        const icon = d.moon_icon ? `${d.moon_icon} ` : '';
        const sum = (L==='en') ? labels.lunarEclipse : labels.eclipseLunar;
        const desc = (function(){
          const bits = [];
          if (d.lunar_eclipse_kind) bits.push(`${words.kind}: ${d.lunar_eclipse_kind}`);
          if (typeof d.lunar_eclipse_mag === 'number') bits.push(`${words.magnitude}: ${d.lunar_eclipse_mag}`);
          return bits.join('\n');
        })();
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-lunar-eclipse`, startIso: d.lunar_eclipse_utc, summary: icon + sum, desc, cats: cat });
      }
      // Supermoon
      if (d.supermoon && d.supermoon_utc) {
        const icon = d.moon_icon ? `${d.moon_icon} ` : '';
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-supermoon`, startIso: d.supermoon_utc, summary: icon + labels.supermoon, desc: buildMoonDesc(d), cats: cat });
      }
      // Alignment
      if (typeof d.alignment !== 'undefined' && d.alignment_utc) {
        const n = Number(d.alignment)||0;
        const aspectTxt = (typeof d.alignment_span_deg === 'number' && isFinite(d.alignment_span_deg)) ? (() => {
          const nm = aspectNameFromSpan(d.alignment_span_deg, n);
          return nm ? `, ${nm}` : '';
        })() : '';
        const pShort = findPlanetsLabelShort(d);
        const planetsTxt = pShort ? ` — ${pShort}` : '';
        const summary = `${labels.alignment}${n?` (${n})`:''}${aspectTxt}${planetsTxt}`;
        const descLines = [];
        const alDesc = buildAlignmentDesc(d);
        if (alDesc) descLines.push(alDesc);
        // Do not include moon general info in alignment; moved to day description
        // Hebrew/Festival hints on same day
        if (d.he_month_name && d.he_day && d.he_year) {
          descLines.push(`${words.hebrew}: ${d.he_month_name} ${d.he_day}, ${d.he_year}`);
        }
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-alignment-${n}`, startIso: d.alignment_utc, summary, desc: descLines.join('\n\n'), cats: cat });
      }

      // Enoch day span (start to end) with visible UTC range in summary
      {
        // Always attempt to create the Enoch day event with bounds inferred if needed
        const ordered = data.slice().sort((a,b) => Number(a.day_of_year) - Number(b.day_of_year));
        const idx = ordered.findIndex(x => x.day_of_year === d.day_of_year);
        const { start, end } = inferBounds(ordered, idx >= 0 ? idx : 0);
        const baseLbl = formatDaySummary(d);
        const desc = (function(){
          const bits = [];
          bits.push(`Enoch: Y${d.enoch_year} M${d.enoch_month} D${d.enoch_day} (DOY ${d.day_of_year})`);
          bits.push(`${words.start}: ${start}`);
          bits.push(`${words.end}: ${end}`);
          if (typeof d.added_week !== 'undefined') bits.push(`${words.addedWeek}: ${d.added_week ? (words.yes) : (words.no)}`);
          const moon = buildMoonDesc(d);
          if (moon) bits.push(moon);
          return bits.join('\n');
        })();
        pushEvent({ uid: `enoch-${d.enoch_year}-${d.day_of_year}-day-span`, startIso: start, endIso: end, summary: baseLbl, desc, cats: words.catEnoch });
      }
    }

    lines.push('END:VCALENDAR');
    const ics = lines.join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const yr = inferEnochYear(data) ?? 'year';
    a.download = `enoch-astro-${yr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('[ICS] build failed', e);
  }
}

