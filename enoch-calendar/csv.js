function parseCSV(text) {
  console.log('[parseCSV] starting parse, length', text.length);
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) {
    console.warn('[parseCSV] no lines to parse');
    return [];
  }
  const headers = lines.shift().split(',');
  const data = [];
  const toNum = (v) => {
    if (v === '' || typeof v === 'undefined') return undefined;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const toInt = (v) => {
    if (v === '' || typeof v === 'undefined') return undefined;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  };
  const toBool = (v) => {
    if (typeof v !== 'string') return !!v;
    const s = v.trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'y';
  };
  lines.forEach(line => {
    if (!line.trim()) return;
    const cols = line.split(',');
    if (cols.length < headers.length) {
      console.warn('[parseCSV] skipping malformed line', line);
      return;
    }
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = cols[i]);
    obj.enoch_year = toInt(obj.enoch_year);
    obj.enoch_month = toInt(obj.enoch_month);
    obj.enoch_day = toInt(obj.enoch_day);
    obj.day_of_year = toInt(obj.day_of_year);
    obj.added_week = toBool(obj.added_week);
    if (obj.moon_phase_angle_deg !== undefined) obj.moon_phase_angle_deg = toNum(obj.moon_phase_angle_deg);
    if (obj.moon_illum !== undefined) obj.moon_illum = toNum(obj.moon_illum);
    if (obj.moon_distance_km !== undefined) obj.moon_distance_km = toNum(obj.moon_distance_km);
    if (obj.moon_sign_primary_pct !== undefined) obj.moon_sign_primary_pct = toNum(obj.moon_sign_primary_pct);
    if (obj.moon_sign_secondary_pct !== undefined) obj.moon_sign_secondary_pct = toNum(obj.moon_sign_secondary_pct);
    obj.perigee = toBool(obj.perigee);
    obj.apogee = toBool(obj.apogee);
    data.push(obj);
  });
  console.log('[parseCSV] parsed rows', data.length);
  return data;
}
