function downloadCSV(data) {
  if (!data.length) return;
  const hasLunar = typeof data[0].moon_phase_angle_deg !== 'undefined';
  const hasHebrew = typeof data[0].he_year !== 'undefined';
  const baseHeader = ['gregorian','enoch_year','enoch_month','enoch_day','day_of_year','added_week','name','start_utc','end_utc'];
  const lunarHeader = hasLunar ? ['moon_phase_angle_deg','moon_illum','moon_icon','moon_event','moon_event_utc','moon_sign','moon_zodiac_mode','moon_distance_km','perigee','perigee_utc','apogee','apogee_utc'] : [];
  const hebrewHeader = hasHebrew ? ['he_year','he_month','he_day','he_month_name','is_rosh_chodesh','he_holiday_code','he_holiday_name'] : [];
  const header = [...baseHeader, ...lunarHeader, ...hebrewHeader].join(',');
  const rows = data.map(d => {
    const base = [
      d.gregorian,
      d.enoch_year ?? '',
      d.enoch_month,
      d.enoch_day,
      d.day_of_year ?? '',
      d.added_week,
      (d.name ?? '').toString().replace(/,/g,' '),
      d.start_utc ?? '',
      d.end_utc ?? ''
    ];
    const lunar = hasLunar ? [
      (d.moon_phase_angle_deg ?? ''),
      (d.moon_illum ?? ''),
      (d.moon_icon ?? ''),
      (d.moon_event ?? ''),
      (d.moon_event_utc ?? ''),
      (d.moon_sign ?? ''),
      (d.moon_zodiac_mode ?? ''),
      (d.moon_distance_km ?? ''),
      (d.perigee ? '1' : ''),
      (d.perigee_utc ?? ''),
      (d.apogee ? '1' : ''),
      (d.apogee_utc ?? '')
    ] : [];
    const heb = hasHebrew ? [
      (d.he_year ?? ''),
      (d.he_month ?? ''),
      (d.he_day ?? ''),
      (d.he_month_name ?? ''),
      (d.is_rosh_chodesh ? '1' : ''),
      (d.he_holiday_code ?? ''),
      (d.he_holiday_name ?? '')
    ] : [];
    return [...base, ...lunar, ...heb].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const yr = data[0]?.enoch_year ?? 'unknown-year';
  a.download = `enoch-calendar-${yr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
