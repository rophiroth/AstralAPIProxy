import swisseph as swe
import pytz
from datetime import timedelta, datetime
from .enoch import *

def debug_jd(jd, label="Debug JD",label2="DEBUG"):
    y, m, d, hour_decimal = swe.revjul(jd)

    hours = int(hour_decimal)
    minutes_decimal = (hour_decimal - hours) * 60
    minutes = int(minutes_decimal)
    seconds_decimal = (minutes_decimal - minutes) * 60
    seconds = int(seconds_decimal)
    try:
        # datetime no soporta años <= 0; sólo usar cuando está en rango
        if 1 <= int(y) <= 9999:
            dt = datetime(int(y), int(m), int(d), hours, minutes, seconds, 0)
            name = dt.strftime("%A")
        else:
            raise ValueError("year out of range")
    except Exception:
        # Nombre del día vía Swiss Ephemeris
        dow = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        name = dow[int(swe.day_of_week(jd))]
    print(f"[{label2}] {label} Fecha Gregoriana: {name} {int(d):02d}/{int(m):02d}/{int(y)} {hours:02d}:{minutes:02d}:{seconds:02d} UTC  (JD: {jd:.6f})")
    
    
def debug_any(anything, label=" Something: ",label2="DEBUG"):
    print(f"[{label2}] {label}: {anything}")
    
def jd_to_datetime(jd, tzinfo=pytz.UTC):
    """
    Convierte un Julian Day a un datetime completo (incluyendo horas, minutos y segundos).
    """
    y, m, d, hour_decimal = swe.revjul(jd)

    hours = int(hour_decimal)
    minutes_decimal = (hour_decimal - hours) * 60
    minutes = int(minutes_decimal)
    seconds_decimal = (minutes_decimal - minutes) * 60
    seconds = int(seconds_decimal)
    microseconds = int(round((seconds_decimal - seconds) * 1_000_000))
    
    return datetime(int(y), int(m), int(d), hours, minutes, seconds,microseconds, tzinfo)
    
def format_jd(jd):
    y, m, d, hour = swe.revjul(jd)
    dow = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    from math import modf
    hour_frac, hour_int = modf(hour)
    min_frac, hour_int = modf(hour)
    minutes = int((hour_frac) * 60)
    seconds = int((((hour_frac) * 60) - minutes) * 60)
    weekday = dow[int(swe.day_of_week(jd))]
    return f"{weekday}, {int(y):04d}-{int(m):02d}-{int(d):02d} {int(hour)}:{minutes:02d}:{seconds:02d}"

DROPBOX_BASE = "https://www.dropbox.com/scl/fi/y3naz62gy6f6qfrhquu7u/ephe/"

import os
import urllib.request

import os
import urllib.request

def format_jd(jd):
    y, m, d, hour = swe.revjul(jd)
    dow = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    from math import modf
    hour_frac, hour_int = modf(hour)
    min_frac, hour_int = modf(hour)
    minutes = int((hour_frac) * 60)
    seconds = int((((hour_frac) * 60) - minutes) * 60)
    weekday = dow[int(swe.day_of_week(jd))]
    return f"{weekday}, {int(y):04d}-{int(m):02d}-{int(d):02d} {int(hour)}:{minutes:02d}:{seconds:02d}"

