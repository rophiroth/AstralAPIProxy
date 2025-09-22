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
