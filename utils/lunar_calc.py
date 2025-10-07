from datetime import datetime, timedelta, timezone
import math
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

def sun_moon_state(jd_ut):
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
    Return list of {'type': 'equinox'|'solstice', 'season': 'march'|'june'|'september'|'december', 'time': datetime_utc}
    for the given Gregorian year using Swiss Ephemeris.
    """
    # Rough anchors to bracket events
    anchors = [
        (3, 18, 0.0, 0.0, 'equinox', 'march'),      # around Mar 20
        (6, 20, 0.0, 90.0, 'solstice', 'june'),      # around Jun 21
        (9, 20, 0.0, 180.0, 'equinox', 'september'), # around Sep 22/23
        (12, 20, 0.0, 270.0, 'solstice', 'december') # around Dec 21/22
    ]
    out = []
    for mo, d, hh, tgt, kind, name in anchors:
        try:
            # bracket +/- 5 days
            t0 = datetime(year, mo, d, int(hh), 0, 0, tzinfo=timezone.utc) - timedelta(days=5)
            t1 = t0 + timedelta(days=10)
            # Coarse scan to find sign change
            step = timedelta(hours=12)
            prev_t = t0
            prev_v = _wrap180(_sun_ecliptic_longitude_deg(jd_utc(prev_t)) - tgt)
            found = None
            t = t0 + step
            while t <= t1:
                v = _wrap180(_sun_ecliptic_longitude_deg(jd_utc(t)) - tgt)
                if v == 0 or (prev_v < 0 and v > 0) or (prev_v > 0 and v < 0):
                    found = (prev_t, t)
                    break
                prev_t, prev_v = t, v
                t += step
            if found is None:
                # fallback: pick endpoint
                cand = t0 + timedelta(days=5)
                out.append({'type': kind, 'season': name, 'time': cand})
            else:
                t_best = _refine_longitude_crossing(found[0], found[1], tgt)
                out.append({'type': kind, 'season': name, 'time': t_best})
        except Exception:
            # fallback approximate
            approx = datetime(year, mo, d, 12, 0, 0, tzinfo=timezone.utc)
            out.append({'type': kind, 'season': name, 'time': approx})
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
                    tret = r[1]
                    if tret and len(tret) > 0 and tret[0] > 0:
                        t = tret[0]
                        dt = swe.revjul(t)
                        dt_utc = datetime(int(dt[0]), int(dt[1]), int(dt[2]), int(dt[3]) % 24, int((dt[3] % 1)*60), 0, tzinfo=timezone.utc)
                        events.append({'type': 'solar', 'time': dt_utc, 'subtype': 'eclipse'})
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
                    tret = r[1]
                    if tret and len(tret) > 0 and tret[0] > 0:
                        t = tret[0]
                        dt = swe.revjul(t)
                        dt_utc = datetime(int(dt[0]), int(dt[1]), int(dt[2]), int(dt[3]) % 24, int((dt[3] % 1)*60), 0, tzinfo=timezone.utc)
                        events.append({'type': 'lunar', 'time': dt_utc, 'subtype': 'eclipse'})
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
def _planet_longitudes_deg(dt_utc: datetime, ids: list = None) -> dict:
    jd = jd_utc(dt_utc)
    jd_tt = _to_tt(jd)
    flags = swe.FLG_SWIEPH
    if ids is None:
        ids = [swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
    longs = {}
    for pid in ids:
        try:
            lon = swe.calc(jd_tt, pid, flags)[0][0]
            longs[pid] = _norm360(lon)
        except Exception:
            pass
    return longs

def scan_alignments_simple(
    start: datetime,
    end: datetime,
    max_span_deg: float = 30.0,
    min_count: int = 4,
    step_hours: float = 24.0,
    planet_mode: str = '',
    include_outer: bool = False,
) -> list:
    """Scan window for simple ecliptic alignments.

    - If planet_mode in {'inner'} use Mercury/Venus/Mars.
    - If 'classic5' (default) use Mercury..Saturn.
    - If 'seven' or include_outer True use Mercury..Saturn + Uranus/Neptune.
    - If 'all' include Pluto too.
    - Sampling every step_hours (default 24h) to reduce misses.
    Returns list of {'type':'alignment','time': dt_utc, 'count': n}.
    """
    events = []
    # Pick planet set
    mode = (planet_mode or '').strip().lower()
    ids = [swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN]
    if mode in ('inner', 'inners'):
        ids = [swe.MERCURY, swe.VENUS, swe.MARS]
    elif mode in ('seven', 'outer', 'outers') or include_outer:
        ids = [swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN, swe.URANUS, swe.NEPTUNE]
    elif mode in ('all', 'nine', '8', '9'):
        ids = [swe.MERCURY, swe.VENUS, swe.MARS, swe.JUPITER, swe.SATURN, swe.URANUS, swe.NEPTUNE, swe.PLUTO]

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
        best = 0
        best_span = None
        best_pids = []
        n = len(items)
        for i in range(n):
            base_lon = items[i][1]
            for j in range(i, n):
                lon_j = items[j][1]
                span = (lon_j - base_lon) if j >= i else (lon_j + 360 - base_lon)
                # build set inside arc
                inside = []
                for pid, L in items:
                    dlon = (_norm360(L - base_lon)) % 360
                    if 0 <= dlon <= span:
                        inside.append(pid)
                cnt = len(inside)
                if span <= max_span_deg and cnt > best:
                    best = cnt
                    best_span = span
                    best_pids = inside[:]
        if best >= min_count:
            events.append({'type': 'alignment', 'time': t, 'count': best, 'pids': best_pids, 'span': float(best_span) if best_span is not None else None, 'total': len(ids)})
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
