function parseCSV(text) {
  console.log('[parseCSV] starting parse, length', text.length);
  if (!text || !text.trim()) return [];

  // Robust line split (handle trailing newlines)
  const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = rawLines.filter(l => l !== '');
  if (!lines.length) {
    console.warn('[parseCSV] no lines to parse');
    return [];
  }

  // CSV line parser with quotes support
  function parseLine(line) {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          // Escaped quote
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQ = true;
        } else if (ch === ',') {
          out.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    out.push(cur);
    return out;
  }

  const headers = parseLine(lines.shift()).map(h => (h || '').trim());
  const data = [];

  // Converters
  function normalizeDecimal(str) {
    // If string uses comma as decimal and no dot, replace comma with dot
    if (/,/.test(str) && !/\./.test(str)) return str.replace(',', '.');
    return str;
  }
  const toNum = (v) => {
    if (v === null || typeof v === 'undefined') return undefined;
    let s = String(v).trim();
    if (s === '') return undefined;
    const hadPct = /%$/.test(s);
    s = s.replace(/%$/, '');
    s = normalizeDecimal(s);
    const n = parseFloat(s);
    if (!Number.isFinite(n)) return undefined;
    // Generic numeric converter: do not auto-scale here; handled per-field below
    return n;
  };
  const toInt = (v) => {
    if (v === null || typeof v === 'undefined') return undefined;
    const s = String(v).trim();
    if (s === '') return undefined;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : undefined;
  };
  const toBool = (v) => {
    if (v === null || typeof v === 'undefined') return false;
    const s = String(v).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on';
  };

  const NUM_FIELDS = new Set([
    'enoch_year','enoch_month','enoch_day','day_of_year',
    'moon_phase_angle_deg','moon_phase_angle_start_deg','moon_phase_angle_end_deg',
    'moon_illum','moon_illum_start','moon_illum_end',
    'moon_long_start_deg','moon_long_end_deg','moon_long_delta_deg',
    'moon_distance_km',
    'moon_sign_primary_pct','moon_sign_secondary_pct',
    'he_year','he_month','he_day'
  ]);
  const INT_FIELDS = new Set(['enoch_year','enoch_month','enoch_day','day_of_year','he_year','he_month','he_day']);
  const BOOL_FIELDS = new Set(['added_week','perigee','apogee','is_rosh_chodesh','solar_eclipse','lunar_eclipse','supermoon']);
  NUM_FIELDS.add('alignment');
  // Extra numeric fields for alignments/eclipses
  ['alignment_span_deg','alignment_score','solar_eclipse_mag','lunar_eclipse_mag'].forEach(k => NUM_FIELDS.add(k));

  lines.forEach((line) => {
    if (!line || !line.trim()) return;
    const cols = parseLine(line);
    if (!cols.length) return;
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      let val = cols[i] !== undefined ? cols[i] : '';
      if (BOOL_FIELDS.has(key)) {
        obj[key] = toBool(val);
      } else if (INT_FIELDS.has(key)) {
        obj[key] = toInt(val);
      } else if (NUM_FIELDS.has(key)) {
        let num = toNum(val);
        // Field-specific normalization
        if (typeof num !== 'undefined') {
          if (key === 'moon_illum' || key === 'moon_illum_start' || key === 'moon_illum_end') {
            // Ensure fraction 0..1. If value looks like percent (had % or >1), scale down
            const raw = String(val || '');
            if (/%$/.test(raw) || num > 1) num = num / 100;
          }
        }
        obj[key] = num;
      } else {
        obj[key] = (val === undefined ? '' : String(val));
      }
    }
    // Normalize percent-like numeric fields if they came as strings like "95%"
    // Keep as numeric; main.js will accept >1 as percent and normalize downstream.
    if (Object.prototype.hasOwnProperty.call(obj, 'moon_sign_primary_pct')) {
      const p = toNum(obj.moon_sign_primary_pct);
      if (typeof p !== 'undefined') obj.moon_sign_primary_pct = p;
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'moon_sign_secondary_pct')) {
      const s = toNum(obj.moon_sign_secondary_pct);
      if (typeof s !== 'undefined') obj.moon_sign_secondary_pct = s;
    }
    // Ensure moon_illum remains in [0..1]
    if (typeof obj.moon_illum === 'number') {
      if (obj.moon_illum < 0) obj.moon_illum = 0;
      if (obj.moon_illum > 1) obj.moon_illum = Math.min(1, obj.moon_illum / 100);
    }
    data.push(obj);
  });

  console.log('[parseCSV] parsed rows', data.length);
  return data;
}
