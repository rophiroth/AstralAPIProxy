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
CORS(app, resources={r"/*": {"origins": "*"}})

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
        print(f"[DEBUG] Adjusted Enok date: {enoch_date_dt}", flush=True)

        if not isinstance(enoch_date_dt, datetime):
            print(f"[ERROR] Unexpected enoch_date_dt type: {type(enoch_date_dt)}", flush=True)
            raise ValueError("Enoch date calculation failed")

        jd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60.0)
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
        for name, planet_id in planets.items():
            lon, lat, dist = swe.calc_ut(jd, planet_id)
            results[name] = {
                "longitude": lon,
                "latitude": lat,
                "distance": dist
            }

        enoch_data = calculate_enoch_year(dt, latitude, longitude, tz_str)

        return jsonify({
            "julian_day": jd,
            "planets": results,
            "enoch": enoch_data
        })

    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}", flush=True)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
