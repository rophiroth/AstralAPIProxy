function downloadCSV(data) {
  if (!data.length) return;
  const header = 'gregorian,enoch_year,enoch_month,enoch_day,day_of_year,added_week,name,start_utc,end_utc';
  const rows = data.map(d => [
    d.gregorian,
    d.enoch_year ?? '',
    d.enoch_month,
    d.enoch_day,
    d.day_of_year ?? '',
    d.added_week,
    d.name ?? '',
    d.start_utc ?? '',
    d.end_utc ?? ''
  ].join(','));
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

