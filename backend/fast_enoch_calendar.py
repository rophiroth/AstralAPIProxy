import swisseph as swe
from datetime import datetime, timedelta, timezone
from typing import Callable, Dict, List, Optional, Tuple

from utils.datetime_local import localize_datetime
from utils.enoch import calculate_enoch_date
from utils.lunar_calc import sun_moon_state, lunar_sign_from_longitude


def _jd_to_iso_utc(jd: float) -> str:
    """Format a JD as ISO UTC string."""
    y, mo, d, hour = swe.revjul(jd)
    hh = int(hour)
    mm_f = (hour - hh) * 60.0
    mi = int(mm_f)
    ss = int(round((mm_f - mi) * 60.0))
    if ss == 60:
        ss = 0
        mi += 1
    if mi == 60:
        mi = 0
        hh += 1
    return f"{int(y)}-{int(mo):02d}-{int(d):02d}T{hh:02d}:{mi:02d}:{ss:02d}Z"


def default_sunsets(day_dt_utc: datetime, latitude: float, longitude: float) -> Tuple[str, str]:
    """Compute previous and current day sunsets (UTC) using Swiss Ephemeris."""
    geopos = (longitude, latitude, 0)
    jd0 = swe.julday(day_dt_utc.year, day_dt_utc.month, day_dt_utc.day, 0.0)
    try:
        _, data_today = swe.rise_trans(jd0, swe.SUN, 2, geopos)
        jd_s_today = data_today[0]
    except Exception as e:
        print(f"[fast_enoch_calendar] rise_trans today failed for {day_dt_utc.date()}: {e}")
        jd_s_today = jd0 + 0.75
    jd_prev = jd0 - 1.0
    yb, mb, db, _ = swe.revjul(jd_prev)
    try:
        _, data_prev = swe.rise_trans(swe.julday(int(yb), int(mb), int(db), 0.0), swe.SUN, 2, geopos)
        jd_s_prev = data_prev[0]
    except Exception as e:
        print(f"[fast_enoch_calendar] rise_trans prev failed for {day_dt_utc.date()}: {e}")
        jd_s_prev = jd_prev + 0.75
    return _jd_to_iso_utc(jd_s_prev), _jd_to_iso_utc(jd_s_today)


def _month_lengths(include_added_week: bool) -> List[int]:
    months = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31]
    if include_added_week:
        months[-1] += 7
    return months


def _derive_start_utc(dt_utc: datetime, enoch_day_of_year: int) -> datetime:
    return dt_utc - timedelta(days=int(enoch_day_of_year) - 1)


def build_fast_enoch_calendar(
    date_str: str,
    latitude: float,
    longitude: float,
    tz_str: str = "UTC",
    zodiac_mode: str = "tropical",
    include_added_week: bool = True,
    bounds_resolver: Optional[Callable[[datetime, float, float], Tuple[str, str]]] = None,
) -> Dict:
    """
    Build an Enoch calendar year by computing the start boundary once, then reusing it per day.

    - Keeps Swiss-ephemeris accuracy for Sun/Moon data (midday sample).
    - Does not alter existing endpoints; intended for a fast calendar-only path.
    """
    dt_local = localize_datetime(date_str, tz_str)
    dt_utc = dt_local.astimezone(timezone.utc)
    jd = swe.julday(
        dt_utc.year,
        dt_utc.month,
        dt_utc.day,
        dt_utc.hour + dt_utc.minute / 60 + dt_utc.second / 3600 + dt_utc.microsecond / 3.6e9,
    )
    base_enoch = calculate_enoch_date(jd, latitude, longitude, tz_str)
    enoch_year = base_enoch.get("enoch_year")
    enoch_day_of_year = base_enoch.get("enoch_day_of_year")
    if enoch_day_of_year is None:
        raise RuntimeError("Base Enoch mapping missing day_of_year.")
    start_utc = _derive_start_utc(dt_utc, enoch_day_of_year)
    months = _month_lengths(include_added_week)
    total_days = sum(months)
    days = []
    m_idx = 0
    day_in_month = 1
    resolver = bounds_resolver or default_sunsets
    for i in range(total_days):
        day_dt_utc = start_utc + timedelta(days=i)
        midday = datetime(day_dt_utc.year, day_dt_utc.month, day_dt_utc.day, 12, 0, 0, tzinfo=timezone.utc)
        jd_mid = swe.julday(midday.year, midday.month, midday.day, 12.0)
        try:
            lon_sun, lon_moon, phase, illum, dist_km = sun_moon_state(jd_mid)
        except Exception:
            lon_sun = None
            lon_moon = None
            phase = None
            illum = None
            dist_km = None
        try:
            moon_sign = lunar_sign_from_longitude(lon_moon, zodiac_mode) if lon_moon is not None else ""
        except Exception:
            moon_sign = ""
        try:
            start_iso, end_iso = resolver(day_dt_utc, latitude, longitude)
        except Exception:
            start_iso, end_iso = None, None
        # Fallback if resolver returned None values (should not propagate)
        if not start_iso or not end_iso:
            try:
                jd0 = swe.julday(day_dt_utc.year, day_dt_utc.month, day_dt_utc.day, 0.0)
                jd_prev = jd0 - 1.0
                start_iso = _jd_to_iso_utc(jd_prev + 0.75)
                end_iso = _jd_to_iso_utc(jd0 + 0.75)
            except Exception:
                start_iso = start_iso or None
                end_iso = end_iso or None
        day_of_year = i + 1
        added_week_flag = include_added_week and day_of_year > 364
        days.append(
            {
                "gregorian": day_dt_utc.date().isoformat(),
                "enoch_year": enoch_year,
                "enoch_month": m_idx + 1,
                "enoch_day": day_in_month,
                "added_week": added_week_flag,
                "day_of_year": day_of_year,
                "start_utc": start_iso,
                "end_utc": end_iso,
                "moon_phase_angle_deg": round(phase, 3) if phase is not None else None,
                "moon_illum": round(illum, 6) if illum is not None else None,
                "moon_distance_km": round(dist_km, 1) if dist_km is not None else None,
                "moon_sign": moon_sign,
                "moon_zodiac_mode": zodiac_mode,
                "lon_sun_deg": round(lon_sun, 6) if lon_sun is not None else None,
                "lon_moon_deg": round(lon_moon, 6) if lon_moon is not None else None,
            }
        )
        day_in_month += 1
        if m_idx < len(months) and day_in_month > months[m_idx]:
            m_idx += 1
            day_in_month = 1
            if m_idx >= len(months):
                break
    return {"ok": True, "enoch_year": enoch_year, "days": days, "quality": "fast"}
