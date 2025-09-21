// Resolve API endpoint with flexible overrides for debug and prod
function resolveApiUrl() {
  try {
    // 1) URL query override: ?api=... (full URL, host, or path)
    const qs = new URLSearchParams(window.location.search || '');
    const qApi = (qs.get('api') || qs.get('apiUrl') || qs.get('api_url') || '').trim();
    if (qApi) {
      if (/^https?:\/\//i.test(qApi)) return qApi; // full URL
      if (qApi.startsWith('/')) return qApi; // relative path on same-origin
      // treat as host
      return `https://${qApi.replace(/\/$/, '')}/calculate`;
    }

    // 2) Runtime globals/meta for easy overrides
    if (window.API_URL && typeof window.API_URL === 'string') return window.API_URL;
    const metaApi = document.querySelector('meta[name="api-url"]')?.content;
    if (metaApi) return metaApi;

    // 3) Same-origin default for any host (multiple apps can share backend path)
    const loc = window.location || {};
    if (loc.protocol !== 'file:') {
      return '/calculate';
    }

    // 4) When running from file:// or unknown env, use public Render
    return 'https://astralapiproxy.onrender.com/calculate';
  } catch (_) {
    return 'https://astralapiproxy.onrender.com/calculate';
  }
}

const API_URL = resolveApiUrl();

function resolveCalcYearUrl() {
  try {
    const u = new URL(API_URL, window.location.origin);
    // If API_URL already ends with /calculate, reuse same origin/path root
    if (u.pathname.endsWith('/calculate')) {
      u.pathname = u.pathname.replace(/\/calculate$/,'/calcYear');
      return u.toString();
    }
    // Otherwise append /calcYear
    if (!u.pathname.endsWith('/')) u.pathname += '/';
    u.pathname += 'calcYear';
    return u.toString();
  } catch(_) {
    // Fallback: assume same-host /calcYear
    return (API_URL || '').replace(/\/calculate$/, '/calcYear') || '/calcYear';
  }
}

// --- CSV cache/upload config helpers ---
function getQS() {
  try { return new URLSearchParams(window.location.search || ''); } catch(_) { return new URLSearchParams(''); }
}

function resolveUploadUrl() {
  try {
    const qs = getQS();
    const q = (qs.get('uploadUrl') || qs.get('upload_url') || '').trim();
    if (q) return q;
    if (typeof window.UPLOAD_CSV_URL === 'string' && window.UPLOAD_CSV_URL) return window.UPLOAD_CSV_URL;
    const meta = document.querySelector('meta[name="upload-csv-url"]')?.content;
    if (meta) return meta;
    // Default to same-origin helper if running on http(s)
    const loc = window.location || {};
    if (loc.protocol && loc.protocol.startsWith('http')) {
      // place uploader alongside index.html inside enoch-calendar/
      // relative path works regardless of base href
      return 'upload_csv.php';
    }
  } catch(_) {}
  return '';
}

function shouldUploadCsv() {
  try {
    const qs = getQS();
    const q = (qs.get('upload') || '').toLowerCase();
    if (q && ['1','true','yes','on'].includes(q)) return true;
    if (typeof window.UPLOAD_CSV === 'boolean') return window.UPLOAD_CSV;
    const meta = (document.querySelector('meta[name="upload-csv"]')?.content || '').toLowerCase();
    if (meta && ['1','true','yes','on'].includes(meta)) return true;
  } catch(_) {}
  // Default: upload only when URL explicitly provided
  return !!resolveUploadUrl();
}

function shouldCacheCsv() {
  try {
    const qs = getQS();
    const q = (qs.get('cache') || '').toLowerCase();
    if (q) return ['1','true','yes','on'].includes(q);
    if (typeof window.CACHE_CSV === 'boolean') return window.CACHE_CSV;
    const meta = (document.querySelector('meta[name="cache-csv"]')?.content || '').toLowerCase();
    if (meta) return ['1','true','yes','on'].includes(meta);
  } catch(_) {}
  return true; // default: cache enabled
}

function csvStorageKey(year) { return `enochCSV:${year}`; }
function csvMetaStorageKey(year) { return `enochCSVmeta:${year}`; }

function getCsvFromLocal(year) {
  try {
    const raw = localStorage.getItem(csvStorageKey(year));
    if (!raw) return '';
    // Optional TTL handling
    const metaRaw = localStorage.getItem(csvMetaStorageKey(year));
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw);
        if (meta.ttlMs && meta.savedAt && (Date.now() - meta.savedAt > meta.ttlMs)) {
          localStorage.removeItem(csvStorageKey(year));
          localStorage.removeItem(csvMetaStorageKey(year));
          return '';
        }
      } catch(_) {}
    }
    return raw;
  } catch(_) { return ''; }
}

function saveCsvToLocal(year, csv, ttlDays = 365) {
  try {
    localStorage.setItem(csvStorageKey(year), csv);
    const ttlMs = (ttlDays && Number.isFinite(ttlDays)) ? ttlDays * 24 * 3600 * 1000 : 0;
    const meta = { savedAt: Date.now(), ttlMs };
    localStorage.setItem(csvMetaStorageKey(year), JSON.stringify(meta));
    console.log('[csvCache] saved to localStorage for year', year);
  } catch(e) {
    console.warn('[csvCache] save failed', e?.message || e);
  }
}

function buildCsvText(rows) {
  if (!rows || !rows.length) return '';
  const hasLunar = typeof rows[0].moon_phase_angle_deg !== 'undefined';
  const hasHebrew = typeof rows[0].he_year !== 'undefined';
  const baseHeader = ['gregorian','enoch_year','enoch_month','enoch_day','day_of_year','added_week','name','start_utc','end_utc'];
  const lunarHeader = hasLunar ? ['moon_phase_angle_deg','moon_illum','moon_icon','moon_event','moon_event_utc','moon_sign','moon_zodiac_mode','moon_distance_km','perigee','perigee_utc','apogee','apogee_utc'] : [];
  const hebrewHeader = hasHebrew ? ['he_year','he_month','he_day','he_month_name','is_rosh_chodesh','he_holiday_code','he_holiday_name'] : [];
  const header = [...baseHeader, ...lunarHeader, ...hebrewHeader].join(',');
  const lines = rows.map(d => {
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
      (d.moon_illum ?? ''),
      (d.moon_icon ?? ''),
      (d.moon_event ?? ''),
      (d.moon_event_utc ?? ''),
      (d.moon_sign ?? ''),
      (d.moon_zodiac_mode ?? ''),
      (d.moon_distance_km ?? ''),
      (d.perigee ? '1' : ''),
      (d.perigee_utc ?? ''),
      (d.apogee ? '1' : ''),
      (d.apogee_utc ?? '')
    ] : [];
    const heb = hasHebrew ? [
      (d.he_year ?? ''),
      (d.he_month ?? ''),
      (d.he_day ?? ''),
      (d.he_month_name ?? ''),
      (d.is_rosh_chodesh ? '1' : ''),
      (d.he_holiday_code ?? ''),
      (d.he_holiday_name ?? '')
    ] : [];
    return [...base, ...lunar, ...heb].join(',');
  });
  return [header, ...lines].join('\n');
}

