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

    # Definir la ubicación geográfica y la zona horaria
    location = LocationInfo(name="Custom", region="Custom", timezone=tz_str,
                            latitude=latitude, longitude=longitude)

    try:
        tz = pytz.timezone(tz_str)
    except pytz.UnknownTimeZoneError:
        print(f"[DEBUG] Zona horaria desconocida: {tz_str}. Usando UTC.")
        tz = pytz.UTC

    # Convertir el datetime entregado a hora local
    local_dt = dt.astimezone(tz)

    # Obtener hora del sunset del día actual y forzar que esté en la misma zona horaria
    sunset = sun(location.observer, date=local_dt.date(), tzinfo=tz)['sunset'].astimezone(tz)

    # Debug opcional (puedes comentar si no quieres verbosidad)
    print(f"[DEBUG] Local datetime: {local_dt}")
    print(f"[DEBUG] Sunset time:    {sunset}")

    # Si ya pasó el sunset → estamos en el nuevo día enokiano
    if local_dt >= sunset:
        return dt + timedelta(days=1)

    # Si aún no ha ocurrido el sunset → seguimos en el día actual
    return dt
