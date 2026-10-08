// Modo claro / oscuro. "auto" sigue lo que tenga configurado el celu o la compu.
const CLAVE = 'pesos_tema'
const medio = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

export function leerTema() {
  try { return localStorage.getItem(CLAVE) || 'auto' } catch { return 'auto' }
}

export function aplicarTema(preferencia = leerTema()) {
  const oscuro = preferencia === 'oscuro' || (preferencia === 'auto' && medio?.matches)
  document.documentElement.dataset.tema = oscuro ? 'oscuro' : 'claro'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', oscuro ? '#0B1511' : '#0F4D35')
}

export function guardarTema(preferencia) {
  try { localStorage.setItem(CLAVE, preferencia) } catch { /* nada */ }
  aplicarTema(preferencia)
}

// Si está en automático y el sistema cambia de modo, la app cambia sola
if (medio) medio.addEventListener('change', () => { if (leerTema() === 'auto') aplicarTema('auto') })