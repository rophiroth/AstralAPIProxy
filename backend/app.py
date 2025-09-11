from flask import Flask, request, jsonify
from flask_cors import CORS
import swisseph as swe
from datetime import datetime
import os
import pytz
from utils.enoch import calculate_enoch_date
from utils.sunset import adjust_by_sunset
from utils.datetime_local import localize_datetime
from utils.debug import *
from utils.asc_mc_houses import calculate_asc_mc_and_houses  # << NUEVO IMPORT
from utils.planet_positions import calculate_planets

import traceback

app = Flask(__name__)
<<<<<<< HEAD

# Flexible CORS: allow same-origin by default; enable cross-origin via env
# - Set env CORS_ORIGINS to a comma-separated list of origins (e.g. "https://calendar.psyhackers.org,https://chart.psyhackers.org,http://localhost:5173")
# - If not set, use "*" (no credentials) which is fine for our JSON POST without cookies.
origins_env = os.environ.get("CORS_ORIGINS", "").strip()
if origins_env:
    allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
else:
    # Default explicit allowlist for deployed apps under psyhackers.org
    allowed_origins = [
        "https://chart.psyhackers.org",
        "https://calendar.psyhackers.org",
    ]

# Apply CORS to our API routes; credentials not needed for bearer-less JSON calls
CORS(app, resources={r"/calculate": {"origins": allowed_origins}}, supports_credentials=False)
=======
>>>>>>> d646aee (frontend(calendar): flexible API URL resolver with same-origin default; backend: CORS allowlist for psyhackers.org apps (chart, calendar).)

# Flexible CORS: allow same-origin by default; enable cross-origin via env
# - Set env CORS_ORIGINS to a comma-separated list of origins (e.g. "https://calendar.psyhackers.org,https://chart.psyhackers.org,http://localhost:5173")
# - If not set, use "*" (no credentials) which is fine for our JSON POST without cookies.
origins_env = os.environ.get("CORS_ORIGINS", "").strip()
if origins_env:
    allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
else:
    # Default explicit allowlist for deployed apps under psyhackers.org
    allowed_origins = [
        "https://chart.psyhackers.org",
        "https://calendar.psyhackers.org",
    ]

# Apply CORS to our API routes; credentials not needed for bearer-less JSON calls
CORS(app, resources={r"/calculate": {"origins": allowed_origins}}, supports_credentials=False)

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
        utc_dt = dt.astimezone(pytz.utc)
        print(f"[DEBUG] UTC datetime: {utc_dt} (tz: {utc_dt.tzinfo})", flush=True)

        jd = swe.julday(
            utc_dt.year, utc_dt.month, utc_dt.day,
            utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600 + utc_dt.microsecond / 3600000000
        )
        
        results = calculate_planets(jd, latitude, longitude)
        #debug_any(results,"results calculate_planets")
        enoch_data = calculate_enoch_date(jd, latitude, longitude, tz_str)
        houses_data = calculate_asc_mc_and_houses(jd, latitude, longitude)
        debug_any(houses_data,"Datos de ASC MC & HOUSES")
        return jsonify({
            "julian_day": jd,
            "planets": results,
            "enoch": enoch_data,
            "houses_data": houses_data
        })

    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}", flush=True)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
from flask import Flask, request, jsonify
from flask_cors import CORS
import swisseph as swe
from datetime import datetime
import os
import pytz
from utils.enoch import calculate_enoch_date
from utils.sunset import adjust_by_sunset
from utils.datetime_local import localize_datetime
from utils.debug import *
from utils.asc_mc_houses import calculate_asc_mc_and_houses  # << NUEVO IMPORT
from utils.planet_positions import calculate_planets

import traceback

app = Flask(__name__)

# Flexible CORS: allow same-origin by default; enable cross-origin via env
# - Set env CORS_ORIGINS to a comma-separated list of origins (e.g. "https://calendar.psyhackers.org,https://chart.psyhackers.org,http://localhost:5173")
# - If not set, use "*" (no credentials) which is fine for our JSON POST without cookies.
origins_env = os.environ.get("CORS_ORIGINS", "").strip()
if origins_env:
    allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
else:
    # Default explicit allowlist for deployed apps under psyhackers.org
    allowed_origins = [
        "https://chart.psyhackers.org",
        "https://calendar.psyhackers.org",
    ]

# Apply CORS to our API routes; credentials not needed for bearer-less JSON calls
CORS(app, resources={r"/calculate": {"origins": allowed_origins}}, supports_credentials=False)

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
        utc_dt = dt.astimezone(pytz.utc)
        print(f"[DEBUG] UTC datetime: {utc_dt} (tz: {utc_dt.tzinfo})", flush=True)

        jd = swe.julday(
            utc_dt.year, utc_dt.month, utc_dt.day,
            utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600 + utc_dt.microsecond / 3600000000
        )
        
        results = calculate_planets(jd, latitude, longitude)
        #debug_any(results,"results calculate_planets")
        enoch_data = calculate_enoch_date(jd, latitude, longitude, tz_str)
        houses_data = calculate_asc_mc_and_houses(jd, latitude, longitude)
        debug_any(houses_data,"Datos de ASC MC & HOUSES")
        return jsonify({
            "julian_day": jd,
            "planets": results,
            "enoch": enoch_data,
            "houses_data": houses_data
        })

    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}", flush=True)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
