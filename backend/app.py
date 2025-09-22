from flask import Flask, request, jsonify
from flask_cors import CORS
import swisseph as swe
from datetime import datetime, timedelta, timezone
import os
import pytz
from astral import LocationInfo
from astral.sun import sun as astral_sun
from utils.enoch import calculate_enoch_date
from utils.datetime_local import localize_datetime
from utils.debug import *
from utils.asc_mc_houses import calculate_asc_mc_and_houses
from utils.planet_positions import calculate_planets
from utils.lunar_calc import jd_utc, sun_moon_state, scan_phase_events, scan_perigee_apogee, lunar_sign_from_longitude

import traceback

app = Flask(__name__)

# Flexible CORS: allow same-origin by default; enable cross-origin via env
origins_env = os.environ.get("CORS_ORIGINS", "").strip()
if origins_env:
    allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
else:
    allowed_origins = [
        "https://chart.psyhackers.org",
        "https://calendar.psyhackers.org",
    ]

CORS(app, resources={r"/calculate": {"origins": allowed_origins}, r"/calcYear": {"origins": allowed_origins}}, supports_credentials=False)

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        data = request.get_json()
        date_str = data.get("datetime")
        latitude = float(data.get("latitude"))
        longitude = float(data.get("longitude"))
        tz_str = data.get("timezone", "UTC")

        dt = localize_datetime(date_str, tz_str)
        utc_dt = dt.astimezone(pytz.utc)
        jd = swe.julday(
            utc_dt.year, utc_dt.month, utc_dt.day,
            utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600 + utc_dt.microsecond / 3600000000
        )
        results = calculate_planets(jd, latitude, longitude)
        enoch_data = calculate_enoch_date(jd, latitude, longitude, tz_str)
        houses_data = calculate_asc_mc_and_houses(jd, latitude, longitude)
        return jsonify({
            "julian_day": jd,
            "planets": results,
            "enoch": enoch_data,
            "houses_data": houses_data
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def day_bounds_utc(greg_date: datetime, latitude: float, longitude: float, tz_str: str):
    """Return (start_utc, end_utc) where start is previous day's sunset and end is day's sunset."""
    try:
        tz = pytz.timezone(tz_str)
    except Exception:
        tz = pytz.utc
    loc = LocationInfo(name="L", region="L", timezone=tz_str, latitude=latitude, longitude=longitude)
    local_day = tz.localize(datetime(greg_date.year, greg_date.month, greg_date.day, 12, 0, 0))
    s_today = astral_sun(loc.observer, date=local_day.date(), tzinfo=tz)["sunset"]
    s_prev = astral_sun(loc.observer, date=(local_day - timedelta(days=1)).date(), tzinfo=tz)["sunset"]
    return s_prev.astimezone(pytz.utc), s_today.astimezone(pytz.utc)


@app.route('/calcYear', methods=['POST'])
def calc_year():
    try:
        data = request.get_json() or {}
        date_str = data.get("datetime")
        latitude = float(data.get("latitude"))
        longitude = float(data.get("longitude"))
        tz_str = data.get("timezone", "UTC")
        zodiac_mode = (data.get("zodiac_mode") or "tropical").lower()

        # Base date and Enoch mapping via existing util
        dt_local = localize_datetime(date_str, tz_str)
        dt_utc = dt_local.astimezone(pytz.utc)
        jd = swe.julday(
            dt_utc.year, dt_utc.month, dt_utc.day,
            dt_utc.hour + dt_utc.minute / 60 + dt_utc.second / 3600 + dt_utc.microsecond / 3600000000
        )
        base_enoch = calculate_enoch_date(jd, latitude, longitude, tz_str)
        enoch_year = base_enoch.get('enoch_year')
        enoch_day_of_year = base_enoch.get('enoch_day_of_year')

        # Determine start date (UTC) for day 1 of the Enoch year
        start_utc = dt_utc - timedelta(days=int(enoch_day_of_year) - 1)

        days = []
        # First compute a baseline 364 days; we will extend by 7 if added week is flagged on last day
        total_days = 364
        def sign_fractions(s_prev, s_today, zodiac_mode, step_hours=2):
            try:
                # Accumulate actual durations per sign within [s_prev, s_today)
                def sign_idx_for_time(tt):
                    jd_s = jd_utc(tt)
                    lon_sun, lon_moon, *_ = sun_moon_state(jd_s)
                    idx = int(((lon_moon % 360.0) / 30.0)) % 12
                    return idx

                durations = {}
                t0 = s_prev
                while t0 < s_today:
                    t1 = min(t0 + timedelta(hours=step_hours), s_today)
                    i0 = sign_idx_for_time(t0)
                    i1 = sign_idx_for_time(t1)
                    if i0 == i1:
                        dt = (t1 - t0).total_seconds()
                        durations[i0] = durations.get(i0, 0.0) + dt
                    else:
                        # Refine boundary crossing within [t0, t1]
                        a, b = t0, t1
                        ia = i0
                        for _ in range(25):
                            mid = a + (b - a) / 2
                            im = sign_idx_for_time(mid)
                            if im == ia:
                                a = mid
                            else:
                                b = mid
                            if (b - a).total_seconds() <= 1:
                                break
                        tc = b  # crossing time approx
                        dt1 = (tc - t0).total_seconds()
                        dt2 = (t1 - tc).total_seconds()
                        durations[i0] = durations.get(i0, 0.0) + max(0.0, dt1)
                        durations[i1] = durations.get(i1, 0.0) + max(0.0, dt2)
                    t0 = t1

                total_sec = sum(durations.values())
                if total_sec <= 0:
                    return None
                # Map indices to names and fractions
                items = sorted(durations.items(), key=lambda kv: kv[1], reverse=True)
                def idx_to_name(idx):
                    # Use a representative longitude within the sign to retrieve the label
                    lon_rep = (idx * 30.0) + 0.1
                    return lunar_sign_from_longitude(lon_rep, zodiac_mode)
                primary_idx, primary_dt = (items[0] if items else (None, 0.0))
                secondary_idx, secondary_dt = (items[1] if len(items) > 1 else (None, 0.0))
                return {
                    'primary': idx_to_name(primary_idx) if primary_idx is not None else None,
                    'primary_pct': (primary_dt / total_sec) if total_sec > 0 else 0.0,
                    'secondary': idx_to_name(secondary_idx) if secondary_idx is not None else None,
                    'secondary_pct': (secondary_dt / total_sec) if total_sec > 0 else 0.0,
                }
            except Exception:
                return None

        for i in range(total_days):
            day_dt_utc = start_utc + timedelta(days=i)
            greg = day_dt_utc.date().isoformat()
            # Sunset bounds for local day (previous sunset -> today's sunset)
            midday = datetime(day_dt_utc.year, day_dt_utc.month, day_dt_utc.day, 12, 0, 0, tzinfo=timezone.utc)
            s_prev, s_today = day_bounds_utc(midday, latitude, longitude, tz_str)
            # Sample lunar state at the midpoint of the local day window
            mid_utc = s_prev + (s_today - s_prev) / 2
            jd_mid = jd_utc(mid_utc)
            lon_sun, lon_moon, phase, illum, dist_km = sun_moon_state(jd_mid)
            # Enoch day at same sample time
            e_day = calculate_enoch_date(jd_mid, latitude, longitude, tz_str)
            # Lunar sign (tropical default)
            moon_sign = lunar_sign_from_longitude(lon_moon, zodiac_mode)
            sign_mix = sign_fractions(s_prev, s_today, zodiac_mode)
            days.append({
                'gregorian': greg,
                'enoch_year': e_day.get('enoch_year'),
                'enoch_month': e_day.get('enoch_month'),
                'enoch_day': e_day.get('enoch_day'),
                'added_week': e_day.get('added_week'),
                'name': e_day.get('name'),
                'day_of_year': i + 1,
                'start_utc': s_prev.isoformat(),
                'end_utc': s_today.isoformat(),
                'moon_phase_angle_deg': round(phase, 3),
                'moon_illum': round(illum, 6),
                'moon_distance_km': round(dist_km, 1),
                'moon_sign': sign_mix['primary'] if sign_mix and sign_mix.get('primary') else moon_sign,
                'moon_sign_primary': sign_mix['primary'] if sign_mix else moon_sign,
                'moon_sign_primary_pct': round(sign_mix['primary_pct'], 6) if sign_mix else 1.0,
                'moon_sign_secondary': sign_mix['secondary'] if sign_mix else None,
                'moon_sign_secondary_pct': round(sign_mix['secondary_pct'], 6) if sign_mix else 0.0,
                'moon_zodiac_mode': zodiac_mode
            })

        # If last day reports added week, extend 7 more days
        if days and days[-1].get('added_week'):
            for j in range(7):
                i = total_days + j
                day_dt_utc = start_utc + timedelta(days=i)
                greg = day_dt_utc.date().isoformat()
                midday = datetime(day_dt_utc.year, day_dt_utc.month, day_dt_utc.day, 12, 0, 0, tzinfo=timezone.utc)
                s_prev, s_today = day_bounds_utc(midday, latitude, longitude, tz_str)
                mid_utc = s_prev + (s_today - s_prev) / 2
                jd_mid = jd_utc(mid_utc)
                lon_sun, lon_moon, phase, illum, dist_km = sun_moon_state(jd_mid)
                e_day = calculate_enoch_date(jd_mid, latitude, longitude, tz_str)
                moon_sign = lunar_sign_from_longitude(lon_moon, zodiac_mode)
                sign_mix = sign_fractions(s_prev, s_today, zodiac_mode)
                days.append({
                    'gregorian': greg,
                    'enoch_year': e_day.get('enoch_year'),
                    'enoch_month': e_day.get('enoch_month'),
                    'enoch_day': e_day.get('enoch_day'),
                    'added_week': e_day.get('added_week'),
                    'name': e_day.get('name'),
                    'day_of_year': i + 1,
                    'start_utc': s_prev.isoformat(),
                    'end_utc': s_today.isoformat(),
                    'moon_phase_angle_deg': round(phase, 3),
                    'moon_illum': round(illum, 6),
                    'moon_distance_km': round(dist_km, 1),
                    'moon_sign': sign_mix['primary'] if sign_mix and sign_mix.get('primary') else moon_sign,
                    'moon_sign_primary': sign_mix['primary'] if sign_mix else moon_sign,
                    'moon_sign_primary_pct': round(sign_mix['primary_pct'], 6) if sign_mix else 1.0,
                    'moon_sign_secondary': sign_mix['secondary'] if sign_mix else None,
                    'moon_sign_secondary_pct': round(sign_mix['secondary_pct'], 6) if sign_mix else 0.0,
                    'moon_zodiac_mode': zodiac_mode
                })

        # Compute exact lunar events across the full span (from first start to last end)
        if days:
            span_start = datetime.fromisoformat(days[0]['start_utc'].replace('Z','+00:00'))
            span_end = datetime.fromisoformat(days[-1]['end_utc'].replace('Z','+00:00'))
            phase_events = scan_phase_events(span_start, span_end, step_hours=6)
            dist_events = scan_perigee_apogee(span_start, span_end, step_hours=6)
            # Map events to containing day bucket
            def bucket_index(t):
                # Assign to half-open interval [start, end) to avoid double-assigning events on exact sunset
                for idx, d in enumerate(days):
                    st = datetime.fromisoformat(d['start_utc'].replace('Z','+00:00'))
                    en = datetime.fromisoformat(d['end_utc'].replace('Z','+00:00'))
                    # For last day, include end boundary
                    if idx == len(days) - 1:
                        if st <= t <= en:
                            return idx
                    else:
                        if st <= t < en:
                            return idx
                return None
            for ev in sorted(phase_events, key=lambda e: e['time']):
                bi = bucket_index(ev['time'])
                if bi is not None:
                    d = days[bi]
                    # If a bucket already has an event, keep the earliest-set one to avoid overwriting
                    if 'moon_event' not in d:
                        # Pick icon mapping
                        icon = ''
                        if ev['type'] == 'new':
                            icon = '🌚'
                        elif ev['type'] == 'full':
                            icon = '🌝'
                        elif ev['type'] == 'first_quarter':
                            icon = '🌓'
                        elif ev['type'] == 'last_quarter':
                            icon = '🌗'
                        d['moon_event'] = ev['type']
                        d['moon_event_utc'] = ev['time'].astimezone(timezone.utc).isoformat()
                        d['moon_icon'] = icon
            for ev in dist_events:
                bi = bucket_index(ev['time'])
                if bi is not None:
                    d = days[bi]
                    if ev['type'] == 'perigee':
                        d['perigee'] = True
                        d['perigee_utc'] = ev['time'].astimezone(timezone.utc).isoformat()
                    if ev['type'] == 'apogee':
                        d['apogee'] = True
                        d['apogee_utc'] = ev['time'].astimezone(timezone.utc).isoformat()

        return jsonify({
            'ok': True,
            'enoch_year': enoch_year,
            'days': days
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'ok': False, 'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
