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

ZODIAC_TROPICAL = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
]

def lunar_sign_from_longitude(lon_deg: float, mode='tropical') -> str:
    # Only tropical supported here; sidereal can apply ayanamsha offset before mapping
    lon = _norm360(lon_deg)
    idx = int(lon // 30) % 12
    return ZODIAC_TROPICAL[idx]

