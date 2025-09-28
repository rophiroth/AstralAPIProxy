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

// --- User location (lat/lon/tz) resolution ---
// Initialize with sane defaults (do not reference LATITUDE/LONGITUDE before they are declared)
let USER_LAT = -33.45;
let USER_LON = -70.6667;
let USER_TZ = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';

async function resolveUserLocation() {
  try {
    const qs = getQS();
    const qlat = parseFloat(qs.get('lat'));
    const qlon = parseFloat(qs.get('lon') || qs.get('lng'));
    const qtz = (qs.get('tz') || '').trim();
    if (isFinite(qlat) && Math.abs(qlat) <= 90) USER_LAT = qlat;
    if (isFinite(qlon) && Math.abs(qlon) <= 180) USER_LON = qlon;
    if (qtz) USER_TZ = qtz;
    // Local storage fallback
    const ls = localStorage;
    if (ls) {
      if (!isFinite(qlat)) { const v = parseFloat(ls.getItem('userLat')); if (isFinite(v)) USER_LAT = v; }
      if (!isFinite(qlon)) { const v = parseFloat(ls.getItem('userLon')); if (isFinite(v)) USER_LON = v; }
      const tzLS = ls.getItem('userTz'); if (!qtz && tzLS) USER_TZ = tzLS;
    }
    // Try browser Geolocation
    if ((!isFinite(qlat) || !isFinite(qlon)) && navigator.geolocation) {
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition((pos) => {
          try {
            USER_LAT = pos.coords.latitude;
            USER_LON = pos.coords.longitude;
            localStorage.setItem('userLat', String(USER_LAT));
            localStorage.setItem('userLon', String(USER_LON));
          } catch(_){}
          resolve();
        }, () => resolve(), { enableHighAccuracy: false, timeout: 4000, maximumAge: 3600000 });
      });
    }
    // If still missing, ask user
    if (!isFinite(USER_LAT) || !isFinite(USER_LON)) {
      const ans = prompt('Enter your location as lat,lon (e.g., 40.7,-74.0):');
      if (ans && /-?\d/.test(ans)) {
        const parts = ans.split(/[,\s]+/);
        const la = parseFloat(parts[0]);
        const lo = parseFloat(parts[1]);
        if (isFinite(la) && Math.abs(la)<=90) USER_LAT = la;
        if (isFinite(lo) && Math.abs(lo)<=180) USER_LON = lo;
        try { localStorage.setItem('userLat', String(USER_LAT)); localStorage.setItem('userLon', String(USER_LON)); } catch(_){}
      }
    }
    try { localStorage.setItem('userTz', USER_TZ); } catch(_){}
  } catch(_) {}
}

function getUserLatLonTz() { return { lat: USER_LAT, lon: USER_LON, tz: USER_TZ }; }

// Sanity: map phase angle to nearest canonical event
function nearestEventFromAngle(deg) {
  if (typeof deg !== 'number' || !isFinite(deg)) return '';
  const a = ((deg % 360) + 360) % 360;
  const targets = [0, 90, 180, 270];
  const names = ['new','first_quarter','full','last_quarter'];
  let bestIdx = 0, bestD = 1e9;
  for (let i=0;i<targets.length;i++) {
    let d = Math.abs(a - targets[i]);
    if (d > 180) d = 360 - d;
    if (d < bestD) { bestD = d; bestIdx = i; }
  }
  return names[bestIdx];
}

// --- Lunar UI helpers (icons + i18n labels) ---
function getLang() {
  try { return (window.lang || 'es'); } catch(_) { return 'es'; }
}

function moonEventIcon(evt) {
  switch (evt) {
    case 'new': return '🌚';
    case 'full': return '🌝';
    // Prefer face-style quarters for clearer distinction
    case 'first_quarter': return '🌛';
    case 'last_quarter': return '🌜';
    default: return '';
  }
}

function moonEventLabel(evt) {
  const L = getLang();
  const es = { new: 'Luna nueva', full: 'Luna llena', first_quarter: 'Cuarto creciente', last_quarter: 'Cuarto menguante' };
  const en = { new: 'New Moon', full: 'Full Moon', first_quarter: 'First Quarter', last_quarter: 'Last Quarter' };
  const map = (L === 'en') ? en : es;
  return map[evt] || '';
}

function phaseAngleToIcon(deg) {
  if (typeof deg !== 'number' || !isFinite(deg)) return '';
  const a = ((deg % 360) + 360) % 360;
  if (a < 45) return '🌑';
  if (a < 90) return '🌒';
  if (a < 135) return '🌓';
  if (a < 180) return '🌔';
  if (a < 225) return '🌕';
  if (a < 270) return '🌖';
  if (a < 315) return '🌗';
  return '🌘';
}

function i18nWord(key) {
  try {
    if (window.t) {
      const v = window.t(key);
      if (v && v !== key) return v;
    }
  } catch(_){}
  const L = getLang();
  const es = { labelMoon: 'Luna', labelEvent: 'Evento', labelSign: 'Signo', labelDistance: 'Dist', perigee: 'Perigeo', apogee: 'Apogeo' };
  const en = { labelMoon: 'Moon', labelEvent: 'Event', labelSign: 'Sign', labelDistance: 'Dist', perigee: 'Perigee', apogee: 'Apogee' };
  const map = (L === 'en') ? en : es;
  return map[key] || key;
}