async function uploadCsvToServer(year, csv) {
  const url = resolveUploadUrl();
  if (!url) return { ok: false, reason: 'no-url' };
  try {
    const fileName = `enoch-calendar-${year}.csv`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const fd = new FormData();
    fd.append('file', blob, fileName);
    fd.append('year', String(year));
    fd.append('filename', fileName);
    // Optional token/header
    const token = (document.querySelector('meta[name="upload-csv-token"]')?.content || window.UPLOAD_CSV_TOKEN || '').trim();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'POST', body: fd, headers });
    if (!res.ok) {
      console.warn('[csvUpload] failed', res.status, res.statusText);
      return { ok: false, status: res.status };
    }
    console.log('[csvUpload] uploaded', fileName, 'to', url);
    return { ok: true };
  } catch (e) {
    console.warn('[csvUpload] error', e?.message || e);
    return { ok: false, error: e?.message || String(e) };
  }
}
const LATITUDE = -33.45;
const LONGITUDE = -70.6667;

let currentStartDate;
let currentYearLength = 364;
let currentYear;
let currentData = [];
let isBuilding = false;

console.log('[main] script loaded');

// i18n helpers (fallbacks if i18n.js is not present)
const setStatus = (window.setStatus) ? window.setStatus : function(key){
  const s = document.getElementById('status');
  if (!s) return;
  s.textContent = (window.t ? window.t(key) : (key || ''));
};
const setYearLabel = (window.setYearLabel) ? window.setYearLabel : function(year, approx){
  const yl = document.getElementById('yearLabel');
  if (!yl) return;
  yl.textContent = approx ? `Year ${year} (≈ ${approx} CE)` : `Year ${year}`;
};

// Simple visible version to verify deploy
const APP_VERSION = 'calendar@2025-08-28T00:00Z';
try {
  const s = document.getElementById('status');
  if (s) s.textContent = (s.textContent ? s.textContent + ' | ' : '') + APP_VERSION;
} catch (_) {}

// Surface uncaught errors to the UI to avoid silent stalls
window.addEventListener('error', (e) => {
  const msg = e?.error?.message || e?.message || 'Unknown error';
  console.error('[globalError]', e?.error || e);
  const s = document.getElementById('status');
  if (s) s.textContent = 'Error: ' + msg;
});

// Also surface unhandled promise rejections (helps when fetch/async fails)
window.addEventListener('unhandledrejection', (e) => {
  const msg = e?.reason?.message || String(e.reason || 'Unknown rejection');
  console.error('[unhandledrejection]', e);
  const s = document.getElementById('status');
  if (s) s.textContent = 'Promise error: ' + msg;
});

// --- Local Enoch-year approximation helpers ---
// We approximate March equinox around Mar 20 ~21:24 UTC, then
// pick the first Wednesday ON or AFTER the equinox as Enochian new year start.
function approximateMarchEquinoxUTC(year) {
  // Simple fixed approximation; good enough to select CSV year.
  // For years 0..99, some engines have quirks; use ISO string to force 4-digit year.
  if (year >= 0 && year < 100) {
    const y4 = String(year).padStart(4, '0');
    return new Date(`${y4}-03-20T21:24:00.000Z`);
  }
  return new Date(Date.UTC(year, 2, 20, 21, 24, 0)); // Mar=2
}

function firstWednesdayOnOrAfterUTC(date) {
  const base = new Date(date);
  const day = base.getUTCDay(); // 0=Sun .. 3=Wed .. 6=Sat
  const diffToWed = (3 - day + 7) % 7; // 0..6 to get to Wed
  return addDays(base, diffToWed);
}

function getApproxEnochStartForGregorianYear(year) {
  const eqx = approximateMarchEquinoxUTC(year);
  return firstWednesdayOnOrAfterUTC(eqx);
}

function padYear4(y) {
  try {
    const n = Number(y);
    if (Number.isFinite(n) && n >= 0 && n < 1000) return String(n).padStart(4, '0');
    return String(y);
  } catch (_) { return String(y); }
}

const REFERENCE_ENOCH_YEAR = 5996; // aligns with backend mapping (2025 -> 5996)
function getApproxEnochYearForDate(dateUTC) {
  const y = dateUTC.getUTCFullYear();
  const startY = getApproxEnochStartForGregorianYear(y);
  // If date is before this year's start, use previous year's start mapping
  const baseGregorianYear = (dateUTC < startY) ? (y - 1) : y;
  return REFERENCE_ENOCH_YEAR + (baseGregorianYear - 2025);
}

async function fetchEnoch(date) {
  console.log('[fetchEnoch] request', date.toISOString());
  const body = {
    datetime: date.toISOString().slice(0, 19),
    latitude: LATITUDE,
    longitude: LONGITUDE,
    timezone: 'UTC'
  };
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    console.error('[fetchEnoch] API error', res.status);
    throw new Error('API error');
  }
  const json = await res.json();
  console.log('[fetchEnoch] response', json);
  return json;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// --- Safe date helpers (avoid "Invalid time value") ---
