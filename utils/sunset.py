from datetime import datetime, timedelta
from astral import LocationInfo
from astral.sun import sun
import pytz

def adjust_by_sunset(dt: datetime, latitude: float, longitude: float, tz_str: str) -> datetime:
    """
    Ajusta la fecha para el cálculo del día enokiano:
    Si la hora ya pasó el sunset local real (en su zona horaria), se suma un día.
    Si no, se mantiene el día actual.
    """
    location = LocationInfo(name="Debug", region="Debug", timezone=tz_str,
                            latitude=latitude, longitude=longitude)

    try:
        tz = pytz.timezone(tz_str)
    except pytz.UnknownTimeZoneError:
        print(f"[DEBUG] Zona horaria desconocida: {tz_str}. Usando UTC.", flush=True)
        tz = pytz.UTC

    local_dt = dt.astimezone(tz)

    # Obtener el sunset, y asegurar que sea aware para evitar errores de comparación
    sunset_raw = sun(location.observer, date=local_dt.date(), tzinfo=tz)['sunset']
    sunset = tz.localize(sunset_raw.replace(tzinfo=None)) if sunset_raw.tzinfo is None else sunset_raw.astimezone(tz)

    print("\n[ENOK DEBUG] =====================", flush=True)
    print(f"Input UTC datetime        : {dt} (tz: {dt.tzinfo})", flush=True)
    print(f"Local datetime            : {local_dt} (tz: {tz_str})", flush=True)
    print(f"Sunset local time         : {sunset}", flush=True)
    print(f"SHOULD SUM 1 DAY?         : {'YES' if local_dt >= sunset else 'NO'}", flush=True)
    print("===============================\n", flush=True)

    if local_dt >= sunset:
        return dt + timedelta(days=1)

    return dt
