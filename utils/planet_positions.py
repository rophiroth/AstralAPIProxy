from utils.jd_time_utils import jd_to_tt
import swisseph as swe
from utils.debug import debug_any

def calculate_planets(jd, latitude, longitude):
    swe.set_topo(longitude, latitude, 0)
    flags = swe.FLG_SWIEPH #| swe.FLG_TOPOCTR

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
    jd_tt = jd_to_tt(jd)
    results = {}
    for name, planet_id in planets.items():
        
        res = swe.calc(jd_tt, planet_id, flags)
        debug_any(res, f"{name} and {planet_id}")
        if isinstance(res, tuple) and len(res) == 2:
            lonlat, _ = res
            lon = lonlat[0] if len(lonlat) > 0 else None
            lat = lonlat[1] if len(lonlat) > 1 else None
            dist = lonlat[2] if len(lonlat) > 2 else None
            results[name] = {
                "longitude": lon,
                "latitude": lat,
                "distance": dist
            }
        else:
            results[name] = {
                "longitude": None,
                "latitude": None,
                "distance": None,
                "error": "Failed to calculate"
            }

    return results
