const shemot72 = [
  "והו","ילי","סיט","עלם","מהש","ללה","אכא","כהת","הזי","אלד","לאו","ההע",
  "יזל","מבה","ריה","הקם","לאו","כלי","לוו","פהל","נלך","ייי","מלה","חהו",
  "נתה","האא","ירת","שאה","ריי","אום","לכב","ושר","יחו","להח","כוק","מנד",
  "אני","חעם","רהע","ייז","ההה","מיך","וול","ילה","סאל","ערי","עשל","מיה",
  "והו","דני","עמם","ננא","נית","מבה","פוי","נמם","ייל","הרח","מצר","ומב",
  "יהה","ענו","מחי","דמב","מנק","איע","חבו","ראה","יבם","היי","מום"
];

function getShemEnochiano(mes, dia, addedWeek) {
  const mesesLargos = [3, 6, 9, 12];
  let diasEnMes = mesesLargos.includes(mes) ? 31 : 30;
  if (mes === 12 && addedWeek) diasEnMes = 38;
  const offset = (mes - 1) * 6;
  const proportion = (dia - 1) / diasEnMes;
  const index = offset + Math.min(5, Math.floor(proportion * 6));
  return shemot72[index];
}

