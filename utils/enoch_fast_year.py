import math
from typing import List, Optional, Dict


MONTHS_BASE = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31]


def derive_enoch_start_jd(target_jd: float, enoch_day_of_year: Optional[int]) -> Optional[float]:
    """Return the JD of Enoch Day 1 (start boundary) using one known day-of-year."""
    if enoch_day_of_year is None:
        return None
    try:
        day_idx = int(enoch_day_of_year)
    except Exception:
        return None
    return target_jd - (day_idx - 1)


def _month_lengths(include_added_week: bool) -> List[int]:
    """Standard month lengths; extend last month if extra week is included."""
    months = MONTHS_BASE[:]
    if include_added_week:
        months[-1] += 7
    return months


def build_enoch_table(start_jd: float, enoch_year: int, include_added_week: bool = True) -> List[Dict]:
    """
    Precompute month/day/day-of-year for an entire Enoch year starting at `start_jd`.
    Does not approximate astronomy; it only avoids re-running the same calendar math per day.
    """
    months = _month_lengths(include_added_week)
    total_days = sum(months) if include_added_week else 364
    table: List[Dict] = []
    m_idx = 0
    day_in_month = 1
    for i in range(total_days):
        enoch_day_of_year = i + 1
        added_week = include_added_week and enoch_day_of_year > 364
        table.append({
            'enoch_year': enoch_year,
            'enoch_month': m_idx + 1,
            'enoch_day': day_in_month,
            'enoch_day_of_year': enoch_day_of_year,
            'added_week': added_week,
            'start_jd': start_jd + i
        })
        day_in_month += 1
        if m_idx < len(months) and day_in_month > months[m_idx]:
            m_idx += 1
            day_in_month = 1
            if m_idx >= len(months):
                break
    return table
