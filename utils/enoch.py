from datetime import datetime, timedelta
from utils.sunset import adjust_by_sunset
import pytz

# Referencias para calcular los años de Enoj
REFERENCE_YEAR_ENOCH = 5996
REFERENCE_GREGORIAN = datetime(2025, 3, 18, 0, 0, 0, tzinfo=pytz.UTC)  # Miércoles cercano al equinoccio, sin el ajuste del atardecer aún

def calculate_enoch_year(target_date: datetime, latitude: float, longitude: float, tz_str: str):
    # Asegurar que target_date esté en formato aware
    if target_date.tzinfo is None:
        target_date = pytz.timezone(tz_str).localize(target_date)

    # Ajuste dinámico por atardecer
    current = adjust_by_sunset(REFERENCE_GREGORIAN, latitude, longitude, tz_str)
    enoch_year = REFERENCE_YEAR_ENOCH

    def get_next_enoch_start(base_date):
        next_date = base_date + timedelta(days=364)
        next_sunset = adjust_by_sunset(next_date, latitude, longitude, tz_str)
        delta_days = (next_sunset - base_date).days
        if delta_days > 364:
            return base_date + timedelta(days=371), True
        return base_date + timedelta(days=364), False

    # Ir hacia atrás si target_date es anterior
    while target_date < current:
        prev_start, had_extra_week = get_next_enoch_start(current - timedelta(days=371))
        current = prev_start
        enoch_year -= 1

    # Ir hacia adelante mientras target_date esté después del año actual
    added_week = False
    while True:
        next_start, added_week = get_next_enoch_start(current)
        if target_date < next_start:
            break
        current = next_start
        enoch_year += 1

    # Ajuste por atardecer: si el target_date es después del sunset, cuenta como el siguiente día
    adjusted_dt = adjust_by_sunset(target_date, latitude, longitude, tz_str)
    day_of_year = (adjusted_dt - current).days

    return {
        "enoch_year": enoch_year,
        "enoch_start": current.strftime("%Y-%m-%d"),
        "enoch_day_of_year": day_of_year,
        "enoch_month": (day_of_year) // 30 + 1,
        "enoch_day": (day_of_year) % 30 + 1,
        "added_week": added_week
    }
