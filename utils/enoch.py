import swisseph as swe
from utils.jd_time_utils import jd_to_tt
#from datetime import timedelta, datetime
import pytz
from .debug import *
# Configuración global
REFERENCE_LATITUDE = -33.45  # Santiago, Chile
REFERENCE_LONGITUDE = -70.6667
REFERENCE_ENOCH_YEAR = 5996  # Año base de Enoj (equivale a 2025)

import os
from datetime import datetime

# Ruta ABSOLUTA al directorio que contiene los .se1
ruta_efem = os.path.abspath("sweph/ephe")
swe.set_ephe_path(ruta_efem)
for archivo in ["seplm36.se1", "seplm42.se1", "sepl_30.se1"]:
    ruta = os.path.join(ruta_efem, archivo)
    print(f"✅ {archivo} encontrado: {os.path.exists(ruta)}")
print(f"[DEBUG] Ruta de efemérides seteada en: {ruta_efem}")

# Detectar índice de miércoles en runtime (evita supuestos de mapeo del backend de Swiss Ephemeris)
WEDNESDAY_INDEX = swe.day_of_week(swe.julday(2025, 3, 19, 0.0))  # 2025-03-19 es miércoles

def _dow_index_from_jd(jd_val: float) -> int:
    """Devuelve el índice de día de semana para el JD dado, usando 0h UT del día civil."""
    y, mo, d, _h = swe.revjul(jd_val)
    return swe.day_of_week(swe.julday(int(y), int(mo), int(d), 0.0))


def calculate_real_equinox_jd(target_date,longitude,latitude):
    """
    Calcula el JD (Julian Day) del equinoccio real de marzo (Sol en 0° Aries)
    aplicable para la fecha dada. Si la fecha es antes del inicio real del año enojiano,
    toma el equinoccio del año anterior.
    """
    year, month, day, _ = swe.revjul(target_date)

    # Paso 1: Encontrar el equinoccio del año actual
    jd_current = _find_equinox_jd_for_year(year,longitude,latitude)
    #debug_any(jd_current,"jd_current")
    #debug_any(jd_target,"jd_target")
    # Paso 2: Solo buscar el inicio enojiano real si target_date es diferente del equinoccio
    if (target_date) != (jd_current):
        jd_enoch_start = find_enoch_year_start(jd_current,longitude,latitude,True)

        # Paso 3: Ver si la fecha está antes del inicio real del año enojiano
        if target_date < jd_enoch_start:
            jd_current = _find_equinox_jd_for_year(year - 1,longitude,latitude)

    #debug_jd(jd_current, "[DEBUG] calculate_real_equinox_jd: ")
    return jd_current



def _find_longitude_crossing_for_year(year:int, target_longitude:float, longitude:float, latitude:float, start_hint:tuple) -> float:
    """
    Busca el JD (UT) donde el Sol alcanza `target_longitude` (0=Aries, 90=Cáncer, 180=Libra, 270=Capricornio)
    en el año `year`. Usa un inicio aproximado `start_hint` = (mes, día) para converger rápido.
    """
    swe.set_topo(longitude, latitude, 0)
    m, d = start_hint
    jd_start = swe.julday(year, m, d)
    planet = swe.SUN
    flags = swe.FLG_SWIEPH | swe.FLG_TOPOCTR
    max_iterations = 240
    for _ in range(max_iterations):
        jd_tt = jd_to_tt(jd_start)
        pos, _ = swe.calc(jd_tt, planet, flags)
        sun_long = pos[0] % 360.0
        diff = (sun_long - target_longitude + 540.0) % 360.0 - 180.0
        if abs(diff) < 0.005:  # ~0.005° ≈ 20'' de arco
            return jd_start
        jd_start -= diff / (360.0 / 365.2422)
    raise RuntimeError(f"No se encontró cruce solar {target_longitude}° para el año {year}")


