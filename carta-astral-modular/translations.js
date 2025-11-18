// translations.js - centralized chart translations and glue helpers
(function() {
  const translations = {
    es: {
      title: "Carta Astral del Árbol de la Vida",
      brandUrl: "https://www.sabiduriaholistica.org",
      dateLabel: "Fecha y hora de nacimiento:",
      locationLabel: "Ubicación (Ciudad, País):",
      submitButton: "Calcular Carta",
      placeholder: "Escribe tu ciudad",
      gpsLabel: "Usar ubicación actual",
      statusSearching: "Buscando ubicación...",
      statusDetected: "Ubicación detectada",
      statusDetectedBrowser: "Ubicación aproximada detectada",
      statusError: "GPS:",
      detectedPlaceholder: "Ubicación actual (Ubicación detectada)",
      suggestionNoResults: "No se encontraron resultados",
      suggestionError: "No hay conexión",
      loadingApp: "Cargando módulo...",
      errorUnavailable: "Servicio temporalmente no disponible. Intenta nuevamente en unos segundos.",
      selectLocationMessage: "Selecciona una ubicación válida o permite el acceso a tu ubicación.",
      calculatingMessage: "Calculando carta...",
      gpsDenied: "sin permiso",
      unexpectedError: "Error inesperado",
      enochTitle: "Calendario de Enoj",
      enochYear: "Año",
      enochMonth: "Mes",
      enochDay: "Día",
      enochDayOfYear: "Día del año",
      enochAddedWeek: "Semana adicional",
      enochAstronomicalName: "Nombre (Astronómico)",
      enochEnochName: "Nombre (Enoch)",
      shemKavanahLabel: "Kavan\u00e1",
      yesLabel: "Sí",
      noLabel: "No",
      planetsTitle: "Planetas",
      housesTitle: "Casas astrológicas",
      ascLabel: "Asc",
      descLabel: "Desc",
      mcLabel: "MC",
      houseLabel: "Casa",
      elementSummaryTitle: "Resumen elemental",
      elementSourceUnit: "Conteo (unitario)",
      elementSourceWeighted: "Puntaje (ponderado)",
      elementPolarityTitle: "Polaridad",
      polarityMasculine: "Masculino (Fuego + Aire)",
      polarityFeminine: "Femenino (Agua + Tierra)",
      tableSourceLabel: "Fuente",
      modalitiesTitle: "Resumen por modalidades",
      modalitiesSourceUnit: "Conteo (unitario)",
      modalitiesSourceWeighted: "Puntaje (ponderado)",
      aspectsTitle: "Aspectos clásicos",
      aspectTypeLabel: "Aspecto",
      aspectPlanetsLabel: "Planetas",
      aspectOrbLabel: "Orbe",
      notePluto: "Nota: se excluye Plutón; Sol, Luna y Ascendente puntúan x2 en los conteos ponderados.",
      triadLabel: "Tríada",
      triadMasculine: "Masculino (Fuego)",
      triadNeutral: "Neutro (Aire)",
      triadFeminine: "Femenino (Agua+Tierra)",
      planetNames: {
        Sun: "Sol",
        Moon: "Luna",
        Mercury: "Mercurio",
        Venus: "Venus",
        Mars: "Marte",
        Jupiter: "Júpiter",
        Saturn: "Saturno",
        Uranus: "Urano",
        Neptune: "Neptuno",
        Pluto: "Plutón",
        Ascendant: "Ascendente"
      },
      signNames: {
        Aries: "Aries",
        Taurus: "Tauro",
        Gemini: "Géminis",
        Cancer: "Cáncer",
        Leo: "Leo",
        Virgo: "Virgo",
        Libra: "Libra",
        Scorpio: "Escorpio",
        Sagittarius: "Sagitario",
        Capricorn: "Capricornio",
        Aquarius: "Acuario",
        Pisces: "Piscis"
      },
      elementNames: {
        Fuego: "Fuego",
        Tierra: "Tierra",
        Aire: "Aire",
        Agua: "Agua"
      },
      modalityNames: {
        Cardinal: "Cardinal",
        Fijo: "Fijo",
        Mutable: "Mutable"
      },
      sefirotNames: {
        Keter: "Keter",
        Chokhmah: "Jojmá",
        Binah: "Biná",
        Chesed: "Jesed",
        Gevurah: "Guevurá",
        Tiferet: "Tiferet",
        Netzach: "Netsaj",
        Hod: "Hod",
        Yesod: "Yesod",
        Maljut: "Maljut"
      },
      aspectNames: {
        conjunction: "Conjunción",
        sextile: "Sextil",
        square: "Cuadratura",
        trine: "Trígono",
        opposition: "Oposición"
      }
      aiSummaryTitle: "Resumen con IA",
      aiSummaryHint: "MashIA resume la carta completa con un lenguaje claro y kabal\u00edstico.",
      aiSummaryButton: "Generar resumen kabal\u00edstico",
      aiSummaryPlaceholder: "Pulsa el bot\u00f3n para recibir la interpretaci\u00f3n completa.",
      aiSummaryNoBackend: "Configura la URL del backend de MashIA para activar este m\u00f3dulo.",
      aiSummaryNoData: "Calcula la carta antes de pedir el resumen.",
      aiSummaryWorking: "Generando...",
      aiSummaryLoading: "Conectando con la IA...",
      aiSummaryError: "No se pudo generar el resumen.",
      aiSummaryEmpty: "La IA no devolvi\u00f3 texto."
    },
    en: {
      title: "Tree of Life Astral Chart",
      brandUrl: "https://www.sabiduriaholistica.org",
      dateLabel: "Birth date and time:",
      locationLabel: "Location (City, Country):",
      submitButton: "Calculate Chart",
      placeholder: "Type your city",
      gpsLabel: "Use current location",
      statusSearching: "Looking up location...",
      statusDetected: "Location detected",
      statusDetectedBrowser: "Approximate location detected",
      statusError: "GPS:",
      detectedPlaceholder: "Current location (Detected)",
      suggestionNoResults: "No results found",
      suggestionError: "No connection",
      loadingApp: "Loading module...",
      errorUnavailable: "Service temporarily unavailable. Please try again in a moment.",
      selectLocationMessage: "Choose a valid location or allow access to your location.",
      calculatingMessage: "Calculating chart...",
      gpsDenied: "permission denied",
      unexpectedError: "Unexpected error",
      enochTitle: "Enoch Calendar",
      enochYear: "Year",
      enochMonth: "Month",
      enochDay: "Day",
      enochDayOfYear: "Day of year",
      enochAddedWeek: "Added week",
      enochAstronomicalName: "Name (Astronomical)",
      enochEnochName: "Name (Enoch)",
      shemKavanahLabel: "Kavanah",
      yesLabel: "Yes",
      noLabel: "No",
      planetsTitle: "Planets",
      housesTitle: "Astrological Houses",
      ascLabel: "Asc",
      descLabel: "Desc",
      mcLabel: "MC",
      houseLabel: "House",
      elementSummaryTitle: "Element Summary",
      elementSourceUnit: "Count (unit)",
      elementSourceWeighted: "Score (weighted)",
      elementPolarityTitle: "Polarity",
      polarityMasculine: "Masculine (Fire + Air)",
      polarityFeminine: "Feminine (Water + Earth)",
      tableSourceLabel: "Source",
      modalitiesTitle: "Modalities Summary",
      modalitiesSourceUnit: "Count (unit)",
      modalitiesSourceWeighted: "Score (weighted)",
      aspectsTitle: "Classical Aspects",
      aspectTypeLabel: "Aspect",
      aspectPlanetsLabel: "Planets",
      aspectOrbLabel: "Orb",
      notePluto: "Note: Pluto is excluded; Sun, Moon and Ascendant count twice in weighted totals.",
      triadLabel: "Triad",
      triadMasculine: "Masculine (Fire)",
      triadNeutral: "Neutral (Air)",
      triadFeminine: "Feminine (Water+Earth)",
      planetNames: {
        Sun: "Sun",
        Moon: "Moon",
        Mercury: "Mercury",
        Venus: "Venus",
        Mars: "Mars",
        Jupiter: "Jupiter",
        Saturn: "Saturn",
        Uranus: "Uranus",
        Neptune: "Neptune",
        Pluto: "Pluto",
        Ascendant: "Ascendant"
      },
      signNames: {
        Aries: "Aries",
        Taurus: "Taurus",
        Gemini: "Gemini",
        Cancer: "Cancer",
        Leo: "Leo",
        Virgo: "Virgo",
        Libra: "Libra",
        Scorpio: "Scorpio",
        Sagittarius: "Sagittarius",
        Capricorn: "Capricorn",
        Aquarius: "Aquarius",
        Pisces: "Pisces"
      },
      elementNames: {
        Fuego: "Fire",
        Tierra: "Earth",
        Aire: "Air",
        Agua: "Water"
      },
      modalityNames: {
        Cardinal: "Cardinal",
        Fijo: "Fixed",
        Mutable: "Mutable"
      },
      sefirotNames: {
        Keter: "Keter",
        Chokhmah: "Chokhmah",
        Binah: "Binah",
        Chesed: "Chesed",
        Gevurah: "Gevurah",
        Tiferet: "Tiferet",
        Netzach: "Netzach",
        Hod: "Hod",
        Yesod: "Yesod",
        Maljut: "Maljut"
      },
      aspectNames: {
        conjunction: "Conjunction",
        sextile: "Sextile",
        square: "Square",
        trine: "Trine",
        opposition: "Opposition"
      }
      aiSummaryTitle: "AI Summary",
      aiSummaryHint: "MashIA distills the whole chart into a clear Kabbalistic overview.",
      aiSummaryButton: "Generate Kabbalistic Summary",
      aiSummaryPlaceholder: "Tap the button to receive the synthesized Tree of Life reading.",
      aiSummaryNoBackend: "Configure the MashIA backend URL to enable this section.",
      aiSummaryNoData: "Calculate the chart before requesting the summary.",
      aiSummaryWorking: "Generating...",
      aiSummaryLoading: "Contacting the AI...",
      aiSummaryError: "Could not generate the summary.",
      aiSummaryEmpty: "The AI returned an empty message."
    }
  };

  function getTranslation(lang) {
    return translations[lang] || translations.es;
  }

  function pushToGlobal(lang) {
    const current = getTranslation(lang);
    try {
      window.__chartTranslations = current;
      window.__chartLanguage = lang;
      window.getChartTranslation = function(key, fallback) {
        return (current && current[key]) || fallback || key;
      };
      window.translateSignName = function(sign) {
        const dict = current && current.signNames;
        return (dict && dict[sign]) || sign;
      };
      window.translatePlanetName = function(planet) {
        const dict = current && current.planetNames;
        return (dict && dict[planet]) || planet;
      };
      window.translateAspectName = function(type) {
        const dict = current && current.aspectNames;
        return (dict && dict[type]) || type;
      };
      window.dispatchEvent(new CustomEvent('chart:language-change', {
        detail: { lang, translations: current }
      }));
    } catch (_){}
    return current;
  }

  try {
    window.ChartTranslations = {
      translations,
      defaultLang: 'es',
      getTranslation,
      pushToGlobal
    };
  } catch (_){}
})();
