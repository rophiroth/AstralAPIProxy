from datetime import datetime, timedelta, timezone
import math
from functools import lru_cache
import pytz
import swisseph as swe

AU_KM = 149597870.7

def _norm360(x: float) -> float:
    x = x % 360.0
    return x + 360.0 if x < 0 else x

def _wrap180(x: float) -> float:
    x = (x + 180.0) % 360.0 - 180.0
    return x

def _to_tt(jd_ut):
    # Swiss Ephemeris expects TT when using swe.calc with FLG_SWIEPH
    # Approx: TT ~= UT + 69 seconds / 86400 (not critical for daily phase)
    return jd_ut + (69.0/86400.0)

def _round_jd(jd: float) -> float:
    """Round JD to avoid exploding cache keys; 1e-6 days ~0.0864s."""
    try:
        return round(float(jd), 6)
    except Exception:
        return float(jd)

def _sun_moon_state_raw(jd_ut):
    jd_tt = _to_tt(jd_ut)
    flags = swe.FLG_SWIEPH
    mres = swe.calc(jd_tt, swe.MOON, flags)[0]
    sres = swe.calc(jd_tt, swe.SUN, flags)[0]
    lon_moon = mres[0]
    lon_sun = sres[0]
    dist_moon_km = mres[2] * AU_KM
    phase = _norm360(lon_moon - lon_sun)
    illum = 0.5*(1.0 - math.cos(math.radians(phase)))
    return lon_sun, lon_moon, phase, illum, dist_moon_km

@lru_cache(maxsize=200_000)
def _sun_moon_state_cached(jd_ut_rounded: float):
    return _sun_moon_state_raw(jd_ut_rounded)

def sun_moon_state(jd_ut):
    """Cached Sun/Moon state keyed by rounded JD to cut Swiss calls."""
    return _sun_moon_state_cached(_round_jd(jd_ut))

def jd_utc(dt_utc: datetime) -> float:
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=timezone.utc)
    else:
        dt_utc = dt_utc.astimezone(timezone.utc)
    return swe.julday(dt_utc.year, dt_utc.month, dt_utc.day,
                      dt_utc.hour + dt_utc.minute/60 + dt_utc.second/3600 + dt_utc.microsecond/3.6e9)

def refine_root_for_phase(t0: datetime, t1: datetime, target_deg: float, max_iter=20):
    # Bisection on f(t) = wrap180(phase(t) - target)
    f = lambda t: _wrap180(sun_moon_state(jd_utc(t))[2] - target_deg)
    a, b = t0, t1
    fa, fb = f(a), f(b)
    # If same sign, return closer end
    if fa == 0:
        return a
    if fb == 0:
        return b
    if fa*fb > 0:
        return a if abs(fa) < abs(fb) else b
    for _ in range(max_iter):
        mid = a + (b - a)/2
        fm = f(mid)
        if abs(fm) < 1e-3:  # ~0.06 arcmin
            return mid
        if fa*fm <= 0:
            b, fb = mid, fm
        else:
            a, fa = mid, fm
    return a + (b - a)/2

def scan_phase_events(start: datetime, end: datetime, step_hours=6):
    events = []  # list of {type, time}
    targets = [(0.0, 'new'), (90.0, 'first_quarter'), (180.0, 'full'), (270.0, 'last_quarter')]
    t = start
    prev_vals = {}
    while t <= end:
        jd = jd_utc(t)
        phase = sun_moon_state(jd)[2]
        for tgt, name in targets:
            val = _wrap180(phase - tgt)
            if name in prev_vals:
                t_prev, v_prev = prev_vals[name]
                # detect sign change
                if v_prev == 0:
                    events.append({'type': name, 'time': t_prev})
                elif val == 0 or (v_prev < 0 and val > 0) or (v_prev > 0 and val < 0):
                    # refine in [t_prev, t]
                    root = refine_root_for_phase(t_prev, t, tgt)
                    events.append({'type': name, 'time': root})
            prev_vals[name] = (t, val)
        t += timedelta(hours=step_hours)
    return events

def refine_extremum_time(t0: datetime, t1: datetime, mode='min', iters=12):
    # Ternary-like search on distance, coarse but ok
    def dist_at(t):
        return sun_moon_state(jd_utc(t))[4]
    a, b = t0, t1
    for _ in range(iters):
        dt = (b - a) / 3
        m1 = a + dt
        m2 = b - dt
        f1 = dist_at(m1)
        f2 = dist_at(m2)
        if mode == 'min':
            if f1 < f2:
                b = m2
            else:
                a = m1
        else:
            if f1 > f2:
                b = m2
            else:
                a = m1
    t_best = a + (b - a)/2
    d_best = dist_at(t_best)
    return t_best, d_best

def scan_perigee_apogee(start: datetime, end: datetime, step_hours=6):
    # sample distances, find local minima/maxima
    samples = []
    t = start
    while t <= end:
        d = sun_moon_state(jd_utc(t))[4]
        samples.append((t, d))
        t += timedelta(hours=step_hours)
    events = []
    for i in range(1, len(samples)-1):
        t_prev, d_prev = samples[i-1]
        t_mid, d_mid = samples[i]
        t_next, d_next = samples[i+1]
        if d_mid < d_prev and d_mid < d_next:
            # local min -> perigee
            tb, db = refine_extremum_time(t_prev, t_next, mode='min')
            events.append({'type': 'perigee', 'time': tb, 'distance_km': db})
        if d_mid > d_prev and d_mid > d_next:
            tb, db = refine_extremum_time(t_prev, t_next, mode='max')
            events.append({'type': 'apogee', 'time': tb, 'distance_km': db})
    return events



