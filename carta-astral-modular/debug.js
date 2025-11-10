// debug.js
function debugValue(label, ...values) {
  try {
    // Usar console.log para que siempre sea visible en Chrome (console.debug puede ocultarse)
    console.log(`[DBG] ${label}`, ...values);
  } catch (_) {}
}

// Capturar errores globales para depurar en producción
(function installGlobalErrorHandlers(){
  if (window.__dbgInstalled) return;
  window.__dbgInstalled = true;
  window.addEventListener('error', (ev) => {
    try {
      console.error('[ERR]', ev.message || ev.error, ev.filename, ev.lineno, ev.colno);
      const out = document.getElementById('output');
      if (out && out.classList && out.classList.contains('hidden')) out.classList.remove('hidden');
      if (out) out.innerHTML = `<p><strong>Error:</strong> ${String(ev.message || ev.error || 'Desconocido')}</p>`;
    } catch (_) {}
  });
  window.addEventListener('unhandledrejection', (ev) => {
    try {
      console.error('[REJECTION]', ev.reason);
      const out = document.getElementById('output');
      if (out && out.classList && out.classList.contains('hidden')) out.classList.remove('hidden');
      if (out) out.innerHTML = `<p><strong>Error:</strong> ${String(ev.reason || 'Promesa rechazada')}</p>`;
    } catch (_) {}
  });
})();
