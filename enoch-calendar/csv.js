function parseCSV(text) {
  console.log('[parseCSV] starting parse, length', text.length);
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) {
    console.warn('[parseCSV] no lines to parse');
    return [];
  }
  const headers = lines.shift().split(',');
  const data = [];
  lines.forEach(line => {
    if (!line.trim()) return;
    const cols = line.split(',');
    if (cols.length < headers.length) {
      console.warn('[parseCSV] skipping malformed line', line);
      return;
    }
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = cols[i]);
    obj.enoch_month = parseInt(obj.enoch_month, 10);
    obj.enoch_day = parseInt(obj.enoch_day, 10);
    obj.added_week = obj.added_week === 'true';
    data.push(obj);
  });
  console.log('[parseCSV] parsed rows', data.length);
  return data;
}