// Format start/end longitudes with zodiac labels from backend
function formatStartEndLunar(d) {
  try {
    const ls = Number(d.moon_long_start_deg);
    const le = Number(d.moon_long_end_deg);
    const ss = d.moon_sign_start || '';
    const se = d.moon_sign_end || '';
    if (!Number.isFinite(ls) || !Number.isFinite(le)) return '';
    const fmt = (x) => (Math.round(x * 10) / 10).toFixed(1);
    const degInSign = (x) => {
      const n = ((x % 360) + 360) % 360;
      return n % 30;
    };
    const a = fmt(degInSign(ls)) + '°';
    const b = fmt(degInSign(le)) + '°';
    if (ss && se && ss !== se) {
      return `${ss} ${a} → ${se} ${b}`;
    }
    if (ss) return `${ss} ${a} → ${b}`;
    if (se) return `${a} → ${se} ${b}`;
    return `${a} → ${b}`;
  } catch(_) { return '';
  }
}

// Normalize percent-like values to fraction [0..1]
function pctToFrac(val) {
  try {
    if (val === null || typeof val === 'undefined') return NaN;
    let s = val;
    if (typeof s === 'string') {
      s = s.trim().replace(/%$/, '');
    }
    let n = Number(s);
    if (!Number.isFinite(n)) return NaN;
    if (n > 1) n = n / 100; // accept 0..100 inputs
    if (n < 0) n = 0;
    if (n > 1) n = 1;
    return n;
  } catch(_) { return NaN; }
}

// Canonicalize sign names to compare/order zodiacally (tropical order Aries..Pisces)
function canonicalSignName(sign) {
  try {
    if (!sign || typeof sign !== 'string') return '';
    let s = sign.trim();
    const strip = (x) => x.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const t = strip(s);
    const map = {
      'aries': 'Aries',
      'tauro': 'Taurus', 'taurus': 'Taurus',
      'geminis': 'Gemini', 'géminis': 'Gemini', 'gemini': 'Gemini',
      'cancer': 'Cancer', 'cáncer': 'Cancer',
      'leo': 'Leo',
      'virgo': 'Virgo',
      'libra': 'Libra',
      'escorpio': 'Scorpio', 'scorpio': 'Scorpio',
      'sagitario': 'Sagittarius', 'sagittarius': 'Sagittarius',
      'capricornio': 'Capricorn', 'capricorn': 'Capricorn',
      'acuario': 'Aquarius', 'aquarius': 'Aquarius',
      'piscis': 'Pisces', 'pisces': 'Pisces'
    };
    return map[t] || s;
  } catch(_) { return String(sign||''); }
}

function zodiacIndex(sign) {
  const order = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const c = canonicalSignName(sign);
  const i = order.indexOf(c);
  return (i >= 0) ? i : 99;
}

function getSignOrderMode() {
  try {
    const v = (getQS().get('order') || '').trim().toLowerCase();
    if (!v) return 'zodiac';
    if (['zodiac','astro','tropical'].includes(v)) return 'zodiac';
    if (['percent','pct','p'].includes(v)) return 'percent';
    if (['primary','raw','as-is'].includes(v)) return 'primary';
  } catch(_) {}
  return 'zodiac';
}

// Decide left/right order of two signs respecting zodiac cycle (Pisces → Aries wrap)
function orderZodiacPair(a, b) {
  const ia = zodiacIndex(a);
  const ib = zodiacIndex(b);
  if (ia === 99 || ib === 99) return { left: a, right: b };
  const N = 12;
  // If adjacent, put the preceding sign first (e.g., Pisces before Aries)
  if ((ia + 1) % N === ib) return { left: a, right: b };
  if ((ib + 1) % N === ia) return { left: b, right: a };
  // Otherwise, fall back to zodiac index order with wrap considered minimal
  // Prefer the sign that precedes the other along one-step-forward path
  const dAB = (ib - ia + N) % N;
  const dBA = (ia - ib + N) % N;
  if (dAB < dBA) return { left: a, right: b };
  if (dBA < dAB) return { left: b, right: a };
  // Tie: keep incoming order
  return { left: a, right: b };
}

// Pretty illumination: show decimals when small to avoid repeated 0%
function formatIllumPercent(illum) {
  const x = Number(illum);
  if (!Number.isFinite(x) || x < 0) return '';
  const p = x * 100;
  // Finer precision near zero to capture subtle changes
  if (p > 0 && p < 1) return p.toFixed(2) + '%';
  if (p >= 1 && p < 10) return p.toFixed(1) + '%';
  return Math.round(p) + '%';
}

function getMixThreshold() {
  try {
    const qs = getQS();
    const v = (qs.get('mix') || '').trim();
    if (!v) return 0.0001; // default 0.01% (ultra-low)
    let num = parseFloat(v);
    if (!isFinite(num)) return 0.0001;
    if (num > 1) num = num / 100; // allow ?mix=25 meaning 25%
    if (num < 0) num = 0;
    if (num > 0.5) num = 0.5; // sane upper bound
    return num;
  } catch(_) { return 0.0001; }
}

function getPureClamp() {
  try {
    const qs = getQS();
    const raw = (qs.get('pure') || '').trim();
    const v = raw.toLowerCase();
    if (!v) return 0.95; // default: if primary >= 95%, show as pure
    // Allow disabling pure gating entirely: ?pure=off
    if (['off','none','no','disable'].includes(v)) return 2; // never reached by pPct (<=1)
    let num = parseFloat(raw);
    if (!isFinite(num)) return 0.95;
    if (raw.includes('%') || num > 1) num = num / 100; // allow ?pure=95 or ?pure=95%
    if (num < 0) num = 0;
    if (num > 1) num = 1;
    return num;
  } catch(_) { return 0.95; }
}

