import traceback
import re
from pathlib import Path
from datetime import datetime, timedelta, timezone

import pytz
import swisseph as swe
from flask import jsonify, request, current_app

from utils.enoch import calculate_enoch_date
from utils.datetime_local import localize_datetime
from utils.debug import *
from utils.lunar_calc import (
    jd_utc, sun_moon_state, scan_phase_events_jd, scan_perigee_apogee_jd,
    lunar_sign_from_longitude, lunar_sign_mix, refine_sign_cusp,
    solar_cardinal_points_for_year, scan_eclipses_global_jd, scan_alignments_simple_jd,
    scan_pair_aspects_jd
)
try:
    from fast_enoch_calendar import build_fast_enoch_calendar
except Exception:
    from .fast_enoch_calendar import build_fast_enoch_calendar  # type: ignore
try:
    from fast_enoch_calendar import build_fast_enoch_calendar
except Exception:
    from .fast_enoch_calendar import build_fast_enoch_calendar  # type: ignore


def _parse_iso_to_jd(date_str: str) -> float:
    """
    Parse extended ISO8601 like -002971-03-25T21:24:00Z or with offset and return UT JD.
    If timezone offset is present, convert to UTC by subtracting the offset in days.
    """
    # Support: YYYY-MM-DDTHH:MM[:SS[.us]](Z|±HH:MM)
    iso_re = re.compile(r"^([+-]?\d{1,6})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(Z|[+-]\d{2}:\d{2})?$")
    m = iso_re.match(date_str)
    if not m:
        raise ValueError("unsupported ISO format")
    y = int(m.group(1)); mo = int(m.group(2)); d = int(m.group(3))
    hh = int(m.group(4)); mi = int(m.group(5)); ss = int(m.group(6) or 0)
    micros = int((m.group(7) or '0').ljust(6,'0'))
    tzpart = m.group(8) or 'Z'
    frac = hh + mi/60.0 + ss/3600.0 + micros/3600000000.0
    jd_local = swe.julday(y, mo, d, frac)
    if tzpart == 'Z':
        return jd_local
    # tzpart like +HH:MM or -HH:MM
    sign = 1 if tzpart[0] == '+' else -1
    th = int(tzpart[1:3]); tm = int(tzpart[4:6])
    offset_days = sign * (th*3600 + tm*60) / 86400.0
    # Local time = UTC + offset ⇒ UTC = local - offset
    return jd_local - offset_days

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
    # Year can be negative; no datetime here. Pad positives to 4 digits.
    y_str = (f"{int(y):04d}" if int(y) >= 0 else f"{int(y)}")
    return f"{y_str}-{int(mo):02d}-{int(d):02d}T{hh:02d}:{mi:02d}:{ss:02d}Z"

# --- Pure-python approximate fallbacks (no Swiss ephemeris files) ---
import math

def _approx_sunset_ut_hms(y:int, m:int, d:int, lat:float, lon:float):
    """Approximate sunset time in UT as (h,m,s) using NOAA-like formula.
    Works proleptically; ignores elevation and refraction fine-tuning.
    """
    try:
        def to_rad(x): return x * math.pi / 180.0
        def to_deg(x): return x * 180.0 / math.pi
        # Day of year N for proleptic Gregorian; rough for BCE but monotonic
        # Compute N via JD differencing to avoid datetime
        jd_day = swe.julday(y, m, d, 0.0)
        jd_year0 = swe.julday(y, 1, 1, 0.0)
        N = int(jd_day - jd_year0) + 1
        lng_hour = lon / 15.0
        t = N + ((18 - lng_hour) / 24.0)
        M = (0.9856 * t) - 3.289
        L = M + (1.916 * math.sin(to_rad(M))) + (0.020 * math.sin(to_rad(2*M))) + 282.634
        L = (L % 360 + 360) % 360
        RA = to_deg(math.atan(0.91764 * math.tan(to_rad(L))))
        RA = (RA % 360 + 360) % 360
        Lq = math.floor(L/90) * 90
        RAq = math.floor(RA/90) * 90
        RA = (RA + (Lq - RAq)) / 15.0
        sinDec = 0.39782 * math.sin(to_rad(L))
        cosDec = math.cos(math.asin(sinDec))
        cosH = (math.cos(to_rad(90.833)) - (sinDec * math.sin(to_rad(lat)))) / (cosDec * math.cos(to_rad(lat)))
        if cosH < -1 or cosH > 1:
            # No sunset/rise; return 18:00 UT as placeholder
            return 18, 0, 0
        H = to_deg(math.acos(cosH)) / 15.0
        T = H + RA - (0.06571 * t) - 6.622
        UT = T - lng_hour
        UT = (UT % 24 + 24) % 24
        hh = int(math.floor(UT))
        mm = int(math.floor((UT - hh) * 60))
        ss = int(round((((UT - hh) * 60) - mm) * 60))
        if ss == 60:
            ss = 0; mm += 1
        if mm == 60:
            mm = 0; hh = (hh + 1) % 24
        return hh, mm, ss
    except Exception:
        return 18, 0, 0

def _iso_from_ymd_hms(y:int, mo:int, d:int, hh:int, mi:int, ss:int) -> str:
    y_str = (f"{y:04d}" if y >= 0 else str(y))
    return f"{y_str}-{mo:02d}-{d:02d}T{hh:02d}:{mi:02d}:{ss:02d}Z"

def _approx_enoch_from_jd(jd: float, latitude: float, longitude: float):
    """Approximate Enoch mapping without Swiss ephemeris files.
    Policy (aligned with UI/backfill paths):
    - Day boundary is at local SUNSET.
    - Year starts at the TUESDAY SUNSET nearest to March equinox at given lat/lon
      (i.e., Day 1 runs Tue-sunset → Wed-sunset).
    - Day-of-year = floor(jd - year_start_tuesday_sunset) + 1
    - Month lengths fixed: 30,30,31,30,30,31,30,30,31,30,30,31
    - Year number mapped so that Gregorian 2025 → Enoch 5996 using the
      Gregorian year of the start boundary.
    """
    # Start boundary (Tuesday sunset) for the containing year
    start_jd = _approx_start_jd_for_enoch_year(jd, latitude, longitude)
    # Use floor to be safe with BCE and fractional JDs around boundary
    day_of_year = int(math.floor(jd - start_jd)) + 1
    # Month/day split
    months = [30,30,31,30,30,31,30,30,31,30,30,31]
    added_week = day_of_year > 364
    md = day_of_year - 1
    m_idx = 0
    while m_idx < 12 and md >= months[m_idx]:
        md -= months[m_idx]
        m_idx += 1
    enoch_month = min(12, m_idx + 1)
    enoch_day = md + 1
    # Year numbering relative to start boundary's civil year
    sy, _, _, _ = swe.revjul(start_jd)
    years_passed = int(sy) - 2025
    enoch_year = 5996 + years_passed
    return {
        'enoch_year': enoch_year,
        'enoch_month': enoch_month,
        'enoch_day': enoch_day,
        'enoch_day_of_year': day_of_year,
        'added_week': added_week
    }

