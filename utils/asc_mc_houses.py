import swisseph as swe
try:
    from utils.debug import is_debug_verbose
except Exception:
    def is_debug_verbose():
        return False

def degree_to_sign(deg):
    signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
             'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
    index = int(deg // 30)
    return signs[index], deg % 30

def calculate_asc_mc_and_houses(julian_day, latitude, longitude):
    """
    Calcula el Ascendente, Medio Cielo y cúspides de casas desde un Julian Day,
    latitud y longitud (en grados decimales).
    """
    try:
        cusps , ascmc = swe.houses(julian_day, latitude, longitude, b'P')
        asc_deg = ascmc[0]
        mc_deg = ascmc[1]
    
        asc_sign, asc_pos = degree_to_sign(asc_deg)
        mc_sign, mc_pos = degree_to_sign(mc_deg)
        if is_debug_verbose():
            print("cusps:", len(cusps), cusps)
            print("ascmc:", len(ascmc), ascmc)
        casas = []
        for i in range(0, min(len(cusps), 13)):  # casas 1 a 12 si están disponibles
            deg = cusps[i]
            sign, pos = degree_to_sign(deg)
            casas.append({
                "house": i+1,
                "degree": deg,
                "sign": sign,
                "position": pos
            })

        return {
            "ascendant": {
                "degree": asc_deg,
                "sign": asc_sign,
                "position": asc_pos
            },
            "midheaven": {
                "degree": mc_deg,
                "sign": mc_sign,
                "position": mc_pos
            },
            "houses": casas
        }
    except Exception as e:
        return {
            "error": f"Failed to calculate ASC/MC/houses: {str(e)}"
        }