// Accepts 'YYYY-MM-DD' or 'YYYY/MM/DD', returns a Date in UTC midday to avoid TZ rollovers.
function parseYMDToUTC(ymd) {
  try {
    if (!ymd || typeof ymd !== 'string') return null;
    const norm = ymd.trim().replace(/\//g, '-');
    const m = norm.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const [, y, mo, d] = m;
    // Construct ISO string to ensure consistent parsing
    const iso = `${y}-${mo}-${d}T12:00:00Z`;
    const dt = new Date(iso);
    return isNaN(dt.getTime()) ? null : dt;
  } catch (_) {
    return null;
  }
}

// --- Sunset calculations (NOAA approximation) ---
// Returns a Date in UTC for local sunset of given civil date at (lat, lon). May return null in polar cases.
function calcSunsetUTC(date, lat, lon) {
  try {
    const toRad = d => d * Math.PI / 180;
    const toDeg = r => r * 180 / Math.PI;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // 1-12
    const day = date.getUTCDate();
    const N = Math.floor((Date.UTC(year, month-1, day) - Date.UTC(year,0,0)) / 86400000);
    const lngHour = lon / 15;
    const t = N + ((18 - lngHour) / 24); // use 18h local for sunset approx
    const M = (0.9856 * t) - 3.289;
    let L = M + (1.916 * Math.sin(toRad(M))) + (0.020 * Math.sin(toRad(2*M))) + 282.634;
    L = (L % 360 + 360) % 360;
    let RA = toDeg(Math.atan(0.91764 * Math.tan(toRad(L))));
    RA = (RA % 360 + 360) % 360;
    const Lq = Math.floor(L/90) * 90;
    const RAq = Math.floor(RA/90) * 90;
    RA = (RA + (Lq - RAq)) / 15; // hours
    const sinDec = 0.39782 * Math.sin(toRad(L));
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(toRad(90.833)) - (sinDec * Math.sin(toRad(lat)))) / (cosDec * Math.cos(toRad(lat)));
    if (cosH < -1 || cosH > 1) return null; // sun never sets/rises
    let H = toDeg(Math.acos(cosH)) / 15; // hours
    let T = H + RA - (0.06571 * t) - 6.622; // sunset
    let UT = T - lngHour;
    UT = (UT % 24 + 24) % 24;
    const hours = Math.floor(UT);
    const minutes = Math.floor((UT - hours) * 60);
    const seconds = Math.round((((UT - hours) * 60) - minutes) * 60);
    const d = new Date(Date.UTC(year, month-1, day, 0, 0, 0));
    d.setUTCHours(hours, minutes, seconds, 0);
    return d;
  } catch (e) {
    console.warn('[sunset] calc error', e?.message || e);
    return null;
  }
}

function calcSunsetUTCFromLocalYMD(ymd, lat, lon) {
  const dt = parseYMDToUTC(ymd);
  if (!dt) return null;
  return calcSunsetUTC(dt, lat, lon);
}

function sunsetPairForYMD(ymd, lat, lon) {
  // Start = previous day's sunset; End = same day's sunset
  const base = parseYMDToUTC(ymd);
  if (!base) return { startUTC: null, endUTC: null };
  const prev = addDays(base, -1);
  const startUTC = calcSunsetUTC(prev, lat, lon);
  const endUTC = calcSunsetUTC(base, lat, lon);
  return { startUTC, endUTC };
}