def _approx_start_jd_for_enoch_year(jd: float, latitude: float, longitude: float) -> float:
    """Return the approximate START-BOUNDARY JD (UT) of the Enoch year containing the given JD.
    Semantics:
    - Enoch Day 1 runs from TUESDAY sunset to WEDNESDAY sunset.
    - Here we return the TUESDAY SUNSET (start boundary) that begins Day 1,
      chosen nearest to the March equinox anchor at the provided lat/lon.
    If the given jd is before that start, compute from the previous year's anchor.
    """
    def _dow_index_0h(jd_val: float) -> int:
        yy, mo, dd, _h = swe.revjul(jd_val)
        return swe.day_of_week(swe.julday(int(yy), int(mo), int(dd), 0.0))
    WED_IDX = swe.day_of_week(swe.julday(2025, 3, 19, 0.0))

    def _wed_sunset_near(anchor_jd_val: float) -> float:
        jd_before = anchor_jd_val
        while _dow_index_0h(jd_before) != WED_IDX:
            jd_before -= 1.0
        yb, mb, db, _ = swe.revjul(jd_before)

        jd_after = anchor_jd_val
        while _dow_index_0h(jd_after) != WED_IDX:
            jd_after += 1.0
        ya, ma, da, _ = swe.revjul(jd_after)

        bh, bm, bs = _approx_sunset_ut_hms(int(yb), int(mb), int(db), latitude, longitude)
        ah, am, a_s = _approx_sunset_ut_hms(int(ya), int(ma), int(da), latitude, longitude)
        s_before = swe.julday(int(yb), int(mb), int(db), bh + bm/60 + bs/3600)
        s_after  = swe.julday(int(ya), int(ma), int(da), ah + am/60 + a_s/3600)
        return s_before if abs(s_before - anchor_jd_val) <= abs(s_after - anchor_jd_val) else s_after

    def _tue_sunset_before(wed_sunset_jd: float) -> float:
        """Given a WEDNESDAY sunset JD, return the previous civil day's (Tuesday) sunset JD
        at the same latitude/longitude using the same NOAA-like approximation.
        """
        y, mo, d, _ = swe.revjul(wed_sunset_jd)
        # Previous civil day relative to Wednesday
        jd_prev0 = swe.julday(int(y), int(mo), int(d), 0.0) - 1.0
        yb, mb, db, _ = swe.revjul(jd_prev0)
        hh, mm, ss = _approx_sunset_ut_hms(int(yb), int(mb), int(db), latitude, longitude)
        return swe.julday(int(yb), int(mb), int(db), hh + mm/60 + ss/3600)

    y, _m, _d, _ = swe.revjul(jd)
    anchor = swe.julday(int(y), 3, 20, 21 + 24/60)
    # Find the Wednesday sunset closest to equinox, then take the Tuesday sunset before it
    wed_end = _wed_sunset_near(anchor)
    start = _tue_sunset_before(wed_end)
    if jd < start:
        py = int(y) - 1
        anchor_prev = swe.julday(py, 3, 20, 21 + 24/60)
        wed_end_prev = _wed_sunset_near(anchor_prev)
        start = _tue_sunset_before(wed_end_prev)
    return start

# Approx lunar phase (no Swiss files)
SYNODIC_DAYS = 29.530588853
REF_NEW_MOON_JD = swe.julday(2000, 1, 6, 18 + 14/60)

def _approx_lunar_for_jd(jd: float):
    days = jd - REF_NEW_MOON_JD
    age = days % SYNODIC_DAYS
    phase_frac = age / SYNODIC_DAYS  # 0=new, 0.5=full
    illum = 0.5 * (1 - math.cos(2 * math.pi * phase_frac))
    angle_deg = (phase_frac * 360.0) % 360.0  # 0=new, 90=first quarter, 180=full
    return angle_deg, illum


def day_bounds_utc(greg_date: datetime, latitude: float, longitude: float, tz_str: str):
    """Return (start_utc, end_utc) where start is previous day's sunset and end is day's sunset."""
    try:
        from astral import LocationInfo
        from astral.sun import sun as astral_sun
    except Exception:
        LocationInfo = None
        astral_sun = None

    try:
        tz = pytz.timezone(tz_str)
    except Exception:
        tz = pytz.utc
    try:
        if LocationInfo and astral_sun:
            loc = LocationInfo(name="L", region="L", timezone=tz_str, latitude=latitude, longitude=longitude)
            local_day = tz.localize(datetime(greg_date.year, greg_date.month, greg_date.day, 12, 0, 0))
            s_today = astral_sun(loc.observer, date=local_day.date(), tzinfo=tz)["sunset"]
            s_prev = astral_sun(loc.observer, date=(local_day - timedelta(days=1)).date(), tzinfo=tz)["sunset"]
            return s_prev.astimezone(pytz.utc), s_today.astimezone(pytz.utc)
    except Exception:
        try:
            print("[approx_reason] Astral sunset calc failed; using Swiss rise_trans fallback")
        except Exception:
            pass
    try:
        geopos = (longitude, latitude, 0)
        jd0 = swe.julday(greg_date.year, greg_date.month, greg_date.day, 0.0)
        try:
            _, data_today = swe.rise_trans(jd0, swe.SUN, 2, geopos)
            jd_s_today = data_today[0]
        except Exception:
            jd_s_today = jd0 + 0.75
        jd_prev_day = jd0 - 1.0
        yb, mb, db, _ = swe.revjul(jd_prev_day)
        try:
            _, data_prev = swe.rise_trans(swe.julday(int(yb), int(mb), int(db), 0.0), swe.SUN, 2, geopos)
            jd_s_prev = data_prev[0]
        except Exception:
            jd_s_prev = jd_prev_day + 0.75
        return _jd_to_iso_utc(jd_s_prev), _jd_to_iso_utc(jd_s_today)
    except Exception:
        y = greg_date.year
        mo = greg_date.month
        d = greg_date.day
        ph, pm, ps = _approx_sunset_ut_hms(y, mo, d - 1 if d > 1 else d, latitude, longitude)
        th, tm, ts = _approx_sunset_ut_hms(y, mo, d, latitude, longitude)
        if d == 1:
            jd_today = swe.julday(y, mo, d, 0.0)
            yb, mb, db, _ = swe.revjul(jd_today - 1.0)
            prev_iso = _iso_from_ymd_hms(int(yb), int(mb), int(db), ph, pm, ps)
            today_iso = _iso_from_ymd_hms(y, mo, d, th, tm, ts)
            return prev_iso, today_iso
        prev_iso = _iso_from_ymd_hms(y, mo, d - 1, ph, pm, ps)
        today_iso = _iso_from_ymd_hms(y, mo, d, th, tm, ts)
        return prev_iso, today_iso


