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

    # Asegurarse de que dt tenga tzinfo antes de cualquier operación
    if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
        print("[FIX] Forzando tzinfo a dt (estaba naive o inválido)", flush=True)
        dt = tz.localize(dt.replace(tzinfo=None))
    else:
        print("[CHECK] dt ya era aware", flush=True)

    local_dt = dt.astimezone(tz)

    # Obtener el sunset, y asegurar que sea aware para evitar errores de comparación
    sunset_raw = sun(location.observer, date=local_dt.date(), tzinfo=tz)['sunset']
    sunset = tz.localize(sunset_raw.replace(tzinfo=None)) if sunset_raw.tzinfo is None else sunset_raw.astimezone(tz)

    print("\n[ENOK DEBUG] =====================", flush=True)
    print(f"Input UTC datetime        : {dt} (tz: {dt.tzinfo})", flush=True)
    print(f"Local datetime            : {local_dt} (tz: {tz_str})", flush=True)
    print(f"Sunset local time         : {sunset}", flush=True)

    try:
        should_sum = local_dt >= sunset
        print(f"SHOULD SUM 1 DAY?         : {'YES' if should_sum else 'NO'}", flush=True)
    except Exception as e:
        print(f"[ERROR] Comparison failed: {e}", flush=True)
        should_sum = False

    print("===============================\n", flush=True)

    if should_sum:
        return dt# + timedelta(days=1)

    return dt