function fmtLocal(dt) {
  if (!dt || isNaN(dt)) return 'N/A';
  try {
    return dt.toLocaleString(undefined, {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (_) {
    return dt.toISOString();
  }
}

async function loadYearFromCSV(year) {
  console.log('[loadYearFromCSV] trying year', year);
  try {
    // 0) Try local cache first
    if (shouldCacheCsv()) {
      const cached = getCsvFromLocal(year);
      if (cached) {
        console.log('[loadYearFromCSV] found in local cache');
        const rows = parseCSV(cached);
        currentData = rows.map((r, i) => ({
          gregorian: r.gregorian,
          enoch_year: year,
          enoch_month: r.enoch_month,
          enoch_day: r.enoch_day,
          added_week: r.added_week,
          name: r.name,
          day_of_year: i + 1,
          start_utc: r.start_utc || '',
          end_utc: r.end_utc || ''
        }));
        currentYear = year;
        currentStartDate = parseYMDToUTC(currentData[0].gregorian) || new Date(currentData[0].gregorian);
        currentYearLength = currentData.length;
        try { window.currentData = currentData; window.currentYear = currentYear; } catch(_){ }
        renderCalendar(currentData);
        setYearLabel(year);
        setStatus('statusLoadedCsv');
        console.log('[loadYearFromCSV] loaded from cache', currentYearLength, 'days');
        return true;
      }
    }
    // 1) Try network file on same-origin
    const res = await fetch(`./enoch-calendar-${year}.csv`, { cache: 'no-store' });
    if (!res.ok) throw new Error('not found');
    const text = await res.text();
    const rows = parseCSV(text);
    currentData = rows.map((r, i) => ({
      gregorian: r.gregorian,
      enoch_year: year,
      enoch_month: r.enoch_month,
      enoch_day: r.enoch_day,
      added_week: r.added_week,
      name: r.name,
      day_of_year: i + 1
    }));
    currentYear = year;
    // Use safe parsing in case CSV uses non-ISO separators
    currentStartDate = parseYMDToUTC(currentData[0].gregorian) || new Date(currentData[0].gregorian);
    // Ensure start/end present for tooltip and export when loading CSV lacking them
    currentData = currentData.map(d => {
      if (!d.start_utc || !d.end_utc) {
        const { startUTC, endUTC } = sunsetPairForYMD(d.gregorian, LATITUDE, LONGITUDE);
        d.start_utc = startUTC ? startUTC.toISOString() : '';
        d.end_utc = endUTC ? endUTC.toISOString() : '';
      }
      d.enoch_year = d.enoch_year || year;
      return d;
    });
    currentYearLength = currentData.length;
    try { window.currentData = currentData; window.currentYear = currentYear; } catch(_){ }
    renderCalendar(currentData);
    setYearLabel(year);
    setStatus('statusLoadedCsv');
    console.log('[loadYearFromCSV] loaded', currentYearLength, 'days');
    // Save to local cache for next time
    if (shouldCacheCsv()) {
      try { saveCsvToLocal(year, text); } catch(_) {}
    }
    return true;
  } catch (e) {
    console.warn('[loadYearFromCSV] failed for year', year, e);
    return false;
  }
}

async function buildCalendar(referenceDate = new Date(), tryCSV = true, base = null) {
  if (isBuilding) {
    console.log('[buildCalendar] already building, abort');
    return;
  }
  isBuilding = true;
  console.log('[buildCalendar] start', referenceDate.toISOString(), 'tryCSV', tryCSV);
  const status = document.getElementById('status');
  setStatus('statusLoading');
  const calendarDiv = document.getElementById('calendar');
  calendarDiv.innerHTML = '';
  try {
    const baseData = base || await fetchEnoch(referenceDate);
    const { enoch_year, enoch_day_of_year } = baseData.enoch;
    console.log('[buildCalendar] base year', enoch_year, 'day_of_year', enoch_day_of_year);
    if (tryCSV && await loadYearFromCSV(enoch_year)) {
      console.log('[buildCalendar] loaded from CSV, aborting API build');
      // Ensure state is consistent when exiting early
      isBuilding = false;
      return;
    }
    const startDate = addDays(referenceDate, -(enoch_day_of_year - 1));
    currentStartDate = startDate;
    currentYear = enoch_year;
    try { window.currentYear = currentYear; } catch(_){ }
    console.log('[buildCalendar] startDate', startDate.toISOString());

    // Try new annual endpoint for precise lunar data and day bounds
    try {
      const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
      const calcYearUrl = resolveCalcYearUrl();
      const body = {
        datetime: referenceDate.toISOString().slice(0,19),
        latitude: LATITUDE,
        longitude: LONGITUDE,
        timezone: tz,
        zodiac_mode: 'tropical'
      };
      console.log('[buildCalendar] calling /calcYear', calcYearUrl, body);
      const res = await fetch(calcYearUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const j = await res.json();
        if (j && j.ok && Array.isArray(j.days)) {
          currentData = j.days;
          currentYearLength = currentData.length;
          try { window.currentData = currentData; } catch(_){ }
          renderCalendar(currentData);
          setYearLabel(j.enoch_year || enoch_year);
          status.textContent = '';
          try {
            const csv = buildCsvText(currentData);
            if (csv && shouldCacheCsv()) saveCsvToLocal(j.enoch_year || enoch_year, csv);
            if (csv && shouldUploadCsv()) uploadCsvToServer(j.enoch_year || enoch_year, csv);
          } catch(e){ console.warn('[buildCalendar] cache/upload skipped', e?.message || e); }
          isBuilding = false;
          return;
        }
      }
      console.warn('[buildCalendar] /calcYear failed or returned invalid, falling back');
    } catch(e) {
      console.warn('[buildCalendar] /calcYear error, fallback to daily batches', e?.message || e);
    }

    const dates = [];
    for (let i = 0; i < 364; i++) dates.push(addDays(startDate, i));
    let results = await fetchInBatches(dates);
    if (results[363].enoch.added_week) {
      console.log('[buildCalendar] added week detected');
      const extra = [];
      for (let i = 364; i < 371; i++) extra.push(addDays(startDate, i));
      const more = await fetchInBatches(extra);
      results = results.concat(more);
    }
    currentYearLength = results.length;
    console.log('[buildCalendar] fetched days', currentYearLength);

    currentData = results.map((r, idx) => {
      const gregorian = r.date.toISOString().slice(0, 10);
      const { startUTC, endUTC } = sunsetPairForYMD(gregorian, LATITUDE, LONGITUDE);
      const e = r.enoch;
      return {
        gregorian,
        enoch_year,
        enoch_month: e.enoch_month,
        enoch_day: e.enoch_day,
        added_week: e.added_week,
        name: getShemEnochiano(e.enoch_month, e.enoch_day, e.added_week),
        day_of_year: idx + 1,
        start_utc: startUTC ? startUTC.toISOString() : '',
        end_utc: endUTC ? endUTC.toISOString() : ''
      };
    });
    try { window.currentData = currentData; } catch(_){ }

    renderCalendar(currentData);
    setYearLabel(enoch_year);
    status.textContent = '';
    // Cache and optionally upload CSV representation
    try {
      const csv = buildCsvText(currentData);
      if (csv && shouldCacheCsv()) saveCsvToLocal(enoch_year, csv);
      if (csv && shouldUploadCsv()) uploadCsvToServer(enoch_year, csv);
    } catch (e) {
      console.warn('[buildCalendar] cache/upload skipped', e?.message || e);
    }
  } catch (err) {
    console.error('[buildCalendar] error', err);
    setStatus('statusBuildError');
  } finally {
    isBuilding = false;
    console.log('[buildCalendar] end');
  }
}

async function fetchInBatches(dates, batchSize = 30) {
  console.log('[fetchInBatches] total dates', dates.length, 'batchSize', batchSize);
  const out = [];
  for (let i = 0; i < dates.length; i += batchSize) {
    console.log('[fetchInBatches] batch', i, '-', i + batchSize - 1);
    const batch = dates.slice(i, i + batchSize).map(d => fetchEnoch(d));
    const data = await Promise.all(batch);
    data.forEach((resp, idx) => out.push({ date: dates[i + idx], enoch: resp.enoch }));
  }
  console.log('[fetchInBatches] done');
  return out;
}

// Weekday labels provided by i18n.js if present
function getWeekdaysShort(){
  try { return (window.getWeekdays && window.getWeekdays()) || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; }
  catch(_){ return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; }
}

// Zodiac mapping per Enoch month (1..12)
// Hebrew transliteration and native text included for tooltip hover
const ZODIAC_BY_MONTH = {
  1: { en: 'Aries',       heLatin: 'Taleh',    he: 'טלה',    glyph: '♈' },
  2: { en: 'Taurus',      heLatin: 'Shor',     he: 'שור',    glyph: '♉' },
  3: { en: 'Gemini',      heLatin: 'Teomim',   he: 'תאומים', glyph: '♊' },
  4: { en: 'Cancer',      heLatin: 'Sartan',   he: 'סרטן',   glyph: '♋' },
  5: { en: 'Leo',         heLatin: 'Aryeh',    he: 'אריה',   glyph: '♌' },
  6: { en: 'Virgo',       heLatin: 'Betulah',  he: 'בתולה',  glyph: '♍' },
  7: { en: 'Libra',       heLatin: 'Moznayim', he: 'מאזניים',glyph: '♎' },
  8: { en: 'Scorpio',     heLatin: 'Akrav',    he: 'עקרב',   glyph: '♏' },
  9: { en: 'Sagittarius', heLatin: 'Keshet',   he: 'קשת',    glyph: '♐' },
 10: { en: 'Capricorn',   heLatin: 'Gdi',      he: 'גדי',    glyph: '♑' },
 11: { en: 'Aquarius',    heLatin: 'Dli',      he: 'דלי',    glyph: '♒' },
 12: { en: 'Pisces',      heLatin: 'Dagim',    he: 'דגים',   glyph: '♓' }
};
// Simple base anchors (kept for reference); full mapping is built dynamically below.
const FESTIVALS = [
  { month: 1, day: 14, class: 'pesach', name: 'Pesach' }
];

// Map 10 Days from Rosh Hashanah (7/1) to Yom Kippur (7/10) to Sefirot
function sefirotNameForAweDay(n) {
  // n: 1..10 (1=Rosh Hashanah, 10=Yom Kippur)
  const names = [
    'Maljut',   // 1
    'Yesod',    // 2
    'Hod',      // 3
    'Netzaj',   // 4
    'Tiferet',  // 5
    'Guevurá',  // 6
    'Jesed',    // 7
    'Biná',     // 8
    'Jojmá',    // 9
    'Keter'     // 10
  ];
  if (!n || n < 1 || n > 10) return '';
  return names[n - 1];
}

function buildFestivalMap(data) {
  // Map of day_of_year -> { classList: string[], name: string, short: string }
  const map = new Map();
  const byMD = new Map(); // key: m-d => { day_of_year }
  for (const d of data) byMD.set(`${d.enoch_month}-${d.enoch_day}`, d);

  function setDay(doY, classList, name, short) {
    if (!doY) return;
    const prev = map.get(doY);
    if (prev) {
      // Merge classes, prefer keeping first label; if new is mikra, override label
      const merged = new Set([...(prev.classList||[]), ...(classList||[])]);
      const label = (classList||[]).includes('mikra') ? name : (prev.name || name);
      const s = short || prev.short || name;
      map.set(doY, { classList: [...merged], name: label, short: s });
    } else {
      map.set(doY, { classList: classList || [], name, short: short || name });
    }
  }

  // Pesach (anchor at 1/14), Hag HaMatzot (1/15-21), with mikra on 15 and 21
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

  // Rosh Hashanah (7/1), Days 2..9 as intermediate (Days of Awe), day 10 Yom Kippur
  const rh = byMD.get('7-1');
  if (rh) setDay(rh.day_of_year, ['festival','mikra','rosh-hashanah'], 'Rosh Hashanah', 'Rosh Hash.');
  for (let d = 2; d <= 9; d++) {
    const rec = byMD.get(`7-${d}`);
    if (!rec) continue;
    setDay(rec.day_of_year, ['festival','fest-mid','awe-mid'], `Día de Teshuvá ${d}/10`, `Teshuvá ${d}`);
  }
  const yk = byMD.get('7-10');
  if (yk) setDay(yk.day_of_year, ['festival','mikra','yom-kippur'], 'Yom Kippur', 'Y. Kippur');

  // Sukkot 7/15-21, mikra on 15 and 21, plus Shemini Atzeret 7/22
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

  // Omer count: start at 1/25 for 49 days; day 50 is Shavuot (mikra)
  const omerStart = byMD.get('1-25');
  if (omerStart) {
    const startDOY = omerStart.day_of_year;
    for (let i = 0; i < 49; i++) {
      const doY = startDOY + i;
      const rec = data.find(x => x.day_of_year === doY);
      if (!rec) break;
      setDay(doY, ['omer','festival','fest-mid'], `Ómer día ${i+1}`, `Ómer ${i+1}`);
    }
    const shavuotDOY = startDOY + 49;
    const shav = data.find(x => x.day_of_year === shavuotDOY);
    if (shav) setDay(shavuotDOY, ['festival','shavuot','mikra'], 'Shavuot', 'Shavuot');
  }

  return map;
}

// --- Lunar phase helpers (synodic approximation) ---
// Reference new moon: 2000-01-06 18:14:00 UTC, synodic month length ~29.530588853 days
const SYNODIC_DAYS = 29.530588853;
const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

function moonPhaseInfoForYMD(ymd) {
  try {
    const dt = parseYMDToUTC(ymd) || new Date(ymd + 'T12:00:00Z');
    const ms = dt.getTime();
    const days = (ms - REF_NEW_MOON_MS) / 86400000;
    let age = days % SYNODIC_DAYS;
    if (age < 0) age += SYNODIC_DAYS;
    const phase = age / SYNODIC_DAYS; // 0..1 (0=new, 0.5=full)
    const illum = 0.5 * (1 - Math.cos(2 * Math.PI * phase));
    const near = (p, target, eps = 0.03) => {
      const d = Math.abs(p - target);
      return d < eps || Math.abs(d - 1) < eps;
    };
    const isNew = near(phase, 0.0);
    const isFirstQuarter = near(phase, 0.25);
    const isFull = near(phase, 0.5);
    const isLastQuarter = near(phase, 0.75);
    let icon = '';
    let label = '';
    if (isNew) { icon = '🌑'; label = 'Luna nueva'; }
    else if (isFirstQuarter) { icon = '🌓'; label = 'Cuarto creciente'; }
    else if (isFull) { icon = '🌕'; label = 'Luna llena'; }
    else if (isLastQuarter) { icon = '🌗'; label = 'Cuarto menguante'; }
    else {
      if (illum < 0.25) icon = '🌒';
      else if (illum < 0.5) icon = '🌓';
      else if (illum < 0.75) icon = '🌔';
      else icon = '🌖';
      label = 'Fase lunar';
    }
    return { phase, age, illum, isNew, isFirstQuarter, isFull, isLastQuarter, icon, label, date: dt };
  } catch(_) { return null; }
}

function approximateSeptemberEquinoxUTC(year) {
  // Simple approximation around Sep 22 ~ 18:30 UTC
  if (year >= 0 && year < 100) {
    const y4 = String(year).padStart(4, '0');
    return new Date(`${y4}-09-22T18:30:00.000Z`);
  }
  return new Date(Date.UTC(year, 8, 22, 18, 30, 0));
}

function buildLunarMap(data) {
  // Map day_of_year -> lunar info, plus mark first new moon after Sep equinox as Lunar Rosh Hashanah
  const map = new Map();
  const detailed = [];
  for (const d of data) {
    const info = moonPhaseInfoForYMD(d.gregorian);
    if (!info) continue;
    const item = {
      icon: info.icon,
      label: info.label,
      isNew: info.isNew,
      isFull: info.isFull,
      isFirstQuarter: info.isFirstQuarter,
      isLastQuarter: info.isLastQuarter,
      date: info.date
    };
    map.set(d.day_of_year, item);
    detailed.push({ doY: d.day_of_year, ...item });
  }
  try {
    const first = data[0];
    if (first) {
      const y = parseInt(first.gregorian.slice(0,4), 10);
      const eqx = approximateSeptemberEquinoxUTC(y);
      const newMoons = detailed.filter(x => x.isNew && x.date >= eqx).sort((a,b) => a.date - b.date);
      if (newMoons.length) {
        const tag = newMoons[0];
        const rec = map.get(tag.doY) || {};
        rec.lunarRosh = true;
        rec.label = 'Rosh Hashanah (lunar)';
        rec.icon = '🟡';
        map.set(tag.doY, rec);
      }
    }
  } catch(_) {}
  return map;
}

function renderCalendar(data) {
  try {
    var wds = (function(){ try { return (window.getWeekdays && window.getWeekdays()) || []; } catch(_){ return []; } })();
    console.log('[renderCalendar] lang=', window.lang, 'weekdays=', wds);
    try { window.uiLog && window.uiLog('renderCalendar lang=' + (window.lang||'') + ' days=' + (data?data.length:0)); } catch(_){ }
  } catch(_){}
  const festivalMap = buildFestivalMap(data);
  const lunarMap = buildLunarMap(data);
  const calendarDiv = document.getElementById('calendar');
  calendarDiv.innerHTML = '';
  const todayStr = new Date().toISOString().slice(0, 10);

  for (let m = 1; m <= 12; m++) {
    const monthData = data.filter(d => d.enoch_month === m);
    const table = document.createElement('table');
    table.className = 'month';
    const caption = document.createElement('caption');
    const z = ZODIAC_BY_MONTH[m];
    if (z) {
      const label = (window.t ? window.t('monthLabel', { m }) : `Month ${m}`);
      caption.textContent = `${label} ${z.glyph}`;
      caption.title = `${z.en} — ${z.heLatin}${z.he ? ' (' + z.he + ')' : ''}`;
    } else {
      caption.textContent = (window.t ? window.t('monthLabel', { m }) : `Month ${m}`);
    }
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const WEEKDAYS = getWeekdaysShort();
    WEEKDAYS.forEach(w => {
      const th = document.createElement('th');
      th.textContent = w;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let row = document.createElement('tr');
    // Compute leading blanks for the first day of this month.
    // In this calendar, day_of_year 1 is Wednesday (index 3 when 0=Sun).
    // Month starts are determined by the day_of_year of the first entry of the month.
    const firstDayOfYear = monthData[0]?.day_of_year || 1;
    const startCol = ((firstDayOfYear - 1) + 3) % 7; // 0=Sun .. 6=Sat
    for (let i = 0; i < startCol; i++) row.appendChild(document.createElement('td'));

    monthData.forEach(d => {
      if (row.children.length === 7) {
        tbody.appendChild(row);
        row = document.createElement('tr');
      }
      const cell = document.createElement('td');
      const div = document.createElement('div');
      div.className = 'day';
      if (d.gregorian === todayStr) div.classList.add('today');
      if ((d.day_of_year + 3) % 7 === 0) div.classList.add('shabbat');
      const festInfo = festivalMap.get(d.day_of_year);
      if (festInfo) {
        (festInfo.classList || []).forEach(c => div.classList.add(c));
        div.classList.add('festival');
      }
      // Tooltip: include start/end at local sunset boundaries
      const { startUTC, endUTC } = sunsetPairForYMD(d.gregorian, LATITUDE, LONGITUDE);
      const startLocal = fmtLocal(startUTC);
      const endLocal = fmtLocal(endUTC);
      const festLine = festInfo && festInfo.name ? `\n${window.t ? window.t('labelFestival') : 'Festival'}: ${festInfo.name}` : '';
      // Add Sefirot mapping for Days of Awe (7/1..7/10)
      let sefLine = '';
      if (d.enoch_month === 7 && d.enoch_day >= 1 && d.enoch_day <= 10) {
        const sName = sefirotNameForAweDay(d.enoch_day);
        if (sName) sefLine = `\n${window.t ? window.t('labelSefira') : 'Sefirah'}: ${sName}`;
      }
      const lblDate = window.t ? window.t('labelDate') : 'Date';
      const lblStart = window.t ? window.t('labelStart') : 'Starts';
      const lblEnd = window.t ? window.t('labelEnd') : 'Ends';
      let moonLine = '';
      if (typeof d.moon_phase_angle_deg !== 'undefined') {
        const evt = d.moon_event ? `, evento: ${d.moon_event}${d.moon_event_utc?(' @ '+d.moon_event_utc):''}` : '';
        const sign = d.moon_sign ? `, signo: ${d.moon_sign}` : '';
        const dist = (typeof d.moon_distance_km !== 'undefined') ? `, dist: ${d.moon_distance_km} km` : '';
        moonLine = `\nLuna: fase ${d.moon_phase_angle_deg}° (illum ${Math.round((d.moon_illum||0)*100)}%)${evt}${sign}${dist}`;
      } else {
        const lmForTitle = lunarMap.get(d.day_of_year);
        if (lmForTitle) {
          const l = lmForTitle.label || 'Fase lunar';
          moonLine = `\nLuna: ${l}` + (lmForTitle.lunarRosh ? ' (Año Nuevo lunar)' : '');
        }
      }
      div.title = `${lblDate}: ${d.gregorian}\n${lblStart}: ${startLocal}\n${lblEnd}: ${endLocal}${festLine}${sefLine}${moonLine}`;

      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = d.enoch_day;
      // Moon icon next to the day number (prefer backend precise data if present)
      let lm = null;
      if (typeof d.moon_icon !== 'undefined') {
        lm = { icon: d.moon_icon, label: d.moon_event ? `Evento: ${d.moon_event}` : 'Fase lunar', isNew: d.moon_event === 'new', isFull: d.moon_event === 'full', lunarRosh: false };
      } else {
        lm = lunarMap.get(d.day_of_year);
      }
      if (lm && lm.icon) {
        const m = document.createElement('span');
        m.className = 'moon';
        m.textContent = lm.icon;
        m.title = lm.label || 'Fase lunar';
        num.appendChild(m);
        if (lm.isNew) div.classList.add('moon-new');
        if (lm.isFull) div.classList.add('moon-full');
        if (lm.lunarRosh) div.classList.add('lunar-rosh');
        // Perigee/Apogee small badges
        if (d.perigee) {
          const b = document.createElement('span'); b.textContent = '↓'; b.title = `Perigeo ${d.perigee_utc||''}`; b.style.marginLeft = '2px'; num.appendChild(b);
        }
        if (d.apogee) {
          const b = document.createElement('span'); b.textContent = '↑'; b.title = `Apogeo ${d.apogee_utc||''}`; b.style.marginLeft = '2px'; num.appendChild(b);
        }
      }
      const shem = document.createElement('div');
      shem.className = 'shem';
      shem.textContent = d.name;
      div.appendChild(num);
      div.appendChild(shem);
      if (festInfo && festInfo.name) {
        const festDiv = document.createElement('div');
        festDiv.className = 'fest';
        festDiv.textContent = festInfo.short || festInfo.name;
        div.appendChild(festDiv);
      }
      cell.appendChild(div);
      row.appendChild(cell);
    });

    while (row.children.length < 7) row.appendChild(document.createElement('td'));
    tbody.appendChild(row);
    table.appendChild(tbody);
    calendarDiv.appendChild(table);
  }

  const extra = data.filter(d => d.added_week);
  if (extra.length) {
    const table = document.createElement('table');
    table.className = 'month';
    const caption = document.createElement('caption');
    caption.textContent = (window.t ? window.t('intercalaryWeek') : 'Intercalary Week');
    table.appendChild(caption);
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    extra.forEach(d => {
      const cell = document.createElement('td');
      const div = document.createElement('div');
      div.className = 'day';
      if ((d.day_of_year + 3) % 7 === 0) div.classList.add('shabbat');
      const fest2 = festivalMap.get(d.day_of_year);
      if (fest2) {
        (fest2.classList || []).forEach(c => div.classList.add(c));
        div.classList.add('festival');
      }
      // Intercalary tooltip with sunset boundaries
      const pair2 = sunsetPairForYMD(d.gregorian, LATITUDE, LONGITUDE);
      const f2 = festivalMap.get(d.day_of_year);
      const f2Line = f2 && f2.name ? `\n${window.t ? window.t('labelFestival') : 'Festival'}: ${f2.name}` : '';
      const lblDate2 = window.t ? window.t('labelDate') : 'Date';
      const lblStart2 = window.t ? window.t('labelStart') : 'Starts';
      const lblEnd2 = window.t ? window.t('labelEnd') : 'Ends';
      let moonLine2 = '';
      if (typeof d.moon_phase_angle_deg !== 'undefined') {
        const evt2 = d.moon_event ? `, evento: ${d.moon_event}${d.moon_event_utc?(' @ '+d.moon_event_utc):''}` : '';
        const sign2 = d.moon_sign ? `, signo: ${d.moon_sign}` : '';
        const dist2 = (typeof d.moon_distance_km !== 'undefined') ? `, dist: ${d.moon_distance_km} km` : '';
        moonLine2 = `\nLuna: fase ${d.moon_phase_angle_deg}° (illum ${Math.round((d.moon_illum||0)*100)}%)${evt2}${sign2}${dist2}`;
      } else {
        const lm2 = lunarMap.get(d.day_of_year);
        if (lm2) {
          const l2 = lm2.label || 'Fase lunar';
          moonLine2 = `\nLuna: ${l2}` + (lm2.lunarRosh ? ' (Año Nuevo lunar)' : '');
        }
      }
      div.title = `${lblDate2}: ${d.gregorian}\n${lblStart2}: ${fmtLocal(pair2.startUTC)}\n${lblEnd2}: ${fmtLocal(pair2.endUTC)}${f2Line}${moonLine2}`;
      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = d.enoch_day;
      // Moon icon next to the day number in intercalary week
      if (lm2 && lm2.icon) {
        const m2 = document.createElement('span');
        m2.className = 'moon';
        m2.textContent = lm2.icon;
        m2.title = lm2.label || 'Fase lunar';
        num.appendChild(m2);
        if (lm2.isNew) div.classList.add('moon-new');
        if (lm2.isFull) div.classList.add('moon-full');
        if (lm2.lunarRosh) div.classList.add('lunar-rosh');
      }
      const shem = document.createElement('div');
      shem.className = 'shem';
      shem.textContent = d.name;
      div.appendChild(num);
      div.appendChild(shem);
      if (fest2 && fest2.name) {
        const festDiv = document.createElement('div');
        festDiv.className = 'fest';
        festDiv.textContent = fest2.short || fest2.name;
        div.appendChild(festDiv);
      }
      cell.appendChild(div);
      row.appendChild(cell);
    });
    tbody.appendChild(row);
    table.appendChild(tbody);
    calendarDiv.appendChild(table);
  }
}

// --- Touch/click tooltip support for mobile (Android/iOS) ---
(function setupTouchTooltips(){
  function ensureInfoBox() {
    let box = document.getElementById('dayInfoBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'dayInfoBox';
      box.style.position = 'fixed';
      box.style.zIndex = '9999';
      box.style.maxWidth = '280px';
      box.style.background = 'rgba(0,0,0,0.9)';
      box.style.color = '#fff';
      box.style.padding = '8px 10px';
      box.style.borderRadius = '8px';
      box.style.boxShadow = '0 2px 10px rgba(0,0,0,0.4)';
      box.style.fontSize = '12px';
      box.style.display = 'none';
      box.style.pointerEvents = 'auto';
      box.style.whiteSpace = 'pre-line';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-live', 'polite');

      const close = document.createElement('div');
      close.textContent = '✕';
      close.style.position = 'absolute';
      close.style.top = '2px';
      close.style.right = '6px';
      close.style.cursor = 'pointer';
      close.style.opacity = '0.8';
      close.addEventListener('click', () => hideBox());
      box.appendChild(close);

      const content = document.createElement('div');
      content.id = 'dayInfoBoxContent';
      box.appendChild(content);

      document.body.appendChild(box);
    }
    return box;
  }

  function showBoxFor(el) {
    const box = ensureInfoBox();
    const content = box.querySelector('#dayInfoBoxContent');
    const txt = el.getAttribute('title') || '';
    content.innerHTML = txt.replace(/\n/g, '<br/>');
    // Position near element (bottom-center), with viewport clamping
    const r = el.getBoundingClientRect();
    const margin = 8;
    let left = Math.round(r.left + (r.width/2));
    let top = Math.round(r.bottom + margin);
    box.style.display = 'block';
    box.style.opacity = '0';
    box.style.transform = 'translate(-50%, 0)';
    // Temporarily place to measure
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    // Clamp horizontally within viewport
    const vw = window.innerWidth;
    const bw = box.offsetWidth;
    if (left - bw/2 < margin) {
      box.style.left = Math.max(margin, bw/2 + margin) + 'px';
    } else if (left + bw/2 > vw - margin) {
      box.style.left = Math.min(vw - margin, vw - bw/2 - margin) + 'px';
    }
    // Clamp vertically if too low
    const vh = window.innerHeight;
    const bh = box.offsetHeight;
    if (top + bh > vh - margin) {
      box.style.top = Math.max(margin, r.top - bh - margin) + 'px';
    }
    // Fade in
    requestAnimationFrame(() => { box.style.opacity = '1'; });
  }

  function hideBox() {
    const box = document.getElementById('dayInfoBox');
    if (box) box.style.display = 'none';
  }

  // Event delegation: support click/touch on any .day
  function onActivate(e) {
    const el = e.target?.closest?.('.day');
    if (!el) return;
    // Prevent duplicate activation when touch triggers click
    if (e.type === 'touchstart') {
      e.preventDefault?.();
    }
    showBoxFor(el);
  }

  const cal = document.getElementById('calendar');
  if (cal) {
    cal.addEventListener('click', onActivate, { passive: true });
    cal.addEventListener('touchstart', onActivate, { passive: false });
  }
  // Hide on outside click
  document.addEventListener('click', (e) => {
    const box = document.getElementById('dayInfoBox');
    if (!box || box.style.display === 'none') return;
    if (e.target === box || box.contains(e.target)) return;
    if (e.target?.closest?.('.day')) return; // handled by onActivate
    hideBox();
  }, { passive: true });
  // Hide on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideBox();
  });
})();

document.getElementById('prevYear').addEventListener('click', async () => {
  if (isBuilding) {
    console.log('[prevYear] build in progress');
    return;
  }
  const targetYear = currentYear - 1;
  console.log('[prevYear] target', targetYear);
  if (!(await loadYearFromCSV(targetYear))) {
    await buildCalendar(addDays(currentStartDate, -7), false);
  }
});

document.getElementById('nextYear').addEventListener('click', async () => {
  if (isBuilding) {
    console.log('[nextYear] build in progress');
    return;
  }
  const targetYear = currentYear + 1;
  console.log('[nextYear] target', targetYear);
  if (!(await loadYearFromCSV(targetYear))) {
    await buildCalendar(addDays(currentStartDate, currentYearLength + 7), false);
  }
});

document.getElementById('downloadCsv').addEventListener('click', () => {
  console.log('[downloadCsv] exporting');
  downloadCSV(currentData);
});

const dlIcsBtn = document.getElementById('downloadIcs');
if (dlIcsBtn) dlIcsBtn.addEventListener('click', () => {
  console.log('[downloadIcs] exporting');
  try { downloadICS(currentData); } catch (e) { console.error('ICS export failed', e); }
});

// --- UI wiring for Jump Year and Map Date ---
function onClick(id, handler) {
  const el = document.getElementById(id);
  if (!el) { console.warn('[ui] missing #' + id); return; }
  el.addEventListener('click', handler);
}

// Jump to a specific Enoch year (CSV-first, fallback to approximate)
onClick('jumpYearBtn', async () => {
  try {
    const input = document.getElementById('jumpYearInput');
    if (!input) return;
    const cleaned = String(input.value || '').trim().replace(/[^\d-]/g, '');
    const y = parseInt(cleaned, 10);
    if (!y || isNaN(y)) { setStatus('inputEnterValidYear'); return; }
    if (isBuilding) { console.log('[jumpYear] build in progress'); return; }
    console.log('[jumpYear] requested', y);
    if (await loadYearFromCSV(y)) {
      console.log('[jumpYear] loaded from CSV year', y);
      // show approximate Gregorian anchor alongside the Enoch year for clarity
      const gY = 2025 + (y - REFERENCE_ENOCH_YEAR);
      setYearLabel(y, padYear4(gY));
      return;
    }
    // Approximate start date by mapping Enoch year to Gregorian year using reference
    const gregY = 2025 + (y - REFERENCE_ENOCH_YEAR);
    const approxStart = getApproxEnochStartForGregorianYear(gregY);
    console.log('[jumpYear] fallback build from', approxStart.toISOString());
    await buildCalendar(approxStart, false);
    // Ensure label reflects requested Enoch year
    currentYear = y;
    setYearLabel(y, padYear4(gregY));
  } catch (e) {
    console.error('[jumpYear] failed', e);
    const s = document.getElementById('status'); if (s) s.textContent = 'Jump failed';
  }
});

// Allow Enter on the input
(function() {
  const el = document.getElementById('jumpYearInput');
  if (el) el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const btn = document.getElementById('jumpYearBtn');
      if (btn) btn.click();
    }
  });
})();

