from datetime import datetime
import pytz

def localize_datetime(date_str: str, tz_str: str) -> datetime:
    tz = pytz.timezone(tz_str)
    naive_dt = datetime.fromisoformat(date_str)
    return tz.localize(naive_dt)
