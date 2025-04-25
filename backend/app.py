from flask import Flask, request, jsonify
from flask_cors import CORS
import swisseph as swe
from datetime import datetime
import os
import pytz
from utils.enoch import calculate_enoch_year
from utils.sunset import adjust_by_sunset
from utils.datetime_local import localize_datetime

app = Flask(__name__)
CORS(app)

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        data = request.get_json()
        print("[DEBUG] Received POST /calculate", flush=True)
        print(f"[DEBUG] Raw data: {data}", flush=True)

        date_str = data.get("datetime")
        latitude = float(data.get("latitude"))
        longitude = float(data.get("longitude"))
        tz_str = data.get("timezone", "UTC")

        try:
            tz = pytz.timezone(tz_str)
            print(f"[DEBUG] Timezone OK: {tz}", flush=True)
        except Exception as e:
            print(f"[ERROR] Invalid timezone: {e}", flush=True)

        dt = localize_datetime(date_str, tz_str)
        print(f"[DEBUG] Localized datetime: {dt} (tz: {dt.tzinfo})", flush=True)

        enoch_date_dt = adjust_by_sunset(dt, latitude, longitude, tz_str)
        print(f"[DEBUG] Localized enoch_date_dt: {enoch_date_dt} (tz: {enoch_date_dt.tzinfo})", flush=True)
        jd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60.0)
        print(f"[DEBUG] Localized jd: {jd} (jd: {jd.tzinfo})", flush=True)
        swe.set_topo(longitude, latitude, 0)

        planets = {
            "Sun": swe.SUN,
            "Moon": swe.MOON,
            "Mercury": swe.MERCURY,
            "Venus": swe.VENUS,
            "Mars": swe.MARS,
            "Jupiter": swe.JUPITER,
            "Saturn": swe.SATURN,
            "Uranus": swe.URANUS,
            "Neptune": swe.NEPTUNE,
            "Pluto": swe.PLUTO
        }

        results = {}
        for name, planet in planets.items():
            try:
                result, _ = swe.calc_ut(jd, planet)
                lon = result[0]
                lat = result[1] if len(result) > 1 else None
                dist = result[2] if len(result) > 2 else None
            except Exception as e:
                lon, lat, dist = None, None, None
                print(f"[ERROR] Failed to calculate {name}: {e}", flush=True)
            results[name] = {"longitude": lon, "latitude": lat, "distance": dist}

        enoch_data = calculate_enoch_year(enoch_date_dt, latitude, longitude)

        return jsonify({
            "julian_day": jd,
            "planets": results,
            "enochian_date": enoch_data
        })

    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}", flush=True)
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