def _find_equinox_jd_for_year(year,longitude,latitude):
    """
    Equinoccio de marzo (Sol en 0° Aries). Si falla el cálculo preciso,
    aplica fallback: interpolación por DB opcional y, en última instancia, aproximación fija.
    """
    try:
        return _find_longitude_crossing_for_year(year, 0.0, longitude, latitude, (3, 15))
    except Exception:
        # 1) Intentar interpolación con base de datos opcional backend/equinox_db.json
        try:
            import json
            base_dir = os.path.dirname(os.path.abspath(__file__))
            db_path = os.path.normpath(os.path.join(base_dir, '..', 'backend', 'equinox_db.json'))
            if os.path.exists(db_path):
                with open(db_path, 'r', encoding='utf-8') as f:
                    db = json.load(f)
                years = sorted(int(y) for y in db.keys())
                before = max((y for y in years if y < year and db.get(str(y), {}).get('march_utc')), default=None)
                after = min((y for y in years if y > year and db.get(str(y), {}).get('march_utc')), default=None)
                if before is not None and after is not None and after != before:
                    b_iso = db[str(before)]['march_utc']
                    a_iso = db[str(after)]['march_utc']
                    b_dt = datetime.fromisoformat(b_iso.replace('Z', '+00:00'))
                    a_dt = datetime.fromisoformat(a_iso.replace('Z', '+00:00'))
                    # Interpolación lineal en tiempo
                    w = (year - before) / (after - before)
                    avg_dt = b_dt + (a_dt - b_dt) * w
                    h = avg_dt.hour + avg_dt.minute/60 + avg_dt.second/3600 + avg_dt.microsecond/3600000000
                    return swe.julday(avg_dt.year, avg_dt.month, avg_dt.day, h)
        except Exception:
            pass
        # 2) Aproximación estable: 20-Mar a las 21:24 UTC
        return swe.julday(year, 3, 20, 21 + 24/60)


def find_equinoxes_jd(year:int, longitude:float, latitude:float):
    """Retorna (jd_march, jd_september) para el año dado."""
    jd_mar = _find_longitude_crossing_for_year(year, 0.0, longitude, latitude, (3, 15))
    jd_sep = _find_longitude_crossing_for_year(year, 180.0, longitude, latitude, (9, 15))
    return jd_mar, jd_sep


def find_enoch_year_start(target_date,longitude=REFERENCE_LONGITUDE,latitude=REFERENCE_LATITUDE,debugloop=False):
    """
    Encuentra el inicio del año enojiano basado en el equinoccio real
    y el miércoles enojiano más cercano (miércoles al sunset más próximo).
    """
    # 1. Obtener JD del equinoccio real
    equinox_jd = calculate_real_equinox_jd(target_date,longitude,latitude)

    geopos = (longitude, latitude, 0) #Esta referencia debe ser modificada por la ubicación literal ingresada por el usuario

    # 2. Buscar miércoles anterior (Enoj inicia en miércoles)
    jd_before = equinox_jd
    # Usar índice detectado para miércoles, comparando con el día civil (0h UT)
    while _dow_index_from_jd(jd_before) != WEDNESDAY_INDEX:
        jd_before -= 1.0
    #debug_jd(jd_before,"jd_before")
    # 3. Buscar miércoles siguiente
    jd_after = equinox_jd
    while _dow_index_from_jd(jd_after) != WEDNESDAY_INDEX:
        jd_after += 1.0
    #debug_jd(jd_after,"jd_after")
    # 4. Calcular sunsets para ambos martes
    year, month, day, _ = swe.revjul(jd_before)

    ret1, sunset_data_before = swe.rise_trans(swe.julday(year,month,day,0), swe.SUN, 2, geopos)
    sunset_before_jd = sunset_data_before[0]
    #debug_any(sunset_data_before,"sunset_data_before")
    #debug_jd(sunset_before_jd,"sunset_before_jd")
    
    year, month, day, _ = swe.revjul(jd_after)
    ret2, sunset_data_after = swe.rise_trans(swe.julday(year,month,day,0), swe.SUN, 2, geopos)
    sunset_after_jd = sunset_data_after[0]
    #debug_jd(sunset_after_jd,"sunset_after_jd")
    # 5. Comparar cuál sunset está más cerca del equinoccio
    distancia_before = abs(sunset_before_jd - equinox_jd)
    distancia_after = abs(sunset_after_jd - equinox_jd)


    if distancia_before < distancia_after:
        final_sunset_jd = sunset_before_jd
    else:
        final_sunset_jd = sunset_after_jd
        if debugloop and equinox_jd != target_date and distancia_before == distancia_after:
            debug_any(("EMPATE!!!",equinox_jd,target_date,distancia_before,distancia_after))

    # 🔥 Nuevo DEBUG: resultado final
    #debug_jd(final_sunset_jd, "final_sunset_jd")

    return final_sunset_jd

# Función para obtener días por mes (constante para ahora)
def get_month_days(added_week=False):
    months = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31]
    if added_week:
        months[-1] = 38
    return months

