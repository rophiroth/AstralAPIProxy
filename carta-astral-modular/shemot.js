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

const shemotKavanotEs = [
  "Arrepentimiento, hacer Teshuvá. Borra el pasado; regreso al momento de la Creación.",
  "Protección contra la muerte. Resuelve problemas psíquicos. Acerca la redención.",
  "Hacer milagros.",
  "Quitar malos pensamientos. Pensar en positivo; éxito.",
  "Curación. Refuerza el sistema inmunitario del alma.",
  "Amplía el recipiente; iluminación profética.",
  "Pone orden en la vida.",
  "Anula malos decretos; lucha contra la negatividad del mundo.",
  "Influenciar ángeles.",
  "Protección contra el mal de ojo. Quita la envidia. Renacer (mikve).",
  "Eliminar el ego.",
  "Inducir amor. Transformar el odio en amor.",
  "Bendición para embarazo y descendencia.",
  "Lucha contra el ego. Resuelve conflictos sin violencia.",
  "Ver el mundo causal.",
  "Elevar la suerte astral.",
  "Luchar contra el ego.",
  "Construir la vasija de la bendición.",
  "Redimirse. Conexión con el Ana-Be-Koaj.",
  "Potencia la fuerza espiritual para conectar con el Creador.",
  "Fuerza para ir hasta el final. Segundo aliento; ver atajos.",
  "Bendición de los Cohanim. Fuente de toda bendición; limpia el aura.",
  "Energía sacerdotal que separa el bien del mal y limpia la negatividad.",
  "Cura los celos. Evita la desconexión espiritual.",
  "Conectar con la verdad. Genera continuidad.",
  "Poner orden en la vida.",
  "Asociarse con la Luz. Cambia severidad por armonía.",
  "Encontrar el alma gemela.",
  "Despojarse de todo odio.",
  "Reconciliarse con quienes hay conflicto. Vencer el ego.",
  "Aceptación sin juzgar; plenitud.",
  "Atrae la redención; conecta con la consciencia mesiánica.",
  "Eliminar nuestro lado oscuro.",
  "Aprender a romper el ego.",
  "Humildad. Sublimar el sexo.",
  "Conquistar el miedo. Bendición de curación del Cohen.",
  "Romper el ego. Visión a largo plazo.",
  "Adquirir la cualidad de compartir.",
  "Destruye el mal interno. Cambia situaciones negativas.",
  "Orden y certeza en la vida.",
  "Bendición para sanar todas las situaciones.",
  "Revelar secretos. Bueno antes de estudiar Torá.",
  "Ayuda a otros a conectarse con la divinidad; libera almas.",
  "Conectar con la misericordia; suavizar juicios.",
  "Crear el recipiente para la abundancia en el momento justo.",
  "Adquirir confianza y certeza; éxito.",
  "Eliminar bloqueos y negatividad; allanar el camino.",
  "Adquirir conciencia de la unidad.",
  "Aprender la gratitud.",
  "Adquirir la profecía.",
  "Perdón por culpas pasadas.",
  "Fuerza para conectarse.",
  "Defensa espiritual fuerte; restaura lo perdido.",
  "Continuidad; elimina muerte de proyectos o relaciones.",
  "Fuerza para lograr objetivos.",
  "Anula la idolatría (poder, dinero, religiosidad…).",
  "Trascender limitaciones. Poder del Sinaí.",
  "Hace que la divinidad pelee por mí.",
  "Cordón umbilical con la divinidad.",
  "Liberarse de limitaciones (ego, esclavitud…).",
  "Fuerza de sanación; salud.",
  "Conectar con el maestro interior.",
  "Humildad; virtudes de Moisés.",
  "Ayudar a los demás; amor al prójimo.",
  "Conciencia de ayudar y no juzgar.",
  "Resolver conflictos espiritualmente; elimina venganza.",
  "Poder sobre el tiempo.",
  "Corrige emisión seminal; resuelve problemas sexuales.",
  "Sabiduría; bendición para casarse.",
  "Éxito en los negocios para compartir; elimina bloqueos.",
  "Concesión del don de la profecía.",
  "Eliminar defectos físicos. Poder de negociación."
];

