const DEFAULT_API_URL = 'https://astralapiproxy.onrender.com/calculate';
const API_URL = window.API_URL || document.querySelector('meta[name="api-url"]')?.content || DEFAULT_API_URL;
const LATITUDE = -33.45;
const LONGITUDE = -70.6667;

let currentStartDate;
let currentYearLength = 364;
let currentYear;
let currentData = [];
let isBuilding = false;

console.log('[main] script loaded');

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

// --- Local Enoch-year approximation helpers ---
// We approximate March equinox around Mar 20 ~21:24 UTC, then
// pick the nearest Wednesday as Enochian new year start.
function approximateMarchEquinoxUTC(year) {
  // Simple fixed approximation; good enough to select CSV year.
  // Equinox drifts by < 1 day; nearest Wednesday selection remains stable.
  return new Date(Date.UTC(year, 2, 20, 21, 24, 0)); // Mar=2
}

function nearestWednesdayUTC(date) {
  const base = new Date(date);
  // Find Wednesday after (or on) base
  const day = base.getUTCDay(); // 0=Sun .. 3=Wed .. 6=Sat
  const diffToWed = (3 - day + 7) % 7;
  const after = addDays(base, diffToWed);
  const before = addDays(after, -7);
  // Choose whichever is closer in absolute time
  const dAfter = Math.abs(after - base);
  const dBefore = Math.abs(base - before);
  return dBefore <= dAfter ? before : after;
}

function getApproxEnochStartForGregorianYear(year) {
  const eqx = approximateMarchEquinoxUTC(year);
  return nearestWednesdayUTC(eqx);
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

async function loadYearFromCSV(year) {
  console.log('[loadYearFromCSV] trying year', year);
  try {
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
    currentStartDate = new Date(currentData[0].gregorian);
    currentYearLength = currentData.length;
    renderCalendar(currentData);
    document.getElementById('yearLabel').textContent = `Year ${year}`;
    document.getElementById('status').textContent = 'Loaded from CSV';
    console.log('[loadYearFromCSV] loaded', currentYearLength, 'days');
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
  status.textContent = 'Loading...';
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
    console.log('[buildCalendar] startDate', startDate.toISOString());

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
      const e = r.enoch;
      return {
        gregorian,
        enoch_year,
        enoch_month: e.enoch_month,
        enoch_day: e.enoch_day,
        added_week: e.added_week,
        name: getShemEnochiano(e.enoch_month, e.enoch_day, e.added_week),
        day_of_year: idx + 1
      };
    });

    renderCalendar(currentData);
    document.getElementById('yearLabel').textContent = `Year ${enoch_year}`;
    status.textContent = '';
  } catch (err) {
    console.error('[buildCalendar] error', err);
    status.textContent = 'Error building calendar';
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FESTIVALS = [
  { month: 1, day: 14, class: 'pesach', name: 'Pesach' },
  { month: 7, day: 15, class: 'sukkot', name: 'Sukkot' }
];

function renderCalendar(data) {
  const calendarDiv = document.getElementById('calendar');
  calendarDiv.innerHTML = '';
  const todayStr = new Date().toISOString().slice(0, 10);

  for (let m = 1; m <= 12; m++) {
    const monthData = data.filter(d => d.enoch_month === m);
    const table = document.createElement('table');
    table.className = 'month';
    const caption = document.createElement('caption');
    caption.textContent = `Month ${m}`;
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    WEEKDAYS.forEach(w => {
      const th = document.createElement('th');
      th.textContent = w;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let row = document.createElement('tr');
    for (let i = 0; i < 3; i++) row.appendChild(document.createElement('td'));

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
      const fest = FESTIVALS.find(f => f.month === d.enoch_month && f.day === d.enoch_day);
      if (fest) div.classList.add('festival', fest.class);
      div.title = new Date(d.gregorian).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = d.enoch_day;
      const shem = document.createElement('div');
      shem.className = 'shem';
      shem.textContent = d.name;
      div.appendChild(num);
      div.appendChild(shem);
      if (fest) {
        const festDiv = document.createElement('div');
        festDiv.className = 'fest';
        festDiv.textContent = fest.name;
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
    caption.textContent = 'Intercalary Week';
    table.appendChild(caption);
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    extra.forEach(d => {
      const cell = document.createElement('td');
      const div = document.createElement('div');
      div.className = 'day';
      if ((d.day_of_year + 3) % 7 === 0) div.classList.add('shabbat');
      const fest = FESTIVALS.find(f => f.month === d.enoch_month && f.day === d.enoch_day);
      if (fest) div.classList.add('festival', fest.class);
      div.title = new Date(d.gregorian).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = d.enoch_day;
      const shem = document.createElement('div');
      shem.className = 'shem';
      shem.textContent = d.name;
      div.appendChild(num);
      div.appendChild(shem);
      if (fest) {
        const festDiv = document.createElement('div');
        festDiv.className = 'fest';
        festDiv.textContent = fest.name;
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
    document.getElementById('status').textContent = 'Initialization error';
  }
}

initCalendar();