function formatSignMix(d) {
  try {
    const thresh = getMixThreshold();
    const pureClamp = getPureClamp();
    const primary = d.moon_sign_primary || d.moon_sign || '';
    const pPct = pctToFrac(d.moon_sign_primary_pct);
    const secondary = d.moon_sign_secondary;
    // Fallback: if secondary% missing but primary% present, derive as 1 - primary%
    let sPct = pctToFrac(d.moon_sign_secondary_pct);
    if (!Number.isFinite(sPct) && Number.isFinite(pPct)) {
      sPct = Math.max(0, 1 - pPct);
    }
    // Si backend envía secundario válido, priorizar mostrar mezcla (sin ocultar por pureClamp)
    if (secondary && Number.isFinite(sPct) && Number.isFinite(pPct) && primary && primary !== secondary) {
      // Decide if we should show mix using fractional threshold to support <1%
      const edgeRoundingCase = (Math.round(pPct * 100) === 100 && Math.round((1 - pPct) * 100) === 0 && pPct < 1 && sPct > 0);
      if (!(sPct >= thresh || edgeRoundingCase)) return primary || '';
      // Round to integers and force two-term sum to 100
      let p = Math.max(0, Math.min(100, Math.round(pPct * 100)));
      let s = 100 - p;
      // Avoid visually misleading 100/0 when not truly pure
      if (edgeRoundingCase) { p = 99; s = 1; }
      // Order signs according to zodiac (default), or keep by percent/primary
      const mode = getSignOrderMode();
      let leftName = primary, leftPct = p, rightName = secondary, rightPct = s;
      if (mode === 'zodiac') {
        const pair = orderZodiacPair(primary, secondary);
        if (pair.left !== leftName) { leftPct = s; rightPct = p; }
        leftName = pair.left; rightName = pair.right;
      } else if (mode === 'percent') {
        if (s > p) { leftName = secondary; leftPct = s; rightName = primary; rightPct = p; }
      }
      return `${leftName} ${leftPct}% / ${rightName} ${rightPct}%`;
    }
    // If we don't have a secondary label but we do have shares, still surface the mix numerically
    if (Number.isFinite(sPct) && Number.isFinite(pPct) && primary) {
      const edgeRoundingCase = (Math.round(pPct * 100) === 100 && Math.round((1 - pPct) * 100) === 0 && pPct < 1 && sPct > 0);
      if (!(sPct >= thresh || edgeRoundingCase)) return primary || '';
      let p = Math.max(0, Math.min(100, Math.round(pPct * 100)));
      let s = 100 - p;
      if (edgeRoundingCase) { p = 99; s = 1; }
      // No secondary label: still respect order mode for the numeric part by swapping percentages if needed
      const mode = getSignOrderMode();
      if (mode === 'percent' && s > p) { const tmp = p; p = s; s = tmp; }
      return `${primary} ${p}% / ${s}%`;
    }
    // Si no hay secundario ni shares utilizables: aplicar clamp de pureza sólo como fallback
    if (Number.isFinite(pPct) && pPct >= pureClamp) {
      return primary || '';
    }
    return primary || '';
  } catch(_) { return d.moon_sign || ''; }
}

// Snap icons around canonical phases to visually center event days
// Use wider snap for new/full, narrower for quarters to avoid overusing half icons
// Tight snap to avoid duplicate event-days from angle-only CSV
const SNAP_DEG_SYZIGY = 6;    // new/full
const SNAP_DEG_QUARTER = 6;   // first/last quarter
function snapIconFromAngle(deg) {
  if (typeof deg !== 'number' || !isFinite(deg)) return '';
  const a = ((deg % 360) + 360) % 360;
  const targets = [0,90,180,270];
  // For non-event days, use half icons only when very close; otherwise use crescents/gibbous
  const iconsQuarter = ['🌑','🌓','🌕','🌗'];
  let bestIdx = 0, bestD = 1e9;
  for (let i=0;i<targets.length;i++) {
    let d = Math.abs(a - targets[i]);
    if (d > 180) d = 360 - d;
    if (d < bestD) { bestD = d; bestIdx = i; }
  }
  const isQuarter = (bestIdx === 1 || bestIdx === 3);
  const limit = isQuarter ? SNAP_DEG_QUARTER : SNAP_DEG_SYZIGY;
  if (bestD <= limit) return iconsQuarter[bestIdx];
  return phaseAngleToIcon(a);
}

// --- Minimal moon icon logic (centralized) ---
function normalizeIllum(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return NaN;
  if (n <= 0) return 0;
  if (n >= 1 && n <= 100) return n / 100; // tolerate 0..100 inputs
  return Math.min(1, Math.max(0, n));
}

