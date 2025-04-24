
from datetime import datetime, timedelta
from astral import LocationInfo
from astral.sun import sun
import pytz

def adjust_by_sunset(dt: datetime, latitude: float, longitude: float, tz_str: str) -> datetime:
    """
    Ajusta la fecha para que el día comience con la puesta de sol del día anterior, 
    según la ubicación (lat, lon) y zona horaria.
    """
    location = LocationInfo(name="Custom", region="Custom", timezone=tz_str, latitude=latitude, longitude=longitude)
    tz = pytz.timezone(tz_str)
    local_dt = dt.astimezone(tz)

    # Sunset del día anterior y del día actual
    prev_date = (local_dt - timedelta(days=1)).date()
    sunset_prev = sun(location.observer, date=prev_date, tzinfo=tz)['sunset']
    sunset_today = sun(location.observer, date=local_dt.date(), tzinfo=tz)['sunset']

    # Lógica enokiana real
    if local_dt < sunset_prev:
        return dt - timedelta(days=2)
    elif local_dt < sunset_today:
        return dt - timedelta(days=1)
    else:
        return dt