# Función principal para calcular la fecha enojiana
def calculate_enoch_date(target_date,longitude=REFERENCE_LONGITUDE,latitude=REFERENCE_LATITUDE,tzinfo=pytz.UTC):
    #print(f"Timezone de fecha objetivo: {target_date.tzinfo}")

    #print(f"Fecha objetivo UTC JD: {target_jd}")
    debug_jd(target_date, "DEBUG Fecha objetivo UTC JD: ")
    # Calcular inicio de año enojiano del mismo año
    start_of_enoch_year_jd = find_enoch_year_start(target_date,longitude,latitude)

    # Convertir start_of_enoch_year_jd a fecha UTC
    y_start, m_start, d_start, hour_start = swe.revjul(start_of_enoch_year_jd)

    año_enochiano_base = int(y_start)  # el año gregoriano del inicio del año enojiano

    # Calcular años pasados
    years_passed = año_enochiano_base - 2025
    enoch_year = REFERENCE_ENOCH_YEAR + years_passed

    # Días desde el inicio del año enojiano real
    days_diff = int((target_date - start_of_enoch_year_jd))
    #print(f"Días desde inicio de año enojiano: {days_diff}")

    # Cálculo de mes y día
    #if days_diff >= 364:
    added_week = days_diff >= 364  # (por ahora no implementamos semana extra)
    months = get_month_days(added_week)

    day_of_year = days_diff
    month = 0
    while month < len(months) and day_of_year >= months[month]:
        day_of_year -= months[month]
        month += 1

    enoch_month = month + 1
    enoch_day = day_of_year + 1
    enoch_day_of_year = days_diff + 1

    #print(f"Cálculo final: Año: {enoch_year}, Mes: {enoch_month}, Día: {enoch_day}, Día del año: {enoch_day_of_year}")
    #check_enoch_year_lengths(0,7000)
#    descargar_efemerides_github()

    return {
        'enoch_year': enoch_year,
        'enoch_month': enoch_month,
        'enoch_day': enoch_day,
        'enoch_day_of_year': enoch_day_of_year,
        'added_week': added_week
    }


def check_enoch_year_lengths(start_year, end_year, enoch_year_mode=True):
    """
    Compara la duración de años enojianos entre 'start_year' y 'end_year'.
    Usa solo Julian Day (nada de datetime).
    """
    from collections import defaultdict, Counter

    REFERENCE_ENOCH_YEAR = 5996  # Enoch 0 = gregoriano 2025
    duraciones_inusuales = defaultdict(list)
    reportes_detallados = []

    # Convertimos a años gregorianos si vienen en modo enojiano
    if enoch_year_mode:
        start_year = 2025 + (start_year - REFERENCE_ENOCH_YEAR)
        end_year = 2025 + (end_year - REFERENCE_ENOCH_YEAR)

    for year in range(start_year, end_year):
        try:
            jd_current = swe.julday(year, 3, 30, 18.0)
            jd_next = swe.julday(year + 1, 3, 30, 18.0)

            jd_start_current = find_enoch_year_start(jd_current)
            jd_start_next = find_enoch_year_start(jd_next)

            days_difference = jd_start_next - jd_start_current
            duracion_redondeada = round(days_difference, 2)

            if abs(days_difference - 364.0) > 0.1:
                fecha_actual = format_jd(jd_start_current)
                fecha_siguiente = format_jd(jd_start_next)

                duraciones_inusuales[duracion_redondeada].append(year)
                reportes_detallados.append({
                    "año": year,
                    "inicio_actual": fecha_actual,
                    "inicio_siguiente": fecha_siguiente,
                    "días_diferencia": duracion_redondeada
                })

        except Exception as e:
            reportes_detallados.append({
                "año": year,
                "error": str(e)
            })

    # === Detalle de años anómalos ===
    print("\n📋 Detalle de cada año con duración anómala:")
    for reporte in reportes_detallados:
        if "error" in reporte:
            print(f"[ERROR] Año {reporte['año']}: {reporte['error']}")
        else:
            print(f"Año {reporte['año']} → Inicio: {reporte['inicio_actual']} → Siguiente: {reporte['inicio_siguiente']} → Δ días: {reporte['días_diferencia']}")

    # === Reporte final ===
    print("\n======= REPORTE FINAL =======")
    print(f"Modo de año: {'enojiano' if enoch_year_mode else 'gregoriano'}")
    total_casos = sum(len(v) for v in duraciones_inusuales.values())
    print(f"Total de años con duración inusual: {total_casos}")

    for duracion, años in sorted(duraciones_inusuales.items()):
        print(f"\n🕒 Duración: {duracion} días")
        print(f"Años afectados: {años}")
        if len(años) > 1:
            intervalos = [años[i + 1] - años[i] for i in range(len(años) - 1)]
            print(f"Intervalos entre ocurrencias: {intervalos}")
            conteo = Counter(intervalos)
            patrones = [f"{k} años (×{v})" for k, v in conteo.items() if v > 1]
            if patrones:
                print(f"🌀 Patrón detectado: {' | '.join(patrones)}")
            else:
                print("No se detectó un patrón claro de recurrencia.")
        else:
            print("Ocurrió solo una vez.")

    print("======= FIN REPORTE =======\n")
