
import swisseph as swe

def jd_to_tt(jd_utc):
    """
    Convierte Julian Day UTC a Julian Day TT (Tiempo Terrestre),
    sumando Delta T en días.
    """
    delta_t_seconds = swe.deltat(jd_utc)
    return jd_utc + delta_t_seconds / 86400
