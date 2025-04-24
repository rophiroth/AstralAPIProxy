
from datetime import datetime, timedelta
from astral import LocationInfo
from astral.sun import sun
import pytz

def adjust_by_sunset(dt: datetime) -> datetime:
    """Si la hora es antes de la puesta de sol en Santiago, retrocede un día."""
    santiago = LocationInfo("Santiago", "Chile", "America/Santiago", -33.4489, -70.6693)
    local_dt = dt.astimezone(pytz.timezone("America/Santiago"))
    sunset = sun(santiago.observer, date=local_dt.date(), tzinfo=local_dt.tzinfo)['sunset']
    if local_dt < sunset:
        return dt - timedelta(days=1)
    return dt