// Map a Gregorian date to Enoch and load that year
onClick('mapDateBtn', async () => {
  try {
    const input = document.getElementById('gregDate');
    if (!input || !input.value) { setStatus('pickGregorianDate'); return; }
    // Build a local noon date to avoid TZ rollover
    const dtLocal = new Date(input.value + 'T12:00:00');
    console.log('[mapDate] local date picked', dtLocal.toISOString());
    // Guard: avoid calling backend with years far outside its supported range
    const yGreg = dtLocal.getUTCFullYear();
    if (yGreg < 1 || yGreg > 2099) {
      const approxEnoch = getApproxEnochYearForDate(new Date(dtLocal.toISOString()));
      const msg = `El servidor no soporta el año gregoriano ${padYear4(yGreg)}. Usa Go con Año Enoj ${approxEnoch} (≈ ${padYear4(yGreg)} CE) o carga CSV si existe.`;
      console.warn('[mapDate] out-of-range, skipping API', yGreg);
      const s = document.getElementById('status'); if (s) s.textContent = msg;
      setYearLabel(approxEnoch, padYear4(yGreg));
      // Try CSV for the approximated Enoch year
      await loadYearFromCSV(approxEnoch);
      return;
    }
    if (isBuilding) { console.log('[mapDate] build in progress'); return; }
    const base = await fetchEnoch(dtLocal);
    const e = base.enoch;
    const box = document.getElementById('pickedInfo');
    if (box) {
      if ((window.lang||'es') === 'en') {
        box.textContent = `Gregorian ${input.value} → Enoch Year ${e.enoch_year}, Month ${e.enoch_month}, Day ${e.enoch_day} (day ${e.enoch_day_of_year})`;
      } else {
        box.textContent = `Gregoriano ${input.value} → Enoj Año ${e.enoch_year}, Mes ${e.enoch_month}, Día ${e.enoch_day} (día ${e.enoch_day_of_year})`;
      }
    }
    // Load the calendar of that Enoch year (CSV-first), otherwise build from this date
    console.log('[mapDate] loading calendar for Enoch year', e.enoch_year);
    if (await loadYearFromCSV(e.enoch_year)) {
      console.log('[mapDate] calendar loaded from CSV for year', e.enoch_year);
      return;
    }
    await buildCalendar(dtLocal, false, base);
  } catch (e) {
    console.error('[mapDate] failed', e);
    setStatus('statusMapError');
  }
});

async function initCalendar() {
  console.log('[initCalendar] start');
  const today = new Date();
  try {
    // 1) Try local approx to determine the Enoch year and prefer CSV
    const approxYear = getApproxEnochYearForDate(new Date(today.toISOString()));
    console.log('[initCalendar] approx enoch year', approxYear);
    const csvOk = await loadYearFromCSV(approxYear);
    if (csvOk) return;

    // 2) Fallback to API to get precise base and build
    console.log('[initCalendar] CSV not found, falling back to API build');
    const base = await fetchEnoch(today);
    await buildCalendar(today, false, base);
  } catch (e) {
    console.error('[initCalendar] failed', e);
    setStatus('statusInitError');
  }
}

// Expose for i18n-driven re-render
try { window.renderCalendar = renderCalendar; } catch(_) {}

initCalendar();

