// shemot.js
const shemot72 = [
  "והו",
  "ילי",
  "סיט",
  "עלם",
  "מהש",
  "ללה",
  "אכא",
  "כהת",
  "הזי",
  "אלד",
  "לאו",
  "ההע",
  "יזל",
  "מבה",
  "ריה",
  "הקם",
  "לאו",
  "כלי",
  "לוו",
  "פהל",
  "נלך",
  "ייי",
  "מלה",
  "חהו",
  "נתה",
  "האא",
  "ירת",
  "שאה",
  "ריי",
  "אום",
  "לכב",
  "ושר",
  "יחו",
  "להח",
  "כוק",
  "מנד",
  "אני",
  "חעם",
  "רהע",
  "ייז",
  "ההה",
  "מיך",
  "וול",
  "ילה",
  "סאל",
  "ערי",
  "עשל",
  "מיה",
  "והו",
  "דני",
  "עמם",
  "ננא",
  "נית",
  "מבה",
  "פוי",
  "נמם",
  "ייל",
  "הרח",
  "מצר",
  "ומב",
  "יהה",
  "ענו",
  "מחי",
  "דמב",
  "מנק",
  "איע",
  "חבו",
  "ראה",
  "יבם",
  "היי",
  "מום"
];

function getShemAstronomico(sunLongitude) {
  const index = Math.floor(sunLongitude / 5);
  debugValue("Astronómico index", index, shemot72[index]);
  return shemot72[index];
}

function getShemEnochiano(mes, dia, addedWeek) {
  const mesesLargos = [3, 6, 9, 12];
  let diasEnMes = mesesLargos.includes(mes) ? 31 : 30;
  if (mes === 12 && addedWeek) diasEnMes = 38;

  const offset = (mes - 1) * 6;
  const proporcion = (dia - 1) / diasEnMes;
  const indexDentroDelMes = Math.min(5, Math.floor(proporcion * 6));
  const index = offset + indexDentroDelMes;

  debugValue("Enochiano index", { mes, dia, diasEnMes, offset, indexDentroDelMes, index, name: shemot72[index] });
  return shemot72[index];
}