const shemotKavanotEn = [
  "Repentance, doing Teshuvah. Erases the past; return to the moment of Creation.",
  "Protection from death. Resolves psychic issues. Brings redemption closer.",
  "Work miracles.",
  "Remove negative thoughts. Positive thinking; success.",
  "Healing. Strengthens the soul's immune system.",
  "Expand the vessel; prophetic illumination.",
  "Brings order to life.",
  "Cancels harsh decrees; fights the world's negativity.",
  "Influence angels.",
  "Protection against the evil eye. Removes envy. Rebirth (mikveh).",
  "Remove the ego.",
  "Induce love. Transform hatred into love.",
  "Blessing for pregnancy and offspring.",
  "Fight the ego. Resolve conflicts without violence.",
  "See the causal world.",
  "Elevate astral fortune.",
  "Battle the ego.",
  "Build the vessel of blessing.",
  "Redemption. Connection with the Ana BeKoach.",
  "Empower spiritual strength to connect with the Creator.",
  "Strength to go the distance. Second wind; see shortcuts.",
  "Priestly blessing (Cohanim). Source of all blessing; cleanses the aura.",
  "Priestly energy that separates good from evil and clears negativity.",
  "Heals jealousy. Prevents spiritual disconnection.",
  "Connect with truth. Generates continuity.",
  "Bring order to life.",
  "Align with the Light. Exchange severity for harmony.",
  "Find the soulmate.",
  "Shed all hatred.",
  "Reconcile with those in conflict. Overcome the ego.",
  "Non-judgmental acceptance; wholeness.",
  "Draws redemption; connects with messianic consciousness.",
  "Remove our dark side.",
  "Learn to break the ego.",
  "Humility. Sublimate sexuality.",
  "Conquer fear. Healing blessing of the Kohen.",
  "Break the ego. Long-term vision.",
  "Acquire the quality of sharing.",
  "Destroy inner evil. Transform negative situations.",
  "Order and certainty in life.",
  "Blessing to heal all situations.",
  "Reveal secrets. Good before studying Torah.",
  "Help others connect with the Divine; liberate souls.",
  "Connect with mercy; soften judgments.",
  "Create the vessel for abundance at the right moment.",
  "Gain confidence and certainty; success.",
  "Remove blockages and negativity; clear the path.",
  "Attain consciousness of unity.",
  "Learn gratitude.",
  "Attain prophecy.",
  "Forgiveness for past guilt.",
  "Strength to connect.",
  "Strong spiritual defense; restores what was lost.",
  "Continuity; removes the death of projects or relationships.",
  "Strength to achieve goals.",
  "Nullify idolatry (power, money, religiosity…).",
  "Transcend limitations. Power of Sinai.",
  "Makes the Divine fight for me.",
  "Umbilical cord with the Divine.",
  "Free oneself from limitations (ego, bondage…).",
  "Healing force; health.",
  "Connect with the inner teacher.",
  "Humility; virtues of Moses.",
  "Help others; love of one's neighbor.",
  "Awareness to help and not judge.",
  "Resolve conflicts spiritually; remove vengeance.",
  "Power over time.",
  "Correct seminal emission; resolve sexual problems.",
  "Wisdom; blessing for marriage.",
  "Success in business for sharing; removes blockages.",
  "Bestowal of the gift of prophecy.",
  "Remove physical defects. Power of negotiation."
];

const HEB_FINALS = {
  "ך": "כ",
  "ם": "מ",
  "ן": "נ",
  "ף": "פ",
  "ץ": "צ"
};

