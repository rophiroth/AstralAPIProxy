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
  const toNum = (v) => {
    if (v === null || typeof v === 'undefined') return undefined;
    const s = String(v).trim().replace(/%$/, '');
    if (s === '') return undefined;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
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
    'moon_phase_angle_deg','moon_illum','moon_distance_km',
    'moon_sign_primary_pct','moon_sign_secondary_pct',
    'he_year','he_month','he_day'
  ]);
  const INT_FIELDS = new Set(['enoch_year','enoch_month','enoch_day','day_of_year','he_year','he_month','he_day']);
  const BOOL_FIELDS = new Set(['added_week','perigee','apogee','is_rosh_chodesh']);

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
        obj[key] = toNum(val);
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
    data.push(obj);
  });

  console.log('[parseCSV] parsed rows', data.length);
  return data;
}
