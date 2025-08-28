function downloadCSV(data) {
  if (!data.length) return;
  const header = 'gregorian,enoch_month,enoch_day,added_week,name';
  const rows = data.map(d => `${d.gregorian},${d.enoch_month},${d.enoch_day},${d.added_week},${d.name}`);
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `enoch-calendar-${data[0].enoch_year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

