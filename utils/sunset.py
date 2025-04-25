
from datetime import datetime, timedelta
from astral import LocationInfo
from astral.sun import sun
import pytz

def adjust_by_sunset(dt: datetime, latitude: float, longitude: float, tz_str: str) -> datetime:
    """
    Ajusta la fecha para que el día enokiano comience al atardecer local.
    Si la hora ya pasó el sunset, se suma un día: ya estamos viviendo el nuevo día enokiano.
    Si aún no ha ocurrido el sunset, se mantiene la fecha actual.
    
    Ejemplo:
      - 13/oct 01:00 AM → aún es 13/oct → Día 27
      - 13/oct 20:01 PM → ya es 14/oct enokiano → Día 28
    """
    location = LocationInfo(name="Custom", region="Custom", timezone=tz_str, latitude=latitude, longitude=longitude)
    tz = pytz.timezone(tz_str)
    local_dt = dt.astimezone(tz)

    sunset = sun(location.observer, date=local_dt.date(), tzinfo=tz)['sunset']

    if local_dt >= sunset:
        return dt + timedelta(days=1)

    return dt