const shemotIndexByName = {};
shemot72.forEach((name, index) => {
  const normalized = normalizeShemName(name);
  if (normalized && !Object.prototype.hasOwnProperty.call(shemotIndexByName, normalized)) {
    shemotIndexByName[normalized] = index;
  }
});

function normalizeShemName(name) {
  if (!name) return "";
  return String(name)
    .split("")
    .map((ch) => HEB_FINALS[ch] || ch)
    .join("");
}

function resolveShemLang(lang) {
  if (lang) {
    return String(lang).toLowerCase().startsWith("en") ? "en" : "es";
  }
  try {
    const globalLang = (typeof window !== "undefined" && (window.__chartLanguage || window.lang || window.currentLang)) || "es";
    return String(globalLang).toLowerCase().startsWith("en") ? "en" : "es";
  } catch (_){
    return "es";
  }
}

function getKavanahList(lang) {
  return lang === "en" ? shemotKavanotEn : shemotKavanotEs;
}

function getShemInfoByIndex(index, lang) {
  if (typeof index !== "number" || index < 0 || index >= shemot72.length) return null;
  const resolvedLang = resolveShemLang(lang);
  const list = getKavanahList(resolvedLang);
  return {
    index,
    name: shemot72[index],
    kavanah: list[index] || ""
  };
}

function getShemInfoByName(name, lang) {
  const normalized = normalizeShemName(name);
  if (!normalized) return null;
  const idx = Object.prototype.hasOwnProperty.call(shemotIndexByName, normalized) ? shemotIndexByName[normalized] : -1;
  return getShemInfoByIndex(idx, lang);
}

function getShemKavanah(name, lang) {
  const info = getShemInfoByName(name, lang);
  return (info && info.kavanah) || "";
}

function getShemAstronomicoIndex(sunLongitude) {
  if (typeof sunLongitude !== "number" || !isFinite(sunLongitude)) return -1;
  let normalized = sunLongitude % 360;
  if (normalized < 0) normalized += 360;
  const idx = Math.floor(normalized / 5);
  if (idx < 0) return 0;
  if (idx >= shemot72.length) return shemot72.length - 1;
  return idx;
}

function getShemAstronomico(sunLongitude) {
  const index = getShemAstronomicoIndex(sunLongitude);
  const value = index >= 0 ? shemot72[index] : "";
  debugValue("Astronómico index", index, value);
  return value;
}

function getShemEnochianoIndex(mes, dia, addedWeek) {
  const mesesLargos = [3, 6, 9, 12];
  let diasEnMes = mesesLargos.includes(mes) ? 31 : 30;
  if (mes === 12 && addedWeek) diasEnMes = 38;
  const offset = (mes - 1) * 6;
  const proporcion = (dia - 1) / diasEnMes;
  const indexDentroDelMes = Math.min(5, Math.floor(proporcion * 6));
  const index = offset + indexDentroDelMes;
  return index >= 0 && index < shemot72.length ? index : -1;
}

function getShemEnochiano(mes, dia, addedWeek) {
  const index = getShemEnochianoIndex(mes, dia, addedWeek);
  const value = index >= 0 ? shemot72[index] : "";
  debugValue("Enochiano index", { mes, dia, addedWeek, index, name: value });
  return value;
}

function getShemInfoFromLongitude(sunLongitude, lang) {
  const index = getShemAstronomicoIndex(sunLongitude);
  return getShemInfoByIndex(index, lang);
}

function getShemInfoFromEnoch(mes, dia, addedWeek, lang) {
  const index = getShemEnochianoIndex(mes, dia, addedWeek);
  return getShemInfoByIndex(index, lang);
}

try {
  window.getShemKavanah = getShemKavanah;
  window.getShemInfoByIndex = getShemInfoByIndex;
  window.getShemInfoByName = getShemInfoByName;
  window.getShemInfoFromLongitude = getShemInfoFromLongitude;
  window.getShemInfoFromEnoch = getShemInfoFromEnoch;
} catch (_){ }