function pickMoonIcon(d, lunarMap, override) {
  // 1) Deterministic override (used around exact events to keep symmetry)
  if (override && override.icon) {
    return { icon: override.icon, isNewEvt: d.moon_event === 'new', isFullEvt: d.moon_event === 'full' };
  }
  // 2) Exact backend event → use faces (🌚/🌝/🌛/🌜) only if enabled
  if ((typeof useServerEvents === 'function' ? useServerEvents() : false) && d.moon_event) {
    const m = { new: '🌚', full: '🌝', first_quarter: '🌛', last_quarter: '🌜' };
    return { icon: m[d.moon_event] || '', isNewEvt: d.moon_event === 'new', isFullEvt: d.moon_event === 'full' };
  }
  // 2b) Client-side: if angle is near canonical targets, use faces
  if (Number.isFinite(d.moon_phase_angle_deg)) {
    const a = ((d.moon_phase_angle_deg % 360) + 360) % 360;
    const targets = [0,90,180,270];
    const faces = ['🌚','🌛','🌝','🌜'];
    let bestIdx = 0, bestD = 1e9;
    for (let i=0;i<targets.length;i++) {
      let dist = Math.abs(a - targets[i]);
      if (dist > 180) dist = 360 - dist;
      if (dist < bestD) { bestD = dist; bestIdx = i; }
    }
    const limit = (bestIdx === 1 || bestIdx === 3) ? SNAP_DEG_QUARTER : SNAP_DEG_SYZIGY;
    if (bestD <= limit) return { icon: faces[bestIdx], isNewEvt: bestIdx===0, isFullEvt: bestIdx===2 };
  }
  // 3) Angle from backend, clamped by illumination extremes
  if (Number.isFinite(d.moon_phase_angle_deg)) {
    const f = normalizeIllum(d.moon_illum);
    if (Number.isFinite(f)) {
      if (f <= 0.02) return { icon: '🌑', isNewEvt: false, isFullEvt: false };
      if (f >= 0.98) return { icon: '🌕', isNewEvt: false, isFullEvt: false };
    }
    return { icon: snapIconFromAngle(d.moon_phase_angle_deg), isNewEvt: false, isFullEvt: false };
  }
  // 4) Fallback: approximate lunar map (discs/halves only)
  const lm = lunarMap && lunarMap.get(d.day_of_year);
  if (lm) {
    let icon = '';
    if (lm.isNew) icon = '🌑';
    else if (lm.isFull) icon = '🌕';
    else if (lm.isFirstQuarter) icon = '🌓';
    else if (lm.isLastQuarter) icon = '🌗';
    else icon = lm.icon || '';
    return { icon, isNewEvt: !!lm.isNew, isFullEvt: !!lm.isFull };
  }
  return { icon: '', isNewEvt: false, isFullEvt: false };
}

function buildMoonTooltip(d, lunarMap) {
  const LblMoon = i18nWord('labelMoon');
  if (Number.isFinite(d.moon_phase_angle_deg)) {
    const LblEvent = i18nWord('labelEvent');
    const LblSign = i18nWord('labelSign');
    const LblDist = i18nWord('labelDistance');
    let evt = '';
    if (typeof useServerEvents === 'function' ? useServerEvents() : false) {
      if (d.moon_event) evt = `, ${LblEvent}: ${moonEventLabel(d.moon_event)}${d.moon_event_utc?(' @ '+d.moon_event_utc):''}`;
    }
    const signText = formatSignMix(d);
    const degText = formatStartEndLunar(d);
    const sign = (signText || degText) ? `, ${LblSign}: ${signText}${degText ? ' ('+degText+')' : ''}` : '';
    const dist = (Number.isFinite(d.moon_distance_km)) ? `, ${LblDist}: ${d.moon_distance_km} km` : '';
    // Prefer start/end illumination across the Enoch day if available
    const hasSE = Number.isFinite(d.moon_illum_start) && Number.isFinite(d.moon_illum_end);
    let pct = formatIllumPercent(d.moon_illum);
    if (hasSE) {
      const startPct = formatIllumPercent(d.moon_illum_start);
      const endPct = formatIllumPercent(d.moon_illum_end);
      const eps = 0.0005; // ~0.05%
      const delta = Number(d.moon_illum_end) - Number(d.moon_illum_start);
      if (Math.abs(delta) <= eps) {
        // Equal within epsilon: if an event occurs inside, show valley/peak explicitly
        if (d.moon_event === 'new') {
          pct = `${startPct} ↘ 0% ↗ ${endPct}`;
        } else if (d.moon_event === 'full') {
          pct = `${startPct} ↗ 100% ↘ ${endPct}`;
        } else {
          pct = `${startPct} ↔ ${endPct}`;
        }
      } else {
        pct = `${startPct} ${delta > 0 ? '↗' : '↘'} ${endPct}`;
      }
    }
    return `\n${LblMoon}: ${pct}${evt}${sign}${dist}`;
  }
  const lm = lunarMap && lunarMap.get(d.day_of_year);
  if (lm) {
    const l = lm.label || (getLang()==='en'?'Lunar phase':'Fase lunar');
    return `\n${LblMoon}: ${l}` + (lm.lunarRosh ? (getLang()==='en'?' (Lunar New Year)':' (Año Nuevo lunar)') : '');
  }
  return '';
}

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

