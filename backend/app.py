from flask import Flask, request, jsonify
from flask_cors import CORS
import swisseph as swe
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import pytz
from astral import LocationInfo
from astral.sun import sun as astral_sun
from utils.enoch import calculate_enoch_date
from utils.datetime_local import localize_datetime
from utils.debug import *
from utils.asc_mc_houses import calculate_asc_mc_and_houses
from utils.planet_positions import calculate_planets
from utils.lunar_calc import (
    jd_utc, sun_moon_state, scan_phase_events, scan_perigee_apogee,
    lunar_sign_from_longitude, lunar_sign_mix, refine_sign_cusp,
    solar_cardinal_points_for_year, scan_eclipses_global, scan_alignments_simple,
    scan_pair_aspects
)
try:
    from calc_year_route import calc_year
except Exception:
    from .calc_year_route import calc_year  # type: ignore

import traceback

from ai_summary import register_ai_summary_route

app = Flask(__name__)

# Ensure Swiss Ephemeris finds the bundled data (sweph/ephe)
EPHE_PATH = Path(__file__).resolve().parent.parent / "sweph" / "ephe"
try:
    swe.set_ephe_path(str(EPHE_PATH))
except Exception:
    # Fallback: attempt relative string path; errors will still surface in logs
    swe.set_ephe_path("sweph/ephe")

# Flexible CORS: allow same-origin by default; enable cross-origin via env
origins_env = os.environ.get("CORS_ORIGINS", "").strip()
if origins_env:
    allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
else:
    allowed_origins = [
        "https://chart.psyhackers.org",
        "https://calendar.psyhackers.org",
    ]

# Broaden CORS to all routes so even error responses carry CORS headers for these origins
CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=False)
register_ai_summary_route(app)

# --- Helpers to support extended ISO (including BCE) directly to JD ---
import re
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

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        data = request.get_json()
        date_str = data.get("datetime")
        latitude = float(data.get("latitude"))
        longitude = float(data.get("longitude"))
        tz_str = data.get("timezone", "UTC")
        jd = None
        try:
            dt = localize_datetime(date_str, tz_str)
            utc_dt = dt.astimezone(pytz.utc)
            jd = swe.julday(
                utc_dt.year, utc_dt.month, utc_dt.day,
                utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600 + utc_dt.microsecond / 3600000000
            )
        except Exception:
            # Try extended ISO → JD path (supports negative years if ISO has Z/offset)
            if isinstance(date_str, str):
                jd = _parse_iso_to_jd(date_str)
            else:
                raise
        # Planets (may fail if ephemeris files missing)
        approx_flags = {'enoch': False, 'planets': False}
        try:
            results = calculate_planets(jd, latitude, longitude)
        except Exception as _e:
            traceback.print_exc()
            results = { 'error': 'ephemeris-missing' }
            approx_flags['planets'] = True
        # Enoch mapping (fallback to approximate if precise fails)
        try:
            enoch_data = calculate_enoch_date(jd, latitude, longitude, tz_str)
        except Exception as _e:
            traceback.print_exc()
            enoch_data = _approx_enoch_from_jd(jd, latitude, longitude)
            approx_flags['enoch'] = True
        # Houses (optional)
        try:
            houses_data = calculate_asc_mc_and_houses(jd, latitude, longitude)
        except Exception:
            houses_data = None
        return jsonify({
            "julian_day": jd,
            "planets": results,
            "enoch": enoch_data,
            "houses_data": houses_data,
            "quality": ("approx" if any(approx_flags.values()) else "full"),
            "approx": approx_flags
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def day_bounds_utc(greg_date: datetime, latitude: float, longitude: float, tz_str: str):
    """Return (start_utc, end_utc) where start is previous day's sunset and end is day's sunset."""
    # Preferred: Astral (good for common-year ranges)
    try:
        tz = pytz.timezone(tz_str)
    except Exception:
        tz = pytz.utc
    try:
        loc = LocationInfo(name="L", region="L", timezone=tz_str, latitude=latitude, longitude=longitude)
        local_day = tz.localize(datetime(greg_date.year, greg_date.month, greg_date.day, 12, 0, 0))
        s_today = astral_sun(loc.observer, date=local_day.date(), tzinfo=tz)["sunset"]
        s_prev = astral_sun(loc.observer, date=(local_day - timedelta(days=1)).date(), tzinfo=tz)["sunset"]
        return s_prev.astimezone(pytz.utc), s_today.astimezone(pytz.utc)
    except Exception:
        # Fallback chain: Swiss sunsets → NOAA approx
        try:
            geopos = (longitude, latitude, 0)
            jd0 = swe.julday(greg_date.year, greg_date.month, greg_date.day, 0.0)
            try:
                _, data_today = swe.rise_trans(jd0, swe.SUN, 2, geopos)  # 2 = sunset
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
            # NOAA approx (no Swiss files)
            y = greg_date.year; mo = greg_date.month; d = greg_date.day
            ph, pm, ps = _approx_sunset_ut_hms(y, mo, d-1 if d>1 else d, latitude, longitude)
            th, tm, ts = _approx_sunset_ut_hms(y, mo, d, latitude, longitude)
            # Adjust previous day if d==1
            if d == 1:
                # previous day via JD
                jd_today = swe.julday(y, mo, d, 0.0)
                yb, mb, db, _ = swe.revjul(jd_today - 1.0)
                prev_iso = _iso_from_ymd_hms(int(yb), int(mb), int(db), ph, pm, ps)
                today_iso = _iso_from_ymd_hms(y, mo, d, th, tm, ts)
                return prev_iso, today_iso
            prev_iso = _iso_from_ymd_hms(y, mo, d-1, ph, pm, ps)
            today_iso = _iso_from_ymd_hms(y, mo, d, th, tm, ts)
            return prev_iso, today_iso


app.add_url_rule('/calcYear', view_func=calc_year, methods=['POST'])

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
