
from flask import Flask, request, jsonify
from flask_cors import CORS
import swisseph as swe
from datetime import datetime
from utils.enoch import calculate_enoch_year

app = Flask(__name__)
CORS(app)

@app.route('/calculate', methods=['POST'])
def calculate():
    try:
        data = request.get_json()
        date_str = data.get("datetime")
        latitude = float(data.get("latitude"))
        longitude = float(data.get("longitude"))

        dt = datetime.fromisoformat(date_str)
        from utils.sunset import adjust_by_sunset
        tz_str = data.get("timezone")
        dt = adjust_by_sunset(dt, latitude, longitude, tz_str)
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
        for name, code in planets.items():
            pos, _ = swe.calc(jd, code, swe.FLG_TOPOCTR | swe.FLG_SWIEPH)
            results[name] = round(pos[0], 6)

        enoch_data = calculate_enoch_year(dt, latitude, longitude)

        return jsonify({
            "julian_day": jd,
            "positions": results,
            "location": {"latitude": latitude, "longitude": longitude},
            "datetime": date_str,
            "enoch": enoch_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