// Build CSV URL with versioned cache-busting and optional no-cache toggle
function csvFetchUrl(year) {
  try {
    const base = `./enoch-calendar-${year}.csv`;
    const u = new URL(base, window.location.href);
    const ver = (typeof APP_VERSION === 'string' && APP_VERSION) ? APP_VERSION : String(Date.now());
    u.searchParams.set('v', ver);
    const qs = getQS();
    const force = (qs.get('nocache') || qs.get('no_cache') || qs.get('force') || '').toLowerCase();
    if (['1','true','yes','on'].includes(force)) {
      u.searchParams.set('_', String(Date.now()));
    }
    return u.toString();
  } catch(_) {
    return `./enoch-calendar-${year}.csv?v=${encodeURIComponent(APP_VERSION||'v0')}`;
  }
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

function csvStorageKey(year) {
  try {
    const ver = (typeof APP_VERSION === 'string' && APP_VERSION) ? APP_VERSION : 'v0';
    return `enochCSV:${ver}:${year}`;
  } catch(_) { return `enochCSV:v0:${year}`; }
}
function csvMetaStorageKey(year) {
  try {
    const ver = (typeof APP_VERSION === 'string' && APP_VERSION) ? APP_VERSION : 'v0';
    return `enochCSVmeta:${ver}:${year}`;
  } catch(_) { return `enochCSVmeta:v0:${year}`; }
}

function preferCsv() {
  try {
    const qs = getQS();
    const q = (qs.get('csv') || qs.get('prefer') || '').toLowerCase();
    if (q === '0' || q === 'false' || q === 'no' || q === 'api') return false;
    if (q === '1' || q === 'true' || q === 'yes' || q === 'csv') return true;
  } catch(_) {}
  return true; // default prefer CSV when available
}

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
  const header = [...baseHeader, ...lunarHeader, ...hebrewHeader].join(',');
  const lines = rows.map(d => {
    const base = [
      d.gregorian,
      d.enoch_year ?? '',
      d.enoch_month,
      d.enoch_day,
      d.day_of_year ?? '',
      d.added_week,
      (function(){
        try {
          const nm = (d.name && String(d.name).trim()) || getShemEnochiano(d.enoch_month, d.enoch_day, d.added_week) || '';
          return String(nm).replace(/,/g,' ');
        } catch(_) { return (d.name ?? ''); }
      })(),
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

// Lightweight debug helper: console.debug by default; console.log if ?debug=1
function dbg() {
  try {
    const qs = getQS();
    const force = (qs.get('debug') || '').toLowerCase();
    const useLog = ['1','true','yes','on'].includes(force);
    const logger = (useLog && console.log) ? console.log : (console.debug || console.log);
    logger.apply(console, arguments);
  } catch (_) {}
}

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
const APP_VERSION = 'calendar@2025-09-22T00:00Z';
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
  return addDaysUTC(base, diffToWed);
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
  const { lat, lon, tz } = getUserLatLonTz();
  const body = {
    datetime: date.toISOString().slice(0, 19),
    latitude: lat,
    longitude: lon,
    timezone: tz || 'UTC'
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
  dbg('[fetchEnoch] response (compact)', {
    jd: json?.julian_day,
    enoch: json?.enoch ? {
      y: json.enoch.enoch_year,
      m: json.enoch.enoch_month,
      d: json.enoch.enoch_day,
      doy: json.enoch.enoch_day_of_year
    } : undefined
  });
  return json;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
// UTC-safe day addition to avoid DST/local offset shifts when iterating days
function addDaysUTC(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
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
  const prev = addDaysUTC(base, -1);
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
        try {
          const smp = rows.slice(0, 5).map(r => ({ g: r.gregorian, evt: r.moon_event, icon: r.moon_icon, ang: r.moon_phase_angle_deg, illum: r.moon_illum }));
          dbg('[loadYearFromCSV] cache sample', smp);
        } catch(_){ }
        const { lat: uLat1, lon: uLon1 } = getUserLatLonTz();
        currentData = rows.map((r, i) => ({
          gregorian: r.gregorian,
          enoch_year: r.enoch_year || year,
          enoch_month: r.enoch_month,
          enoch_day: r.enoch_day,
          added_week: !!r.added_week,
          name: r.name,
          day_of_year: r.day_of_year || (i + 1),
          start_utc: r.start_utc || sunsetPairForYMD(r.gregorian, uLat1, uLon1).startUTC?.toISOString() || '',
          end_utc: r.end_utc || sunsetPairForYMD(r.gregorian, uLat1, uLon1).endUTC?.toISOString() || '',
          // Carry lunar fields from CSV if present
          moon_phase_angle_deg: (Number.isFinite(r.moon_phase_angle_deg) ? r.moon_phase_angle_deg : undefined),
          moon_phase_angle_start_deg: (Number.isFinite(r.moon_phase_angle_start_deg) ? r.moon_phase_angle_start_deg : undefined),
          moon_phase_angle_end_deg: (Number.isFinite(r.moon_phase_angle_end_deg) ? r.moon_phase_angle_end_deg : undefined),
          moon_illum: (Number.isFinite(r.moon_illum) ? r.moon_illum : undefined),
          moon_illum_start: (Number.isFinite(r.moon_illum_start) ? r.moon_illum_start : undefined),
          moon_illum_end: (Number.isFinite(r.moon_illum_end) ? r.moon_illum_end : undefined),
          moon_icon: r.moon_icon,
          moon_event: r.moon_event,
          moon_event_utc: r.moon_event_utc,
          moon_sign: r.moon_sign,
          moon_sign_primary: r.moon_sign_primary,
          moon_sign_primary_pct: (Number.isFinite(r.moon_sign_primary_pct) ? r.moon_sign_primary_pct : (r.moon_sign_primary_pct ? Number(r.moon_sign_primary_pct) : undefined)),
          moon_sign_secondary: r.moon_sign_secondary,
          moon_sign_secondary_pct: (Number.isFinite(r.moon_sign_secondary_pct) ? r.moon_sign_secondary_pct : (r.moon_sign_secondary_pct ? Number(r.moon_sign_secondary_pct) : undefined)),
          moon_zodiac_mode: r.moon_zodiac_mode,
          moon_long_start_deg: (Number.isFinite(r.moon_long_start_deg) ? r.moon_long_start_deg : undefined),
          moon_long_end_deg: (Number.isFinite(r.moon_long_end_deg) ? r.moon_long_end_deg : undefined),
          moon_long_delta_deg: (Number.isFinite(r.moon_long_delta_deg) ? r.moon_long_delta_deg : undefined),
          moon_sign_start: r.moon_sign_start,
          moon_sign_end: r.moon_sign_end,
          moon_distance_km: (Number.isFinite(r.moon_distance_km) ? r.moon_distance_km : undefined),
          perigee: !!r.perigee,
          perigee_utc: r.perigee_utc,
          apogee: !!r.apogee,
          apogee_utc: r.apogee_utc
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
    const res = await fetch(csvFetchUrl(year), { cache: 'no-store' });
    if (!res.ok) throw new Error('not found');
    const text = await res.text();
    const rows = parseCSV(text);
    try {
      const smp2 = rows.slice(0, 5).map(r => ({ g: r.gregorian, evt: r.moon_event, icon: r.moon_icon, ang: r.moon_phase_angle_deg, illum: r.moon_illum }));
      dbg('[loadYearFromCSV] net sample', smp2);
    } catch(_){ }
    currentData = rows.map((r, i) => ({
      gregorian: r.gregorian,
      enoch_year: r.enoch_year || year,
      enoch_month: r.enoch_month,
      enoch_day: r.enoch_day,
      added_week: !!r.added_week,
      name: r.name,
      day_of_year: r.day_of_year || (i + 1),
      // Carry lunar fields from CSV if present
      start_utc: r.start_utc,
      end_utc: r.end_utc,
      moon_phase_angle_deg: (Number.isFinite(r.moon_phase_angle_deg) ? r.moon_phase_angle_deg : undefined),
      moon_phase_angle_start_deg: (Number.isFinite(r.moon_phase_angle_start_deg) ? r.moon_phase_angle_start_deg : undefined),
      moon_phase_angle_end_deg: (Number.isFinite(r.moon_phase_angle_end_deg) ? r.moon_phase_angle_end_deg : undefined),
      moon_illum: (Number.isFinite(r.moon_illum) ? r.moon_illum : undefined),
      moon_illum_start: (Number.isFinite(r.moon_illum_start) ? r.moon_illum_start : undefined),
      moon_illum_end: (Number.isFinite(r.moon_illum_end) ? r.moon_illum_end : undefined),
      moon_icon: r.moon_icon,
      moon_event: r.moon_event,
      moon_event_utc: r.moon_event_utc,
      moon_sign: r.moon_sign,
      moon_sign_primary: r.moon_sign_primary,
      moon_sign_primary_pct: (Number.isFinite(r.moon_sign_primary_pct) ? r.moon_sign_primary_pct : (r.moon_sign_primary_pct ? Number(r.moon_sign_primary_pct) : undefined)),
      moon_sign_secondary: r.moon_sign_secondary,
      moon_sign_secondary_pct: (Number.isFinite(r.moon_sign_secondary_pct) ? r.moon_sign_secondary_pct : (r.moon_sign_secondary_pct ? Number(r.moon_sign_secondary_pct) : undefined)),
      moon_zodiac_mode: r.moon_zodiac_mode,
      moon_long_start_deg: (Number.isFinite(r.moon_long_start_deg) ? r.moon_long_start_deg : undefined),
      moon_long_end_deg: (Number.isFinite(r.moon_long_end_deg) ? r.moon_long_end_deg : undefined),
      moon_long_delta_deg: (Number.isFinite(r.moon_long_delta_deg) ? r.moon_long_delta_deg : undefined),
      moon_sign_start: r.moon_sign_start,
      moon_sign_end: r.moon_sign_end,
      moon_distance_km: (Number.isFinite(r.moon_distance_km) ? r.moon_distance_km : undefined),
      perigee: !!r.perigee,
      perigee_utc: r.perigee_utc,
      apogee: !!r.apogee,
      apogee_utc: r.apogee_utc
    }));
    currentYear = year;
    // Use safe parsing in case CSV uses non-ISO separators
    currentStartDate = parseYMDToUTC(currentData[0].gregorian) || new Date(currentData[0].gregorian);
    // Ensure start/end present for tooltip and export when loading CSV lacking them
    const { lat: uLat2, lon: uLon2 } = getUserLatLonTz();
    currentData = currentData.map(d => {
      if (!d.start_utc || !d.end_utc) {
        const { startUTC, endUTC } = sunsetPairForYMD(d.gregorian, uLat2, uLon2);
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
    // Normalize reference to a UTC anchor to avoid DST/local drift, then add days in UTC
    const refUTC = new Date(referenceDate.toISOString());
    const startDate = addDaysUTC(refUTC, -(enoch_day_of_year - 1));
    currentStartDate = startDate;
    currentYear = enoch_year;
    try { window.currentYear = currentYear; } catch(_){ }
    console.log('[buildCalendar] startDate', startDate.toISOString());

    // Try new annual endpoint for precise lunar data and day bounds
    try {
      const { lat: uLat, lon: uLon, tz } = getUserLatLonTz();
      const calcYearUrl = resolveCalcYearUrl();
      const body = {
        datetime: referenceDate.toISOString().slice(0,19),
        latitude: uLat,
        longitude: uLon,
        timezone: tz,
        zodiac_mode: 'tropical'
      };
      console.log('[buildCalendar] calling /calcYear', calcYearUrl, body);
      const res = await fetch(calcYearUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const j = await res.json();
        dbg('[calcYear] header', { ok: j?.ok, enoch_year: j?.enoch_year, days: Array.isArray(j?.days) ? j.days.length : 0 });
        try {
          if (j && Array.isArray(j.days)) {
            const sample = j.days.slice(0, 7).map(d => ({
              g: d.gregorian,
              evt: d.moon_event,
              icon: d.moon_icon,
              ang: d.moon_phase_angle_deg,
              illum: d.moon_illum,
              start: d.start_utc,
              end: d.end_utc
            }));
            dbg('[calcYear] sample days', sample);
          }
        } catch(_){}
        if (j && j.ok && Array.isArray(j.days)) {
          // Ensure each day carries the Shemot name; fallback to local resolver if backend omitted it
          currentData = j.days.map(d => ({
            ...d,
            name: (d && d.name) ? d.name : getShemEnochiano(d.enoch_month, d.enoch_day, d.added_week)
          }));
          try {
            const evs = currentData.filter(d => d.moon_event).map(d => ({ g: d.gregorian, evt: d.moon_event, utc: d.moon_event_utc, icon: d.moon_icon }));
            dbg('[calcYear] events received (first 12)', evs.slice(0,12));
          } catch(_){ }
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
    for (let i = 0; i < 364; i++) dates.push(addDaysUTC(startDate, i));
    let results = await fetchInBatches(dates);
    if (results[363].enoch.added_week) {
      console.log('[buildCalendar] added week detected');
      const extra = [];
      for (let i = 364; i < 371; i++) extra.push(addDaysUTC(startDate, i));
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
    // Tighter epsilon to avoid multi-day "near" flags in fallback (approximate) mode
    const near = (p, target, eps = 0.01) => {
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

// Build deterministic icon overrides around precise events so the cycle is symmetric
// Rules (requested):
// - new (🌚) day is surrounded by: ... 🌘🌘 🌑 🌚 🌑 🌒🌒 ...
// - full (🌝) day is surrounded by: ... 🌖🌖 🌕 🌝 🌕 🌔🌔 ...
// - quarters use face on event day (🌛/🌜) and half-discs around: ... 🌓🌓 🌛/🌜 🌓🌓 ...
function buildIconOverrides(data) {
  const map = new Map(); // day_of_year -> { icon, prio }
  const setIcon = (idx, icon, prio) => {
    const d = data[idx];
    if (!d) return;
    // Do not override a day that contains its own precise event icon
    if (d.moon_event && prio < 3) return;
    const key = d.day_of_year;
    const prev = map.get(key);
    if (!prev || (prev.prio || 0) < prio) map.set(key, { icon, prio });
  };
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const evt = d.moon_event;
    if (!evt) continue;
    if (evt === 'new') {
      setIcon(i, '🌚', 3);
      setIcon(i-1, '🌑', 2);
      setIcon(i+1, '🌑', 2);
      setIcon(i-2, '🌘', 1);
      setIcon(i+2, '🌒', 1);
    } else if (evt === 'full') {
      setIcon(i, '🌝', 3);
      setIcon(i-1, '🌕', 2);
      setIcon(i+1, '🌕', 2);
      setIcon(i-2, '🌖', 1);
      setIcon(i+2, '🌔', 1);
    } else if (evt === 'first_quarter') {
      setIcon(i, '🌛', 3);
      setIcon(i-1, '🌓', 2);
      setIcon(i+1, '🌓', 2);
      setIcon(i-2, '🌓', 1);
      setIcon(i+2, '🌓', 1);
    } else if (evt === 'last_quarter') {
      setIcon(i, '🌜', 3);
      setIcon(i-1, '🌓', 2);
      setIcon(i+1, '🌓', 2);
      setIcon(i-2, '🌓', 1);
      setIcon(i+2, '🌓', 1);
    }
  }
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
  function useServerEvents() {
    try {
      const q = (getQS().get('events') || '').toLowerCase();
      if (['server','backend','on','1','yes','true'].includes(q)) return true;
      if (['client','local','off','0','no','false'].includes(q)) return false;
    } catch(_) {}
    return false; // default: client-side event derivation
  }
  function useIconOverrides() {
    try {
      const q = (getQS().get('icons') || '').toLowerCase();
      if (['enhanced','override','overrides','faces','on','1','yes','true'].includes(q)) return true;
      if (['raw','simple','off','0','no','false'].includes(q)) return false;
    } catch(_) {}
    return false; // default: keep it simple, no overrides
  }
  const calendarDiv = document.getElementById('calendar');
  calendarDiv.innerHTML = '';
  const iconOverrides = useIconOverrides() ? buildIconOverrides(data) : new Map();
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
      const { lat, lon } = getUserLatLonTz();
      const { startUTC, endUTC } = sunsetPairForYMD(d.gregorian, lat, lon);
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
      const moonLine = buildMoonTooltip(d, lunarMap);
      div.title = `${lblDate}: ${d.gregorian}\n${lblStart}: ${startLocal}\n${lblEnd}: ${endLocal}${festLine}${sefLine}${moonLine}`;

      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = d.enoch_day;
      // Moon icon next to the day number (centralized logic)
      const override = iconOverrides.get(d.day_of_year);
      const picked = pickMoonIcon(d, lunarMap, override);
      const dayIcon = picked.icon;
      const isNewEvt = picked.isNewEvt;
      const isFullEvt = picked.isFullEvt;
      if (dayIcon) {
        const m = document.createElement('span');
        m.className = 'moon';
        m.textContent = dayIcon;
        num.appendChild(m);
        if (isNewEvt) div.classList.add('moon-new');
        if (isFullEvt) div.classList.add('moon-full');
        // Perigee/Apogee small badges
        if (d.perigee) {
          const b = document.createElement('span'); b.textContent = '↓'; b.title = `${i18nWord('perigee')} ${d.perigee_utc||''}`; b.style.marginLeft = '2px'; num.appendChild(b);
        }
        if (d.apogee) {
          const b = document.createElement('span'); b.textContent = '↑'; b.title = `${i18nWord('apogee')} ${d.apogee_utc||''}`; b.style.marginLeft = '2px'; num.appendChild(b);
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
      const { lat: lat2, lon: lon2 } = getUserLatLonTz();
      const pair2 = sunsetPairForYMD(d.gregorian, lat2, lon2);
      const f2 = festivalMap.get(d.day_of_year);
      const f2Line = f2 && f2.name ? `\n${window.t ? window.t('labelFestival') : 'Festival'}: ${f2.name}` : '';
      const lblDate2 = window.t ? window.t('labelDate') : 'Date';
      const lblStart2 = window.t ? window.t('labelStart') : 'Starts';
      const lblEnd2 = window.t ? window.t('labelEnd') : 'Ends';
      const moonLine2 = buildMoonTooltip(d, lunarMap);
      div.title = `${lblDate2}: ${d.gregorian}\n${lblStart2}: ${fmtLocal(pair2.startUTC)}\n${lblEnd2}: ${fmtLocal(pair2.endUTC)}${f2Line}${moonLine2}`;
      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = d.enoch_day;
      // Moon icon next to the day number in intercalary week (prefer backend)
      {
        const override2 = iconOverrides.get(d.day_of_year);
        const picked2 = pickMoonIcon(d, lunarMap, override2);
        const icon2 = picked2.icon;
        const newEvt2 = picked2.isNewEvt;
        const fullEvt2 = picked2.isFullEvt;
        if (icon2) {
          const m2 = document.createElement('span');
          m2.className = 'moon';
          m2.textContent = icon2;
          num.appendChild(m2);
          if (newEvt2) div.classList.add('moon-new');
          if (fullEvt2) div.classList.add('moon-full');
        }
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
  if (!(preferCsv() && await loadYearFromCSV(targetYear))) {
    await buildCalendar(addDaysUTC(currentStartDate, -7), false);
  }
});

document.getElementById('nextYear').addEventListener('click', async () => {
  if (isBuilding) {
    console.log('[nextYear] build in progress');
    return;
  }
  const targetYear = currentYear + 1;
  console.log('[nextYear] target', targetYear);
  if (!(preferCsv() && await loadYearFromCSV(targetYear))) {
    await buildCalendar(addDaysUTC(currentStartDate, currentYearLength + 7), false);
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
    if (preferCsv() && await loadYearFromCSV(y)) {
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
    if (preferCsv() && await loadYearFromCSV(e.enoch_year)) {
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
    await resolveUserLocation();
    // 1) Try local approx to determine the Enoch year and prefer CSV (unless disabled)
    const approxYear = getApproxEnochYearForDate(new Date(today.toISOString()));
    console.log('[initCalendar] approx enoch year', approxYear);
    if (preferCsv()) {
      const csvOk = await loadYearFromCSV(approxYear);
      if (csvOk) return;
    } else {
      console.log('[initCalendar] preferCsv disabled via query, skip CSV');
    }

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

// Smooth scroll to today's cell if present
function scrollToToday() {
  try {
    const el = document.querySelector('.day.today');
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      el.style.transition = 'box-shadow 0.6s';
      el.style.boxShadow = '0 0 0 3px var(--accent-2), 0 0 0 6px rgba(123,104,238,0.3)';
      setTimeout(() => { try { el.style.boxShadow = ''; } catch(_){} }, 800);
    }
  } catch(_){}
}

// Jump to the Enoch year that contains today, render it, then scroll to today
async function goToToday() {
  try {
    if (isBuilding) { console.log('[today] build in progress'); return; }
    const today = new Date();
    // Ask backend for exact Enoch year/day for today respecting user tz
    const base = await fetchEnoch(today);
    const y = base?.enoch?.enoch_year;
    if (y && preferCsv() && await loadYearFromCSV(y)) {
      // CSV path: already rendered
      setYearLabel(y);
      setTimeout(scrollToToday, 0);
      return;
    }
    // Fallback to API build from today base
    await buildCalendar(today, false, base);
    setTimeout(scrollToToday, 0);
  } catch(e) {
    console.warn('[today] failed', e?.message || e);
    // As a last resort, try to scroll in current view
    setTimeout(scrollToToday, 0);
  }
}

try { window.goToToday = goToToday; window.scrollToToday = scrollToToday; } catch(_){}

initCalendar();