def _moon_longitude_deg(dt: datetime) -> float:
    # Return Moon ecliptic longitude normalized to [0, 360).
    return _norm360(sun_moon_state(jd_utc(dt))[1])


def refine_sign_cusp(t0: datetime, t1: datetime, target_deg: float, max_iter: int = 30) -> datetime:
    # Refine UTC time when the Moon crosses the given zodiac cusp.
    target = target_deg % 360.0

    def f(t: datetime) -> float:
        lon = _moon_longitude_deg(t)
        return _wrap180(lon - target)

    a, b = t0, t1
    fa = f(a)
    fb = f(b)
    if fa == 0:
        return a
    if fb == 0:
        return b
    if fa * fb > 0:
        return a if abs(fa) < abs(fb) else b
    for _ in range(max_iter):
        mid = a + (b - a) / 2
        fm = f(mid)
        if abs(fm) < 1e-5 or (b - a).total_seconds() <= 60:
            return mid
        if fa * fm <= 0:
            b, fb = mid, fm
        else:
            a, fa = mid, fm
    return a + (b - a) / 2


def lunar_sign_mix(start: datetime, end: datetime, mode: str = 'tropical'):
    # Compute dominant and secondary lunar signs between start/end UTC datetimes.
    try:
        if start is None or end is None:
            return {}
        if start.tzinfo is None:
            start_utc = start.replace(tzinfo=timezone.utc)
        else:
            start_utc = start.astimezone(timezone.utc)
        if end.tzinfo is None:
            end_utc = end.replace(tzinfo=timezone.utc)
        else:
            end_utc = end.astimezone(timezone.utc)
    except Exception:
        return {}

    total_seconds = (end_utc - start_utc).total_seconds()
    lon_start = _moon_longitude_deg(start_utc)
    if total_seconds <= 0:
        sign = lunar_sign_from_longitude(lon_start, mode)
        return {
            'primary_sign': sign,
            'primary_pct': 1.0,
            'secondary_sign': None,
            'secondary_pct': 0.0,
            'segments': [{'sign': sign, 'seconds': 0.0, 'share': 1.0}]
        }

    lon_end = _moon_longitude_deg(end_utc)
    while lon_end < lon_start - 1e-6:
        lon_end += 360.0

    cusps = []
    next_cusp = math.floor(lon_start / 30.0) * 30.0 + 30.0
    while next_cusp < lon_end - 1e-6:
        cusps.append(next_cusp)
        next_cusp += 30.0

    signs = ZODIAC_TROPICAL
    current_idx = int(math.floor(lon_start / 30.0)) % len(signs)
    current_sign = signs[current_idx]
    seg_start = start_utc
    segments = []

    for cusp in cusps:
        cross_time = refine_sign_cusp(seg_start, end_utc, cusp)
        if cross_time <= seg_start:
            cross_time = min(end_utc, seg_start + timedelta(seconds=1))
        segments.append((current_sign, seg_start, cross_time))
        seg_start = cross_time
        current_idx = (current_idx + 1) % len(signs)
        current_sign = signs[current_idx]

    segments.append((current_sign, seg_start, end_utc))

    shares = {}
    for sign, s, e in segments:
        seconds = max((e - s).total_seconds(), 0.0)
        if seconds <= 0:
            continue
        shares[sign] = shares.get(sign, 0.0) + seconds

    if not shares:
        sign = lunar_sign_from_longitude(lon_start, mode)
        return {
            'primary_sign': sign,
            'primary_pct': 1.0,
            'secondary_sign': None,
            'secondary_pct': 0.0,
            'segments': []
        }

    segments_info = []
    for sign, seconds in shares.items():
        share = seconds / total_seconds if total_seconds > 0 else 0.0
        segments_info.append({'sign': sign, 'seconds': seconds, 'share': share})
    segments_info.sort(key=lambda x: x['share'], reverse=True)

    primary = segments_info[0]
    secondary = segments_info[1] if len(segments_info) > 1 else None

    return {
        'primary_sign': primary['sign'],
        'primary_pct': primary['share'],
        'secondary_sign': secondary['sign'] if secondary else None,
        'secondary_pct': secondary['share'] if secondary else 0.0,
        'segments': segments_info
    }

ZODIAC_TROPICAL = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
]

# --- Solar cardinal points (equinoxes/solstices) ---
def _to_tt_jd(jd_ut: float) -> float:
    return jd_ut + (69.0/86400.0)

def _sun_ecliptic_longitude_deg(jd_ut: float) -> float:
    jd_tt = _to_tt_jd(jd_ut)
    flags = swe.FLG_SWIEPH
    lon = swe.calc(jd_tt, swe.SUN, flags)[0][0]
    return _norm360(lon)

