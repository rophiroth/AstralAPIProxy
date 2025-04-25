
from datetime import datetime, timedelta
from astral import LocationInfo
from astral.sun import sun
import pytz

def adjust_by_sunset(dt: datetime, latitude: float, longitude: float, tz_str: str) -> datetime:
    """
    El día enokiano comienza con la puesta de sol del día anterior.
    """
    location = LocationInfo(name="Custom", region="Custom", timezone=tz_str, latitude=latitude, longitude=longitude)
    tz = pytz.timezone(tz_str)
    local_dt = dt.astimezone(tz)

    sunset_prev = sun(location.observer, date=(local_dt.date() - timedelta(days=1)), tzinfo=tz)['sunset']
    
    if local_dt < sunset_prev:
        return dt - timedelta(days=2)
    else:
        return dt - timedelta(days=1)
