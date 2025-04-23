
from datetime import datetime, timedelta
from astral import LocationInfo
from astral.sun import sun
import pytz

START_YEAR_ENOCH = 5996
START_GREGORIAN = datetime(2024, 3, 20)  # Miércoles más cercano al equinoccio 2024

def find_nearest_wednesday(year):
    equinox_guess = datetime(year, 3, 20)
    options = [equinox_guess + timedelta(days=i) for i in range(-3, 4)]
    options.sort(key=lambda d: (abs((d - equinox_guess).days), d.weekday() != 2))
    return next(d for d in options if d.weekday() == 2)

def get_sunset_hour(dt, latitude, longitude):
    loc = LocationInfo(name="custom", region="custom", timezone="UTC", latitude=latitude, longitude=longitude)
    s = sun(loc.observer, date=dt.date(), tzinfo=pytz.UTC)
    return s['sunset'].hour + s['sunset'].minute / 60

def calculate_enoch_year(target_date, latitude, longitude):
    current = START_GREGORIAN
    enoch_year = START_YEAR_ENOCH

    while target_date < current:
        prev_wed = find_nearest_wednesday(current.year - 1)
        added_week = (current - prev_wed).days > 364
        year_length = 364 + (7 if added_week else 0)
        current = current - timedelta(days=year_length)
        enoch_year -= 1

    while True:
        next_wed = find_nearest_wednesday(current.year + 1)
        added_week = (next_wed - current).days > 364
        year_length = 364 + (7 if added_week else 0)
        if target_date < current + timedelta(days=year_length):
            break
        current = current + timedelta(days=year_length)
        enoch_year += 1

    day_of_year = (target_date - current).days
    sunset_hour = get_sunset_hour(target_date, latitude, longitude)
    target_decimal_hour = target_date.hour + target_date.minute / 60
    if target_decimal_hour >= sunset_hour:
        day_of_year += 1

    return {
        "enoch_year": enoch_year,
        "enoch_start": current.strftime("%Y-%m-%d"),
        "enoch_day_of_year": day_of_year,
        "enoch_month": (day_of_year - 1) // 30 + 1,
        "enoch_day": (day_of_year - 1) % 30 + 1,
        "added_week": added_week
    }