def _refine_longitude_crossing(t0_utc: datetime, t1_utc: datetime, target_deg: float, iters: int = 25) -> datetime:
    target = target_deg % 360.0
    def f(t: datetime) -> float:
        return _wrap180(_sun_ecliptic_longitude_deg(jd_utc(t)) - target)
    a, b = t0_utc, t1_utc
    fa, fb = f(a), f(b)
    if abs(fa) < 1e-3: return a
    if abs(fb) < 1e-3: return b
    # If same sign, choose closer endpoint; otherwise bisection
    if fa * fb > 0:
        return a if abs(fa) < abs(fb) else b
    for _ in range(iters):
        mid = a + (b - a) / 2
        fm = f(mid)
        if abs(fm) < 1e-4 or (b - a).total_seconds() <= 60:
            return mid
        if fa * fm <= 0:
            b, fb = mid, fm
        else:
            a, fa = mid, fm
    return a + (b - a) / 2

def solar_cardinal_points_for_year(year: int) -> list:
    """
    Return list of {'type': 'equinox'|'solstice', 'season': 'march'|'june'|'september'|'december', 'jd': float, 'iso': str}
    for the given proleptic Gregorian year using Swiss Ephemeris. Works for BCE years by avoiding datetime().
    """
    def _sun_lon_deg_ut(jd_ut: float) -> float:
        try:
            jd_tt = _to_tt_jd(jd_ut)
            return _norm360(swe.calc(jd_tt, swe.SUN, swe.FLG_SWIEPH)[0][0])
        except Exception:
            return 0.0

    def _wrap180(x: float) -> float:
        return ((x + 180.0) % 360.0) - 180.0

    def _refine_jd(a: float, b: float, target_deg: float, iters: int = 40) -> float:
        fa = _wrap180(_sun_lon_deg_ut(a) - target_deg)
        fb = _wrap180(_sun_lon_deg_ut(b) - target_deg)
        if fa * fb > 0:
            return a if abs(fa) < abs(fb) else b
        lo, hi = a, b
        vlo, vhi = fa, fb
        for _ in range(iters):
            mid = 0.5 * (lo + hi)
            vmid = _wrap180(_sun_lon_deg_ut(mid) - target_deg)
            if abs(vmid) < 1e-6 or abs(hi - lo) < 1e-7:
                return mid
            if vlo * vmid <= 0:
                hi, vhi = mid, vmid
            else:
                lo, vlo = mid, vmid
        return 0.5 * (lo + hi)

    def _iso_from_jd(jd_val: float) -> str:
        try:
            y, mo, d, hour = swe.revjul(jd_val)
            hh = int(hour)
            mm_f = (hour - hh) * 60.0
            mi = int(mm_f)
            ss = int(round((mm_f - mi) * 60.0))
            if ss == 60:
                ss = 0; mi += 1
            if mi == 60:
                mi = 0; hh += 1
            y_str = (f\"{int(y):04d}\" if int(y) >= 0 else f\"{int(y)}\")
            return f\"{y_str}-{int(mo):02d}-{int(d):02d}T{hh:02d}:{mi:02d}:{ss:02d}Z\"
        except Exception:
            return str(jd_val)

    # approximate day-of-year anchors (Julian day offsets from Jan 1 UT noon)
    anchors = [
        (79.0, 0.0, 'equinox', 'march'),
        (171.0, 90.0, 'solstice', 'june'),
        (263.0, 180.0, 'equinox', 'september'),
        (355.0, 270.0, 'solstice', 'december'),
    ]

    jd_year0 = swe.julday(year, 1, 1, 0.0)
    out = []
    for day_est, target_deg, kind, name in anchors:
        try:
            start = jd_year0 + day_est - 5.0
            end = start + 25.0
            step = 0.5  # days
            prev_jd = start
            prev_v = _wrap180(_sun_lon_deg_ut(prev_jd) - target_deg)
            bracket = None
            jd = start + step
            while jd <= end:
                v = _wrap180(_sun_lon_deg_ut(jd) - target_deg)
                if v == 0 or (prev_v < 0 and v > 0) or (prev_v > 0 and v < 0):
                    bracket = (prev_jd, jd)
                    break
                prev_jd, prev_v = jd, v
                jd += step
            if bracket is None:
                # fallback: midpoint of scan
                jd_best = start + 12.0
            else:
                jd_best = _refine_jd(bracket[0], bracket[1], target_deg)
            out.append({'type': kind, 'season': name, 'jd': jd_best, 'iso': _iso_from_jd(jd_best)})
        except Exception:
            jd_fallback = jd_year0 + day_est
            out.append({'type': kind, 'season': name, 'jd': jd_fallback, 'iso': _iso_from_jd(jd_fallback)})
    return out

# --- Eclipses (best-effort; guarded if functions unavailable) ---
def scan_eclipses_global(start: datetime, end: datetime) -> list:
    """Return list of eclipse events between start/end UTC.
    Each event: { 'type': 'solar'|'lunar', 'time': datetime_utc, 'subtype': str }
    Uses Swiss Ephemeris when available; otherwise returns [].
    """
    events = []
    try:
        jd_start = jd_utc(start)
        jd_end = jd_utc(end)
        # Solar eclipses (global)
        try:
            jd = jd_start
            while jd < jd_end:
                # flags: 0 forward
                r = swe.sol_eclipse_when_glob(jd, swe.FLG_SWIEPH, 0)
                if isinstance(r, tuple) and len(r) >= 2:
                    retflag = r[0] if len(r) > 0 else 0
                    tret = r[1]
                    if tret and len(tret) > 0 and tret[0] > 0:
                        t = tret[0]
                        dt = swe.revjul(t)
                        dt_utc = datetime(int(dt[0]), int(dt[1]), int(dt[2]), int(dt[3]) % 24, int((dt[3] % 1)*60), 0, tzinfo=timezone.utc)
                        kind = 'eclipse'
                        try:
                            # Classify
                            if retflag & swe.ECL_TOTAL:
                                kind = 'total'
                            elif retflag & swe.ECL_ANNULAR:
                                kind = 'annular'
                            elif retflag & swe.ECL_ANNULAR_TOTAL:
                                kind = 'hybrid'
                            elif retflag & swe.ECL_PARTIAL:
                                kind = 'partial'
                        except Exception:
                            pass
                        events.append({'type': 'solar', 'time': dt_utc, 'subtype': kind})
                        jd = t + 5  # skip ahead some days
                    else:
                        jd += 20
                else:
                    break
        except Exception:
            pass
        # Lunar eclipses (global)
        try:
            jd = jd_start
            while jd < jd_end:
                r = swe.lun_eclipse_when(jd, swe.FLG_SWIEPH, 0)
                if isinstance(r, tuple) and len(r) >= 2:
                    retflag = r[0] if len(r) > 0 else 0
                    tret = r[1]
                    if tret and len(tret) > 0 and tret[0] > 0:
                        t = tret[0]
                        dt = swe.revjul(t)
                        dt_utc = datetime(int(dt[0]), int(dt[1]), int(dt[2]), int(dt[3]) % 24, int((dt[3] % 1)*60), 0, tzinfo=timezone.utc)
                        kind = 'eclipse'
                        try:
                            if retflag & swe.ECL_TOTAL:
                                kind = 'total'
                            elif retflag & swe.ECL_PARTIAL:
                                kind = 'partial'
                            elif retflag & swe.ECL_PENUMBRAL:
                                kind = 'penumbral'
                        except Exception:
                            pass
                        events.append({'type': 'lunar', 'time': dt_utc, 'subtype': kind})
                        jd = t + 5
                    else:
                        jd += 20
                else:
                    break
        except Exception:
            pass
    except Exception:
        return []
    # Keep only those inside window
    events = [e for e in events if start <= e['time'] <= end]
    return events

# --- Simple planetary alignment detector ---
@lru_cache(maxsize=200_000)
def _planet_longitudes_deg_jd_cached(jd_key: float, ids_key: tuple):
    jd_tt = _to_tt(jd_key)
    flags = swe.FLG_SWIEPH
    longs = {}
    for pid in ids_key:
        try:
            lon = swe.calc(jd_tt, pid, flags)[0][0]
            longs[pid] = _norm360(lon)
        except Exception:
            pass
    return longs

def _planet_longitudes_deg(dt_utc: datetime, ids: list = None) -> dict:
    jd = jd_utc(dt_utc)
    if ids is None:
        ids = [swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
    ids_key = tuple(ids)
    return _planet_longitudes_deg_jd_cached(_round_jd(jd), ids_key)

def scan_alignments_simple(
    start: datetime,
    end: datetime,
    max_span_deg: float = 30.0,
    min_count: int = 4,
    step_hours: float = 24.0,
    planet_mode: str = '',
    include_outer: bool = False,
    include_moon: bool = False,
    include_sun: bool = False,
) -> list:
    """Scan window for simple ecliptic alignments.

    - If planet_mode in {'inner'} use Mercury/Venus/Mars.
    - If 'classic5' (default) use Mercury..Saturn.
    - If 'seven' include Sun+Moon+Mercury..Saturn.
    - If include_outer True add Uranus/Neptune to the current set.
    - If 'all' include Sun+Moon+Mercury..Pluto (adds outer + Pluto).
    - Sampling every step_hours (default 24h) to reduce misses.

    Returns list of events. Each event:
      {'type':'alignment','time': dt_utc, 'count': n, 'pids': [...], 'span': deg, 'total': totalPlanets}
    Multiple events can occur at the same timestamp (distinct planet sets).
    """
    events = []
    # Pick planet set
    mode = (planet_mode or '').strip().lower()
    ids = [swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
    if mode in ('inner', 'inners'):
        ids = [swe.MERCURY, swe.VENUS, swe.MARS]
    elif mode in ('seven', '7'):
        ids = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
    elif mode in ('all', 'nine', '8', '9'):
        # Start from full classic set and add outers and luminaries — exclude Pluto by request
        # (treat only IAU planets + luminaries for alignments)
        ids = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN, swe.URANUS, swe.NEPTUNE]
    # Optional flags can add luminaries/outers on top of chosen mode
    if include_moon and swe.MOON not in ids:
        ids = [swe.MOON] + ids
    if include_sun and swe.SUN not in ids:
        ids = [swe.SUN] + ids
    if include_outer:
        for pid in (getattr(swe, 'URANUS', None), getattr(swe, 'NEPTUNE', None)):
            if pid is not None and pid not in ids:
                ids.append(pid)

    # Clamp parameters
    try:
        step = max(1.0, float(step_hours))
    except Exception:
        step = 24.0
    t = datetime(start.year, start.month, start.day, 0, 0, 0, tzinfo=timezone.utc)
    while t <= end:
        # Keep association to planet ids so we can report which are aligned
        longs_map = _planet_longitudes_deg(t, ids=ids)
        items = sorted(longs_map.items(), key=lambda kv: kv[1])  # [(pid, lon), ...]
        n = len(items)
        total = len(ids)
        # Collect all clusters meeting criteria; dedupe by pid set; prefer smaller span on ties
        by_set = {}
        for i in range(n):
            base_lon = items[i][1]
            # walk forward across wrap: consider n points ahead including wrap-around
            for k in range(n):
                j = (i + k) % n
                lon_j = items[j][1] + (360.0 if j < i else 0.0)
                span = lon_j - base_lon
                if span < 0:
                    continue
                if span > max_span_deg:
                    break
                inside = []
                for idx in range(n):
                    pid, L = items[idx]
                    Lf = L + (360.0 if idx < i else 0.0)
                    dlon = Lf - base_lon
                    if 0 <= dlon <= span:
                        inside.append(pid)
                cnt = len(inside)
                if cnt >= min_count:
                    key = tuple(sorted(inside))
                    prev = by_set.get(key)
                    if prev is None or span < prev['span'] - 1e-9:
                        by_set[key] = {'type': 'alignment', 'time': t, 'count': cnt, 'pids': inside[:], 'span': float(span), 'total': total}
        # If none met min_count, still record the tightest pair when min_count==2 to support pair searches
        if not by_set and min_count <= 2:
            best_pair = None
            best_span = None
            for i in range(n):
                for k in range(1, n):
                    j = (i + k) % n
                    base = items[i][1]
                    lon_j = items[j][1] + (360.0 if j < i else 0.0)
                    span = lon_j - base
                    if best_span is None or span < best_span:
                        best_span = span
                        best_pair = (items[i][0], items[j][0])
            if best_pair is not None and (best_span is not None) and best_span <= max_span_deg:
                by_set[tuple(sorted(best_pair))] = {'type': 'alignment', 'time': t, 'count': 2, 'pids': list(best_pair), 'span': float(best_span), 'total': total}
        # Flush
        events.extend(by_set.values())
        t += timedelta(hours=step)
    return events



def scan_pair_aspects(
    start: datetime,
    end: datetime,
    step_hours: float = 6.0,
    planet_mode: str = '',
    include_outer: bool = False,
    include_moon: bool = False,
    include_sun: bool = False,
    include_oppositions: bool = True,
    orbs: dict = None,
) -> list:
    """Scan window for classical 2‑body aspects regardless of compactness span.

    Returns list of events with shape similar to scan_alignments_simple entries:
      {'type':'aspect','time': dt_utc, 'count': 2, 'pids': [pid1,pid2], 'span': sep_deg, 'total': totalPlanets}

    Notes:
    - Uses minimal angular separation in [0,180].
    - Default orbs (deg): conj 10, opp 10, sqr 8, tri 7, sex 5.
    - If include_oppositions is False, 180° aspects are skipped.
    - Planet set configured like scan_alignments_simple.
    """
    events = []
    # Pick planet set (mirror logic from scan_alignments_simple)
    mode = (planet_mode or '').strip().lower()
    ids = [swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
    if mode in ('inner', 'inners'):
        ids = [swe.MERCURY, swe.VENUS, swe.MARS]
    elif mode in ('seven', '7'):
        ids = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
    elif mode in ('all', 'nine', '8', '9'):
        ids = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN, swe.URANUS, swe.NEPTUNE]
    if include_moon and swe.MOON not in ids:
        ids = [swe.MOON] + ids
    if include_sun and swe.SUN not in ids:
        ids = [swe.SUN] + ids
    if include_outer:
        for pid in (getattr(swe, 'URANUS', None), getattr(swe, 'NEPTUNE', None)):
            if pid is not None and pid not in ids:
                ids.append(pid)

    # Orbs
    if orbs is None:
        # Tighter default orbs so minor aspects are more selective
        orbs = {
            'conj': 8.0,
            'opp': 8.0,
            'sqr': 5.0,
            'tri': 4.0,
            'sex': 3.0,
        }

    def min_sep(a: float, b: float) -> float:
        d = abs((a - b) % 360.0)
        return d if d <= 180.0 else 360.0 - d

    def best_aspect_match(sep: float):
        """Return (target_deg, delta) for the best aspect within its orb, else (None, None)."""
        candidates = [(0.0, 'conj'), (60.0, 'sex'), (90.0, 'sqr'), (120.0, 'tri')]
        if include_oppositions:
            candidates.append((180.0, 'opp'))
        best_tgt = None
        best_delta = float('inf')
        for tgt, code in candidates:
            orb = orbs.get(code, 0.0)
            delta = abs(sep - tgt)
            if delta <= orb and delta < best_delta:
                best_delta = delta
                best_tgt = tgt
        if best_tgt is None:
            return None, None
        return best_tgt, best_delta

    # Clamp step
    try:
        step = max(1.0, float(step_hours))
    except Exception:
        step = 6.0

    t = datetime(start.year, start.month, start.day, 0, 0, 0, tzinfo=timezone.utc)
    total = len(ids)
    while t <= end:
        longs_map = _planet_longitudes_deg(t, ids=ids)
        items = list(longs_map.items())  # [(pid, lon)]
        n = len(items)
        seen = set()
        for i in range(n):
            pid_i, Li = items[i]
            for j in range(i + 1, n):
                pid_j, Lj = items[j]
                key = (min(pid_i, pid_j), max(pid_i, pid_j))
                if key in seen:
                    continue
                sep = min_sep(Li, Lj)
                tgt, delta = best_aspect_match(sep)
                if tgt is not None:
                    events.append({
                        'type': 'aspect',
                        'time': t,
                        'count': 2,
                        'pids': [pid_i, pid_j],
                        'span': float(sep),  # store separation for compatibility
                        'offset': float(delta),  # deviation to exact aspect
                        'total': total,
                    })
                    seen.add(key)
        t += timedelta(hours=step)
    return events

def lunar_sign_mix_linear(start: datetime, end: datetime, mode: str = 'tropical'):
    """
    Fast, simple mix estimator based only on lunar longitude at day start/end.

    Assumptions:
    - Use the Enoch day bounds (sunset->sunset) provided as start/end (UTC).
    - The Moon advances < 30° per day, so at most one zodiac cusp is crossed.
    - Shares are computed linearly by angular advance (proxy for time share over the day).

    Returns dict with primary/secondary signs and fractional shares (0..1).
    """
    try:
        if start is None or end is None:
            return {}
        s_utc = start if start.tzinfo is not None else start.replace(tzinfo=timezone.utc)
        e_utc = end if end.tzinfo is not None else end.replace(tzinfo=timezone.utc)

        lon_s = _moon_longitude_deg(s_utc)
        lon_e = _moon_longitude_deg(e_utc)
        # unwrap end so it is >= start (avoid 360 wrap between samples)
        while lon_e < lon_s - 1e-9:
            lon_e += 360.0
        advance = max(lon_e - lon_s, 0.0)

        idx_s = int(math.floor(lon_s / 30.0)) % 12
        sign_s = ZODIAC_TROPICAL[idx_s]
        cusp = (idx_s + 1) * 30.0

        # Did we stay within the same sign the whole day?
        if lon_e <= cusp + 1e-9:
            return {
                'primary_sign': sign_s,
                'primary_pct': 1.0,
                'secondary_sign': None,
                'secondary_pct': 0.0
            }

        # We crossed exactly one cusp into the next sign
        idx_n = (idx_s + 1) % 12
        sign_n = ZODIAC_TROPICAL[idx_n]
        # angular portion spent in first sign
        in_first = max(min(cusp - lon_s, advance), 0.0)
        share_first = 0.0 if advance <= 0 else max(0.0, min(1.0, in_first / advance))
        share_next = 1.0 - share_first

        # If numerical quirks yield tiny nonzero shares, clamp them
        eps = 1e-6
        if share_first < eps:
            share_first = 0.0; share_next = 1.0
        if share_next < eps:
            share_next = 0.0; share_first = 1.0

        # Return ordered by share descending
        if share_first >= share_next:
            return {
                'primary_sign': sign_s,
                'primary_pct': share_first,
                'secondary_sign': sign_n if share_next > 0 else None,
                'secondary_pct': share_next if share_next > 0 else 0.0
            }
        else:
            return {
                'primary_sign': sign_n,
                'primary_pct': share_next,
                'secondary_sign': sign_s if share_first > 0 else None,
                'secondary_pct': share_first if share_first > 0 else 0.0
            }
    except Exception:
        # Fallback to start sign only
        lon_s = _moon_longitude_deg(start if start.tzinfo else start.replace(tzinfo=timezone.utc))
        sign = lunar_sign_from_longitude(lon_s, mode)
        return {
            'primary_sign': sign,
            'primary_pct': 1.0,
            'secondary_sign': None,
            'secondary_pct': 0.0
        }

def lunar_sign_from_longitude(lon_deg: float, mode='tropical') -> str:
    # Only tropical supported here; sidereal can apply ayanamsha offset before mapping
    lon = _norm360(lon_deg)
    idx = int(lon // 30) % 12
    return ZODIAC_TROPICAL[idx]

# --- JD-based scanners (avoid datetime range limits) ---

def _jd_to_iso_utc(jd: float) -> str:
    """Format a JD as an ISO-like UTC string supporting extended years (BCE)."""
    y, mo, d, hour = swe.revjul(jd)
    hh = int(hour)
    mm_f = (hour - hh) * 60.0
    mi = int(mm_f)
    ss = int(round((mm_f - mi) * 60.0))
    if ss == 60:
        ss = 0; mi += 1
    if mi == 60:
        mi = 0; hh += 1
    y_str = (f"{int(y):04d}" if int(y) >= 0 else f"{int(y)}")
    return f"{y_str}-{int(mo):02d}-{int(d):02d}T{hh:02d}:{mi:02d}:{ss:02d}Z"

def _refine_phase_root_jd(jd0: float, jd1: float, target_deg: float, max_iter: int = 30) -> float:
    def f(jd):
        return _wrap180(sun_moon_state(jd)[2] - target_deg)
    a, b = jd0, jd1
    fa, fb = f(a), f(b)
    if fa == 0:
        return a
    if fb == 0:
        return b
    if fa*fb > 0:
        return a if abs(fa) < abs(fb) else b
    for _ in range(max_iter):
        mid = 0.5*(a + b)
        fm = f(mid)
        if abs(fm) < 1e-4:
            return mid
        if fa*fm <= 0:
            b, fb = mid, fm
        else:
            a, fa = mid, fm
    return 0.5*(a + b)

def scan_phase_events_jd(start_jd: float, end_jd: float, step_hours: float = 8.0):
    """Return list of lunar phase events between two JDs."""
    events = []
    targets = [(0.0, 'new'), (90.0, 'first_quarter'), (180.0, 'full'), (270.0, 'last_quarter')]
    step_days = max(1.0, float(step_hours)) / 24.0
    jd = start_jd
    prev_vals = {}
    while jd <= end_jd + 1e-9:
        phase = sun_moon_state(jd)[2]
        for tgt, name in targets:
            val = _wrap180(phase - tgt)
            if name in prev_vals:
                jd_prev, v_prev = prev_vals[name]
                if v_prev == 0:
                    events.append({'type': name, 'jd': jd_prev, 'iso': _jd_to_iso_utc(jd_prev)})
                elif val == 0 or (v_prev < 0 and val > 0) or (v_prev > 0 and val < 0):
                    root = _refine_phase_root_jd(jd_prev, jd, tgt)
                    events.append({'type': name, 'jd': root, 'iso': _jd_to_iso_utc(root)})
            prev_vals[name] = (jd, val)
        jd += step_days
    return events

def _refine_extremum_jd(jd0: float, jd1: float, mode='min', iters: int = 20):
    def dist_at(jd):
        return sun_moon_state(jd)[4]
    a, b = jd0, jd1
    for _ in range(iters):
        d = (b - a) / 3.0
        m1 = a + d
        m2 = b - d
        f1 = dist_at(m1)
        f2 = dist_at(m2)
        if mode == 'min':
            if f1 < f2:
                b = m2
            else:
                a = m1
        else:
            if f1 > f2:
                b = m2
            else:
                a = m1
    mid = 0.5*(a + b)
    return mid, dist_at(mid)

def scan_perigee_apogee_jd(start_jd: float, end_jd: float, step_hours: float = 8.0):
    step_days = max(1.0, float(step_hours)) / 24.0
    samples = []
    jd = start_jd
    while jd <= end_jd + 1e-9:
        d = sun_moon_state(jd)[4]
        samples.append((jd, d))
        jd += step_days
    events = []
    for i in range(1, len(samples)-1):
        jd_prev, d_prev = samples[i-1]
        jd_mid, d_mid = samples[i]
        jd_next, d_next = samples[i+1]
        if d_mid < d_prev and d_mid < d_next:
            jb, db = _refine_extremum_jd(jd_prev, jd_next, mode='min')
            events.append({'type': 'perigee', 'jd': jb, 'distance_km': db, 'iso': _jd_to_iso_utc(jb)})
        if d_mid > d_prev and d_mid > d_next:
            jb, db = _refine_extremum_jd(jd_prev, jd_next, mode='max')
            events.append({'type': 'apogee', 'jd': jb, 'distance_km': db, 'iso': _jd_to_iso_utc(jb)})
    return events

def scan_eclipses_global_jd(start_jd: float, end_jd: float) -> list:
    """Eclipse search using JDs; returns events with jd and iso."""
    events = []
    try:
        jd = start_jd
        # Solar
        while jd < end_jd:
            r = swe.sol_eclipse_when_glob(jd, swe.FLG_SWIEPH, 0)
            if not (isinstance(r, tuple) and len(r) >= 2):
                break
            retflag = r[0] if len(r) > 0 else 0
            tret = r[1]
            if tret and len(tret) > 0 and tret[0] > 0:
                t = tret[0]
                kind = 'eclipse'
                try:
                    if retflag & swe.ECL_TOTAL:
                        kind = 'total'
                    elif retflag & swe.ECL_ANNULAR:
                        kind = 'annular'
                    elif retflag & swe.ECL_ANNULAR_TOTAL:
                        kind = 'hybrid'
                    elif retflag & swe.ECL_PARTIAL:
                        kind = 'partial'
                except Exception:
                    pass
                events.append({'type': 'solar', 'jd': t, 'iso': _jd_to_iso_utc(t), 'subtype': kind})
                jd = t + 5
            else:
                jd += 20
        # Lunar
        jd = start_jd
        while jd < end_jd:
            r = swe.lun_eclipse_when(jd, swe.FLG_SWIEPH, 0)
            if not (isinstance(r, tuple) and len(r) >= 2):
                break
            retflag = r[0] if len(r) > 0 else 0
            tret = r[1]
            if tret and len(tret) > 0 and tret[0] > 0:
                t = tret[0]
                kind = 'eclipse'
                try:
                    if retflag & swe.ECL_TOTAL:
                        kind = 'total'
                    elif retflag & swe.ECL_PARTIAL:
                        kind = 'partial'
                    elif retflag & swe.ECL_PENUMBRAL:
                        kind = 'penumbral'
                except Exception:
                    pass
                events.append({'type': 'lunar', 'jd': t, 'iso': _jd_to_iso_utc(t), 'subtype': kind})
                jd = t + 5
            else:
                jd += 20
    except Exception:
        return []
    events = [e for e in events if start_jd <= e['jd'] <= end_jd]
    return events

def _planet_longitudes_deg_jd(jd_ut: float, ids: list) -> dict:
    jd_tt = _to_tt(jd_ut)
    flags = swe.FLG_SWIEPH
    longs = {}
    for pid in ids:
        try:
            lon = swe.calc(jd_tt, pid, flags)[0][0]
            longs[pid] = _norm360(lon)
        except Exception:
            pass
    return longs

def scan_alignments_simple_jd(start_jd: float, end_jd: float, max_span_deg: float = 30.0, min_count: int = 4, step_hours: float = 24.0, planet_mode: str = '', include_outer: bool = False, include_moon: bool = False, include_sun: bool = False) -> list:
    events = []
    mode = (planet_mode or '').strip().lower()
    ids = [swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
    if mode in ('inner', 'inners'):
        ids = [swe.MERCURY, swe.VENUS, swe.MARS]
    elif mode in ('seven', '7'):
        ids = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
    elif mode in ('all', 'nine', '8', '9'):
        ids = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN, swe.URANUS, swe.NEPTUNE]
    if include_moon and swe.MOON not in ids:
        ids = [swe.MOON] + ids
    if include_sun and swe.SUN not in ids:
        ids = [swe.SUN] + ids
    if include_outer:
        for pid in (getattr(swe, 'URANUS', None), getattr(swe, 'NEPTUNE', None)):
            if pid is not None and pid not in ids:
                ids.append(pid)
    step = max(1.0, float(step_hours)) / 24.0
    jd = start_jd
    while jd <= end_jd + 1e-9:
        longs_map = _planet_longitudes_deg_jd(jd, ids=ids)
        items = sorted(longs_map.items(), key=lambda kv: kv[1])
        n = len(items)
        total = len(ids)
        by_set = {}
        for i in range(n):
            base_lon = items[i][1]
            for k in range(n):
                j = (i + k) % n
                lon_j = items[j][1] + (360.0 if j < i else 0.0)
                span = lon_j - base_lon
                if span < 0:
                    continue
                if span > max_span_deg:
                    break
                inside = []
                for idx in range(n):
                    pid, L = items[idx]
                    Lf = L + (360.0 if idx < i else 0.0)
                    dlon = Lf - base_lon
                    if 0 <= dlon <= span:
                        inside.append(pid)
                cnt = len(inside)
                if cnt >= min_count:
                    key = tuple(sorted(inside))
                    prev = by_set.get(key)
                    if prev is None or span < prev['span'] - 1e-9:
                        by_set[key] = {'type': 'alignment', 'jd': jd, 'count': cnt, 'pids': inside[:], 'span': float(span), 'total': total}
        events.extend(by_set.values())
        jd += step
    return events

def scan_pair_aspects_jd(start_jd: float, end_jd: float, step_hours: float = 6.0, planet_mode: str = '', include_outer: bool = False, include_moon: bool = False, include_sun: bool = False, include_oppositions: bool = True) -> list:
    events = []
    mode = (planet_mode or '').strip().lower()
    ids = [swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
    if mode in ('inner', 'inners'):
        ids = [swe.MERCURY, swe.VENUS, swe.MARS]
    elif mode in ('seven', '7'):
        ids = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
    elif mode in ('all', 'nine', '8', '9'):
        ids = [swe.SUN, swe.MOON, swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN, swe.URANUS, swe.NEPTUNE]
    if include_moon and swe.MOON not in ids:
        ids = [swe.MOON] + ids
    if include_sun and swe.SUN not in ids:
        ids = [swe.SUN] + ids
    if include_outer:
        for pid in (getattr(swe, 'URANUS', None), getattr(swe, 'NEPTUNE', None)):
            if pid is not None and pid not in ids:
                ids.append(pid)

    def min_sep(a: float, b: float) -> float:
        d = abs((a - b) % 360.0)
        return d if d <= 180.0 else 360.0 - d

    def best_aspect_match(sep: float):
        candidates = [(0.0, 'conj'), (60.0, 'sex'), (90.0, 'sqr'), (120.0, 'tri')]
        if include_oppositions:
            candidates.append((180.0, 'opp'))
        orbs = {
            'conj': 8.0,
            'opp': 8.0,
            'sqr': 5.0,
            'tri': 4.0,
            'sex': 3.0,
        }
        best_tgt = None
        best_delta = float('inf')
        for tgt, code in candidates:
            orb = orbs.get(code, 0.0)
            delta = abs(sep - tgt)
            if delta <= orb and delta < best_delta:
                best_delta = delta
                best_tgt = tgt
        if best_tgt is None:
            return None, None
        return best_tgt, best_delta

    step = max(1.0, float(step_hours)) / 24.0
    jd = start_jd
    total = len(ids)
    while jd <= end_jd + 1e-9:
        longs_map = _planet_longitudes_deg_jd(jd, ids=ids)
        items = list(longs_map.items())
        n = len(items)
        seen = set()
        for i in range(n):
            pid_i, Li = items[i]
            for j in range(i + 1, n):
                pid_j, Lj = items[j]
                key = (min(pid_i, pid_j), max(pid_i, pid_j))
                if key in seen:
                    continue
                sep = min_sep(Li, Lj)
                tgt, delta = best_aspect_match(sep)
                if tgt is not None:
                    events.append({
                        'type': 'aspect',
                        'jd': jd,
                        'count': 2,
                        'pids': [pid_i, pid_j],
                        'span': float(sep),
                        'offset': float(delta),
                        'total': total,
                    })
                    seen.add(key)
        jd += step
    return events
