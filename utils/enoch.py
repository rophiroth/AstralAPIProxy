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

# Ruta ABSOLUTA al directorio que contiene los .se1
ruta_efem = os.path.abspath("sweph/ephe")
swe.set_ephe_path(ruta_efem)
for archivo in ["seplm36.se1", "seplm42.se1", "sepl_30.se1"]:
    ruta = os.path.join(ruta_efem, archivo)
    print(f"✅ {archivo} encontrado: {os.path.exists(ruta)}")
print(f"[DEBUG] Ruta de efemérides seteada en: {ruta_efem}")


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



def _find_equinox_jd_for_year(year,longitude,latitude):
    """
    Función auxiliar que encuentra el JD del equinoccio de marzo de un año dado.
    """
    swe.set_topo(longitude, latitude, 0)
    jd_start = swe.julday(year, 3, 15)

    target_longitude = 0.0  # 0° Aries
    planet = swe.SUN
    flags = swe.FLG_SWIEPH | swe.FLG_TOPOCTR #| swe.FLG_TRUEPOS

    step = 0.25  # Paso de búsqueda en días
    max_iterations = 200
    for _ in range(max_iterations):
        jd_tt = jd_to_tt(jd_start)
        pos, _ = swe.calc(jd_tt, planet,flags)
        sun_long = pos[0] % 360

        if abs(sun_long - target_longitude) < 0.01:
            break

        diff = (sun_long - target_longitude + 360) % 360
        if diff > 180:
            diff -= 360

        jd_start -= diff / (360 / 365.2422)

    else:
        raise RuntimeError(f"No se encontró el equinoccio para el año {year}")

    return jd_start


def find_enoch_year_start(target_date,longitude=REFERENCE_LONGITUDE,latitude=REFERENCE_LATITUDE,debugloop=False):
    """
    Encuentra el inicio del año enojiano basado en el equinoccio real
    y el martes enojiano más cercano (martes al sunset más próximo).
    """
    # 1. Obtener JD del equinoccio real
    equinox_jd = calculate_real_equinox_jd(target_date,longitude,latitude)

    geopos = (longitude, latitude, 0) #Esta referencia debe ser modificada por la ubicación literal ingresada por el usuario

    # 2. Buscar martes anterior
    jd_before = equinox_jd
    while swe.day_of_week(jd_before) != 1:  # 2 = Tuesday
        jd_before -= 1.0
    #debug_jd(jd_before,"jd_before")
    # 3. Buscar martes siguiente
    jd_after = equinox_jd
    while swe.day_of_week(jd_after) != 1:
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