def derive_enoch_start_jd(target_jd: float, enoch_day_of_year: int):
    try:
        return target_jd - (int(enoch_day_of_year) - 1)
    except Exception:
        return None


def build_enoch_table(start_jd: float, enoch_year: int, include_added_week: bool = True):
    months = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31]
    if include_added_week:
        months[-1] += 7
    total_days = sum(months) if include_added_week else 364
    table = []
    m_idx = 0
    day_in_month = 1
    for i in range(total_days):
        day_of_year = i + 1
        added_week = include_added_week and day_of_year > 364
        table.append(
            {
                "enoch_year": enoch_year,
                "enoch_month": m_idx + 1,
                "enoch_day": day_in_month,
                "enoch_day_of_year": day_of_year,
                "added_week": added_week,
            }
        )
        day_in_month += 1
        if m_idx < len(months) and day_in_month > months[m_idx]:
            m_idx += 1
            day_in_month = 1
            if m_idx >= len(months):
                break
    return table


def calc_year():
        # Ensure Swiss Ephemeris uses bundled path on every request (Render sometimes ignores env)
        try:
            ephe_root = Path(__file__).resolve().parent.parent / "sweph" / "ephe"
            swe.set_ephe_path(str(ephe_root))
        except Exception:
            pass
        approx_reasons = []
        def ensure_reason(msg: str):
            if not approx_reasons:
                approx_reasons.append(msg)
        def record_reason(msg: str, exc=None):
            """
            Track and log every approximation/fallback reason so it is visible in backend logs.
            """
            nonlocal approx_global
            approx_global = True
            msg_text = msg if exc is None else f"{msg}: {exc}"
            approx_reasons.append(msg_text)
            try:
                if exc:
                    current_app.logger.exception(msg_text)
                else:
                    current_app.logger.warning(msg_text)
            except Exception:
                pass
            # Always emit to stdout/stderr so it shows up in host logs
            try:
                print(f"[approx_reason] {msg_text}")
                if exc:
                    print(exc)
            except Exception:
                pass
            if exc:
                try:
                    traceback.print_exc()
                except Exception:
                    pass
        # Trace entry so we know requests are hitting this handler
        try:
            print("[calc_year] start request", flush=True)
        except Exception:
            pass
        try:
            data = request.get_json() or {}
            date_str = data.get("datetime")
            latitude = float(data.get("latitude"))
            longitude = float(data.get("longitude"))
            tz_str = data.get("timezone", "UTC")
            zodiac_mode = (data.get("zodiac_mode") or "tropical").lower()
            approx_global = False
            # Ensure Swiss Ephemeris uses bundled files (helps when Render resets working dir)
            try:
                ephe_root = Path(__file__).resolve().parent.parent / "sweph" / "ephe"
                swe.set_ephe_path(str(ephe_root))
            except Exception:
                pass
            # Optional alignment tuning
            try:
                align_min_count = int(data.get('align_min_count') if data.get('align_min_count') is not None else (data.get('align_count') if data.get('align_count') is not None else 4))
            except Exception:
                align_min_count = 4
            try:
                align_span_deg = float(data.get('align_span_deg') if data.get('align_span_deg') is not None else (data.get('align_span') if data.get('align_span') is not None else 30.0))
            except Exception:
                align_span_deg = 30.0
            try:
                align_step_hours = float(data.get('align_step_hours') if data.get('align_step_hours') is not None else (data.get('align_step') if data.get('align_step') is not None else 24.0))
            except Exception:
                align_step_hours = 24.0
            align_planets = str(data.get('align_planets') or '').strip().lower()  # e.g., 'inner','classic5','seven','all'
            align_include_outer = str(data.get('align_include_outer') or data.get('align_outer') or '').strip().lower() in ('1','true','yes','on','outer','all')
            # Allow luminaries: via explicit flags or implied by planet mode
            align_include_moon = str(data.get('align_include_moon') or data.get('align_moon') or '').strip().lower() in ('1','true','yes','on','moon','seven','all')
            align_include_sun = str(data.get('align_include_sun') or data.get('align_sun') or '').strip().lower() in ('1','true','yes','on','sun','seven','all')
            if align_planets in ('seven','all'):
                align_include_moon = True
                align_include_sun = True
            # Independent pair-aspect detection flags
            align_detect_aspects = str(data.get('align_detect_aspects') or data.get('align_aspects') or '').strip().lower() in ('1','true','yes','on','all','full','opp','oppositions')
            align_include_oppositions = str(data.get('align_include_oppositions') or data.get('align_oppositions') or '').strip().lower() in ('1','true','yes','on','opp','oppositions','all','full')
            # Force approximate mode if requested (avoids any Swiss-dependent calls except julday/revjul)
            approx_flag_raw = str(data.get('approx') or data.get('mode') or '').strip().lower()
            approx_mode = approx_flag_raw in ('1','true','yes','on','approx')
            if approx_mode:
                approx_global = True
                record_reason("Approx mode requested by client")

            # Parse JD once (needed regardless of fast path)
            jd = None
            dt_utc = None
            bce_mode = False
            try:
                dt_local = localize_datetime(date_str, tz_str)
                dt_utc = dt_local.astimezone(pytz.utc)
                jd = swe.julday(
                    dt_utc.year, dt_utc.month, dt_utc.day,
                    dt_utc.hour + dt_utc.minute / 60 + dt_utc.second / 3600 + dt_utc.microsecond / 3600000000
                )
            except Exception:
                try:
                    jd = _parse_iso_to_jd(date_str)
                    bce_mode = True
                except Exception:
                    jd = None
                    record_reason("Failed to parse datetime to JD; using approx later", traceback.format_exc())

            # Skip fast_enoch_calendar to avoid partial/approx output for extended years; always build full detail
            use_fast_days = False
            days = []
            enoch_year = None

            # Base date and Enoch mapping via existing util (needed for fallbacks/enrichment)
            if approx_mode:
                base_enoch = _approx_enoch_from_jd(jd, latitude, longitude)
                approx_global = True
            else:
                try:
                    base_enoch = calculate_enoch_date(jd, latitude, longitude, tz_str)
                except Exception:
                    record_reason("calculate_enoch_date failed; switching to approximate base", traceback.format_exc())
                    base_enoch = _approx_enoch_from_jd(jd, latitude, longitude)
                    approx_global = True
                enoch_year = base_enoch.get('enoch_year')
                enoch_day_of_year = base_enoch.get('enoch_day_of_year')
                # Precompute Enoch calendar to avoid recomputing per day
                enoch_start_jd = derive_enoch_start_jd(jd, enoch_day_of_year)
                enoch_table = None
                if enoch_start_jd is not None and enoch_year is not None:
                    try:
                        enoch_table = build_enoch_table(enoch_start_jd, enoch_year, include_added_week=True)
                    except Exception:
                        enoch_table = None
                # Determine start anchor
            use_jd_path = False
            start_utc = None
            start_jd = None
            if approx_mode:
                # For approximate years, build from TUESDAY sunset (start boundary) nearest equinox (at user lat/lon)
                start_jd = _approx_start_jd_for_enoch_year(jd, latitude, longitude)
                use_jd_path = True
            else:
                if not bce_mode:
                    try:
                        start_utc = dt_utc - timedelta(days=int(enoch_day_of_year) - 1)
                    except Exception:
                        # datetime overflow for BCE/very early years → fall back to JD path
                        start_jd = jd - (int(enoch_day_of_year) - 1)
                        use_jd_path = True
                        record_reason("Failed to derive start_utc (likely BCE/overflow); switching to JD path", traceback.format_exc())
                else:
                    start_jd = jd - (int(enoch_day_of_year) - 1)
                    use_jd_path = True
    
            def enoch_for_index(index: int, jd_mid_val: float):
                """Fast lookup of Enoch date for a given day index, fallback to precise calculation."""
                if enoch_table is not None and index < len(enoch_table):
                    return enoch_table[index]
                try:
                    return calculate_enoch_date(jd_mid_val, latitude, longitude, tz_str)
                except Exception:
                    return _approx_enoch_from_jd(jd_mid_val, latitude, longitude)
    
            def enrich_with_moon_mix(day_dict, start_dt, end_dt):
                # Preciso: detecta cruce(s) reales y reparte por tiempo en cada signo
                try:
                    mix = lunar_sign_mix(start_dt, end_dt, zodiac_mode)
                except Exception:
                    mix = None
                if not mix:
                    return
                primary = mix.get('primary_sign')
                if primary:
                    day_dict['moon_sign_primary'] = primary
                    day_dict['moon_sign'] = primary
                primary_pct = mix.get('primary_pct')
                if primary_pct is not None:
                    day_dict['moon_sign_primary_pct'] = primary_pct
                secondary = mix.get('secondary_sign')
                secondary_pct = mix.get('secondary_pct')
                # Adjuntar longitudes crudas al inicio/fin del día (best effort)
                try:
                    s_state = sun_moon_state(jd_utc(start_dt))
                    e_state = sun_moon_state(jd_utc(end_dt))
                    lon_start = s_state[1]
                    lon_end = e_state[1]
                    # Normalizar a 0..360 para salida estable
                    lon_start_n = (lon_start % 360.0 + 360.0) % 360.0
                    lon_end_n = (lon_end % 360.0 + 360.0) % 360.0
                    day_dict['moon_long_start_deg'] = round(lon_start_n, 3)
                    day_dict['moon_long_end_deg'] = round(lon_end_n, 3)
                    # Delta hacia adelante (desenrollado)
                    lon_end_unwrapped = lon_end
                    while lon_end_unwrapped < lon_start - 1e-9:
                        lon_end_unwrapped += 360.0
                    delta = max(0.0, lon_end_unwrapped - lon_start)
                    day_dict['moon_long_delta_deg'] = round(delta, 3)
                    # Signos de inicio/fin
                    try:
                        sign_start = lunar_sign_from_longitude(lon_start, zodiac_mode)
                        sign_end = lunar_sign_from_longitude(lon_end, zodiac_mode)
                        day_dict['moon_sign_start'] = sign_start
                        day_dict['moon_sign_end'] = sign_end
                    except Exception:
                        record_reason("Failed to derive moon sign start/end for day", traceback.format_exc())
                    # Fase e iluminación al inicio/fin del día enojeano
                    phase_start, illum_start = s_state[2], s_state[3]
                    phase_end, illum_end = e_state[2], e_state[3]
                    day_dict['moon_phase_angle_start_deg'] = round(phase_start, 3)
                    day_dict['moon_phase_angle_end_deg'] = round(phase_end, 3)
                    day_dict['moon_illum_start'] = round(illum_start, 6)
                    day_dict['moon_illum_end'] = round(illum_end, 6)
                except Exception:
                    # Approximate start/end illum when Swiss is unavailable
                    try:
                        # If start_dt/end_dt are strings (ISO), convert to JD
                        def to_jd_from_any(x):
                            if isinstance(x, str):
                                return _parse_iso_to_jd(x)
                            return jd_utc(x)
                        jd_s = to_jd_from_any(start_dt)
                        jd_e = to_jd_from_any(end_dt)
                        ph_s, il_s = _approx_lunar_for_jd(jd_s)
                        ph_e, il_e = _approx_lunar_for_jd(jd_e)
                        day_dict['moon_phase_angle_start_deg'] = round(ph_s, 3)
                        day_dict['moon_phase_angle_end_deg'] = round(ph_e, 3)
                        day_dict['moon_illum_start'] = round(il_s, 6)
                        day_dict['moon_illum_end'] = round(il_e, 6)
                    except Exception:
                        record_reason("Failed to assign moon phase/illum for day", traceback.format_exc())

                # Política: 100% sólo si no hubo cruce de signo; si hubo, reportar mezcla exacta.
                segs = mix.get('segments') or []
                crosses = sum(1 for s in segs if (s.get('share') or 0) > 0) > 1
                if crosses and secondary is not None:
                    day_dict['moon_sign_secondary'] = secondary
                    day_dict['moon_sign_secondary_pct'] = secondary_pct
                    day_dict['moon_sign_crossed'] = True
                    # Intentar reportar instante de cúspide cuando sólo hay un cruce
                    try:
                        # Detectar cúspide inmediata siguiente al inicio
                        lon_start = sun_moon_state(jd_utc(start_dt))[1]
                        base_sector = int((lon_start % 360.0) // 30)
                        cusp_deg = (base_sector + 1) * 30.0
                        cusp_deg = cusp_deg % 360.0
                        cusp_time = refine_sign_cusp(start_dt, end_dt, cusp_deg)
                        if cusp_time:
                            day_dict['moon_sign_cusp_utc'] = cusp_time.astimezone(timezone.utc).isoformat()
                            day_dict['moon_sign_cusp_deg'] = cusp_deg
                    except Exception:
                        record_reason("Failed to compute moon sign cusp crossing", traceback.format_exc())
                else:
                    # Día puro
                    day_dict.pop('moon_sign_secondary', None)
                    day_dict.pop('moon_sign_secondary_pct', None)
                    day_dict['moon_sign_primary_pct'] = 1.0
                    day_dict['moon_sign_crossed'] = False
                # Do not include segments in simple mode
    
            if not use_fast_days:
                # First compute a baseline 364 days; we will extend by 7 if added week is flagged on last day
                total_days = 364
                for i in range(total_days):
                if not use_jd_path:
                    day_dt_utc = start_utc + timedelta(days=i)
                    greg = day_dt_utc.date().isoformat()
                        # Midday sample for positions
                        midday = datetime(day_dt_utc.year, day_dt_utc.month, day_dt_utc.day, 12, 0, 0, tzinfo=timezone.utc)
                        jd_mid = swe.julday(midday.year, midday.month, midday.day, 12.0)
                        try:
                            lon_sun, lon_moon, phase, illum, dist_km = sun_moon_state(jd_mid)
                        except Exception:
                            lon_sun = None; lon_moon = None
                            phase, illum = _approx_lunar_for_jd(jd_mid)
                            dist_km = None
                            record_reason(f"sun_moon_state failed (added week) day {i+1}; using approximate lunar data", traceback.format_exc())
                            approx_global = True
                            record_reason(f"sun_moon_state failed at day {i+1}; using approximate lunar data", traceback.format_exc())
                        # Enoch day
                        e_day = enoch_for_index(i, jd_mid)
                        # Sunset bounds
                        s_prev, s_today = day_bounds_utc(midday, latitude, longitude, tz_str)
                        # Lunar sign (tropical default)
                        try:
                            moon_sign = lunar_sign_from_longitude(lon_moon, zodiac_mode) if lon_moon is not None else ''
                        except Exception:
                            moon_sign = ''
                        day_record = {
                            'gregorian': greg,
                            'enoch_year': e_day.get('enoch_year'),
                            'enoch_month': e_day.get('enoch_month'),
                            'enoch_day': e_day.get('enoch_day'),
                            'added_week': e_day.get('added_week'),
                            'name': e_day.get('name'),
                            'day_of_year': i + 1,
                            'start_utc': (s_prev if isinstance(s_prev, str) else s_prev.isoformat()),
                            'end_utc': (s_today if isinstance(s_today, str) else s_today.isoformat()),
                            'moon_phase_angle_deg': round(phase, 3) if phase is not None else None,
                            'moon_illum': round(illum, 6) if illum is not None else None,
                            'moon_distance_km': round(dist_km, 1) if dist_km is not None else None,
                            'moon_sign': moon_sign,
                            'moon_zodiac_mode': zodiac_mode
                        }
                        if not isinstance(s_prev, str) and not isinstance(s_today, str):
                            enrich_with_moon_mix(day_record, s_prev, s_today)
                        days.append(day_record)
                    else:
                        # BCE/proleptic path using JD only
                        day_jd0 = start_jd + i
                        y, mo, d, _ = swe.revjul(day_jd0)
                        greg = f"{int(y)}-{int(mo):02d}-{int(d):02d}"
                        jd_mid = swe.julday(int(y), int(mo), int(d), 12.0)
                    lon_sun = None; lon_moon = None
                    phase, illum = _approx_lunar_for_jd(jd_mid)
                    dist_km = None
                    if not approx_global:
                        approx_global = True
                        record_reason("BCE/JD path: using approximate lunar data (Swiss ephemeris unavailable)")
                        # Enoch day approx to avoid Swiss
                        e_day = enoch_for_index(i, jd_mid)
                        # Sunsets via Swiss Ephemeris
                        geopos = (longitude, latitude, 0)
                        jd0 = swe.julday(int(y), int(mo), int(d), 0.0)
                        try:
                            _, data_today = swe.rise_trans(jd0, swe.SUN, 2, geopos)
                            jd_s_today = data_today[0]
                        except Exception:
                            jd_s_today = jd0 + 0.75
                            record_reason(f"rise_trans (today) failed for {greg}; approximating sunset", traceback.format_exc())
                        jd_prev_day = jd0 - 1.0
                        yb, mb, db, _h = swe.revjul(jd_prev_day)
                        try:
                            _, data_prev = swe.rise_trans(swe.julday(int(yb), int(mb), int(db), 0.0), swe.SUN, 2, geopos)
                            jd_s_prev = data_prev[0]
                        except Exception:
                            jd_s_prev = jd_prev_day + 0.75
                            record_reason(f"rise_trans (prev) failed for {greg}; approximating sunset", traceback.format_exc())
                        try:
                            moon_sign = lunar_sign_from_longitude(lon_moon, zodiac_mode) if lon_moon is not None else ''
                        except Exception:
                            moon_sign = ''
                        day_record = {
                            'gregorian': greg,
                            'enoch_year': e_day.get('enoch_year'),
                            'enoch_month': e_day.get('enoch_month'),
                            'enoch_day': e_day.get('enoch_day'),
                            'added_week': e_day.get('added_week'),
                            'name': e_day.get('name'),
                            'day_of_year': i + 1,
                            'start_utc': _jd_to_iso_utc(jd_s_prev),
                            'end_utc': _jd_to_iso_utc(jd_s_today),
                            'moon_phase_angle_deg': round(phase, 3) if phase is not None else None,
                            'moon_illum': round(illum, 6) if illum is not None else None,
                            'moon_distance_km': round(dist_km, 1) if dist_km is not None else None,
                            'moon_sign': moon_sign,
                            'moon_zodiac_mode': zodiac_mode
                        }
                        days.append(day_record)
    
            # If last day reports added week, extend 7 more days (only in classic path)
            if (not use_fast_days) and days and days[-1].get('added_week'):
                for j in range(7):
                    i = total_days + j
                    if not bce_mode:
                        day_dt_utc = start_utc + timedelta(days=i)
                        greg = day_dt_utc.date().isoformat()
                        midday = datetime(day_dt_utc.year, day_dt_utc.month, day_dt_utc.day, 12, 0, 0, tzinfo=timezone.utc)
                        jd_mid = swe.julday(midday.year, midday.month, midday.day, 12.0)
                        try:
                            lon_sun, lon_moon, phase, illum, dist_km = sun_moon_state(jd_mid)
                        except Exception:
                            lon_sun = None; lon_moon = None
                            phase, illum = _approx_lunar_for_jd(jd_mid)
                            dist_km = None
                        e_day = calculate_enoch_date(jd_mid, latitude, longitude, tz_str)
                        s_prev, s_today = day_bounds_utc(midday, latitude, longitude, tz_str)
                        try:
                            moon_sign = lunar_sign_from_longitude(lon_moon, zodiac_mode) if lon_moon is not None else ''
                        except Exception:
                            moon_sign = ''
                        day_record = {
                            'gregorian': greg,
                            'enoch_year': e_day.get('enoch_year'),
                            'enoch_month': e_day.get('enoch_month'),
                            'enoch_day': e_day.get('enoch_day'),
                            'added_week': e_day.get('added_week'),
                            'name': e_day.get('name'),
                            'day_of_year': i + 1,
                            'start_utc': (s_prev if isinstance(s_prev, str) else s_prev.isoformat()),
                            'end_utc': (s_today if isinstance(s_today, str) else s_today.isoformat()),
                            'moon_phase_angle_deg': round(phase, 3),
                            'moon_illum': round(illum, 6),
                            'moon_distance_km': round(dist_km, 1),
                            'moon_sign': moon_sign,
                            'moon_zodiac_mode': zodiac_mode
                        }
                        if not isinstance(s_prev, str) and not isinstance(s_today, str):
                            enrich_with_moon_mix(day_record, s_prev, s_today)
                        days.append(day_record)
                    else:
                        day_jd0 = start_jd + i
                        y, mo, d, _ = swe.revjul(day_jd0)
                        greg = f"{int(y)}-{int(mo):02d}-{int(d):02d}"
                        jd_mid = swe.julday(int(y), int(mo), int(d), 12.0)
                        try:
                            lon_sun, lon_moon, phase, illum, dist_km = sun_moon_state(jd_mid)
                        except Exception:
                            lon_sun = None; lon_moon = None
                            phase, illum = _approx_lunar_for_jd(jd_mid)
                            dist_km = None
                        e_day = calculate_enoch_date(jd_mid, latitude, longitude, tz_str)
                        geopos = (longitude, latitude, 0)
                        jd0 = swe.julday(int(y), int(mo), int(d), 0.0)
                        try:
                            _, data_today = swe.rise_trans(jd0, swe.SUN, 2, geopos)
                            jd_s_today = data_today[0]
                        except Exception:
                            jd_s_today = jd0 + 0.75
                            record_reason(f"rise_trans (today, added week) failed for {greg}; approximating sunset", traceback.format_exc())
                        jd_prev_day = jd0 - 1.0
                        yb, mb, db, _h = swe.revjul(jd_prev_day)
                        try:
                            _, data_prev = swe.rise_trans(swe.julday(int(yb), int(mb), int(db), 0.0), swe.SUN, 2, geopos)
                            jd_s_prev = data_prev[0]
                        except Exception:
                            jd_s_prev = jd_prev_day + 0.75
                            record_reason(f"rise_trans (prev, added week) failed for {greg}; approximating sunset", traceback.format_exc())
                        try:
                            moon_sign = lunar_sign_from_longitude(lon_moon, zodiac_mode) if lon_moon is not None else ''
                        except Exception:
                            moon_sign = ''
                        day_record = {
                            'gregorian': greg,
                            'enoch_year': e_day.get('enoch_year'),
                            'enoch_month': e_day.get('enoch_month'),
                            'enoch_day': e_day.get('enoch_day'),
                            'added_week': e_day.get('added_week'),
                            'name': e_day.get('name'),
                            'day_of_year': i + 1,
                            'start_utc': _jd_to_iso_utc(jd_s_prev),
                            'end_utc': _jd_to_iso_utc(jd_s_today),
                            'moon_phase_angle_deg': round(phase, 3),
                            'moon_illum': round(illum, 6),
                            'moon_distance_km': round(dist_km, 1),
                            'moon_sign': moon_sign,
                            'moon_zodiac_mode': zodiac_mode
                        }
                        days.append(day_record)
    
            # Compute lunar/solar events across the full span using JD-only helpers
            if days:
                jd_bounds = []
                span_start_jd = None
                span_end_jd = None
                try:
                    for _d in days:
                        try:
                            s_jd = _parse_iso_to_jd(_d.get('start_utc')) if _d.get('start_utc') else None
                        except Exception:
                            s_jd = None
                        try:
                            e_jd = _parse_iso_to_jd(_d.get('end_utc')) if _d.get('end_utc') else None
                        except Exception:
                            e_jd = None
                        jd_bounds.append((s_jd, e_jd))
                    for sjd, ejd in jd_bounds:
                        if span_start_jd is None and sjd is not None:
                            span_start_jd = sjd
                        if ejd is not None:
                            span_end_jd = ejd
                    if span_start_jd is None or span_end_jd is None:
                        record_reason(f"Span parse returned None; first_start={days[0].get('start_utc')} last_end={days[-1].get('end_utc')}")
                except Exception:
                    span_start_jd = None
                    span_end_jd = None
                    record_reason("Failed to parse span for event mapping", traceback.format_exc())

                def bucket_index_jd(t_jd: float):
                    for idx, (sjd, ejd) in enumerate(jd_bounds):
                        if sjd is None or ejd is None:
                            continue
                        if sjd <= t_jd <= ejd:
                            return idx
                    return None

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
                        y_str = (f"{int(y):04d}" if int(y) >= 0 else f"{int(y)}")
                        return f"{y_str}-{int(mo):02d}-{int(d):02d}T{hh:02d}:{mi:02d}:{ss:02d}Z"
                    except Exception:
                        return str(jd_val)

                try:
                    phase_events = scan_phase_events_jd(span_start_jd, span_end_jd, step_hours=8) if span_start_jd and span_end_jd else []
                    dist_events = scan_perigee_apogee_jd(span_start_jd, span_end_jd, step_hours=8) if span_start_jd and span_end_jd else []
                except Exception:
                    phase_events = []
                    dist_events = []
                    record_reason("Phase/perigee scan failed; skipping event enrichment", traceback.format_exc())

                for ev in phase_events:
                    bi = bucket_index_jd(ev.get('jd'))
                    if bi is None:
                        continue
                    d = days[bi]
                    icon = ''
                    if ev.get('type') == 'new':
                        icon = 'new'
                    elif ev.get('type') == 'full':
                        icon = 'full'
                    elif ev.get('type') == 'first_quarter':
                        icon = '1q'
                    elif ev.get('type') == 'last_quarter':
                        icon = '3q'
                    d['moon_event'] = ev.get('type')
                    d['moon_event_utc'] = ev.get('iso') or _iso_from_jd(ev.get('jd'))
                    if icon:
                        d['moon_icon'] = icon

                for ev in dist_events:
                    bi = bucket_index_jd(ev.get('jd'))
                    if bi is None:
                        continue
                    d = days[bi]
                    if ev.get('type') == 'perigee':
                        d['perigee'] = True
                        d['perigee_utc'] = ev.get('iso') or _iso_from_jd(ev.get('jd'))
                    if ev.get('type') == 'apogee':
                        d['apogee'] = True
                        d['apogee_utc'] = ev.get('iso') or _iso_from_jd(ev.get('jd'))

                try:
                    full_times = [ev['jd'] for ev in phase_events if ev.get('type') == 'full' and ev.get('jd') is not None]
                    perigee_times = [ev['jd'] for ev in dist_events if ev.get('type') == 'perigee' and ev.get('jd') is not None]
                    for ft in full_times:
                        if not perigee_times:
                            continue
                        nearest = min(perigee_times, key=lambda t: abs(t - ft))
                        if abs(nearest - ft) <= 1.0:
                            bi = bucket_index_jd(ft)
                            if bi is not None:
                                d = days[bi]
                                d['supermoon'] = True
                                d['supermoon_utc'] = _iso_from_jd(ft)
                    try:
                        print(f"[calc_year] phase_events={len(phase_events)} dist_events={len(dist_events)} full={len(full_times)} perigee={len(perigee_times)}", flush=True)
                    except Exception:
                        pass
                except Exception:
                    record_reason("Failed while marking supermoon events", traceback.format_exc())

                try:
                    if span_start_jd and span_end_jd:
                        years = sorted(set([int(swe.revjul(span_start_jd)[0]), int(swe.revjul(span_end_jd)[0])]))
                        sol = []
                        for y in years:
                            sol.extend(solar_cardinal_points_for_year(y))
                        for ev in sol:
                            ev_jd = ev.get('jd')
                            if ev_jd is None:
                                try:
                                    ev_jd = jd_utc(ev.get('time'))
                                except Exception:
                                    ev_jd = None
                            if ev_jd is None:
                                continue
                            bi = bucket_index_jd(ev_jd)
                            if bi is None:
                                continue
                            d = days[bi]
                            if ev.get('type') == 'equinox':
                                d['equinox'] = ev.get('season') or 'equinox'
                                d['equinox_utc'] = _iso_from_jd(ev_jd)
                            elif ev.get('type') == 'solstice':
                                d['solstice'] = ev.get('season') or 'solstice'
                                d['solstice_utc'] = _iso_from_jd(ev_jd)
                except Exception:
                    record_reason("Failed while mapping equinox/solstice events", traceback.format_exc())

                try:
                    if span_start_jd and span_end_jd:
                        ec = scan_eclipses_global_jd(span_start_jd, span_end_jd)
                        for ev in ec:
                            bi = bucket_index_jd(ev.get('jd'))
                            if bi is None:
                                continue
                            d = days[bi]
                            if ev.get('type') == 'solar':
                                d['solar_eclipse'] = True
                                if ev.get('iso'):
                                    d['solar_eclipse_utc'] = ev['iso']
                                if ev.get('subtype'):
                                    d['solar_eclipse_kind'] = ev.get('subtype')
                            elif ev.get('type') == 'lunar':
                                d['lunar_eclipse'] = True
                                if ev.get('iso'):
                                    d['lunar_eclipse_utc'] = ev['iso']
                                if ev.get('subtype'):
                                    d['lunar_eclipse_kind'] = ev.get('subtype')
                except Exception:
                    record_reason("Failed during eclipse mapping", traceback.format_exc())

                try:
                    if span_start_jd and span_end_jd:
                        al = scan_alignments_simple_jd(
                            span_start_jd,
                            span_end_jd,
                            max_span_deg=max(1.0, min(60.0, align_span_deg)),
                            min_count=max(0, min(10, align_min_count)),
                            step_hours=max(1.0, min(24.0, align_step_hours)),
                            planet_mode=align_planets,
                            include_outer=align_include_outer,
                            include_moon=align_include_moon,
                            include_sun=align_include_sun
                        )
                        name_map = {
                            swe.MERCURY: 'Mercury',
                            swe.VENUS: 'Venus',
                            swe.MARS: 'Mars',
                            swe.JUPITER: 'Jupiter',
                            swe.SATURN: 'Saturn',
                        }
                        try:
                            name_map[swe.URANUS] = 'Uranus'
                            name_map[swe.NEPTUNE] = 'Neptune'
                            name_map[swe.PLUTO] = 'Pluto'
                        except Exception:
                            record_reason("Failed to map outer planet names for alignments", traceback.format_exc())
                        try:
                            name_map[swe.SUN] = 'Sun'
                            name_map[swe.MOON] = 'Moon'
                        except Exception:
                            record_reason("Failed to map luminary names for alignments", traceback.format_exc())

                        per_day = {}
                        for ev in al:
                            bi = bucket_index_jd(ev.get('jd'))
                            if bi is None:
                                continue
                            recs = per_day.setdefault(bi, {})
                            key = tuple(sorted(ev.get('pids') or [])) or (('t', ev.get('jd')),)
                            prev = recs.get(key)
                            cnt = int(ev.get('count') or 0)
                            span = float(ev.get('span') or 1e9)
                            total = int(ev.get('total') or 0) or max(len(key), 1)
                            try:
                                denom_cap = 7
                                denom = float(max(1, min(denom_cap, int(total or 0))))
                                frac = max(0.0, min(1.0, cnt / denom))
                                comp = max(0.0, min(1.0, 1.0 - span / float(max(1.0, align_span_deg))))
                                pids = ev.get('pids') or []
                                try:
                                    has_sun = (swe.SUN in pids)
                                    has_moon = (swe.MOON in pids)
                                except Exception:
                                    has_sun = False; has_moon = False
                                lum_bonus = (0.06 if has_sun else 0.0) + (0.04 if has_moon else 0.0)
                                count_bonus = max(0.0, min(0.08, 0.02 * max(0, cnt - 2)))
                                score = 0.5 * frac + 0.5 * comp + lum_bonus + count_bonus
                                score = max(0.0, min(1.0, round(score, 3)))
                            except Exception:
                                score = None
                            better = (prev is None)
                            if prev is not None:
                                if cnt > prev['count']:
                                    better = True
                                elif cnt == prev['count'] and span < prev['span']:
                                    better = True
                                elif cnt == prev['count'] and abs(span - prev['span']) < 1e-9 and (ev.get('jd') or 0) < (prev.get('jd') or 0):
                                    better = True
                            if better:
                                planets_label = None
                                try:
                                    if ev.get('pids'):
                                        planets_label = ','.join([name_map.get(pid, str(pid)) for pid in ev['pids']])
                                except Exception:
                                    planets_label = None
                                recs[key] = {
                                    'jd': ev.get('jd'),
                                    'count': cnt,
                                    'total': total,
                                    'planets': planets_label,
                                    'span': span,
                                    'score': score,
                                }
                        try:
                            if align_detect_aspects:
                                asp = scan_pair_aspects_jd(
                                    span_start_jd,
                                    span_end_jd,
                                    step_hours=max(1.0, min(24.0, align_step_hours)),
                                    planet_mode=align_planets,
                                    include_outer=align_include_outer,
                                    include_moon=align_include_moon,
                                    include_sun=align_include_sun,
                                    include_oppositions=align_include_oppositions,
                                )
                                for ev in asp:
                                    bi = bucket_index_jd(ev.get('jd'))
                                    if bi is None:
                                        continue
                                    recs = per_day.setdefault(bi, {})
                                    key = tuple(sorted(ev.get('pids') or []))
                                    prev = recs.get(key)
                                    cnt = 2
                                    span = float(ev.get('span') or 1e9)
                                    total = int(ev.get('total') or 0) or 2
                                    offset = ev.get('offset')
                                    planets_label = None
                                    try:
                                        planets_label = ','.join([name_map.get(pid, str(pid)) for pid in ev.get('pids') or []])
                                    except Exception:
                                        planets_label = None
                                    better = (prev is None) or (cnt > prev['count']) or (cnt == prev['count'] and span < prev['span'])
                                    if better:
                                        recs[key] = {
                                            'jd': ev.get('jd'),
                                            'count': cnt,
                                            'total': total,
                                            'planets': planets_label,
                                            'span': span,
                                            'score': prev['score'] if (prev and 'score' in prev) else None,
                                            'offset': float(offset) if (offset is not None) else None,
                                        }
                        except Exception:
                            record_reason("Failed while scanning pair aspects", traceback.format_exc())

                        for bi, recs in per_day.items():
                            d = days[bi]
                            best = None
                            for r in recs.values():
                                if best is None or r['count'] > best['count'] or (r['count'] == best['count'] and r['span'] < best['span']):
                                    best = r
                            if best:
                                try:
                                    d['alignment'] = max(int(d.get('alignment') or 0), int(best['count']))
                                    if best.get('jd') is not None:
                                        d['alignment_utc'] = _iso_from_jd(best['jd'])
                                    d['alignment_total'] = int(best['total'])
                                    if best.get('planets'):
                                        d['alignment_planets'] = best['planets']
                                    d['alignment_span_deg'] = float(best['span'])
                                    if best.get('score') is not None:
                                        d['alignment_score'] = best['score']
                                except Exception:
                                    record_reason("Failed while summarizing alignments", traceback.format_exc())
                            try:
                                items = []
                                for r in sorted(recs.values(), key=lambda x: (-(x['count']), x['span'], x.get('jd') or 0)):
                                    item = {
                                        'utc': _iso_from_jd(r['jd']) if r.get('jd') is not None else None,
                                        'count': r['count'],
                                        'total': r['total'],
                                        'span_deg': r['span'],
                                    }
                                    if r.get('planets'):
                                        item['planets'] = r['planets']
                                    if r.get('score') is not None:
                                        item['score'] = r['score']
                                    if r.get('offset') is not None:
                                        item['offset_deg'] = r['offset']
                                    items.append(item)
                                if items:
                                    d['alignments'] = items
                            except Exception:
                                record_reason("Failed while listing alignments", traceback.format_exc())
                    else:
                        record_reason("No alignments span computed (missing JD bounds)")
                except Exception:
                    record_reason("Failed during alignment scan", traceback.format_exc())

                try:
                    if span_start_jd and span_end_jd:
                        has_align = any((d.get('alignments') or d.get('alignment')) for d in days)
                        if not has_align:
                            record_reason("No alignments detected for given thresholds")
                except Exception:
                    pass
            resp = {
                'ok': True,
                'enoch_year': enoch_year,
                'days': days
            }
            # Signal quality when approximations were used
            if approx_mode or approx_global or any((d.get('moon_distance_km') is None for d in days)):
                resp['quality'] = 'approx'
            else:
                resp['quality'] = 'full'
            # If we marked approximate but have no specific reasons, synthesize one so it's visible
            if resp['quality'] == 'approx' and not approx_reasons:
                if any((d.get('moon_distance_km') is None for d in days)):
                    record_reason("Moon distance unavailable for some days; used approximate lunar data")
                else:
                    record_reason("Approximate calendar generated (no specific error captured)")
            if approx_reasons:
                resp['quality_reasons'] = approx_reasons
            # Emit a one-line summary of quality so it is always visible in logs/stdout
            try:
                print(f"[calc_year] quality={resp['quality']} reasons={resp.get('quality_reasons', [])} days={len(days)} approx_mode={approx_mode} approx_global={approx_global}", flush=True)
            except Exception:
                pass
            return jsonify(resp)
        except Exception as e:
            traceback.print_exc()
            record_reason("calc_year outer exception; entering full approximate fallback", traceback.format_exc())
            # Ultimate fallback: build an approximate year without any Swiss-dependent calls (except julday/revjul)
            try:
                data = request.get_json() or {}
                date_str = data.get("datetime")
                latitude = float(data.get("latitude"))
                longitude = float(data.get("longitude"))
                tz_str = data.get("timezone", "UTC")
                # Parse JD from ISO
                jd = _parse_iso_to_jd(date_str)
                base_enoch = _approx_enoch_from_jd(jd, latitude, longitude)
                enoch_year = base_enoch.get('enoch_year')
                # Anchor start at TUESDAY sunset (start boundary) nearest equinox (approx path, no Swiss ephe)
                start_jd = _approx_start_jd_for_enoch_year(jd, latitude, longitude)
                days = []
                total_days = 364
                for i in range(total_days):
                    day_jd0 = start_jd + i
                    y, mo, d, _ = swe.revjul(day_jd0)
                    greg = f"{int(y)}-{int(mo):02d}-{int(d):02d}"
                    jd_mid = swe.julday(int(y), int(mo), int(d), 12.0)
                    phase, illum = _approx_lunar_for_jd(jd_mid)
                    # Sunsets approx (Swiss may be unavailable)
                    try:
                        geopos = (longitude, latitude, 0)
                        jd0 = swe.julday(int(y), int(mo), int(d), 0.0)
                        _, data_today = swe.rise_trans(jd0, swe.SUN, 2, geopos)
                        jd_s_today = data_today[0]
                    except Exception:
                        jd0 = swe.julday(int(y), int(mo), int(d), 0.0)
                        jd_s_today = jd0 + 0.75
                    try:
                        jd_prev_day = jd0 - 1.0
                        yb, mb, db, _h = swe.revjul(jd_prev_day)
                        _, data_prev = swe.rise_trans(swe.julday(int(yb), int(mb), int(db), 0.0), swe.SUN, 2, geopos)
                        jd_s_prev = data_prev[0]
                    except Exception:
                        jd_prev_day = jd0 - 1.0
                        jd_s_prev = jd_prev_day + 0.75
                    e_day = _approx_enoch_from_jd(jd_mid, latitude, longitude)
                    day_record = {
                        'gregorian': greg,
                        'enoch_year': e_day.get('enoch_year'),
                        'enoch_month': e_day.get('enoch_month'),
                        'enoch_day': e_day.get('enoch_day'),
                        'added_week': e_day.get('added_week'),
                        'name': e_day.get('name'),
                        'day_of_year': i + 1,
                        'start_utc': _jd_to_iso_utc(jd_s_prev),
                        'end_utc': _jd_to_iso_utc(jd_s_today),
                        'moon_phase_angle_deg': round(phase, 3),
                        'moon_illum': round(illum, 6),
                        'moon_distance_km': None,
                        'moon_sign': '',
                        'moon_zodiac_mode': (data.get('zodiac_mode') or 'tropical').lower()
                    }
                    days.append(day_record)
                return jsonify({'ok': True, 'enoch_year': enoch_year, 'days': days, 'quality': 'approx', 'quality_reasons': approx_reasons}), 200
            except Exception as e2:
                traceback.print_exc()
                record_reason("approx_fallback_failed", traceback.format_exc())
                return jsonify({'ok': False, 'error': str(e2), 'quality_reasons': approx_reasons}), 500
    
    
    
    
    
    
