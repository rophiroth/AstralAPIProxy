import builtins
builtins.print = lambda *args, **kwargs: __import__('builtins').print(*args, **{**kwargs, 'flush': True})

from datetime import datetime, timedelta
from astral import LocationInfo
from astral.sun import sun
import pytz

def adjust_by_sunset(dt: datetime, latitude: float, longitude: float, tz_str: str) -> datetime:
    """
    Ajusta la fecha para el cálculo del día enokiano:
    Si la hora ya pasó el sunset local real (en su zona horaria), se suma un día.
    Si no, se mantiene el día actual.

    Este cálculo respeta el inicio del día enokiano al atardecer.
    """

    location = LocationInfo(name="Debug", region="Debug", timezone=tz_str,
                            latitude=latitude, longitude=longitude)

    try:
        tz = pytz.timezone(tz_str)
    except pytz.UnknownTimeZoneError:
        print(f"[DEBUG] Zona horaria desconocida: {tz_str}. Usando UTC.")
        tz = pytz.UTC

    local_dt = dt.astimezone(tz)
    sunset = sun(location.observer, date=local_dt.date(), tzinfo=tz)['sunset'].astimezone(tz)

    print("\n[ENOK DEBUG] =====================")
    print(f"Input UTC datetime        : {dt} (tz: {dt.tzinfo})")
    print(f"Local datetime            : {local_dt} (tz: {tz_str})")
    print(f"Sunset local time         : {sunset}")
    print(f"SHOULD SUM 1 DAY?         : {'YES' if local_dt >= sunset else 'NO'}")
    print("===============================\n")

    if local_dt >= sunset:
        return dt + timedelta(days=1)

    return dt
